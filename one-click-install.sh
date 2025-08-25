#!/bin/bash

# Oto Parça Panel - One-Click Installation Script
# Sıfır temiz sunucuya tek komutla tam kurulum
# Ubuntu 20.04+ / Debian 11+ için optimize edilmiştir

set -e  # Hata durumunda scripti durdur

# =============================================================================
# RENKLI OUTPUT VE PROGRESS BAR
# =============================================================================

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Progress bar fonksiyonu
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[%3d%%]${NC} [" "$percent"
    printf "%*s" "$filled" | tr ' ' '█'
    printf "%*s" "$empty" | tr ' ' '░'
    printf "] ${WHITE}%s${NC}" "$message"
}

# Log fonksiyonları
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 $1${NC}"
}

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================

DOMAIN_NAME=""
SSL_EMAIL=""
INSTALL_DIR="/opt/oto-parca-panel"
LOG_FILE="/var/log/oto-parca-install.log"
TOTAL_STEPS=15
CURRENT_STEP=0

# Güçlü şifreler
POSTGRES_PASSWORD=""
JWT_SECRET=""
NEXTAUTH_SECRET=""

# =============================================================================
# USAGE FUNCTION
# =============================================================================

# Kullanım bilgilerini göster
show_usage() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    OTO PARÇA PANEL                           ║${NC}"
    echo -e "${PURPLE}║              One-Click Installation Script                   ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}🚀 OtoParcaPanel Kurulum Aracı${NC}"
    echo ""
    echo -e "${CYAN}Kullanım:${NC}"
    echo -e "  ${WHITE}sudo ./one-click-install.sh${NC}                    # Self-signed SSL ile kurulum"
    echo -e "  ${WHITE}sudo ./one-click-install.sh example.com${NC}        # Ana domain ile Let's Encrypt"
    echo -e "  ${WHITE}sudo ./one-click-install.sh www.example.com${NC}    # WWW subdomain ile Let's Encrypt"
    echo -e "  ${WHITE}sudo ./one-click-install.sh api.example.com${NC}    # API subdomain ile Let's Encrypt"
    echo -e "  ${WHITE}sudo ./one-click-install.sh app.example.com${NC}    # APP subdomain ile Let's Encrypt"
    echo -e "  ${WHITE}sudo ./one-click-install.sh panel.example.com${NC}  # Panel subdomain ile Let's Encrypt"
    echo ""
    echo -e "${CYAN}SSL Sertifika Seçenekleri:${NC}"
    echo -e "  ${GREEN}✅ Let's Encrypt${NC}  - Ücretsiz, otomatik yenilenen, güvenilir SSL"
    echo -e "  ${YELLOW}⚠️  Self-signed${NC}   - Geliştirme ortamı için, tarayıcı uyarısı verir"
    echo ""
    echo -e "${CYAN}Örnekler:${NC}"
    echo -e "  ${WHITE}sudo ./one-click-install.sh otoparca.com${NC}       # Ana domain kurulumu"
    echo -e "  ${WHITE}sudo ./one-click-install.sh panel.otoparca.com${NC} # Panel subdomain kurulumu"
    echo -e "  ${WHITE}sudo ./one-click-install.sh api.otoparca.com${NC}   # API subdomain kurulumu"
    echo ""
    echo -e "${CYAN}Gereksinimler:${NC}"
    echo -e "  ${WHITE}• Ubuntu 20.04+ veya Debian 11+${NC}"
    echo -e "  ${WHITE}• En az 4GB RAM${NC}"
    echo -e "  ${WHITE}• En az 20GB disk alanı${NC}"
    echo -e "  ${WHITE}• Root erişimi (sudo)${NC}"
    echo -e "  ${WHITE}• Domain DNS kaydı (Let's Encrypt için)${NC}"
    echo ""
    echo -e "${CYAN}Not:${NC}"
    echo -e "  ${WHITE}• Let's Encrypt için domain'in DNS kaydı sunucuya yönlendirilmiş olmalıdır${NC}"
    echo -e "  ${WHITE}• Subdomain kullanımında sadece belirtilen subdomain için sertifika alınır${NC}"
    echo -e "  ${WHITE}• Ana domain kullanımında hem ana domain hem www için sertifika alınır${NC}"
    echo ""
}

# Help parametresi kontrolü
if [[ "$1" == "help" || "$1" == "--help" || "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

# =============================================================================
# DOMAIN PARAMETER HANDLING
# =============================================================================

# Domain parametresi kontrolü
if [[ -n "$1" ]]; then
    DOMAIN_NAME="$1"
    info "🌐 Domain parametresi alındı: $DOMAIN_NAME"
    info "🔒 Let's Encrypt SSL kurulumu yapılacak"
    
    # Domain format kontrolü
    if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
        error "❌ Geçersiz domain formatı: $DOMAIN_NAME"
        error "💡 Örnekler: example.com, sub.example.com"
        exit 1
    fi
    
    # SSL email otomatik ayarla
    SSL_EMAIL="admin@$DOMAIN_NAME"
    info "📧 SSL Email: $SSL_EMAIL"
else
    info "⚠️  Domain parametresi belirtilmedi"
    info "💡 Let's Encrypt kullanımı için: sudo ./one-click-install.sh domain.com"
    info "🔒 Self-signed SSL sertifikası kullanılacak"
fi

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Progress güncellemesi
update_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "$1"
    echo "" # Yeni satır
}

# Komut çalıştırma ve log tutma (retry mekanizması ile)
run_command() {
    local cmd="$1"
    local description="$2"
    local max_retries=${3:-1}
    local retry_delay=${4:-2}
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running: $cmd" >> "$LOG_FILE"
    
    for ((i=1; i<=max_retries; i++)); do
        if eval "$cmd" >> "$LOG_FILE" 2>&1; then
            log "$description"
            return 0
        else
            if [[ $i -lt $max_retries ]]; then
                warn "$description failed (attempt $i/$max_retries). Retrying in ${retry_delay}s..."
                sleep $retry_delay
            else
                error "$description failed after $max_retries attempts. Check $LOG_FILE for details."
                return 1
            fi
        fi
    done
}

# Güvenli komut çalıştırma (hata durumunda devam eder)
run_command_safe() {
    local cmd="$1"
    local description="$2"
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running (safe): $cmd" >> "$LOG_FILE"
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        log "$description"
        return 0
    else
        warn "$description failed but continuing..."
        return 1
    fi
}

# Servis durumu kontrolü
check_service() {
    local service=$1
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
    local port=$1
    if netstat -tlnp | grep ":$port " > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# SYSTEM CHECKS
# =============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Bu script root kullanıcısı ile çalıştırılmalıdır. 'sudo bash one-click-install.sh' kullanın."
    fi
}

check_os() {
    if ! command -v apt &> /dev/null; then
        error "Bu script sadece Ubuntu/Debian sistemlerde çalışır."
    fi
    
    # OS version kontrolü
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        info "İşletim Sistemi: $PRETTY_NAME"
    fi
}

check_system_requirements() {
    update_progress "Sistem gereksinimleri kontrol ediliyor..."
    
    # RAM kontrolü
    local total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$total_mem" -lt 3500 ]; then
        warn "Sistem RAM'i 4GB'dan az ($total_mem MB). Performans sorunları yaşayabilirsiniz."
    fi
    
    # Disk kontrolü
    local available_disk=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$available_disk" -lt 15 ]; then
        warn "Kullanılabilir disk alanı 20GB'dan az ($available_disk GB). Disk alanı yetersiz olabilir."
    fi
    
    log "Sistem gereksinimleri kontrol edildi"
}

# =============================================================================
# USER INPUT
# =============================================================================

get_user_input() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    OTO PARÇA PANEL                           ║${NC}"
    echo -e "${PURPLE}║              One-Click Installation Script                   ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Domain parametresi varsa kullanıcıdan tekrar sorma
    if [[ -z "$DOMAIN_NAME" ]]; then
        # Domain adı al
        while true; do
            read -p "$(echo -e "${CYAN}Domain adınızı girin (örn: otoparca.example.com): ${NC}")" DOMAIN_NAME
            
            if [[ -z "$DOMAIN_NAME" ]]; then
                warn "Domain adı boş olamaz!"
                continue
            fi
            
            # Domain format kontrolü
            if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
                warn "Geçersiz domain formatı! Örnekler: example.com, sub.example.com"
                continue
            fi
            
            break
        done
        
        # Email adı al
        read -p "$(echo -e "${CYAN}SSL sertifikası için email adresinizi girin (varsayılan: admin@$DOMAIN_NAME): ${NC}")" SSL_EMAIL
        SSL_EMAIL=${SSL_EMAIL:-"admin@$DOMAIN_NAME"}
    fi
    
    # Onay al
    echo ""
    info "Kurulum bilgileri:"
    echo -e "${WHITE}Domain: $DOMAIN_NAME${NC}"
    echo -e "${WHITE}SSL Email: $SSL_EMAIL${NC}"
    if [[ -n "$DOMAIN_NAME" ]]; then
        echo -e "${WHITE}SSL Türü: Let's Encrypt (Ücretsiz)${NC}"
    else
        echo -e "${WHITE}SSL Türü: Self-Signed (Geliştirme)${NC}"
    fi
    echo ""
    
    read -p "$(echo -e "${YELLOW}Bu bilgiler ile kuruluma devam edilsin mi? (y/n): ${NC}")" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Kurulum iptal edildi."
        exit 1
    fi
    
    log "Kullanıcı girişleri onaylandı"
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

generate_passwords() {
    update_progress "Güvenli şifreler oluşturuluyor..."
    
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    log "Güvenli şifreler oluşturuldu"
}

update_system() {
    update_progress "Sistem güncelleniyor..."
    
    run_command "apt update" "Paket listesi güncellendi"
    run_command "apt upgrade -y" "Sistem paketleri güncellendi"
    run_command "apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release bc netstat-nat" "Temel paketler yüklendi"
}

install_docker() {
    update_progress "Docker kurulumu yapılıyor..."
    
    # Eski Docker sürümlerini kaldır
    run_command "apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true" "Eski Docker sürümleri kaldırıldı"
    
    # Docker GPG anahtarını ekle
    run_command "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg" "Docker GPG anahtarı eklendi"
    
    # Docker repository'sini ekle
    run_command "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable' | tee /etc/apt/sources.list.d/docker.list > /dev/null" "Docker repository eklendi"
    
    # Docker'ı yükle
    run_command "apt update" "Paket listesi güncellendi"
    run_command "apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Docker yüklendi"
    
    # Docker servisini başlat
    run_command "systemctl enable docker" "Docker servisi etkinleştirildi"
    run_command "systemctl start docker" "Docker servisi başlatıldı"
    
    # Docker Compose kurulumu
    run_command "curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose" "Docker Compose indirildi"
    run_command "chmod +x /usr/local/bin/docker-compose" "Docker Compose çalıştırılabilir yapıldı"
    
    # Docker kullanıcı grubuna ekle
    if [[ -n "$SUDO_USER" ]]; then
        run_command "usermod -aG docker $SUDO_USER" "Kullanıcı Docker grubuna eklendi"
    fi
}

install_nodejs() {
    update_progress "Node.js kurulumu yapılıyor..."
    
    # NodeSource repository'sini ekle
    run_command "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" "NodeSource repository eklendi"
    run_command "apt-get install -y nodejs" "Node.js yüklendi"
    
    # PM2 kurulumu
    run_command "npm install -g pm2" "PM2 yüklendi"
    
    # Node.js version kontrolü
    local node_version=$(node --version)
    log "Node.js $node_version kuruldu"
}

install_postgresql() {
    update_progress "PostgreSQL kurulumu yapılıyor..."
    
    # PostgreSQL kurulumunu kontrol et
    if command -v psql >/dev/null 2>&1; then
        info "PostgreSQL zaten kurulu, sürüm kontrolü yapılıyor..."
        local pg_version=$(sudo -u postgres psql --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)
        if [[ -n "$pg_version" ]]; then
            info "PostgreSQL $pg_version tespit edildi"
        fi
    else
        run_command "apt update" "Paket listesi güncellendi"
        run_command "apt install -y postgresql postgresql-contrib" "PostgreSQL yüklendi"
    fi
    
    # PostgreSQL servisini başlat ve kontrol et
    run_command "systemctl enable postgresql" "PostgreSQL servisi etkinleştirildi"
    run_command "systemctl start postgresql" "PostgreSQL servisi başlatıldı"
    
    # PostgreSQL servisinin tam olarak başlamasını bekle
    info "PostgreSQL servisinin hazır olması bekleniyor..."
    local max_wait=30
    local wait_count=0
    
    while ! sudo -u postgres pg_isready >/dev/null 2>&1; do
        if [[ $wait_count -ge $max_wait ]]; then
            error "PostgreSQL servisi $max_wait saniye içinde hazır olmadı"
            return 1
        fi
        sleep 1
        ((wait_count++))
    done
    
    success "PostgreSQL servisi hazır (${wait_count}s)"
    
    # Veritabanı oluşturma işlemini çağır
    create_database
}

# Gelişmiş veritabanı oluşturma fonksiyonu
create_database() {
    update_progress "Veritabanı ve kullanıcı oluşturuluyor..."
    
    # PostgreSQL bağlantısını test et
    if ! sudo -u postgres pg_isready >/dev/null 2>&1; then
        error "PostgreSQL servisi hazır değil"
        return 1
    fi
    
    # Mevcut veritabanını kontrol et
    local db_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='oto_parca_panel'" 2>/dev/null || echo "")
    local user_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='oto_user'" 2>/dev/null || echo "")
    
    # Kullanıcı oluştur (eğer yoksa)
    if [[ "$user_exists" != "1" ]]; then
        info "Veritabanı kullanıcısı oluşturuluyor..."
        if sudo -u postgres psql -c "CREATE USER oto_user WITH PASSWORD '$POSTGRES_PASSWORD';" >> "$LOG_FILE" 2>&1; then
            success "✅ Veritabanı kullanıcısı oluşturuldu"
        else
            error "❌ Veritabanı kullanıcısı oluşturulamadı"
            log "PostgreSQL kullanıcı oluşturma hatası - detaylar log dosyasında"
            return 1
        fi
    else
        info "Veritabanı kullanıcısı zaten mevcut"
        # Şifreyi güncelle
        if sudo -u postgres psql -c "ALTER USER oto_user WITH PASSWORD '$POSTGRES_PASSWORD';" >> "$LOG_FILE" 2>&1; then
            info "Kullanıcı şifresi güncellendi"
        fi
    fi
    
    # Veritabanı oluştur (eğer yoksa)
    if [[ "$db_exists" != "1" ]]; then
        info "Veritabanı oluşturuluyor..."
        if sudo -u postgres psql -c "CREATE DATABASE oto_parca_panel OWNER oto_user;" >> "$LOG_FILE" 2>&1; then
            success "✅ Veritabanı oluşturuldu"
        else
            error "❌ Veritabanı oluşturulamadı"
            log "PostgreSQL veritabanı oluşturma hatası - detaylar log dosyasında"
            return 1
        fi
    else
        info "Veritabanı zaten mevcut"
    fi
    
    # İzinleri ver
    info "Veritabanı izinleri ayarlanıyor..."
    if sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;" >> "$LOG_FILE" 2>&1; then
        success "✅ Veritabanı izinleri verildi"
    else
        warn "⚠️  İzin verme işleminde sorun olabilir"
    fi
    
    # Bağlantı testi
    info "Veritabanı bağlantısı test ediliyor..."
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT version();" >> "$LOG_FILE" 2>&1; then
        success "✅ Veritabanı bağlantısı başarılı"
        unset PGPASSWORD
        return 0
    else
        error "❌ Veritabanı bağlantısı başarısız"
        warn "Authentication ayarları kontrol ediliyor..."
        
        # pg_hba.conf ayarlarını kontrol et ve düzelt
        configure_postgresql_auth
        
        # Tekrar test et
        if psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT version();" >> "$LOG_FILE" 2>&1; then
            success "✅ Veritabanı bağlantısı düzeltildi"
            unset PGPASSWORD
            return 0
        else
            error "❌ Veritabanı bağlantısı hala başarısız"
            unset PGPASSWORD
            return 1
        fi
    fi
}

# PostgreSQL authentication ayarları
configure_postgresql_auth() {
    info "PostgreSQL authentication ayarları yapılıyor..."
    
    # PostgreSQL sürümünü tespit et
    local pg_version=$(sudo -u postgres psql -tAc "SELECT version()" | grep -oP 'PostgreSQL \K[0-9]+\.[0-9]+' | head -1)
    local pg_config_dir="/etc/postgresql/$pg_version/main"
    
    if [[ ! -d "$pg_config_dir" ]]; then
        # Alternatif yolları dene
        for dir in /etc/postgresql/*/main; do
            if [[ -d "$dir" ]]; then
                pg_config_dir="$dir"
                break
            fi
        done
    fi
    
    if [[ ! -d "$pg_config_dir" ]]; then
        warn "PostgreSQL konfigürasyon dizini bulunamadı"
        return 1
    fi
    
    local pg_hba_conf="$pg_config_dir/pg_hba.conf"
    
    if [[ -f "$pg_hba_conf" ]]; then
        # Backup oluştur
        cp "$pg_hba_conf" "$pg_hba_conf.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Local bağlantılar için md5 authentication ekle
        if ! grep -q "local.*oto_user.*md5" "$pg_hba_conf"; then
            # oto_user için özel kural ekle
            sed -i '/^local.*all.*all.*peer/i local   oto_parca_panel oto_user                               md5' "$pg_hba_conf"
            info "pg_hba.conf güncellendi"
            
            # PostgreSQL'i yeniden başlat
            run_command "systemctl reload postgresql" "PostgreSQL konfigürasyonu yeniden yüklendi"
            
            # Servisin hazır olmasını bekle
            sleep 3
            
            return 0
        else
            info "pg_hba.conf zaten uygun şekilde yapılandırılmış"
            return 0
        fi
    else
        warn "pg_hba.conf dosyası bulunamadı: $pg_hba_conf"
        return 1
    fi
}

install_nginx() {
    update_progress "Nginx kurulumu yapılıyor..."
    
    # Port çakışmalarını kontrol et ve çöz
    resolve_port_conflicts
    
    run_command "apt install -y nginx" "Nginx yüklendi"
    
    # Nginx servisini başlat
    run_command "systemctl enable nginx" "Nginx servisi etkinleştirildi"
    
    # Nginx konfigürasyonunu oluştur
    create_nginx_config
    
    # Nginx'i test et ve başlat
    if nginx -t >> "$LOG_FILE" 2>&1; then
        run_command "systemctl start nginx" "Nginx servisi başlatıldı"
    else
        warn "Nginx konfigürasyon hatası tespit edildi. HTTP-only modda başlatılıyor."
        create_nginx_http_config
        run_command "systemctl start nginx" "Nginx servisi HTTP modda başlatıldı"
    fi
}

resolve_port_conflicts() {
    info "Port çakışmaları kontrol ediliyor..."
    
    # Port 80 kontrolü
    if check_port 80; then
        local process=$(netstat -tlnp | grep ":80 " | awk '{print $7}' | cut -d'/' -f2 | head -1)
        warn "Port 80 kullanımda: $process"
        
        if [[ "$process" == "apache2" ]]; then
            run_command "systemctl stop apache2" "Apache2 durduruldu"
            run_command "systemctl disable apache2" "Apache2 devre dışı bırakıldı"
        fi
    fi
    
    # Port 443 kontrolü
    if check_port 443; then
        local process=$(netstat -tlnp | grep ":443 " | awk '{print $7}' | cut -d'/' -f2 | head -1)
        warn "Port 443 kullanımda: $process"
    fi
}

setup_firewall() {
    update_progress "Firewall ayarları yapılıyor..."
    
    run_command "apt install -y ufw" "UFW yüklendi"
    
    # Varsayılan kurallar
    run_command "ufw default deny incoming" "Gelen bağlantılar varsayılan olarak reddedildi"
    run_command "ufw default allow outgoing" "Giden bağlantılar varsayılan olarak izin verildi"
    
    # Gerekli portları aç
    run_command "ufw allow ssh" "SSH portu açıldı"
    run_command "ufw allow 'Nginx Full'" "Nginx portları açıldı"
    
    # UFW'yi etkinleştir
    run_command "ufw --force enable" "Firewall etkinleştirildi"
}

# Akıllı proje tespit fonksiyonu
find_project_directory() {
    local current_pwd="$(pwd)"
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Temel arama yolları
    local search_paths=(
        "$current_pwd"
        "$script_dir"
        "/root/OtoParcaPanel"
        "$HOME/OtoParcaPanel"
        "/opt/OtoParcaPanel"
        "/home/$SUDO_USER/OtoParcaPanel"
        "$(dirname "$current_pwd")/OtoParcaPanel"
        "$current_pwd/../OtoParcaPanel"
        "$script_dir/../OtoParcaPanel"
        "/tmp/OtoParcaPanel"
        "/var/tmp/OtoParcaPanel"
    )
    
    info "🔍 Proje dizini aranıyor..."
    info "   Mevcut dizin: $current_pwd"
    info "   Script dizini: $script_dir"
    
    # Önce temel yolları kontrol et
    for path in "${search_paths[@]}"; do
        if [[ -d "$path" ]]; then
            info "   📁 Kontrol ediliyor: $path"
            if [[ -d "$path/frontend" && -d "$path/backend" && -f "$path/docker-compose.yml" ]]; then
                success "   ✅ Proje dosyaları bulundu: $path"
                echo "$path"
                return 0
            else
                local missing_files=()
                [[ ! -d "$path/frontend" ]] && missing_files+=("frontend/")
                [[ ! -d "$path/backend" ]] && missing_files+=("backend/")
                [[ ! -f "$path/docker-compose.yml" ]] && missing_files+=("docker-compose.yml")
                warn "   ❌ Eksik dosyalar ($path): ${missing_files[*]}"
            fi
        else
            info "   📁 Dizin mevcut değil: $path"
        fi
    done
    
    # find komutu ile daha geniş arama
    info "🔍 Sistem genelinde arama yapılıyor..."
    local find_paths=(
        "/root"
        "$HOME"
        "/opt"
        "/tmp"
        "/var"
    )
    
    for base_path in "${find_paths[@]}"; do
        if [[ -d "$base_path" ]]; then
            info "   🔍 $base_path altında aranıyor..."
            local found_dirs
            # find ile OtoParcaPanel dizinlerini ara (maksimum 3 seviye derinlik)
            found_dirs=$(find "$base_path" -maxdepth 3 -type d -name "OtoParcaPanel" 2>/dev/null || true)
            
            if [[ -n "$found_dirs" ]]; then
                while IFS= read -r dir; do
                    if [[ -d "$dir/frontend" && -d "$dir/backend" && -f "$dir/docker-compose.yml" ]]; then
                        success "   ✅ find ile proje bulundu: $dir"
                        echo "$dir"
                        return 0
                    else
                        info "   📁 Eksik dosyalar: $dir"
                    fi
                done <<< "$found_dirs"
            fi
        fi
    done
    
    # Son çare: docker-compose.yml dosyasını ara
    info "🔍 docker-compose.yml dosyası aranıyor..."
    local compose_files
    compose_files=$(find /root /home /opt /tmp -name "docker-compose.yml" -path "*/OtoParcaPanel/*" 2>/dev/null | head -5 || true)
    
    if [[ -n "$compose_files" ]]; then
        while IFS= read -r compose_file; do
            local compose_dir="$(dirname "$compose_file")"
            info "   📦 docker-compose.yml bulundu: $compose_dir"
            if [[ -d "$compose_dir/frontend" && -d "$compose_dir/backend" ]]; then
                success "   ✅ Tam proje bulundu: $compose_dir"
                echo "$compose_dir"
                return 0
            fi
        done <<< "$compose_files"
    fi
    
    warn "❌ Hiçbir konumda tam proje dosyaları bulunamadı"
    return 1
}

setup_project() {
    update_progress "Proje dosyaları hazırlanıyor..."
    
    local current_dir="$(pwd)"
    info "🔍 Çalışma dizini: $current_dir"
    
    # Debug: Mevcut dizindeki dosyaları listele
    info "📁 Mevcut dizin içeriği:"
    if command -v ls >/dev/null 2>&1; then
        ls -la "$current_dir" 2>/dev/null | head -10 || echo "   Dizin listelenemedi"
    fi
    
    # Dosya kontrollerini tek tek yap ve sonuçları göster
    info "🔍 Dosya kontrolleri:"
    [[ -d "$current_dir/frontend" ]] && info "   ✅ frontend/ dizini bulundu" || warn "   ❌ frontend/ dizini bulunamadı"
    [[ -d "$current_dir/backend" ]] && info "   ✅ backend/ dizini bulundu" || warn "   ❌ backend/ dizini bulunamadı"
    [[ -f "$current_dir/frontend/package.json" ]] && info "   ✅ frontend/package.json bulundu" || warn "   ❌ frontend/package.json bulunamadı"
    [[ -f "$current_dir/backend/package.json" ]] && info "   ✅ backend/package.json bulundu" || warn "   ❌ backend/package.json bulunamadı"
    [[ -f "$current_dir/docker-compose.yml" ]] && info "   ✅ docker-compose.yml bulundu" || warn "   ❌ docker-compose.yml bulunamadı"
    [[ -d "$current_dir/scraper" ]] && info "   ✅ scraper/ dizini bulundu" || warn "   ❌ scraper/ dizini bulunamadı (opsiyonel)"
    
    # Temel proje dosyalarının varlığını kontrol et
    if [[ ! -d "$current_dir/frontend" || ! -d "$current_dir/backend" || ! -f "$current_dir/docker-compose.yml" ]]; then
        warn "⚠️  Temel proje dosyaları eksik, alternatif konumlar aranıyor..."
        
        local project_dir
        if project_dir=$(find_project_directory); then
            info "✅ Proje dizini bulundu: $project_dir"
            current_dir="$project_dir"
        else
            error "❌ Proje dosyaları hiçbir konumda bulunamadı!"
            error ""
            error "🔍 Arama Raporu:"
            error "   • Mevcut dizin: $current_dir"
            error "   • Script konumu: $(dirname "${BASH_SOURCE[0]}")"
            error "   • Kullanıcı: ${SUDO_USER:-root}"
            error "   • Ev dizini: $HOME"
            error ""
            error "📁 Mevcut dizin içeriği:"
            if ls -la "$current_dir" 2>/dev/null; then
                echo "   (Yukarıda listelendi)"
            else
                error "   Dizin okunamadı veya boş"
            fi
            error ""
            error "📋 Gerekli dosyalar:"
            error "   ✓ frontend/ (React/Next.js uygulaması)"
            error "   ✓ backend/ (Node.js API sunucusu)"
            error "   ✓ frontend/package.json (Frontend bağımlılıkları)"
            error "   ✓ backend/package.json (Backend bağımlılıkları)"
            error "   ✓ docker-compose.yml (Docker yapılandırması)"
            error "   • scraper/ (Python scraper - opsiyonel)"
            error ""
            error "🔧 Çözüm Adımları:"
            error ""
            error "   📥 ADIM 1: Projeyi İndirin"
            error "      git clone https://github.com/mucahitkayadan/OtoParcaPanel.git"
            error "      # veya ZIP olarak indirin ve çıkarın"
            error ""
            error "   📂 ADIM 2: Proje Dizinine Geçin"
            error "      cd OtoParcaPanel"
            error "      # Dosyaların varlığını kontrol edin:"
            error "      ls -la"
            error ""
            error "   🚀 ADIM 3: Kurulumu Başlatın"
            error "      sudo bash one-click-install.sh"
            error ""
            error "   🔍 ADIM 4: Sorun Devam Ederse"
            error "      # Proje dosyalarını manuel kontrol edin:"
            error "      find /root /home /opt -name 'package.json' -path '*/OtoParcaPanel/*' 2>/dev/null"
            error "      # Veya farklı konumda çalıştırın:"
            error "      cd /path/to/your/OtoParcaPanel"
            error "      sudo bash one-click-install.sh"
            error ""
            error "   📞 Destek:"
            error "      • GitHub: https://github.com/mucahitkayadan/OtoParcaPanel/issues"
            error "      • Bu hata mesajını ve 'ls -la' çıktısını paylaşın"
            error ""
            exit 1
        fi
    fi
    
    # Frontend ve backend package.json kontrolü
    if [[ ! -f "$current_dir/frontend/package.json" || ! -f "$current_dir/backend/package.json" ]]; then
        error "❌ Frontend veya backend package.json dosyaları eksik!"
        error "📋 Kontrol edilen konum: $current_dir"
        [[ ! -f "$current_dir/frontend/package.json" ]] && error "   ❌ frontend/package.json bulunamadı"
        [[ ! -f "$current_dir/backend/package.json" ]] && error "   ❌ backend/package.json bulunamadı"
        error ""
        error "🔧 Çözüm:"
        error "   1. Proje dosyalarının tam olarak indirildiğinden emin olun"
        error "   2. git pull origin main komutu ile güncellemeleri çekin"
        error "   3. frontend/ ve backend/ dizinlerinde package.json dosyalarının varlığını kontrol edin"
        exit 1
    fi
    
    success "✅ Proje dosyaları tespit edildi!"
    info "📁 Bulunan dosyalar:"
    [[ -f "$current_dir/package.json" ]] && info "   ✓ package.json"
    [[ -d "$current_dir/frontend" ]] && info "   ✓ frontend/ dizini"
    [[ -d "$current_dir/backend" ]] && info "   ✓ backend/ dizini"
    [[ -d "$current_dir/scraper" ]] && info "   ✓ scraper/ dizini"
    [[ -f "$current_dir/docker-compose.yml" ]] && info "   ✓ docker-compose.yml"
    [[ -f "$current_dir/one-click-install.sh" ]] && info "   ✓ one-click-install.sh"
    
    # Proje dizinini oluştur
    info "📁 Hedef dizinler oluşturuluyor..."
    run_command "mkdir -p $INSTALL_DIR" "Proje dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/postgres" "PostgreSQL veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/redis" "Redis veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/logs" "Log dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/backups" "Backup dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/ssl" "SSL dizini oluşturuldu"
    
    # Proje dosyalarını kopyala
    info "📋 Proje dosyaları $INSTALL_DIR dizinine kopyalanıyor..."
    info "   Kaynak dizin: $current_dir"
    info "   Hedef dizin: $INSTALL_DIR"
    
    # Dosya boyutunu kontrol et
    local source_size
    if command -v du >/dev/null 2>&1; then
        source_size=$(du -sh "$current_dir" 2>/dev/null | cut -f1 || echo "bilinmiyor")
        info "   Kopyalanacak veri boyutu: $source_size"
    fi
    
    # Ana dosyaları kopyala
    if ! run_command "cp -r $current_dir/* $INSTALL_DIR/" "Proje dosyaları kopyalandı"; then
        error "❌ Dosya kopyalama başarısız!"
        error "   Kaynak: $current_dir"
        error "   Hedef: $INSTALL_DIR"
        exit 1
    fi
    
    # Gizli dosyaları da kopyala (varsa)
    info "🔍 Gizli dosyalar kontrol ediliyor..."
    if ls "$current_dir"/.[^.]* 1> /dev/null 2>&1; then
        info "   Gizli dosyalar bulundu, kopyalanıyor..."
        if ! run_command "cp -r $current_dir/.[^.]* $INSTALL_DIR/" "Gizli dosyalar kopyalandı"; then
            warn "⚠️  Gizli dosyalar kopyalanamadı (normal olabilir)"
        fi
    else
        info "   Gizli dosya bulunamadı"
    fi
    
    # .git dizinini temizle (eğer varsa)
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        info "🧹 Git geçmişi temizleniyor..."
        run_command "rm -rf $INSTALL_DIR/.git" "Git geçmişi temizlendi"
    fi
    
    # Kopyalama doğrulaması
    info "✅ Kopyalama doğrulaması yapılıyor..."
    local verification_failed=false
    
    if [[ ! -d "$INSTALL_DIR/frontend" ]]; then
        error "   ❌ frontend/ dizini kopyalanamadı"
        verification_failed=true
    fi
    
    if [[ ! -d "$INSTALL_DIR/backend" ]]; then
        error "   ❌ backend/ dizini kopyalanamadı"
        verification_failed=true
    fi
    
    if [[ ! -f "$INSTALL_DIR/frontend/package.json" ]]; then
        error "   ❌ frontend/package.json kopyalanamadı"
        verification_failed=true
    fi
    
    if [[ ! -f "$INSTALL_DIR/backend/package.json" ]]; then
        error "   ❌ backend/package.json kopyalanamadı"
        verification_failed=true
    fi
    
    if [[ ! -f "$INSTALL_DIR/docker-compose.yml" ]]; then
        error "   ❌ docker-compose.yml kopyalanamadı"
        verification_failed=true
    fi
    
    if [[ "$verification_failed" == "true" ]]; then
        error "❌ Dosya kopyalama doğrulaması başarısız!"
        error "   Hedef dizin içeriği:"
        ls -la "$INSTALL_DIR" 2>/dev/null || echo "   Dizin listelenemedi"
        exit 1
    fi
    
    # İzinleri ayarla
    info "🔐 Dosya izinleri ayarlanıyor..."
    if [[ -n "$SUDO_USER" ]]; then
        run_command "chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR" "Dosya sahipliği ayarlandı"
    fi
    run_command "chmod -R 755 $INSTALL_DIR" "Dizin izinleri ayarlandı"
    
    # Son kontrol
    local final_size
    if command -v du >/dev/null 2>&1; then
        final_size=$(du -sh "$INSTALL_DIR" 2>/dev/null | cut -f1 || echo "bilinmiyor")
        info "   Kopyalanan veri boyutu: $final_size"
    fi
    
    success "✅ Proje dosyaları başarıyla hazırlandı ($INSTALL_DIR)"
}

create_environment_files() {
    update_progress "Environment dosyaları oluşturuluyor..."
    
    # Ana .env dosyası
    cat > "$INSTALL_DIR/.env" << EOF
# Oto Parça Panel - Production Environment
# Bu dosyayı güvenli tutun ve version control'e eklemeyin

# Domain Configuration
DOMAIN_NAME=$DOMAIN_NAME
SSL_EMAIL=$SSL_EMAIL

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://oto_user:$POSTGRES_PASSWORD@localhost:5432/oto_parca_panel
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=oto_user
DATABASE_PASSWORD=$POSTGRES_PASSWORD
DATABASE_NAME=oto_parca_panel

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# NextAuth
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN_NAME

# Frontend
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME/api
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
FRONTEND_URL=https://$DOMAIN_NAME

# Backend
BACKEND_URL=https://$DOMAIN_NAME
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://$DOMAIN_NAME
CORS_CREDENTIALS=true

# WooCommerce (isteğe bağlı)
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Backup (Opsiyonel)
S3_BACKUP_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Monitoring
GRAFANA_PASSWORD=admin123
EOF

    # Frontend .env.local dosyası
    mkdir -p "$INSTALL_DIR/frontend"
    cat > "$INSTALL_DIR/frontend/.env.local" << EOF
# Oto Parça Panel - Frontend Environment
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME/api
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN_NAME
NODE_ENV=production
EOF

    # Backend .env dosyası
    mkdir -p "$INSTALL_DIR/backend"
    cat > "$INSTALL_DIR/backend/.env" << EOF
# Oto Parça Panel - Backend Environment
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=oto_user
DATABASE_PASSWORD=$POSTGRES_PASSWORD
DATABASE_NAME=oto_parca_panel
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN_NAME
CORS_ORIGIN=https://$DOMAIN_NAME
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
EOF

    # Scraper .env dosyası
    mkdir -p "$INSTALL_DIR/scraper"
    cat > "$INSTALL_DIR/scraper/.env" << EOF
# Oto Parça Panel - Scraper Environment
REMOTE_SERVER_URL=https://$DOMAIN_NAME
REMOTE_API_URL=https://$DOMAIN_NAME/api
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_ENV=production
SCRAPER_TIMEOUT=30
SCRAPER_RETRY_COUNT=3
SCRAPER_DELAY=2
LOG_LEVEL=INFO
LOG_FILE=scraper.log
EOF

    # Dosya izinlerini ayarla
    run_command "chmod 600 $INSTALL_DIR/.env" "Environment dosya izinleri ayarlandı"
    run_command "chmod 600 $INSTALL_DIR/frontend/.env.local" "Frontend environment izinleri ayarlandı"
    run_command "chmod 600 $INSTALL_DIR/backend/.env" "Backend environment izinleri ayarlandı"
    run_command "chmod 600 $INSTALL_DIR/scraper/.env" "Scraper environment izinleri ayarlandı"
    
    log "Environment dosyaları oluşturuldu"
}

create_nginx_config() {
    info "Nginx konfigürasyonu oluşturuluyor..."
    
    # Upstream tanımları ile nginx konfigürasyonu
    cat > "/etc/nginx/sites-available/oto-parca-panel" << EOF
# Oto Parça Panel - Nginx Configuration

# Upstream definitions
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # SSL certificates (will be created by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # Frontend routes (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

    # Site'ı etkinleştir
    run_command "ln -sf /etc/nginx/sites-available/oto-parca-panel /etc/nginx/sites-enabled/" "Nginx site etkinleştirildi"
    run_command "rm -f /etc/nginx/sites-enabled/default" "Varsayılan site kaldırıldı"
}

create_nginx_http_config() {
    info "Geçici HTTP-only Nginx konfigürasyonu oluşturuluyor..."
    
    cat > "/etc/nginx/sites-available/oto-parca-panel-http" << EOF
# Oto Parça Panel - HTTP Only Configuration (Temporary)

# Upstream definitions
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "http://$DOMAIN_NAME" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
    }

    # Frontend routes (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    run_command "ln -sf /etc/nginx/sites-available/oto-parca-panel-http /etc/nginx/sites-enabled/oto-parca-panel" "HTTP-only konfigürasyon etkinleştirildi"
}

# Self-signed SSL sertifikası kurulumu
setup_self_signed_ssl() {
    update_progress "Self-signed SSL sertifikası kuruluyor..."
    
    # SSL dizini oluştur
    mkdir -p /etc/nginx/ssl
    
    # Self-signed sertifika oluştur
    if openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx-selfsigned.key \
        -out /etc/nginx/ssl/nginx-selfsigned.crt \
        -subj "/C=TR/ST=Istanbul/L=Istanbul/O=OtoParcaPanel/CN=$DOMAIN_NAME" >> "$LOG_FILE" 2>&1; then
        
        log "Self-signed SSL sertifikası oluşturuldu"
        
        # İzinleri ayarla
        chmod 600 /etc/nginx/ssl/nginx-selfsigned.key
        chmod 644 /etc/nginx/ssl/nginx-selfsigned.crt
        
        # HTTPS Nginx konfigürasyonu oluştur
        create_nginx_https_config
        
        # Nginx'i test et ve yeniden başlat
        if nginx -t >> "$LOG_FILE" 2>&1; then
            run_command "systemctl reload nginx" "Nginx HTTPS modunda yeniden yüklendi"
            log "✅ HTTPS başarıyla etkinleştirildi"
        else
            error "Nginx konfigürasyon hatası, HTTP modda devam ediliyor"
            create_nginx_http_config
            run_command "systemctl reload nginx" "Nginx HTTP modunda yeniden yüklendi"
        fi
    else
        error "Self-signed SSL sertifikası oluşturulamadı"
        warn "HTTP modda devam ediliyor"
    fi
}

# HTTPS Nginx konfigürasyonu oluştur
create_nginx_https_config() {
    info "HTTPS Nginx konfigürasyonu oluşturuluyor..."
    
    cat > "/etc/nginx/sites-available/oto-parca-panel" << EOF
# Oto Parça Panel - HTTPS Configuration

# Upstream definitions
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # Frontend routes (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}
EOF

    # Site'ı etkinleştir
    run_command "ln -sf /etc/nginx/sites-available/oto-parca-panel /etc/nginx/sites-enabled/" "HTTPS Nginx site etkinleştirildi"
    run_command "rm -f /etc/nginx/sites-enabled/default" "Varsayılan site kaldırıldı"
}

# Certbot kurulumu
install_certbot() {
    update_progress "Certbot kuruluyor..."
    
    # Snapd kurulumu
    run_command "apt update" "Paket listesi güncellendi"
    run_command "apt install -y snapd" "Snapd yüklendi"
    run_command "snap install core; snap refresh core" "Snap core yüklendi"
    
    # Certbot kurulumu
    run_command "snap install --classic certbot" "Certbot yüklendi"
    run_command "ln -sf /snap/bin/certbot /usr/bin/certbot" "Certbot bağlantısı oluşturuldu"
    
    log "✅ Certbot başarıyla kuruldu"
}

# Domain validation fonksiyonu
validate_domain() {
    local domain="$1"
    
    # Boş domain kontrolü
    if [[ -z "$domain" ]]; then
        return 1
    fi
    
    # Domain format kontrolü (basit regex)
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        error "❌ Geçersiz domain formatı: $domain"
        return 1
    fi
    
    # DNS çözümleme kontrolü
    if ! nslookup "$domain" >/dev/null 2>&1; then
        warn "⚠️  DNS kaydı bulunamadı: $domain"
        return 1
    fi
    
    return 0
}

# Let's Encrypt SSL sertifika kurulumu (Subdomain desteği ile)
setup_letsencrypt_ssl() {
    update_progress "Let's Encrypt SSL sertifikası kuruluyor..."
    
    # Domain kontrolü
    if [[ -z "$DOMAIN_NAME" ]]; then
        warn "⚠️  Domain adı belirtilmedi, self-signed sertifika kullanılacak"
        setup_self_signed_ssl
        return
    fi
    
    # Domain validation
    if ! validate_domain "$DOMAIN_NAME"; then
        warn "⚠️  Domain doğrulaması başarısız, self-signed sertifika kullanılacak"
        setup_self_signed_ssl
        return
    fi
    
    # Subdomain formatını kontrol et
    local main_domain="$DOMAIN_NAME"
    local domains=""
    
    # Eğer subdomain ise (örn: api.example.com, panel.example.com)
    if [[ "$DOMAIN_NAME" == *.*.* ]]; then
        # Subdomain durumu - sadece belirtilen subdomain için sertifika al
        domains="-d $DOMAIN_NAME"
        info "🌐 Subdomain tespit edildi: $DOMAIN_NAME"
    else
        # Ana domain durumu - hem ana domain hem www için sertifika al
        domains="-d $DOMAIN_NAME -d www.$DOMAIN_NAME"
        info "🌐 Ana domain tespit edildi: $DOMAIN_NAME (www dahil)"
    fi
    
    # Port 80 kontrolü (Let's Encrypt için gerekli)
    local restart_nginx=false
    if netstat -tlnp | grep -q ":80 "; then
        info "📡 Port 80 kullanımda, Nginx geçici olarak durdurulacak"
        run_command "systemctl stop nginx" "Nginx durduruldu"
        restart_nginx=true
    fi
    
    # Let's Encrypt sertifika al
    info "📜 Sertifika alınıyor: $domains"
    if certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$SSL_EMAIL" \
        $domains >> "$LOG_FILE" 2>&1; then
        
        log "✅ Let's Encrypt sertifikası başarıyla alındı"
        create_nginx_letsencrypt_config
        
        # SSL otomatik yenileme kurulumu
        setup_ssl_auto_renewal
        
    else
        error "❌ Let's Encrypt sertifikası alınamadı, self-signed kullanılacak"
        setup_self_signed_ssl
    fi
    
    # Nginx'i yeniden başlat
    if [[ "$restart_nginx" == "true" ]]; then
        run_command "systemctl start nginx" "Nginx başlatıldı"
    fi
}

# Let's Encrypt Nginx yapılandırması (Subdomain desteği ile)
create_nginx_letsencrypt_config() {
    info "🌐 Let's Encrypt Nginx yapılandırması oluşturuluyor..."
    
    # Subdomain kontrolü
    local server_name=""
    local cert_path="/etc/letsencrypt/live/$DOMAIN_NAME"
    
    if [[ "$DOMAIN_NAME" == *.*.* ]]; then
        # Subdomain yapılandırması
        server_name="$DOMAIN_NAME"
        info "🔧 Subdomain için Nginx yapılandırması: $DOMAIN_NAME"
    else
        # Ana domain yapılandırması
        server_name="$DOMAIN_NAME www.$DOMAIN_NAME"
        info "🔧 Ana domain için Nginx yapılandırması: $DOMAIN_NAME (www dahil)"
    fi
    
    cat > "/etc/nginx/sites-available/oto-parca-panel" << EOF
# Oto Parça Panel - Let's Encrypt HTTPS Configuration
# Domain: $DOMAIN_NAME
# Type: $(if [[ "$DOMAIN_NAME" == *.*.* ]]; then echo "Subdomain"; else echo "Main Domain"; fi)

# Upstream definitions
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $server_name;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $server_name;
    
    # Let's Encrypt SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN_NAME";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # Frontend routes (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

    # Site'ı etkinleştir
    run_command "ln -sf /etc/nginx/sites-available/oto-parca-panel /etc/nginx/sites-enabled/" "Let's Encrypt Nginx site etkinleştirildi"
    run_command "rm -f /etc/nginx/sites-enabled/default" "Varsayılan site kaldırıldı"
}

# SSL otomatik yenileme kurulumu
setup_ssl_auto_renewal() {
    info "🔄 SSL otomatik yenileme kuruluyor..."
    
    # Crontab entry ekle
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -
    
    # Test yenileme
    if certbot renew --dry-run >> "$LOG_FILE" 2>&1; then
        log "✅ SSL otomatik yenileme kuruldu"
    else
        warn "⚠️  SSL otomatik yenileme test edilemedi"
    fi
}

install_ssl() {
    update_progress "SSL sertifikası kuruluyor..."
    
    # Certbot kurulumu
    install_certbot
    
    # Let's Encrypt SSL kurulumu dene
    setup_letsencrypt_ssl
    
    info "SSL kurulumu tamamlandı"
}

build_and_start_services() {
    update_progress "Uygulama servisleri başlatılıyor..."
    
    cd "$INSTALL_DIR"
    
    # Backend build
    if [[ -d "backend" ]]; then
        cd backend
        run_command "npm install" "Backend bağımlılıkları yüklendi"
        run_command "npm run build" "Backend build edildi"
        cd ..
    fi
    
    # Frontend build
    if [[ -d "frontend" ]]; then
        cd frontend
        run_command "npm install" "Frontend bağımlılıkları yüklendi"
        run_command "npm run build" "Frontend build edildi"
        cd ..
    fi
    
    # PM2 ecosystem dosyası oluştur
    cat > "ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'oto-parca-backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log'
    },
    {
      name: 'oto-parca-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log'
    }
  ]
};
EOF
    
    # Database migration
    if [[ -d "backend" ]]; then
        cd backend
        if [[ -f "package.json" ]] && grep -q "migration:run" package.json; then
            run_command "npm run migration:run" "Database migration çalıştırıldı"
        fi
        
        if [[ -f "package.json" ]] && grep -q "seed:run" package.json; then
            run_command "npm run seed:run" "Database seed çalıştırıldı"
        fi
        cd ..
    fi
    
    # PM2 ile servisleri başlat
    run_command "pm2 start ecosystem.config.js" "PM2 servisleri başlatıldı"
    run_command "pm2 save" "PM2 konfigürasyonu kaydedildi"
    run_command "pm2 startup" "PM2 otomatik başlatma ayarlandı"
}

setup_monitoring() {
    update_progress "Monitoring ve log rotation ayarlanıyor..."
    
    # Log rotation kurulumu
    cat > "/etc/logrotate.d/oto-parca-panel" << EOF
$INSTALL_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reload all
    endscript
}
EOF
    
    # Sistem optimizasyonu
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo '* soft nofile 65536' >> /etc/security/limits.conf
    echo '* hard nofile 65536' >> /etc/security/limits.conf
    echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf
    
    run_command "sysctl -p" "Sistem parametreleri uygulandı"
    
    log "Monitoring ve optimizasyon ayarlandı"
}

# =============================================================================
# INSTALLATION VALIDATION
# =============================================================================

# Kurulum doğrulama
validate_installation() {
    update_progress "Kurulum doğrulanıyor..."
    
    local validation_errors=0
    
    # Proje dosyalarını kontrol et
    if [[ ! -f "$INSTALL_DIR/frontend/package.json" ]]; then
        warn "Frontend package.json dosyası bulunamadı"
        ((validation_errors++))
    fi
    
    if [[ ! -f "$INSTALL_DIR/backend/package.json" ]]; then
        warn "Backend package.json dosyası bulunamadı"
        ((validation_errors++))
    fi
    
    if [[ ! -f "$INSTALL_DIR/docker-compose.yml" ]]; then
        warn "docker-compose.yml dosyası bulunamadı"
        ((validation_errors++))
    fi
    
    # Environment dosyalarını kontrol et
    local env_files=(
        "$INSTALL_DIR/.env"
        "$INSTALL_DIR/frontend/.env.local"
        "$INSTALL_DIR/backend/.env"
    )
    
    for env_file in "${env_files[@]}"; do
        if [[ ! -f "$env_file" ]]; then
            warn "Environment dosyası bulunamadı: $env_file"
            ((validation_errors++))
        fi
    done
    
    # Servisleri kontrol et
    local services=("docker" "nginx" "postgresql")
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service"; then
            warn "Servis çalışmıyor: $service"
            ((validation_errors++))
        fi
    done
    
    # Port kontrolü
    local ports=(80 443 3000 3001 5432)
    for port in "${ports[@]}"; do
        if ! netstat -tlnp | grep ":$port " > /dev/null 2>&1; then
            warn "Port dinlenmiyor: $port"
            ((validation_errors++))
        fi
    done
    
    if [[ $validation_errors -eq 0 ]]; then
        log "Kurulum doğrulaması başarılı"
        return 0
    else
        warn "$validation_errors doğrulama hatası tespit edildi"
        return 1
    fi
}

# Kurulum özeti
show_installation_summary() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    KURULUM TAMAMLANDI!                      ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${GREEN}🎉 Oto Parça Panel başarıyla kuruldu!${NC}"
    echo ""
    echo -e "${BLUE}📋 Kurulum Özeti:${NC}"
    echo -e "${WHITE}• Domain:${NC} https://$DOMAIN_NAME"
    echo -e "${WHITE}• Kurulum Dizini:${NC} $INSTALL_DIR"
    echo -e "${WHITE}• Log Dosyası:${NC} $LOG_FILE"
    echo ""
    
    echo -e "${YELLOW}🔗 Erişim URL'leri:${NC}"
    echo -e "${WHITE}• Frontend:${NC} https://$DOMAIN_NAME"
    echo -e "${WHITE}• Backend API:${NC} https://$DOMAIN_NAME/api"
    echo -e "${WHITE}• API Docs:${NC} https://$DOMAIN_NAME/api/docs"
    echo ""
    
    echo -e "${CYAN}🛠️ Yönetim Komutları:${NC}"
    echo -e "${WHITE}• Servis Durumu:${NC} ./start-services.sh production status"
    echo -e "${WHITE}• Servisleri Başlat:${NC} ./start-services.sh production start"
    echo -e "${WHITE}• Servisleri Durdur:${NC} ./start-services.sh production stop"
    echo -e "${WHITE}• Port Kontrolü:${NC} ./port-manager.sh status"
    echo -e "${WHITE}• Nginx Debug:${NC} ./nginx-debug.sh"
    echo ""
    
    echo -e "${RED}⚠️ Sonraki Adımlar:${NC}"
    echo -e "${WHITE}1.${NC} WooCommerce ayarlarını yapılandırın (.env dosyasında)"
    echo -e "${WHITE}2.${NC} SSL sertifikasının otomatik yenilenmesini kontrol edin"
    echo -e "${WHITE}3.${NC} Backup ayarlarını yapılandırın"
    echo -e "${WHITE}4.${NC} Monitoring'i etkinleştirin"
    echo -e "${WHITE}5.${NC} Güvenlik ayarlarını gözden geçirin"
    echo ""
    
    echo -e "${GREEN}📞 Destek:${NC}"
    echo -e "${WHITE}• Troubleshooting:${NC} cat NGINX_TROUBLESHOOTING.md"
    echo -e "${WHITE}• Log İnceleme:${NC} tail -f $LOG_FILE"
    echo -e "${WHITE}• GitHub Issues:${NC} https://github.com/mucahitkayadan/OtoParcaPanel/issues"
    echo ""
}

# =============================================================================
# MAIN INSTALLATION FLOW
# =============================================================================

main() {
    # Log dosyasını oluştur
    touch "$LOG_FILE"
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    OTO PARÇA PANEL                           ║${NC}"
    echo -e "${PURPLE}║              One-Click Installation Script                   ║${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}║  Bu script sıfır temiz sunucuya Oto Parça Panel'i kuracak   ║${NC}"
    echo -e "${PURPLE}║  Kurulum yaklaşık 10-15 dakika sürecektir                   ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Sistem kontrolleri
    check_root
    check_os
    check_system_requirements
    
    # Kullanıcı girişleri
    get_user_input
    
    # Kurulum başlangıcı
    echo ""
    info "Kurulum başlatılıyor..."
    echo "Detaylı loglar: $LOG_FILE"
    echo ""
    
    # Ana kurulum adımları
    generate_passwords
    update_system
    install_docker
    install_nodejs
    install_postgresql
    install_nginx
    setup_firewall
    setup_project
    create_environment_files
    build_and_start_services
    install_ssl
    setup_monitoring
    
    # Kurulum doğrulama
    validate_installation
    
    # Kurulum özeti
    show_installation_summary
    
    success "Kurulum başarıyla tamamlandı!"
}



# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Trap ile temizlik
trap 'echo -e "\n${RED}Kurulum iptal edildi.${NC}"' INT TERM

# Ana fonksiyonu çalıştır
main "$@"

# Script sonunda log dosyasının konumunu göster
echo -e "${BLUE}Detaylı kurulum logları: $LOG_FILE${NC}"
echo -e "${BLUE}Kurulum scripti tamamlandı.${NC}"