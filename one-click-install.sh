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

# Komut çalıştırma ve log tutma
run_command() {
    local cmd="$1"
    local description="$2"
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running: $cmd" >> "$LOG_FILE"
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        log "$description"
        return 0
    else
        error "$description failed. Check $LOG_FILE for details."
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
    
    # Internet bağlantısı kontrolü
    if ! ping -c 1 google.com &> /dev/null; then
        error "Internet bağlantısı bulunamadı. Kurulum için internet gereklidir."
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
    
    run_command "apt install -y postgresql postgresql-contrib" "PostgreSQL yüklendi"
    
    # PostgreSQL servisini başlat
    run_command "systemctl enable postgresql" "PostgreSQL servisi etkinleştirildi"
    run_command "systemctl start postgresql" "PostgreSQL servisi başlatıldı"
    
    # Veritabanı oluştur
    run_command "sudo -u postgres psql -c \"CREATE DATABASE oto_parca_panel;\"" "Veritabanı oluşturuldu"
    run_command "sudo -u postgres psql -c \"CREATE USER oto_user WITH PASSWORD '$POSTGRES_PASSWORD';\"" "Veritabanı kullanıcısı oluşturuldu"
    run_command "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;\"" "Veritabanı izinleri verildi"
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

setup_project() {
    update_progress "Proje dosyaları hazırlanıyor..."
    
    # Proje dizinini oluştur
    run_command "mkdir -p $INSTALL_DIR" "Proje dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/postgres" "PostgreSQL veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/data/redis" "Redis veri dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/logs" "Log dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/backups" "Backup dizini oluşturuldu"
    run_command "mkdir -p $INSTALL_DIR/ssl" "SSL dizini oluşturuldu"
    
    # Proje dosyalarını kopyala
    if [[ -d "$(pwd)" && -f "$(pwd)/package.json" ]]; then
        run_command "cp -r $(pwd)/* $INSTALL_DIR/" "Proje dosyaları kopyalandı"
    else
        # GitHub'dan klonla
        run_command "git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git $INSTALL_DIR" "Proje GitHub'dan klonlandı"
    fi
    
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
# VALIDATION FUNCTIONS
# =============================================================================

validate_installation() {
    update_progress "Kurulum doğrulanıyor..."
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    KURULUM DOĞRULAMA                         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Servis durumları
    echo -e "${WHITE}Servis Durumları:${NC}"
    check_service "docker" && echo "" || echo ""
    check_service "postgresql" && echo "" || echo ""
    check_service "nginx" && echo "" || echo ""
    
    # PM2 servisleri
    echo -e "${WHITE}PM2 Servisleri:${NC}"
    if pm2 list | grep -q "oto-parca-backend.*online"; then
        echo -e "${GREEN}✓ Backend${NC}"
    else
        echo -e "${RED}✗ Backend${NC}"
    fi
    
    if pm2 list | grep -q "oto-parca-frontend.*online"; then
        echo -e "${GREEN}✓ Frontend${NC}"
    else
        echo -e "${RED}✗ Frontend${NC}"
    fi
    
    # Port kontrolü
    echo -e "${WHITE}Port Durumları:${NC}"
    check_port 80 && echo -e "${GREEN}✓ Port 80 (HTTP)${NC}" || echo -e "${RED}✗ Port 80 (HTTP)${NC}"
    check_port 443 && echo -e "${GREEN}✓ Port 443 (HTTPS)${NC}" || echo -e "${YELLOW}⚠ Port 443 (HTTPS)${NC}"
    check_port 3000 && echo -e "${GREEN}✓ Port 3000 (Frontend)${NC}" || echo -e "${RED}✗ Port 3000 (Frontend)${NC}"
    check_port 3001 && echo -e "${GREEN}✓ Port 3001 (Backend)${NC}" || echo -e "${RED}✗ Port 3001 (Backend)${NC}"
    
    # Health check'ler
    echo -e "${WHITE}Health Check'ler:${NC}"
    
    # Frontend health check
    if curl -f "http://localhost:3000" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend Health Check${NC}"
    else
        echo -e "${RED}✗ Frontend Health Check${NC}"
    fi
    
    # Backend health check
    if curl -f "http://localhost:3001/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend Health Check${NC}"
    else
        echo -e "${RED}✗ Backend Health Check${NC}"
    fi
    
    # Database bağlantısı
    if sudo -u postgres psql -d oto_parca_panel -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database Connection${NC}"
    else
        echo -e "${RED}✗ Database Connection${NC}"
    fi
    
    # SSL sertifika kontrolü
    if [[ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]]; then
        echo -e "${GREEN}✓ SSL Certificate${NC}"
    else
        echo -e "${YELLOW}⚠ SSL Certificate (HTTP modda çalışıyor)${NC}"
    fi
    
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

show_installation_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    KURULUM TAMAMLANDI                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${WHITE}🌐 Web Adresleri:${NC}"
    if [[ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]]; then
        echo -e "   Frontend: ${CYAN}https://$DOMAIN_NAME${NC}"
        echo -e "   Backend API: ${CYAN}https://$DOMAIN_NAME/api${NC}"
    else
        echo -e "   Frontend: ${CYAN}http://$DOMAIN_NAME${NC}"
        echo -e "   Backend API: ${CYAN}http://$DOMAIN_NAME/api${NC}"
    fi
    echo ""
    
    echo -e "${WHITE}📁 Dosya Konumları:${NC}"
    echo -e "   Proje Dizini: ${CYAN}$INSTALL_DIR${NC}"
    echo -e "   Log Dosyası: ${CYAN}$LOG_FILE${NC}"
    echo -e "   Environment: ${CYAN}$INSTALL_DIR/.env${NC}"
    echo ""
    
    echo -e "${WHITE}🔧 Yönetim Komutları:${NC}"
    echo -e "   PM2 Status: ${CYAN}pm2 status${NC}"
    echo -e "   PM2 Logs: ${CYAN}pm2 logs${NC}"
    echo -e "   Nginx Test: ${CYAN}nginx -t${NC}"
    echo -e "   Nginx Reload: ${CYAN}systemctl reload nginx${NC}"
    echo ""
    
    echo -e "${WHITE}🔐 Güvenlik Bilgileri:${NC}"
    echo -e "   Database Şifresi: ${YELLOW}$POSTGRES_PASSWORD${NC}"
    echo -e "   JWT Secret: ${YELLOW}[Güvenli olarak saklandı]${NC}"
    echo -e "   NextAuth Secret: ${YELLOW}[Güvenli olarak saklandı]${NC}"
    echo ""
    
    echo -e "${WHITE}📋 Sonraki Adımlar:${NC}"
    echo -e "   1. WooCommerce ayarlarını .env dosyasında yapılandırın"
    echo -e "   2. Backup ayarlarını kontrol edin"
    echo -e "   3. SSL sertifikasını test edin (eğer kurulmadıysa)"
    echo -e "   4. Monitoring'i etkinleştirin"
    echo ""
    
    echo -e "${WHITE}🆘 Destek:${NC}"
    echo -e "   Troubleshooting: ${CYAN}cat $INSTALL_DIR/NGINX_TROUBLESHOOTING.md${NC}"
    echo -e "   Port Manager: ${CYAN}$INSTALL_DIR/port-manager.sh status${NC}"
    echo -e "   Nginx Debug: ${CYAN}$INSTALL_DIR/nginx-debug.sh${NC}"
    echo ""
    
    if [[ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]]; then
        echo -e "${YELLOW}⚠️  SSL Uyarısı:${NC}"
        echo -e "   SSL sertifikası oluşturulamadı. Manuel olarak oluşturmak için:"
        echo -e "   ${CYAN}certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME${NC}"
        echo ""
    fi
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