#!/bin/bash

# =============================================================================
# OTO PARÇA PANEL - HETZNER DOCKER KURULUM ARACI
# =============================================================================
# Sürüm: 4.0
# Uyumluluk: Hetzner Cloud Ubuntu 22.04 LTS
# Açıklama: Tek komutla tam otomatik Docker kurulumu
# Geliştirici: Oto Parça Panel Ekibi
# =============================================================================

set -euo pipefail

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================

SCRIPT_VERSION="4.0"
SCRIPT_NAME="Hetzner Docker Installer"
PROJECT_NAME="oto-parca-panel"
INSTALL_DIR="/opt/$PROJECT_NAME"
LOG_FILE="/var/log/${PROJECT_NAME}-install.log"

# Kurulum durumu
TOTAL_STEPS=15
CURRENT_STEP=0
INSTALL_START_TIME=$(date +%s)

# Domain ve SSL
DOMAIN_NAME=""
SSL_EMAIL=""
USE_LETSENCRYPT=false

# Git repository
GIT_REPO="https://github.com/mucahitergul/OtoParcaPanel.git"
GIT_BRANCH="main"

# Güvenlik
POSTGRES_PASSWORD=""
JWT_SECRET=""
NEXTAUTH_SECRET=""
REDIS_PASSWORD=""
GRAFANA_PASSWORD=""

# Hetzner özelinde
HETZNER_SERVER_TYPE=""
TOTAL_RAM=0
TOTAL_DISK=0
CPU_CORES=0

# =============================================================================
# RENKLI OUTPUT VE PROGRESS
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

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

update_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "$1"
    echo ""
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

run_command() {
    local cmd="$1"
    local description="$2"
    local max_retries=${3:-3}
    local retry_delay=${4:-3}
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] EXEC: $cmd" >> "$LOG_FILE"
    
    for ((i=1; i<=max_retries; i++)); do
        info "$description (deneme $i/$max_retries)..."
        
        if eval "$cmd" >> "$LOG_FILE" 2>&1; then
            log "$description"
            return 0
        else
            local exit_code=$?
            warn "$description başarısız (exit code: $exit_code). Deneme $i/$max_retries"
            
            if [[ $i -lt $max_retries ]]; then
                warn "${retry_delay}s sonra tekrar denenecek..."
                sleep $retry_delay
            else
                error "$description $max_retries denemeden sonra başarısız. Log: $LOG_FILE"
            fi
        fi
    done
}

cleanup_on_error() {
    warn "Hata nedeniyle temizlik işlemi başlatılıyor..."
    
    # Docker servislerini durdur
    if command -v docker-compose &> /dev/null && [[ -f docker-compose.yml ]]; then
        docker-compose down 2>/dev/null || true
    fi
    
    # Geçici dosyaları temizle
    rm -f /tmp/${PROJECT_NAME}-* 2>/dev/null || true
    
    warn "Temizlik tamamlandı. Log dosyası: $LOG_FILE"
}

# =============================================================================
# BANNER VE USAGE
# =============================================================================

show_banner() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                           OTO PARÇA PANEL                                   ║${NC}"
    echo -e "${PURPLE}║                    Hetzner Cloud Docker Kurulumu                            ║${NC}"
    echo -e "${PURPLE}║                              Sürüm $SCRIPT_VERSION                                    ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}🚀 Hetzner Cloud için Optimize Edilmiş Docker Kurulumu${NC}"
    echo ""
}

show_usage() {
    echo -e "${CYAN}Kullanım:${NC}"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh${NC}                        # Interaktif kurulum"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh domain.com${NC}             # Domain ile kurulum"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh subdomain.domain.com${NC}   # Subdomain ile kurulum"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh --help${NC}                 # Yardım"
    echo ""
    echo -e "${CYAN}Örnekler:${NC}"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh otoparca.com${NC}"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh panel.otoparca.com${NC}"
    echo -e "  ${WHITE}sudo ./hetzner-install.sh api.mydomain.net${NC}"
    echo ""
    echo -e "${CYAN}Hetzner Cloud Gereksinimleri:${NC}"
    echo -e "  ${WHITE}• Ubuntu 22.04 LTS${NC}"
    echo -e "  ${WHITE}• Minimum: CX21 (2 vCPU, 4GB RAM, 40GB SSD)${NC}"
    echo -e "  ${WHITE}• Önerilen: CX31 (2 vCPU, 8GB RAM, 80GB SSD)${NC}"
    echo -e "  ${WHITE}• Root erişimi${NC}"
    echo -e "  ${WHITE}• İnternet bağlantısı${NC}"
    echo ""
}

# =============================================================================
# DOMAIN INPUT VE VALIDATION
# =============================================================================

get_domain_input() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                            DOMAIN KURULUMU                                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ -z "$DOMAIN_NAME" ]]; then
        echo -e "${WHITE}Domain kurulumu nasıl yapmak istiyorsunuz?${NC}"
        echo ""
        echo -e "${GREEN}1)${NC} ${WHITE}Let's Encrypt SSL ile domain kurulumu${NC} ${YELLOW}(Önerilen)${NC}"
        echo -e "${GREEN}2)${NC} ${WHITE}Self-signed SSL ile localhost kurulumu${NC}"
        echo ""
        
        while true; do
            read -p "$(echo -e "${CYAN}Seçiminizi yapın (1/2): ${NC}")" choice
            case $choice in
                1)
                    echo ""
                    echo -e "${WHITE}Domain adınızı girin:${NC}"
                    echo -e "${YELLOW}• Örnek: otoparca.com${NC}"
                    echo -e "${YELLOW}• Örnek: panel.otoparca.com${NC}"
                    echo -e "${YELLOW}• Örnek: api.mydomain.net${NC}"
                    echo ""
                    
                    while true; do
                        read -p "$(echo -e "${CYAN}Domain: ${NC}")" domain_input
                        if [[ -n "$domain_input" ]]; then
                            DOMAIN_NAME="$domain_input"
                            break
                        else
                            warn "Domain adı boş olamaz!"
                        fi
                    done
                    
                    echo ""
                    echo -e "${WHITE}SSL sertifikası için email adresinizi girin:${NC}"
                    read -p "$(echo -e "${CYAN}Email: ${NC}")" email_input
                    SSL_EMAIL="${email_input:-admin@$DOMAIN_NAME}"
                    USE_LETSENCRYPT=true
                    break
                    ;;
                2)
                    DOMAIN_NAME="localhost"
                    SSL_EMAIL=""
                    USE_LETSENCRYPT=false
                    info "Self-signed SSL ile localhost kurulumu seçildi"
                    break
                    ;;
                *)
                    warn "Geçersiz seçim! Lütfen 1 veya 2 girin."
                    ;;
            esac
        done
    fi
    
    # Domain validasyonu
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        validate_domain "$DOMAIN_NAME"
    fi
}

validate_domain() {
    local domain="$1"
    
    info "Domain validasyonu yapılıyor: $domain"
    
    # Domain format kontrolü
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
        error "Geçersiz domain formatı: $domain"
    fi
    
    # DNS kontrolü
    info "DNS kontrolü yapılıyor..."
    if ! nslookup "$domain" &> /dev/null; then
        warn "Domain DNS kaydı bulunamadı: $domain"
        echo ""
        echo -e "${YELLOW}⚠️ DNS Uyarısı:${NC}"
        echo -e "${WHITE}• Domain henüz bu sunucuya yönlendirilmemiş olabilir${NC}"
        echo -e "${WHITE}• Let's Encrypt kurulumu sırasında hata alabilirsiniz${NC}"
        echo -e "${WHITE}• Domain DNS ayarlarını kontrol edin${NC}"
        echo ""
        
        read -p "$(echo -e "${CYAN}Yine de devam etmek istiyor musunuz? (y/n): ${NC}")" -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Kurulum iptal edildi. DNS ayarlarını yapıp tekrar deneyin."
        fi
    else
        log "DNS kontrolü başarılı: $domain"
    fi
}

# =============================================================================
# HETZNER SYSTEM DETECTION
# =============================================================================

detect_hetzner_environment() {
    update_progress "Hetzner sunucu bilgileri alınıyor..."
    
    # RAM bilgisi
    TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    
    # Disk bilgisi
    TOTAL_DISK=$(df -BG / | awk 'NR==2{print $2}' | sed 's/G//')
    
    # CPU bilgisi
    CPU_CORES=$(nproc)
    
    # Hetzner server type tahmini
    if [[ $TOTAL_RAM -ge 7500 && $CPU_CORES -ge 2 ]]; then
        HETZNER_SERVER_TYPE="CX31 veya üzeri"
    elif [[ $TOTAL_RAM -ge 3500 && $CPU_CORES -ge 2 ]]; then
        HETZNER_SERVER_TYPE="CX21"
    elif [[ $TOTAL_RAM -ge 1500 && $CPU_CORES -ge 1 ]]; then
        HETZNER_SERVER_TYPE="CX11"
    else
        HETZNER_SERVER_TYPE="Bilinmeyen"
    fi
    
    echo ""
    info "Hetzner Sunucu Bilgileri:"
    echo -e "${WHITE}• Tahmini Server Type: $HETZNER_SERVER_TYPE${NC}"
    echo -e "${WHITE}• CPU Çekirdekleri: $CPU_CORES${NC}"
    echo -e "${WHITE}• RAM: ${TOTAL_RAM}MB${NC}"
    echo -e "${WHITE}• Disk: ${TOTAL_DISK}GB${NC}"
    echo ""
    
    # Minimum gereksinim kontrolü
    if [[ $TOTAL_RAM -lt 3500 ]]; then
        warn "RAM 4GB'dan az ($TOTAL_RAM MB). Minimum CX21 önerilir."
    fi
    
    if [[ $TOTAL_DISK -lt 35 ]]; then
        warn "Disk alanı 40GB'dan az ($TOTAL_DISK GB). Disk alanı sıkıntısı yaşayabilirsiniz."
    fi
    
    if [[ $CPU_CORES -lt 2 ]]; then
        warn "CPU çekirdek sayısı 2'den az ($CPU_CORES). Performans sorunları yaşayabilirsiniz."
    fi
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

check_system_requirements() {
    update_progress "Sistem gereksinimleri kontrol ediliyor..."
    
    # Root kontrolü
    if [[ $EUID -ne 0 ]]; then
        error "Bu script root kullanıcısı ile çalıştırılmalıdır. 'sudo ./hetzner-install.sh' kullanın."
    fi
    
    # Ubuntu 22.04 kontrolü
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        info "İşletim Sistemi: $PRETTY_NAME"
        
        if [[ "$VERSION_ID" != "22.04" ]]; then
            warn "Bu script Ubuntu 22.04 LTS için optimize edilmiştir. Mevcut sürüm: $VERSION_ID"
            read -p "$(echo -e "${CYAN}Devam etmek istiyor musunuz? (y/n): ${NC}")" -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Kurulum iptal edildi."
            fi
        fi
    fi
    
    # İnternet bağlantısı kontrolü
    info "İnternet bağlantısı test ediliyor..."
    if ! ping -c 1 -W 5 google.com &> /dev/null; then
        error "İnternet bağlantısı bulunamadı. Kurulum için internet gereklidir."
    fi
    
    log "Sistem gereksinimleri kontrolü tamamlandı"
}

generate_secure_passwords() {
    update_progress "Güvenli şifreler oluşturuluyor..."
    
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
    
    log "Güvenli şifreler oluşturuldu"
}

update_system_packages() {
    update_progress "Sistem güncelleniyor..."
    
    export DEBIAN_FRONTEND=noninteractive
    
    run_command "apt update" "Paket listesi güncellendi"
    run_command "apt upgrade -y" "Sistem paketleri güncellendi"
    run_command "apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release bc net-tools openssl ufw" "Temel paketler yüklendi"
}

install_docker_engine() {
    update_progress "Docker Engine kurulumu yapılıyor..."
    
    # Eski Docker sürümlerini kaldır
    run_command "apt remove -y docker docker-engine docker.io containerd runc" "Eski Docker sürümleri kaldırıldı" 1 1
    
    # Docker GPG anahtarını ekle
    run_command "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg" "Docker GPG anahtarı eklendi"
    
    # Docker repository'sini ekle
    run_command "echo 'deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable' | tee /etc/apt/sources.list.d/docker.list > /dev/null" "Docker repository eklendi"
    
    # Paket listesini güncelle
    run_command "apt update" "Paket listesi güncellendi"
    
    # Docker'ı yükle
    run_command "apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Docker yüklendi"
    
    # Docker servisini başlat ve etkinleştir
    run_command "systemctl enable docker" "Docker servisi etkinleştirildi"
    run_command "systemctl start docker" "Docker servisi başlatıldı"
    
    # Docker Compose kurulumu
    run_command "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose" "Docker Compose indirildi"
    run_command "chmod +x /usr/local/bin/docker-compose" "Docker Compose çalıştırılabilir yapıldı"
    
    # Docker kullanıcı grubuna ekle
    if [[ -n "${SUDO_USER:-}" ]]; then
        run_command "usermod -aG docker $SUDO_USER" "Kullanıcı Docker grubuna eklendi"
    fi
    
    # Docker test
    run_command "docker --version" "Docker sürümü kontrol edildi"
    run_command "docker-compose --version" "Docker Compose sürümü kontrol edildi"
    
    log "Docker Engine kurulumu tamamlandı"
}

setup_project_directory() {
    update_progress "Proje dizini hazırlanıyor..."
    
    run_command "mkdir -p $INSTALL_DIR" "Ana dizin oluşturuldu"
    run_command "cd $INSTALL_DIR" "Ana dizine geçildi"
    
    # Git repository'yi clone et
    if [[ -d ".git" ]]; then
        run_command "git pull origin $GIT_BRANCH" "Proje güncellendi"
    else
        run_command "git clone -b $GIT_BRANCH $GIT_REPO ." "Proje indirildi"
    fi
    
    # Gerekli dizinleri oluştur
    run_command "mkdir -p data/postgres data/redis logs backups ssl uploads nginx/ssl nginx/logs monitoring" "Veri dizinleri oluşturuldu"
    
    # İzinleri ayarla
    if [[ -n "${SUDO_USER:-}" ]]; then
        run_command "chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR" "Dizin sahipliği ayarlandı"
    fi
    run_command "chmod -R 755 $INSTALL_DIR" "Dizin izinleri ayarlandı"
    
    log "Proje dizini hazırlandı: $INSTALL_DIR"
}

create_environment_files() {
    update_progress "Environment dosyaları oluşturuluyor..."
    
    local env_file="$INSTALL_DIR/.env"
    local frontend_env="$INSTALL_DIR/frontend/.env.local"
    
    # Ana .env dosyası
    cat > "$env_file" << EOF
# Oto Parça Panel - Hetzner Production Environment
# Otomatik oluşturuldu: $(date)

# Domain Configuration
DOMAIN_NAME=${DOMAIN_NAME}
SSL_EMAIL=${SSL_EMAIL}

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

# Grafana
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# Node Environment
NODE_ENV=production

# WooCommerce (isteğe bağlı)
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=

# Hetzner Optimizations
HETZNER_SERVER_TYPE=$HETZNER_SERVER_TYPE
TOTAL_RAM=${TOTAL_RAM}
CPU_CORES=${CPU_CORES}
EOF

    # Frontend .env.local dosyası
    mkdir -p "$INSTALL_DIR/frontend"
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

setup_firewall() {
    update_progress "Firewall ayarları yapılıyor..."
    
    # UFW varsayılan kurallar
    run_command "ufw default deny incoming" "Gelen bağlantılar varsayılan olarak engellendi"
    run_command "ufw default allow outgoing" "Giden bağlantılar varsayılan olarak izin verildi"
    
    # SSH portu (Hetzner default: 22)
    run_command "ufw allow ssh" "SSH portu açıldı"
    
    # Web portları
    run_command "ufw allow 80" "HTTP portu açıldı"
    run_command "ufw allow 443" "HTTPS portu açıldı"
    
    # Monitoring portları (opsiyonel)
    run_command "ufw allow 3002" "Grafana portu açıldı"
    run_command "ufw allow 9090" "Prometheus portu açıldı"
    
    # UFW'yi etkinleştir
    run_command "ufw --force enable" "Firewall etkinleştirildi"
    
    log "Firewall ayarları tamamlandı"
}

install_ssl_certificates() {
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        update_progress "Let's Encrypt SSL kurulumu yapılıyor..."
        
        # Certbot kurulumu
        run_command "apt install -y certbot python3-certbot-nginx" "Certbot yüklendi"
        
        # Nginx kurulumu (sertifika için gerekli)
        run_command "apt install -y nginx" "Nginx yüklendi"
        run_command "systemctl enable nginx" "Nginx servisi etkinleştirildi"
        run_command "systemctl start nginx" "Nginx servisi başlatıldı"
        
        # SSL sertifikası al
        info "Let's Encrypt sertifikası alınıyor: $DOMAIN_NAME"
        run_command "certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $SSL_EMAIL --redirect" "Let's Encrypt SSL sertifikası alındı"
        
        # Otomatik yenileme
        run_command "systemctl enable certbot.timer" "SSL otomatik yenileme etkinleştirildi"
        
        log "Let's Encrypt SSL kurulumu tamamlandı"
    else
        update_progress "Self-signed SSL sertifikası oluşturuluyor..."
        
        # Self-signed sertifika oluştur
        run_command "mkdir -p $INSTALL_DIR/nginx/ssl" "SSL dizini oluşturuldu"
        run_command "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $INSTALL_DIR/nginx/ssl/nginx-selfsigned.key -out $INSTALL_DIR/nginx/ssl/nginx-selfsigned.crt -subj '/C=TR/ST=Istanbul/L=Istanbul/O=OtoParcaPanel/CN=localhost'" "Self-signed SSL sertifikası oluşturuldu"
        
        log "Self-signed SSL kurulumu tamamlandı"
    fi
}

optimize_docker_compose() {
    update_progress "Docker Compose Hetzner için optimize ediliyor..."
    
    cd "$INSTALL_DIR"
    
    # Hetzner server tipine göre resource limitleri ayarla
    local backend_memory="1G"
    local backend_cpu="0.5"
    local frontend_memory="1G" 
    local frontend_cpu="0.5"
    local postgres_memory="1G"
    local postgres_cpu="0.5"
    
    if [[ $TOTAL_RAM -ge 7500 ]]; then
        # CX31 veya üzeri
        backend_memory="2G"
        backend_cpu="1.0"
        frontend_memory="2G"
        frontend_cpu="1.0"
        postgres_memory="2G"
        postgres_cpu="1.0"
    elif [[ $TOTAL_RAM -ge 3500 ]]; then
        # CX21
        backend_memory="1G"
        backend_cpu="0.5"
        frontend_memory="1G"
        frontend_cpu="0.5"
        postgres_memory="1.5G"
        postgres_cpu="0.5"
    fi
    
    # Docker Compose dosyasını güncelle
    sed -i "s/memory: 1G/memory: $backend_memory/g" docker-compose.yml
    sed -i "s/cpus: '0.5'/cpus: '$backend_cpu'/g" docker-compose.yml
    
    log "Docker Compose Hetzner için optimize edildi"
}

create_nginx_config() {
    update_progress "Nginx konfigürasyonu oluşturuluyor..."
    
    local nginx_config="$INSTALL_DIR/nginx/nginx.conf"
    local domain_name="${DOMAIN_NAME:-localhost}"
    
    # Ana nginx konfigürasyonu
    cat > "$nginx_config" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Upstream definitions
    upstream backend {
        server backend:3001;
        keepalive 32;
    }
    
    upstream frontend {
        server frontend:3000;
        keepalive 32;
    }
    
    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
}
EOF

    # Site konfigürasyonu
    local site_config="$INSTALL_DIR/nginx/conf.d/default.conf"
    mkdir -p "$INSTALL_DIR/nginx/conf.d"
    
    cat > "$site_config" << EOF
server {
    listen 80;
    server_name $domain_name;
    
    # HTTPS yönlendirmesi
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain_name;
    
    # SSL sertifikaları
EOF

    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        cat >> "$site_config" << EOF
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
EOF
    else
        cat >> "$site_config" << EOF
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
EOF
    fi

    cat >> "$site_config" << 'EOF'
    
    # SSL ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Authentication endpoints with stricter rate limiting
    location ~ ^/api/auth/(login|register) {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    # Frontend
    location @frontend {
        proxy_pass http://frontend;
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

    log "Nginx konfigürasyonu oluşturuldu"
}

build_and_start_services() {
    update_progress "Docker servisleri build ediliyor ve başlatılıyor..."
    
    cd "$INSTALL_DIR"
    
    # Environment dosyasını yükle
    run_command "docker-compose --env-file .env build" "Docker images build edildi"
    
    # Servisleri başlat
    run_command "docker-compose up -d" "Docker servisleri başlatıldı"
    
    # Servislerin başlamasını bekle
    info "Servislerin başlaması bekleniyor..."
    sleep 30
    
    log "Docker servisleri başlatıldı"
}

setup_monitoring() {
    update_progress "Monitoring servisleri kuruluyor..."
    
    cd "$INSTALL_DIR"
    
    # Monitoring servislerini başlat
    run_command "docker-compose --profile monitoring up -d" "Monitoring servisleri başlatıldı"
    
    log "Monitoring kurulumu tamamlandı"
    info "Grafana: https://$DOMAIN_NAME:3002 (admin / $GRAFANA_PASSWORD)"
    info "Prometheus: https://$DOMAIN_NAME:9090"
}

run_final_health_checks() {
    update_progress "Final sistem sağlık kontrolleri yapılıyor..."
    
    cd "$INSTALL_DIR"
    
    local checks_passed=0
    local total_checks=7
    
    # Docker servisleri kontrolü
    if docker-compose ps | grep -q "Up"; then
        log "✓ Docker servisleri çalışıyor"
        ((checks_passed++))
    else
        warn "✗ Docker servisleri sorunlu"
    fi
    
    # Port kontrolleri
    for port in 80 443 3000 3001 5432 6379; do
        if ss -tlnp | grep -q ":$port "; then
            log "✓ Port $port açık"
            ((checks_passed++))
        else
            warn "✗ Port $port kapalı"
        fi
    done
    
    # SSL sertifika kontrolü
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        if [[ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]]; then
            log "✓ SSL sertifikası mevcut"
            ((checks_passed++))
        else
            warn "✗ SSL sertifikası bulunamadı"
        fi
    else
        if [[ -f "$INSTALL_DIR/nginx/ssl/nginx-selfsigned.crt" ]]; then
            log "✓ Self-signed SSL sertifikası mevcut"
            ((checks_passed++))
        else
            warn "✗ Self-signed SSL sertifikası bulunamadı"
        fi
    fi
    
    # HTTP/HTTPS test
    info "Web sitesi erişim testi yapılıyor..."
    if curl -k -s "https://${DOMAIN_NAME:-localhost}/health" | grep -q "healthy"; then
        log "✓ Web sitesi erişilebilir"
        ((checks_passed++))
    else
        warn "✗ Web sitesi erişim sorunu"
    fi
    
    # Sonuç
    echo ""
    if [[ $checks_passed -ge 6 ]]; then
        success "Sistem sağlık kontrolleri başarılı ($checks_passed/$total_checks)"
    else
        warn "Bazı sistem kontrolleri başarısız ($checks_passed/$total_checks)"
        warn "Logları kontrol edin: docker-compose logs"
    fi
}

# =============================================================================
# MAIN INSTALLATION FLOW
# =============================================================================

main() {
    # Banner göster
    show_banner
    
    # Parametreleri parse et
    case "${1:-}" in
        "--help"|"-h"|"help")
            show_usage
            exit 0
            ;;
        "")
            # Interaktif mod
            ;;
        *)
            DOMAIN_NAME="$1"
            USE_LETSENCRYPT=true
            ;;
    esac
    
    # Log dosyasını başlat
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Hetzner Docker kurulum başlatıldı - Sürüm $SCRIPT_VERSION" > "$LOG_FILE"
    
    # Kurulum adımları
    check_system_requirements
    detect_hetzner_environment
    get_domain_input
    
    echo ""
    echo -e "${WHITE}📋 Kurulum Özeti:${NC}"
    echo -e "${CYAN}• Domain: ${DOMAIN_NAME}${NC}"
    echo -e "${CYAN}• SSL: ${USE_LETSENCRYPT:+"Let's Encrypt"}${USE_LETSENCRYPT:-"Self-signed"}${NC}"
    echo -e "${CYAN}• Server: $HETZNER_SERVER_TYPE${NC}"
    echo -e "${CYAN}• Kurulum Dizini: $INSTALL_DIR${NC}"
    echo ""
    
    read -p "$(echo -e "${GREEN}Kuruluma başlansın mı? (y/n): ${NC}")" -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Kurulum iptal edildi."
        exit 1
    fi
    
    echo ""
    info "🚀 Kurulum başlatılıyor..."
    echo ""
    
    # Ana kurulum adımları
    generate_secure_passwords
    update_system_packages
    install_docker_engine
    setup_project_directory
    create_environment_files
    setup_firewall
    install_ssl_certificates
    optimize_docker_compose
    create_nginx_config
    build_and_start_services
    setup_monitoring
    run_final_health_checks
    
    # Kurulum süresi
    local install_end_time=$(date +%s)
    local install_duration=$((install_end_time - INSTALL_START_TIME))
    local install_minutes=$((install_duration / 60))
    local install_seconds=$((install_duration % 60))
    
    # Başarı mesajı
    echo ""
    echo ""
    success "🎉 HETZNER DOCKER KURULUMU TAMAMLANDI!"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                           KURULUM BAŞARILI                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}⏱️ Kurulum Süresi: ${install_minutes}m ${install_seconds}s${NC}"
    echo -e "${WHITE}🏢 Hetzner Server: $HETZNER_SERVER_TYPE${NC}"
    echo -e "${WHITE}📁 Kurulum Dizini: $INSTALL_DIR${NC}"
    echo ""
    echo -e "${WHITE}🌐 Erişim Bilgileri:${NC}"
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        echo -e "${CYAN}• Ana Site: https://$DOMAIN_NAME${NC}"
        echo -e "${CYAN}• API: https://$DOMAIN_NAME/api${NC}"
        echo -e "${CYAN}• Grafana: https://$DOMAIN_NAME:3002${NC}"
        echo -e "${CYAN}• Prometheus: https://$DOMAIN_NAME:9090${NC}"
    else
        local server_ip=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")
        echo -e "${CYAN}• Ana Site: https://$server_ip (Self-signed SSL)${NC}"
        echo -e "${CYAN}• API: https://$server_ip/api${NC}"
        echo -e "${CYAN}• Grafana: https://$server_ip:3002${NC}"
        echo -e "${CYAN}• Prometheus: https://$server_ip:9090${NC}"
    fi
    echo ""
    echo -e "${WHITE}🔐 Giriş Bilgileri:${NC}"
    echo -e "${CYAN}• Grafana: admin / $GRAFANA_PASSWORD${NC}"
    echo ""
    echo -e "${WHITE}🔧 Yönetim Komutları:${NC}"
    echo -e "${CYAN}• Servisleri durdur: cd $INSTALL_DIR && docker-compose down${NC}"
    echo -e "${CYAN}• Servisleri başlat: cd $INSTALL_DIR && docker-compose up -d${NC}"
    echo -e "${CYAN}• Logları görüntüle: cd $INSTALL_DIR && docker-compose logs -f${NC}"
    echo -e "${CYAN}• Sistem durumu: cd $INSTALL_DIR && docker-compose ps${NC}"
    echo ""
    echo -e "${WHITE}📋 Önemli Dosyalar:${NC}"
    echo -e "${CYAN}• Environment: $INSTALL_DIR/.env${NC}"
    echo -e "${CYAN}• Nginx Config: $INSTALL_DIR/nginx/nginx.conf${NC}"
    echo -e "${CYAN}• Log Dosyası: $LOG_FILE${NC}"
    echo ""
    echo -e "${YELLOW}📌 Kurulum Sonrası Notlar:${NC}"
    echo -e "${WHITE}• Şifreler güvenli bir şekilde .env dosyasında saklanmıştır${NC}"
    echo -e "${WHITE}• Firewall (UFW) etkinleştirilmiştir${NC}"
    echo -e "${WHITE}• SSL sertifikası ${USE_LETSENCRYPT:+"otomatik olarak yenilenecektir"}${USE_LETSENCRYPT:-"365 gün geçerlidir"}${NC}"
    echo -e "${WHITE}• Docker servisleri otomatik başlayacak şekilde ayarlanmıştır${NC}"
    echo -e "${WHITE}• Monitoring servisleri çalışmaktadır${NC}"
    echo ""
    
    if [[ "$DOMAIN_NAME" == "localhost" ]]; then
        echo -e "${YELLOW}⚠️ Self-signed SSL kullanıldığı için tarayıcıda güvenlik uyarısı alabilirsiniz${NC}"
        echo -e "${WHITE}💡 Production kullanımı için gerçek bir domain ile Let's Encrypt kurulumu yapmanız önerilir${NC}"
        echo ""
    fi
    
    log "Hetzner Docker kurulumu başarıyla tamamlandı - Süre: ${install_minutes}m ${install_seconds}s"
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
