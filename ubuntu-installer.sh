#!/bin/bash

# =============================================================================
# OTO PARÇA PANEL - UBUNTU 22.04 LTS KURULUM ARACI
# =============================================================================
# Sürüm: 3.0
# Uyumluluk: Ubuntu 22.04 LTS
# Açıklama: Tek komutla tam otomatik kurulum aracı
# Geliştirici: Oto Parça Panel Ekibi
# =============================================================================

set -euo pipefail  # Strict mode: exit on error, undefined vars, pipe failures

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================

# Script bilgileri
SCRIPT_VERSION="3.0"
SCRIPT_NAME="Ubuntu Installer"
INSTALL_DIR="/opt/oto-parca-panel"
LOG_FILE="/var/log/oto-parca-install.log"
ROLLBACK_FILE="/tmp/oto-parca-rollback.log"

# Kurulum durumu
TOTAL_STEPS=12
CURRENT_STEP=0
INSTALL_START_TIME=$(date +%s)

# Domain ve SSL
DOMAIN_NAME=""
SSL_EMAIL=""
USE_LETSENCRYPT=false

# Güvenlik
POSTGRES_PASSWORD=""
JWT_SECRET=""
NEXTAUTH_SECRET=""
REDIS_PASSWORD=""

# Sistem bilgileri
OS_VERSION=""
TOTAL_RAM=0
AVAILABLE_DISK=0

# =============================================================================
# RENKLI OUTPUT VE PROGRESS
# =============================================================================

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Progress bar
show_progress() {
    local current=$1
    local total=$2
    local message="$3"
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[%3d%%]${NC} [" "$percent"
    printf "%*s" "$filled" | tr ' ' '█'
    printf "%*s" "$empty" | tr ' ' '░'
    printf "] ${WHITE}%s${NC}" "$message"
}

# Logging fonksiyonları
log() {
    local message="$1"
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $message" >> "$LOG_FILE"
}

warn() {
    local message="$1"
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ WARNING: $message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $message" >> "$LOG_FILE"
}

error() {
    local message="$1"
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$LOG_FILE"
    cleanup_on_error
    exit 1
}

info() {
    local message="$1"
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ INFO: $message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $message" >> "$LOG_FILE"
}

success() {
    local message="$1"
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 $message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $message" >> "$LOG_FILE"
}

# Progress güncelleme
update_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "$1"
    echo ""
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Komut çalıştırma (retry ve timeout ile)
run_command() {
    local cmd="$1"
    local description="$2"
    local max_retries=${3:-3}
    local retry_delay=${4:-2}
    local timeout=${5:-300}  # 5 dakika default timeout
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] EXEC: $cmd" >> "$LOG_FILE"
    echo "$cmd" >> "$ROLLBACK_FILE"
    
    for ((i=1; i<=max_retries; i++)); do
        info "$description (deneme $i/$max_retries)..."
        
        # Timeout ile komut çalıştır
        if timeout "$timeout" bash -c "$cmd" >> "$LOG_FILE" 2>&1; then
            log "$description"
            return 0
        else
            local exit_code=$?
            if [[ $exit_code -eq 124 ]]; then
                warn "$description timeout oldu (${timeout}s). Deneme $i/$max_retries"
            else
                warn "$description başarısız (exit code: $exit_code). Deneme $i/$max_retries"
            fi
            
            if [[ $i -lt $max_retries ]]; then
                warn "${retry_delay}s sonra tekrar denenecek..."
                sleep $retry_delay
            else
                error "$description $max_retries denemeden sonra başarısız. Log: $LOG_FILE"
            fi
        fi
    done
}

# Güvenli komut çalıştırma (timeout ile)
run_command_safe() {
    local cmd="$1"
    local description="$2"
    local timeout=${3:-60}  # 1 dakika default timeout
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SAFE_EXEC: $cmd" >> "$LOG_FILE"
    
    if timeout "$timeout" bash -c "$cmd" >> "$LOG_FILE" 2>&1; then
        log "$description"
        return 0
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            warn "$description timeout oldu (${timeout}s) ama devam ediliyor..."
        else
            warn "$description başarısız (exit code: $exit_code) ama devam ediliyor..."
        fi
        return 1
    fi
}

# Servis durumu kontrolü
check_service() {
    local service="$1"
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓ $service${NC}"
        return 0
    else
        echo -e "${RED}✗ $service${NC}"
        return 1
    fi
}

# Port kontrolü
check_port() {
    local port="$1"
    if ss -tlnp | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Cleanup fonksiyonu
cleanup_on_error() {
    warn "Hata nedeniyle temizlik işlemi başlatılıyor..."
    
    # Docker servislerini durdur
    if command -v docker-compose &> /dev/null; then
        docker-compose down 2>/dev/null || true
    fi
    
    # Geçici dosyaları temizle
    rm -f /tmp/oto-parca-* 2>/dev/null || true
    
    warn "Temizlik tamamlandı. Rollback bilgileri: $ROLLBACK_FILE"
}

# =============================================================================
# BANNER VE USAGE
# =============================================================================

show_banner() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                           OTO PARÇA PANEL                                   ║${NC}"
    echo -e "${PURPLE}║                    Ubuntu 22.04 LTS Kurulum Aracı                          ║${NC}"
    echo -e "${PURPLE}║                              Sürüm $SCRIPT_VERSION                                    ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}🚀 Otomatik Stok Yönetim Sistemi Kurulumu${NC}"
    echo ""
}

show_usage() {
    echo -e "${CYAN}Kullanım:${NC}"
    echo -e "  ${WHITE}sudo ./ubuntu-installer.sh${NC}                    # Self-signed SSL ile kurulum"
    echo -e "  ${WHITE}sudo ./ubuntu-installer.sh example.com${NC}        # Let's Encrypt SSL ile kurulum"
    echo -e "  ${WHITE}sudo ./ubuntu-installer.sh --help${NC}             # Yardım"
    echo ""
    echo -e "${CYAN}Örnekler:${NC}"
    echo -e "  ${WHITE}sudo ./ubuntu-installer.sh otoparca.com${NC}       # Ana domain kurulumu"
    echo -e "  ${WHITE}sudo ./ubuntu-installer.sh panel.otoparca.com${NC} # Subdomain kurulumu"
    echo ""
    echo -e "${CYAN}Gereksinimler:${NC}"
    echo -e "  ${WHITE}• Ubuntu 22.04 LTS${NC}"
    echo -e "  ${WHITE}• En az 4GB RAM${NC}"
    echo -e "  ${WHITE}• En az 20GB disk alanı${NC}"
    echo -e "  ${WHITE}• Root erişimi (sudo)${NC}"
    echo -e "  ${WHITE}• İnternet bağlantısı${NC}"
    echo ""
}

# =============================================================================
# SYSTEM CHECKS
# =============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Bu script root kullanıcısı ile çalıştırılmalıdır. 'sudo ./ubuntu-installer.sh' kullanın."
    fi
}

check_os() {
    if ! command -v apt &> /dev/null; then
        error "Bu script sadece Ubuntu/Debian sistemlerde çalışır."
    fi
    
    # Ubuntu 22.04 kontrolü
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_VERSION="$VERSION_ID"
        info "İşletim Sistemi: $PRETTY_NAME"
        
        if [[ "$VERSION_ID" != "22.04" ]]; then
            warn "Bu script Ubuntu 22.04 LTS için optimize edilmiştir. Mevcut sürüm: $VERSION_ID"
            read -p "Devam etmek istiyor musunuz? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Kurulum iptal edildi."
            fi
        fi
    fi
}

check_system_requirements() {
    update_progress "Sistem gereksinimleri kontrol ediliyor..."
    
    # RAM kontrolü
    TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$TOTAL_RAM" -lt 3500 ]; then
        warn "Sistem RAM'i 4GB'dan az ($TOTAL_RAM MB). Performans sorunları yaşayabilirsiniz."
    else
        log "RAM: ${TOTAL_RAM}MB - Yeterli"
    fi
    
    # Disk kontrolü
    AVAILABLE_DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_DISK" -lt 15 ]; then
        warn "Kullanılabilir disk alanı 20GB'dan az ($AVAILABLE_DISK GB). Disk alanı yetersiz olabilir."
    else
        log "Disk Alanı: ${AVAILABLE_DISK}GB - Yeterli"
    fi
    
    # CPU kontrolü
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -lt 2 ]; then
        warn "CPU çekirdek sayısı 2'den az ($cpu_cores). Performans sorunları yaşayabilirsiniz."
    else
        log "CPU Çekirdekleri: $cpu_cores - Yeterli"
    fi
    
    # İnternet bağlantısı kontrolü
    if ! ping -c 1 google.com &> /dev/null; then
        error "İnternet bağlantısı bulunamadı. Kurulum için internet gereklidir."
    else
        log "İnternet bağlantısı - Aktif"
    fi
}

# =============================================================================
# INPUT HANDLING
# =============================================================================

parse_arguments() {
    case "${1:-}" in
        "--help"|"-h"|"help")
            show_banner
            show_usage
            exit 0
            ;;
        "")
            info "Domain parametresi belirtilmedi. Self-signed SSL kullanılacak."
            ;;
        *)
            DOMAIN_NAME="$1"
            USE_LETSENCRYPT=true
            info "Domain: $DOMAIN_NAME - Let's Encrypt SSL kullanılacak"
            
            # Domain format kontrolü
            if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
                error "Geçersiz domain formatı: $DOMAIN_NAME"
            fi
            
            SSL_EMAIL="admin@$DOMAIN_NAME"
            ;;
    esac
}

get_user_confirmation() {
    echo ""
    info "Kurulum Bilgileri:"
    echo -e "${WHITE}• Domain: ${DOMAIN_NAME:-"localhost (self-signed SSL)"}${NC}"
    echo -e "${WHITE}• SSL: ${USE_LETSENCRYPT:+"Let's Encrypt"}${USE_LETSENCRYPT:-"Self-signed"}${NC}"
    echo -e "${WHITE}• Email: ${SSL_EMAIL:-"Yok"}${NC}"
    echo -e "${WHITE}• Kurulum Dizini: $INSTALL_DIR${NC}"
    echo ""
    
    read -p "$(echo -e "${YELLOW}Kuruluma devam edilsin mi? (y/n): ${NC}")" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Kurulum iptal edildi."
        exit 1
    fi
    
    log "Kullanıcı onayı alındı"
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

generate_passwords() {
    update_progress "Güvenli şifreler oluşturuluyor..."
    
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    log "Güvenli şifreler oluşturuldu"
}

update_system() {
    update_progress "Sistem güncelleniyor..."
    
    # Paket listesini güncelle
    run_command "apt update" "Paket listesi güncellendi"
    
    # Sistem paketlerini güncelle
    run_command "DEBIAN_FRONTEND=noninteractive apt upgrade -y" "Sistem paketleri güncellendi"
    
    # Temel paketleri yükle
    run_command "DEBIAN_FRONTEND=noninteractive apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release bc net-tools openssl" "Temel paketler yüklendi"
}

prevent_port_conflicts() {
    update_progress "Port çakışmaları kontrol ediliyor..."
    
    local ports=(3000 3001 5432 6379 80 443)
    local conflicts=0
    
    for port in "${ports[@]}"; do
        if ss -tlnp | grep -q ":$port " && ! ss -tlnp | grep ":$port " | grep -q docker; then
            warn "Port $port çakışması tespit edildi"
            local pid=$(ss -tlnp | grep ":$port " | grep -v docker | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
            
            if [[ -n "$pid" && "$pid" != "-" ]]; then
                info "Port $port'i kullanan process durdurulacak: PID $pid"
                kill -9 "$pid" 2>/dev/null || true
                sleep 2
            fi
            ((conflicts++))
        fi
    done
    
    if [[ $conflicts -eq 0 ]]; then
        log "Port çakışması bulunamadı"
    else
        log "$conflicts port çakışması çözüldü"
    fi
}

install_docker() {
    update_progress "Docker kurulumu yapılıyor..."
    
    # Network bağlantı kontrolü
    info "Network bağlantısı kontrol ediliyor..."
    if ! curl -s --connect-timeout 10 https://download.docker.com > /dev/null; then
        warn "Docker sunucusuna bağlantı sorunu. Alternatif yöntem denenecek."
    fi
    
    # Eski Docker sürümlerini kaldır
    run_command_safe "apt remove -y docker docker-engine docker.io containerd runc" "Eski Docker sürümleri kaldırıldı"
    
    # Docker GPG anahtarını ekle (timeout: 60s)
    info "Docker GPG anahtarı indiriliyor..."
    if ! run_command "curl -fsSL --connect-timeout 30 --max-time 60 https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg" "Docker GPG anahtarı eklendi" 3 5 60; then
        warn "Docker GPG anahtarı indirilemedi. Alternatif yöntem deneniyor..."
        run_command "wget -qO- https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg" "Docker GPG anahtarı (wget ile) eklendi" 2 3 60
    fi
    
    # Docker repository'sini ekle
    info "Docker repository ekleniyor..."
    run_command "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable' | tee /etc/apt/sources.list.d/docker.list > /dev/null" "Docker repository eklendi" 2 2 30
    
    # Paket listesini güncelle
    info "Paket listesi güncelleniyor..."
    run_command "apt update" "Paket listesi güncellendi" 3 3 120
    
    # Docker'ı yükle (uzun sürebilir)
    info "Docker paketleri yükleniyor... (Bu işlem birkaç dakika sürebilir)"
    run_command "DEBIAN_FRONTEND=noninteractive apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Docker yüklendi" 2 5 600
    
    # Docker servisini başlat
    info "Docker servisi başlatılıyor..."
    run_command "systemctl enable docker" "Docker servisi etkinleştirildi" 2 2 30
    run_command "systemctl start docker" "Docker servisi başlatıldı" 2 3 60
    
    # Docker Compose kurulumu
    info "Docker Compose indiriliyor..."
    if ! run_command "curl -L --connect-timeout 30 --max-time 120 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose" "Docker Compose indirildi" 2 3 120; then
        warn "Docker Compose indirilemedi. Paket yöneticisi ile kuruluyor..."
        run_command "apt install -y docker-compose" "Docker Compose (apt ile) yüklendi" 2 3 180
    else
        run_command "chmod +x /usr/local/bin/docker-compose" "Docker Compose çalıştırılabilir yapıldı" 1 1 10
    fi
    
    # Docker kullanıcı grubuna ekle
    if [[ -n "${SUDO_USER:-}" ]]; then
        run_command_safe "usermod -aG docker $SUDO_USER" "Kullanıcı Docker grubuna eklendi"
    fi
    
    # Docker test
    info "Docker kurulumu test ediliyor..."
    run_command "docker --version" "Docker sürümü kontrol edildi" 2 2 30
    
    # Docker Compose sürüm kontrolü
    if command -v docker-compose &> /dev/null; then
        run_command "docker-compose --version" "Docker Compose sürümü kontrol edildi" 2 2 30
    elif docker compose version &> /dev/null; then
        log "Docker Compose (plugin) sürümü kontrol edildi"
    else
        warn "Docker Compose kurulumu doğrulanamadı"
    fi
    
    # Docker daemon test
    info "Docker daemon test ediliyor..."
    run_command "docker info" "Docker daemon çalışıyor" 2 3 60
    
    success "Docker kurulumu başarıyla tamamlandı"
}

install_nginx() {
    update_progress "Nginx kurulumu yapılıyor..."
    
    run_command "DEBIAN_FRONTEND=noninteractive apt install -y nginx" "Nginx yüklendi"
    run_command "systemctl enable nginx" "Nginx servisi etkinleştirildi"
    run_command "systemctl start nginx" "Nginx servisi başlatıldı"
    
    # Nginx test
    run_command "nginx -t" "Nginx konfigürasyonu test edildi"
}

setup_firewall() {
    update_progress "Firewall ayarları yapılıyor..."
    
    # UFW kurulumu
    run_command "DEBIAN_FRONTEND=noninteractive apt install -y ufw" "UFW yüklendi"
    
    # Varsayılan kurallar
    run_command "ufw default deny incoming" "Gelen bağlantılar varsayılan olarak engellendi"
    run_command "ufw default allow outgoing" "Giden bağlantılar varsayılan olarak izin verildi"
    
    # Gerekli portları aç
    run_command "ufw allow ssh" "SSH portu açıldı"
    run_command "ufw allow 'Nginx Full'" "Nginx portları açıldı"
    run_command "ufw allow 3000" "Frontend portu açıldı"
    run_command "ufw allow 3001" "Backend portu açıldı"
    
    # UFW'yi etkinleştir
    run_command "ufw --force enable" "Firewall etkinleştirildi"
    
    log "Firewall ayarları tamamlandı"
}

setup_project_directory() {
    update_progress "Proje dizini hazırlanıyor..."
    
    # Ana dizini oluştur
    run_command "mkdir -p $INSTALL_DIR" "Ana dizin oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/postgres" "PostgreSQL veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/redis" "Redis veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/logs" "Log dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/backups" "Backup dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/ssl" "SSL dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/uploads" "Upload dizini oluşturuldu"
    
    # İzinleri ayarla
    if [[ -n "${SUDO_USER:-}" ]]; then
        run_command "chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR" "Dizin sahipliği ayarlandı"
    fi
    run_command "chmod -R 755 $INSTALL_DIR" "Dizin izinleri ayarlandı"
    
    log "Proje dizini $INSTALL_DIR hazırlandı"
}

setup_environment() {
    update_progress "Environment dosyaları oluşturuluyor..."
    
    local env_file=".env"
    local frontend_env="frontend/.env.local"
    
    # Ana .env dosyası
    cat > "$env_file" << EOF
# Oto Parça Panel - Production Environment
# Otomatik oluşturuldu: $(date)

# Domain Configuration
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
SSL_EMAIL=${SSL_EMAIL:-admin@localhost}

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://oto_user:$POSTGRES_PASSWORD@postgres:5432/oto_parca_panel

# JWT
JWT_SECRET=$JWT_SECRET

# NextAuth
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}

# Frontend URLs
NEXT_PUBLIC_API_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME/api}${DOMAIN_NAME:-http://localhost:3001/api}
NEXT_PUBLIC_APP_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}
FRONTEND_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}

# Backend URLs
BACKEND_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3001}
CORS_ORIGIN=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Node Environment
NODE_ENV=production

# WooCommerce (isteğe bağlı)
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
EOF

    # Frontend .env.local dosyası
    mkdir -p frontend
    cat > "$frontend_env" << EOF
# Frontend Production Environment
NEXT_PUBLIC_API_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME/api}${DOMAIN_NAME:-http://localhost:3001/api}
NEXT_PUBLIC_APP_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}
NEXTAUTH_URL=${DOMAIN_NAME:+https://$DOMAIN_NAME}${DOMAIN_NAME:-http://localhost:3000}
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NODE_ENV=production
EOF

    # İzinleri ayarla
    chmod 600 "$env_file" "$frontend_env"
    
    log "Environment dosyaları oluşturuldu"
}

install_ssl() {
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        update_progress "Let's Encrypt SSL kurulumu yapılıyor..."
        
        # Certbot kurulumu
        run_command "DEBIAN_FRONTEND=noninteractive apt install -y certbot python3-certbot-nginx" "Certbot yüklendi"
        
        # DNS kontrolü
        info "Domain DNS kontrolü yapılıyor: $DOMAIN_NAME"
        if ! nslookup "$DOMAIN_NAME" &> /dev/null; then
            warn "Domain DNS kaydı bulunamadı. Let's Encrypt başarısız olabilir."
        fi
        
        # SSL sertifikası al
        run_command "certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $SSL_EMAIL --redirect" "Let's Encrypt SSL sertifikası alındı"
        
        # Otomatik yenileme
        run_command "systemctl enable certbot.timer" "SSL otomatik yenileme etkinleştirildi"
        
        log "Let's Encrypt SSL kurulumu tamamlandı"
    else
        update_progress "Self-signed SSL sertifikası oluşturuluyor..."
        
        # Self-signed sertifika oluştur
        run_command "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt -subj '/C=TR/ST=Istanbul/L=Istanbul/O=OtoParcaPanel/CN=localhost'" "Self-signed SSL sertifikası oluşturuldu"
        
        log "Self-signed SSL kurulumu tamamlandı"
    fi
}

setup_nginx_config() {
    update_progress "Nginx konfigürasyonu ayarlanıyor..."
    
    local nginx_config="/etc/nginx/sites-available/oto-parca-panel"
    local domain_name="${DOMAIN_NAME:-localhost}"
    
    # Nginx site konfigürasyonu
    cat > "$nginx_config" << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    
    # HTTPS yönlendirmesi (Let's Encrypt kullanılıyorsa)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;
    
    # SSL sertifikaları
    ssl_certificate SSL_CERT_PATH;
    ssl_certificate_key SSL_KEY_PATH;
    
    # SSL ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Güvenlik başlıkları
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # API routes (Backend)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Uploads
    location /uploads/ {
        alias /opt/oto-parca-panel/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @frontend;
    }
    
    # Frontend (Next.js)
    location @frontend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Default location
    location / {
        try_files $uri $uri/ @frontend;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Domain ve SSL path'lerini değiştir
    sed -i "s/DOMAIN_PLACEHOLDER/$domain_name/g" "$nginx_config"
    
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        sed -i "s|SSL_CERT_PATH|/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem|g" "$nginx_config"
        sed -i "s|SSL_KEY_PATH|/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem|g" "$nginx_config"
    else
        sed -i "s|SSL_CERT_PATH|/etc/ssl/certs/nginx-selfsigned.crt|g" "$nginx_config"
        sed -i "s|SSL_KEY_PATH|/etc/ssl/private/nginx-selfsigned.key|g" "$nginx_config"
    fi
    
    # Site'ı etkinleştir
    run_command "ln -sf $nginx_config /etc/nginx/sites-enabled/" "Nginx site etkinleştirildi"
    run_command "rm -f /etc/nginx/sites-enabled/default" "Varsayılan site kaldırıldı"
    
    # Nginx'i test et ve yeniden başlat
    run_command "nginx -t" "Nginx konfigürasyonu test edildi"
    run_command "systemctl reload nginx" "Nginx yeniden yüklendi"
    
    log "Nginx konfigürasyonu tamamlandı"
}

start_services() {
    update_progress "Servisler başlatılıyor..."
    
    # Docker servislerini başlat
    run_command "docker-compose up -d" "Docker servisleri başlatıldı"
    
    # Servislerin başlamasını bekle
    sleep 10
    
    # Servis durumlarını kontrol et
    info "Servis durumları kontrol ediliyor..."
    docker-compose ps
    
    log "Servisler başarıyla başlatıldı"
}

run_health_checks() {
    update_progress "Sistem sağlık kontrolleri yapılıyor..."
    
    local checks_passed=0
    local total_checks=6
    
    # Docker servisleri kontrolü
    if docker-compose ps | grep -q "Up"; then
        log "✓ Docker servisleri çalışıyor"
        ((checks_passed++))
    else
        warn "✗ Docker servisleri sorunlu"
    fi
    
    # Port kontrolleri
    for port in 80 443 3000 3001; do
        if check_port $port; then
            log "✓ Port $port açık"
            ((checks_passed++))
        else
            warn "✗ Port $port kapalı"
        fi
    done
    
    # Nginx kontrolü
    if check_service nginx; then
        log "✓ Nginx servisi çalışıyor"
        ((checks_passed++))
    else
        warn "✗ Nginx servisi sorunlu"
    fi
    
    # Sonuç
    if [[ $checks_passed -eq $total_checks ]]; then
        success "Tüm sağlık kontrolleri başarılı ($checks_passed/$total_checks)"
    else
        warn "Bazı sağlık kontrolleri başarısız ($checks_passed/$total_checks)"
    fi
}

# =============================================================================
# MAIN INSTALLATION FLOW
# =============================================================================

main() {
    # Banner göster
    show_banner
    
    # Parametreleri parse et
    parse_arguments "${1:-}"
    
    # Temel kontroller
    check_root
    check_os
    check_system_requirements
    
    # Kullanıcı onayı
    get_user_confirmation
    
    # Log dosyasını başlat
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Kurulum başlatıldı - Sürüm $SCRIPT_VERSION" > "$LOG_FILE"
    
    # Kurulum adımları
    generate_passwords
    update_system
    prevent_port_conflicts
    install_docker
    install_nginx
    setup_firewall
    setup_project_directory
    setup_environment
    install_ssl
    setup_nginx_config
    start_services
    run_health_checks
    
    # Kurulum süresi
    local install_end_time=$(date +%s)
    local install_duration=$((install_end_time - INSTALL_START_TIME))
    
    # Başarı mesajı
    echo ""
    success "🎉 OTO PARÇA PANEL KURULUMU TAMAMLANDI!"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                           KURULUM BAŞARILI                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}📊 Kurulum Bilgileri:${NC}"
    echo -e "${CYAN}• Kurulum Süresi: ${install_duration} saniye${NC}"
    echo -e "${CYAN}• Kurulum Dizini: $INSTALL_DIR${NC}"
    echo -e "${CYAN}• Log Dosyası: $LOG_FILE${NC}"
    echo ""
    echo -e "${WHITE}🌐 Erişim Bilgileri:${NC}"
    if [[ -n "$DOMAIN_NAME" ]]; then
        echo -e "${CYAN}• Web Sitesi: https://$DOMAIN_NAME${NC}"
        echo -e "${CYAN}• API: https://$DOMAIN_NAME/api${NC}"
    else
        echo -e "${CYAN}• Web Sitesi: https://localhost (Self-signed SSL)${NC}"
        echo -e "${CYAN}• API: https://localhost/api${NC}"
    fi
    echo ""
    echo -e "${WHITE}🔧 Yönetim Komutları:${NC}"
    echo -e "${CYAN}• Servisleri durdur: docker-compose down${NC}"
    echo -e "${CYAN}• Servisleri başlat: docker-compose up -d${NC}"
    echo -e "${CYAN}• Logları görüntüle: docker-compose logs -f${NC}"
    echo -e "${CYAN}• Sistem durumu: docker-compose ps${NC}"
    echo ""
    echo -e "${WHITE}📝 Önemli Notlar:${NC}"
    echo -e "${YELLOW}• Şifreler .env dosyasında güvenli bir şekilde saklanmıştır${NC}"
    echo -e "${YELLOW}• Firewall ayarları yapılmıştır (UFW)${NC}"
    echo -e "${YELLOW}• SSL sertifikası ${USE_LETSENCRYPT:+"otomatik olarak yenilenecektir"}${USE_LETSENCRYPT:-"self-signed olarak oluşturulmuştur"}${NC}"
    echo ""
    
    log "Kurulum başarıyla tamamlandı - Süre: ${install_duration}s"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Trap signals for cleanup
trap cleanup_on_error ERR
trap cleanup_on_error INT
trap cleanup_on_error TERM

# Ana fonksiyonu çalıştır
main "$@"

exit 0