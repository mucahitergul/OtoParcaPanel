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
# GITHUB CLONE FUNCTIONS
# =============================================================================

# Git kurulumu kontrolü ve kurulumu
install_git() {
    if ! command -v git &> /dev/null; then
        info "Git kurulumu yapılıyor..."
        run_command "apt update && apt install -y git" "Git kuruldu"
    else
        log "Git zaten kurulu: $(git --version)"
    fi
}

# Network bağlantısı testi
test_network_connectivity() {
    local test_urls=("github.com" "raw.githubusercontent.com" "google.com")
    
    for url in "${test_urls[@]}"; do
        if ping -c 1 "$url" &> /dev/null; then
            log "Network bağlantısı test edildi: $url"
            return 0
        fi
    done
    
    warn "Network bağlantısı sorunlu olabilir"
    return 1
}

# Kapsamlı internet bağlantısı kontrolü
check_internet_connectivity() {
    local test_methods=(
        "ping -c 1 google.com"
        "ping -c 1 8.8.8.8"
        "curl -s --connect-timeout 5 https://google.com"
        "wget -q --spider --timeout=5 https://google.com"
    )
    
    info "Internet bağlantısı test ediliyor..."
    
    # DNS çözümleme testi
    if nslookup github.com &> /dev/null; then
        log "DNS çözümleme çalışıyor"
    else
        warn "DNS çözümleme sorunu tespit edildi"
        # Google DNS'i dene
        echo "nameserver 8.8.8.8" > /etc/resolv.conf.backup
        echo "nameserver 8.8.4.4" >> /etc/resolv.conf.backup
        cp /etc/resolv.conf.backup /etc/resolv.conf
        info "Google DNS ayarlandı"
    fi
    
    # Farklı yöntemlerle bağlantı testi
    for method in "${test_methods[@]}"; do
        if eval "$method" &> /dev/null; then
            log "Internet bağlantısı aktif: $method"
            return 0
        fi
    done
    
    # Proxy kontrolü
    if [[ -n "$http_proxy" || -n "$https_proxy" ]]; then
        warn "Proxy ayarları tespit edildi: $http_proxy $https_proxy"
        info "Proxy ayarlarını kontrol edin"
    fi
    
    # Firewall kontrolü
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        warn "UFW firewall aktif. Giden bağlantıları kontrol edin"
    fi
    
    error "Internet bağlantısı bulunamadı. Kurulum için internet gereklidir."
}

# GitHub repository klonlama - Multiple fallback methods
# Eksik proje dosyalarını GitHub'dan indir
download_missing_files() {
    local current_dir="$(pwd)"
    local temp_clone_dir="/tmp/otoparca-temp-$(date +%s)"
    
    info "Eksik dosyalar GitHub'dan indiriliyor..."
    
    # Geçici dizinde tam projeyi klonla
    if clone_full_project_to_temp "$temp_clone_dir"; then
        # Eksik dosyaları tespit et ve kopyala
        [[ ! -f "$INSTALL_DIR/package.json" && -f "$temp_clone_dir/package.json" ]] && \
            cp "$temp_clone_dir/package.json" "$INSTALL_DIR/" && info "✓ package.json kopyalandı"
        
        [[ ! -d "$INSTALL_DIR/frontend" && -d "$temp_clone_dir/frontend" ]] && \
            cp -r "$temp_clone_dir/frontend" "$INSTALL_DIR/" && info "✓ frontend/ dizini kopyalandı"
        
        [[ ! -d "$INSTALL_DIR/backend" && -d "$temp_clone_dir/backend" ]] && \
            cp -r "$temp_clone_dir/backend" "$INSTALL_DIR/" && info "✓ backend/ dizini kopyalandı"
        
        [[ ! -d "$INSTALL_DIR/scraper" && -d "$temp_clone_dir/scraper" ]] && \
            cp -r "$temp_clone_dir/scraper" "$INSTALL_DIR/" && info "✓ scraper/ dizini kopyalandı"
        
        [[ ! -f "$INSTALL_DIR/docker-compose.yml" && -f "$temp_clone_dir/docker-compose.yml" ]] && \
            cp "$temp_clone_dir/docker-compose.yml" "$INSTALL_DIR/" && info "✓ docker-compose.yml kopyalandı"
        
        # Geçici dizini temizle
        rm -rf "$temp_clone_dir"
        success "✅ Eksik dosyalar başarıyla tamamlandı"
        return 0
    else
        error "❌ Eksik dosyalar indirilemedi"
        rm -rf "$temp_clone_dir"
        return 1
    fi
}

# Geçici dizine tam proje klonla
clone_full_project_to_temp() {
    local temp_dir="$1"
    local repo_urls=(
        "https://github.com/mucahitkayadan/OtoParcaPanel.git"
        "https://github.com/YOUR_USERNAME/OtoParcaPanel.git"
    )
    
    mkdir -p "$temp_dir"
    
    for repo_url in "${repo_urls[@]}"; do
        if timeout 300 git clone --depth 1 "$repo_url" "$temp_dir" >> "$LOG_FILE" 2>&1; then
            return 0
        fi
        rm -rf "$temp_dir" 2>/dev/null
        mkdir -p "$temp_dir"
    done
    
    return 1
}

clone_project_from_github() {
    local repo_urls=(
        "https://github.com/mucahitkayadan/OtoParcaPanel.git"
        "https://github.com/YOUR_USERNAME/OtoParcaPanel.git"
    )
    
    local zip_urls=(
        "https://github.com/mucahitkayadan/OtoParcaPanel/archive/refs/heads/main.zip"
        "https://github.com/YOUR_USERNAME/OtoParcaPanel/archive/refs/heads/main.zip"
    )
    
    # Git kurulumunu kontrol et
    install_git
    
    # Network bağlantısını test et
    test_network_connectivity
    
    # Method 1: Git clone with HTTPS (with retry)
    for repo_url in "${repo_urls[@]}"; do
        info "GitHub'dan klonlanıyor: $repo_url"
        
        # Git clone with timeout and retry
        for attempt in {1..3}; do
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] Git clone attempt $attempt: $repo_url" >> "$LOG_FILE"
            
            if timeout 300 git clone --depth 1 "$repo_url" "$INSTALL_DIR" >> "$LOG_FILE" 2>&1; then
                log "Proje GitHub'dan başarıyla klonlandı (attempt $attempt)"
                return 0
            else
                local exit_code=$?
                warn "Git clone başarısız (attempt $attempt/$3): $repo_url (exit code: $exit_code)"
                
                # Cleanup partial clone
                rm -rf "$INSTALL_DIR" 2>/dev/null
                mkdir -p "$INSTALL_DIR"
                
                if [[ $attempt -lt 3 ]]; then
                    info "2 saniye bekleyip tekrar denenecek..."
                    sleep 2
                fi
            fi
        done
        
        warn "Tüm git clone denemeleri başarısız: $repo_url"
    done
    
    # Method 2: Download ZIP file (with retry and better error handling)
    for zip_url in "${zip_urls[@]}"; do
        info "ZIP dosyası indiriliyor: $zip_url"
        local temp_zip="/tmp/otoparca-panel-$(date +%s).zip"
        local temp_dir="/tmp/otoparca-extract-$(date +%s)"
        
        # Ensure unzip is available
        if ! command -v unzip &> /dev/null; then
            run_command_safe "apt update && apt install -y unzip" "Unzip kurulumu"
        fi
        
        # Download with retry
        for attempt in {1..3}; do
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] ZIP download attempt $attempt: $zip_url" >> "$LOG_FILE"
            
            if curl -L --connect-timeout 30 --max-time 300 --retry 2 "$zip_url" -o "$temp_zip" >> "$LOG_FILE" 2>&1; then
                # Verify download
                if [[ -f "$temp_zip" && -s "$temp_zip" ]]; then
                    info "ZIP dosyası başarıyla indirildi ($(du -h $temp_zip | cut -f1))"
                    
                    # Extract ZIP
                    mkdir -p "$temp_dir"
                    if unzip -q "$temp_zip" -d "$temp_dir" >> "$LOG_FILE" 2>&1; then
                        local extracted_dir=$(find "$temp_dir" -maxdepth 2 -name "*OtoParcaPanel*" -type d | head -1)
                        
                        if [[ -n "$extracted_dir" && -d "$extracted_dir" ]]; then
                            # Copy files
                            if cp -r "$extracted_dir"/* "$INSTALL_DIR/" >> "$LOG_FILE" 2>&1; then
                                log "Proje ZIP'den başarıyla çıkarıldı"
                                # Cleanup
                                rm -rf "$temp_zip" "$temp_dir" 2>/dev/null
                                return 0
                            else
                                warn "Dosya kopyalama başarısız"
                            fi
                        else
                            warn "Çıkarılan dizin bulunamadı: $temp_dir"
                            ls -la "$temp_dir" >> "$LOG_FILE" 2>&1
                        fi
                    else
                        warn "ZIP çıkarma başarısız"
                    fi
                else
                    warn "İndirilen dosya geçersiz veya boş"
                fi
                
                # Cleanup failed attempt
                rm -rf "$temp_zip" "$temp_dir" 2>/dev/null
                
                if [[ $attempt -lt 3 ]]; then
                    info "3 saniye bekleyip tekrar denenecek..."
                    sleep 3
                fi
            else
                warn "ZIP indirme başarısız (attempt $attempt/3): $zip_url"
                rm -rf "$temp_zip" 2>/dev/null
                
                if [[ $attempt -lt 3 ]]; then
                    sleep 3
                fi
            fi
        done
        
        warn "Tüm ZIP indirme denemeleri başarısız: $zip_url"
    done
    
    # Method 3: Wget fallback
    for zip_url in "${zip_urls[@]}"; do
        if command -v wget &> /dev/null || apt install -y wget >> "$LOG_FILE" 2>&1; then
            info "Wget ile indiriliyor: $zip_url"
            local temp_zip="/tmp/otoparca-panel-wget.zip"
            
            if wget -q "$zip_url" -O "$temp_zip" >> "$LOG_FILE" 2>&1; then
                if unzip -q "$temp_zip" -d "/tmp/" >> "$LOG_FILE" 2>&1; then
                    local extracted_dir=$(find /tmp -maxdepth 1 -name "*OtoParcaPanel*" -type d | head -1)
                    if [[ -n "$extracted_dir" ]]; then
                        run_command "cp -r $extracted_dir/* $INSTALL_DIR/" "Proje Wget ile indirildi"
                        run_command "rm -rf $temp_zip $extracted_dir" "Geçici dosyalar temizlendi"
                        return 0
                    fi
                fi
            fi
        fi
        warn "Wget indirme başarısız: $zip_url"
    done
    
    # Method 4: Create minimal project structure
    warn "GitHub'dan indirme başarısız. Minimal proje yapısı oluşturuluyor..."
    create_minimal_project_structure
}

# Minimal proje yapısı oluşturma
create_minimal_project_structure() {
    info "Minimal proje yapısı oluşturuluyor..."
    
    # Temel dizinleri oluştur
    mkdir -p "$INSTALL_DIR"/{frontend,backend,scraper,nginx,database}
    
    # Temel package.json dosyaları
    cat > "$INSTALL_DIR/package.json" << 'EOF'
{
  "name": "oto-parca-panel",
  "version": "1.0.0",
  "description": "Otomotiv Yedek Parça Stok ve Fiyat Takip Sistemi",
  "scripts": {
    "install:all": "cd frontend && npm install && cd ../backend && npm install",
    "build:all": "cd frontend && npm run build && cd ../backend && npm run build",
    "start:prod": "pm2 start ecosystem.config.js"
  }
}
EOF
    
    # Frontend package.json
    cat > "$INSTALL_DIR/frontend/package.json" << 'EOF'
{
  "name": "oto-parca-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
EOF
    
    # Backend package.json
    cat > "$INSTALL_DIR/backend/package.json" << 'EOF'
{
  "name": "oto-parca-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "build": "nest build"
  },
  "dependencies": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "express": "^4.18.0"
  }
}
EOF
    
    log "Minimal proje yapısı oluşturuldu"
    warn "Tam özellikli kurulum için GitHub repository'sine erişim gereklidir"
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
    
    # Internet bağlantısı kontrolü
    check_internet_connectivity
    
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
    
    # Onay al
    echo ""
    info "Girilen bilgiler:"
    echo -e "${WHITE}Domain: $DOMAIN_NAME${NC}"
    echo -e "${WHITE}SSL Email: $SSL_EMAIL${NC}"
    echo ""
    
    read -p "$(echo -e "${YELLOW}Bu bilgiler doğru mu? (y/n): ${NC}")" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Kurulum iptal edildi."
        exit 1
    fi
    
    log "Kullanıcı girişleri alındı"
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

# Mevcut proje dosyalarını kontrol et
check_existing_project() {
    local current_dir="$(pwd)"
    
    info "Mevcut proje dosyaları kontrol ediliyor..."
    
    # Temel proje dosyalarını kontrol et
    local has_package_json=false
    local has_frontend=false
    local has_backend=false
    local has_scraper=false
    local has_docker=false
    
    [[ -f "$current_dir/package.json" ]] && has_package_json=true
    [[ -d "$current_dir/frontend" ]] && has_frontend=true
    [[ -d "$current_dir/backend" ]] && has_backend=true
    [[ -d "$current_dir/scraper" ]] && has_scraper=true
    [[ -f "$current_dir/docker-compose.yml" ]] && has_docker=true
    
    # Proje dosyalarının durumunu raporla
    if [[ "$has_package_json" == true && "$has_frontend" == true && "$has_backend" == true ]]; then
        success "✅ Tam proje dosyaları tespit edildi!"
        info "📁 Bulunan dosyalar:"
        [[ "$has_package_json" == true ]] && info "   ✓ package.json"
        [[ "$has_frontend" == true ]] && info "   ✓ frontend/ dizini"
        [[ "$has_backend" == true ]] && info "   ✓ backend/ dizini"
        [[ "$has_scraper" == true ]] && info "   ✓ scraper/ dizini"
        [[ "$has_docker" == true ]] && info "   ✓ docker-compose.yml"
        
        info "🚀 GitHub clone işlemi atlanacak, mevcut dosyalar kullanılacak"
        return 0
    elif [[ "$has_package_json" == true || "$has_frontend" == true || "$has_backend" == true ]]; then
        warn "⚠️  Kısmi proje dosyaları tespit edildi"
        info "📁 Bulunan dosyalar:"
        [[ "$has_package_json" == true ]] && info "   ✓ package.json" || info "   ✗ package.json eksik"
        [[ "$has_frontend" == true ]] && info "   ✓ frontend/ dizini" || info "   ✗ frontend/ dizini eksik"
        [[ "$has_backend" == true ]] && info "   ✓ backend/ dizini" || info "   ✗ backend/ dizini eksik"
        [[ "$has_scraper" == true ]] && info "   ✓ scraper/ dizini" || info "   ✗ scraper/ dizini eksik"
        
        warn "🔄 Eksik dosyalar GitHub'dan indirilecek"
        return 1
    else
        info "📂 Proje dosyaları bulunamadı"
        info "⬇️  Tam proje GitHub'dan klonlanacak"
        return 2
    fi
}

# Mevcut proje dosyalarını kullan
use_existing_project_files() {
    local current_dir="$(pwd)"
    
    info "Mevcut proje dosyaları $INSTALL_DIR dizinine kopyalanıyor..."
    
    # Güvenlik için backup oluştur
    if [[ -d "$INSTALL_DIR" ]]; then
        local backup_dir="$INSTALL_DIR.backup.$(date +%Y%m%d_%H%M%S)"
        run_command "cp -r $INSTALL_DIR $backup_dir" "Mevcut kurulum yedeklendi: $backup_dir"
    fi
    
    # Proje dosyalarını kopyala (gizli dosyalar dahil)
    run_command "cp -r $current_dir/. $INSTALL_DIR/" "Proje dosyaları kopyalandı"
    
    # .git dizinini temizle (eğer varsa)
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        run_command "rm -rf $INSTALL_DIR/.git" "Git geçmişi temizlendi"
    fi
    
    # Dosya bütünlüğünü kontrol et
    local integrity_check=true
    [[ ! -f "$INSTALL_DIR/package.json" ]] && integrity_check=false
    [[ ! -d "$INSTALL_DIR/frontend" ]] && integrity_check=false
    [[ ! -d "$INSTALL_DIR/backend" ]] && integrity_check=false
    
    if [[ "$integrity_check" == false ]]; then
        error "❌ Dosya kopyalama işlemi başarısız!"
        error "🔄 GitHub clone yöntemine geçiliyor..."
        clone_project_from_github
        return 1
    fi
    
    success "✅ Mevcut proje dosyaları başarıyla kopyalandı"
    return 0
}

setup_project() {
    update_progress "Proje dosyaları hazırlanıyor..."
    
    # Proje dizinini oluştur
    run_command "mkdir -p $INSTALL_DIR" "Proje dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/postgres" "PostgreSQL veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/redis" "Redis veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/logs" "Log dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/backups" "Backup dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/ssl" "SSL dizini oluşturuldu"
    
    # Mevcut proje dosyalarını kontrol et
    check_existing_project
    local project_status=$?
    
    case $project_status in
         0)
             # Tam proje dosyaları mevcut
             use_existing_project_files
             ;;
         1)
             # Kısmi dosyalar mevcut - eksikleri tamamla
             warn "Kısmi proje tespit edildi, eksik dosyalar GitHub'dan indirilecek"
             # Önce mevcut dosyaları kopyala
             use_existing_project_files
             # Sonra eksik dosyaları indir
             download_missing_files
             ;;
         2)
             # Proje dosyaları yok - tam clone
             info "Proje dosyaları bulunamadı, GitHub'dan klonlanacak"
             clone_project_from_github
             ;;
     esac
    
    # İzinleri ayarla
    if [[ -n "$SUDO_USER" ]]; then
        run_command "chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR" "Dosya izinleri ayarlandı"
    fi
    run_command "chmod -R 755 $INSTALL_DIR" "Dizin izinleri ayarlandı"
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

install_ssl() {
    update_progress "SSL sertifikası kuruluyor..."
    
    # Certbot kurulumu
    run_command "apt install -y certbot python3-certbot-nginx" "Certbot yüklendi"
    
    # SSL sertifikası oluştur
    if certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --email "$SSL_EMAIL" --agree-tos --non-interactive --redirect >> "$LOG_FILE" 2>&1; then
        log "SSL sertifikası başarıyla oluşturuldu"
        
        # HTTPS konfigürasyonuna geç
        create_nginx_config
        run_command "nginx -t" "Nginx konfigürasyon testi"
        run_command "systemctl reload nginx" "Nginx yeniden yüklendi"
    else
        warn "SSL sertifikası oluşturulamadı. HTTP modda devam ediliyor."
        info "SSL sertifikasını daha sonra manuel olarak oluşturabilirsiniz: certbot --nginx -d $DOMAIN_NAME"
    fi
    
    # Otomatik yenileme için crontab
    run_command "(crontab -l 2>/dev/null; echo '0 12 * * * /usr/bin/certbot renew --quiet') | crontab -" "SSL otomatik yenileme ayarlandı"
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
    if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
        warn "Ana package.json dosyası bulunamadı"
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