#!/bin/bash

# Oto Parça Panel - Otomatik Kurulum Scripti
# Ubuntu 20.04+ için optimize edilmiştir

set -e  # Hata durumunda scripti durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonu
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root kullanıcısı ile çalıştırılmalıdır. 'sudo ./install.sh' kullanın."
fi

# Domain adı input
get_domain_input() {
    echo ""
    info "=== DOMAIN KONFIGÜRASYONU ==="
    echo ""
    
    # Domain adı al
    while true; do
        read -p "Domain adınızı girin (örn: otoparca.example.com): " DOMAIN_NAME
        
        if [[ -z "$DOMAIN_NAME" ]]; then
            warn "Domain adı boş olamaz!"
            continue
        fi
        
        # Gelişmiş domain format kontrolü
        # Çoklu subdomain'leri destekler (örn: otoparca.isletmemdijitalde.com)
        if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
            warn "Geçersiz domain formatı! Örnekler: example.com, sub.example.com, otoparca.isletmemdijitalde.com"
            continue
        fi
        
        # Domain uzunluk kontrolü
        if [[ ${#DOMAIN_NAME} -gt 253 ]]; then
            warn "Domain adı çok uzun! Maksimum 253 karakter olmalıdır."
            continue
        fi
        
        break
    done
    
    # Email adı al (SSL için)
    read -p "SSL sertifikası için email adresinizi girin (varsayılan: admin@$DOMAIN_NAME): " SSL_EMAIL
    SSL_EMAIL=${SSL_EMAIL:-"admin@$DOMAIN_NAME"}
    
    # Onay al
    echo ""
    info "Girilen bilgiler:"
    echo "Domain: $DOMAIN_NAME"
    echo "SSL Email: $SSL_EMAIL"
    echo ""
    
    read -p "Bu bilgiler doğru mu? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Kurulum iptal edildi."
        exit 1
    fi
    
    log "Domain konfigürasyonu tamamlandı."
}

# Domain input'unu al
get_domain_input

# Sistem bilgilerini kontrol et
check_system() {
    log "Sistem bilgileri kontrol ediliyor..."
    
    # Ubuntu/Debian kontrolü
    if ! command -v apt &> /dev/null; then
        error "Bu script sadece Ubuntu/Debian sistemlerde çalışır."
    fi
    
    # Minimum sistem gereksinimleri
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    AVAILABLE_DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    
    if [ "$TOTAL_MEM" -lt 3500 ]; then
        warn "Sistem RAM'i 4GB'dan az ($TOTAL_MEM MB). Performans sorunları yaşayabilirsiniz."
    fi
    
    if [ "$AVAILABLE_DISK" -lt 15 ]; then
        warn "Kullanılabilir disk alanı 20GB'dan az ($AVAILABLE_DISK GB). Disk alanı yetersiz olabilir."
    fi
    
    log "Sistem kontrolleri tamamlandı."
}

# Sistem güncellemesi
update_system() {
    log "Sistem güncelleniyor..."
    apt update && apt upgrade -y
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    log "Sistem güncellemesi tamamlandı."
}

# Docker kurulumu
install_docker() {
    log "Docker kurulumu başlatılıyor..."
    
    # Eski Docker sürümlerini kaldır
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Docker GPG anahtarını ekle
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Docker repository'sini ekle
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Docker'ı yükle
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Docker servisini başlat
    systemctl enable docker
    systemctl start docker
    
    # Docker Compose kurulumu
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Docker kullanıcı grubuna ekle
    usermod -aG docker $SUDO_USER 2>/dev/null || true
    
    log "Docker kurulumu tamamlandı."
}

# Node.js kurulumu
install_nodejs() {
    log "Node.js kurulumu başlatılıyor..."
    
    # NodeSource repository'sini ekle
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # PM2 kurulumu
    npm install -g pm2
    
    log "Node.js $(node --version) ve PM2 kurulumu tamamlandı."
}

# Python kurulumu kaldırıldı - Scraper local bilgisayarda çalışacak
# install_python() fonksiyonu artık kullanılmıyor

# PostgreSQL kurulumu
install_postgresql() {
    log "PostgreSQL kurulumu başlatılıyor..."
    
    apt install -y postgresql postgresql-contrib
    
    # PostgreSQL servisini başlat
    systemctl enable postgresql
    systemctl start postgresql
    
    log "PostgreSQL kurulumu tamamlandı."
}

# Nginx kurulumu
install_nginx() {
    log "Nginx kurulumu başlatılıyor..."
    
    apt install -y nginx
    
    # Nginx servisini başlat
    systemctl enable nginx
    systemctl start nginx
    
    log "Nginx kurulumu tamamlandı."
}

# Port çakışması kontrolü ve çözümü
check_and_resolve_port_conflicts() {
    log "Port çakışması kontrolü yapılıyor..."
    
    REQUIRED_PORTS=("80" "443" "3000" "3001" "5432" "6379")
    CONFLICTED_PORTS=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if netstat -tlnp | grep ":$port " > /dev/null 2>&1; then
            PROCESS=$(netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f2)
            if [[ "$PROCESS" != "docker-proxy" && "$PROCESS" != "nginx" ]]; then
                warn "Port $port kullanımda: $PROCESS"
                CONFLICTED_PORTS+=("$port:$PROCESS")
            fi
        fi
    done
    
    if [ ${#CONFLICTED_PORTS[@]} -gt 0 ]; then
        echo -e "\n${RED}=== PORT ÇAKIŞMASI TESPİT EDİLDİ ===${NC}"
        echo -e "Aşağıdaki portlar kullanımda:"
        for conflict in "${CONFLICTED_PORTS[@]}"; do
            port=$(echo $conflict | cut -d':' -f1)
            process=$(echo $conflict | cut -d':' -f2)
            echo -e "${YELLOW}Port $port: $process${NC}"
        done
        
        echo -e "\n${BLUE}Çözüm seçenekleri:${NC}"
        echo -e "1. Çakışan servisleri durdur (önerilen)"
        echo -e "2. Alternatif portlar kullan"
        echo -e "3. Manuel çözüm (kurulumu durdur)"
        
        read -p "Seçiminizi yapın (1-3): " -n 1 -r
        echo ""
        
        case $REPLY in
            1)
                log "Çakışan servisler durduruluyor..."
                for conflict in "${CONFLICTED_PORTS[@]}"; do
                    port=$(echo $conflict | cut -d':' -f1)
                    process=$(echo $conflict | cut -d':' -f2)
                    if [[ "$process" != "-" ]]; then
                        pkill -f "$process" 2>/dev/null || true
                        log "$process servisi durduruldu (Port $port)"
                    fi
                done
                ;;
            2)
                warn "Alternatif port kullanımı henüz desteklenmiyor. Manuel konfigürasyon gerekli."
                error "Kurulum iptal edildi. Portları manuel olarak temizleyin."
                ;;
            3)
                error "Kurulum kullanıcı tarafından iptal edildi."
                ;;
            *)
                error "Geçersiz seçim. Kurulum iptal edildi."
                ;;
        esac
    fi
    
    log "Port kontrolü tamamlandı."
}

# Firewall ayarları
setup_firewall() {
    log "Firewall ayarları yapılıyor..."
    
    # UFW kurulumu ve ayarları
    apt install -y ufw
    
    # Varsayılan kurallar
    ufw default deny incoming
    ufw default allow outgoing
    
    # Gerekli portları aç
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 3000  # Frontend
    ufw allow 3001  # Backend
    ufw allow 5000  # Scraper (local connection için)
    
    # UFW'yi etkinleştir
    ufw --force enable
    
    log "Firewall ayarları tamamlandı."
}

# SSL sertifikası kurulumu
install_ssl() {
    log "SSL sertifikası kurulumu başlatılıyor..."
    
    # Certbot kurulumu
    apt install -y certbot python3-certbot-nginx
    
    # SSL setup script'ini çalıştır
    if [ -f "./nginx/ssl-setup.sh" ]; then
        chmod +x ./nginx/ssl-setup.sh
        ./nginx/ssl-setup.sh "$DOMAIN_NAME" "$SSL_EMAIL"
    else
        info "SSL sertifikası için 'certbot --nginx -d $DOMAIN_NAME' komutunu çalıştırın."
    fi
    
    # Otomatik yenileme için crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "SSL kurulumu tamamlandı."
}

# Proje dizinini oluştur
setup_project_directory() {
    log "Proje dizini oluşturuluyor..."
    
    PROJECT_DIR="/opt/oto-parca-panel"
    
    # Proje dizinini oluştur
    mkdir -p $PROJECT_DIR
    mkdir -p $PROJECT_DIR/data/postgres
    mkdir -p $PROJECT_DIR/data/redis
    mkdir -p $PROJECT_DIR/logs
    mkdir -p $PROJECT_DIR/backups
    mkdir -p $PROJECT_DIR/ssl
    
    # İzinleri ayarla
    chown -R $SUDO_USER:$SUDO_USER $PROJECT_DIR
    chmod -R 755 $PROJECT_DIR
    
    log "Proje dizini $PROJECT_DIR oluşturuldu."
}

# Environment dosyalarını oluştur
setup_environment() {
    log "Environment dosyaları oluşturuluyor..."
    
    # Güçlü şifreler oluştur
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # .env dosyasını oluştur
    cat > .env << EOF
# Oto Parça Panel - Production Environment
# Bu dosyayı güvenli tutun ve version control'e eklemeyin

# Domain Configuration
DOMAIN_NAME=$DOMAIN_NAME
SSL_EMAIL=$SSL_EMAIL

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://oto_user:\${POSTGRES_PASSWORD}@postgres:5432/oto_parca_panel

# JWT
JWT_SECRET=$JWT_SECRET

# NextAuth
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN_NAME

# Frontend URLs (Production)
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME/api
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
FRONTEND_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_BACKEND_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_SCRAPER_URL=https://$DOMAIN_NAME/scraper

# Backend URLs (Production)
BACKEND_URL=https://$DOMAIN_NAME
CORS_ORIGIN=https://$DOMAIN_NAME

# WooCommerce (isteğe bağlı)
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=

# Redis
REDIS_URL=redis://redis:6379

# Node Environment
NODE_ENV=production

# Backup (Opsiyonel)
S3_BACKUP_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Monitoring
GRAFANA_PASSWORD=admin123
EOF
    
    # Frontend .env.local dosyasını oluştur
    mkdir -p frontend
    cat > frontend/.env.local << EOF
# Frontend Production Environment
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME/api
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_BACKEND_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_SCRAPER_URL=https://$DOMAIN_NAME/scraper
NEXTAUTH_URL=https://$DOMAIN_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NODE_ENV=production
EOF
    
    chmod 600 .env
    chmod 600 frontend/.env.local
    chown $SUDO_USER:$SUDO_USER .env
    chown $SUDO_USER:$SUDO_USER frontend/.env.local
    
    log "Environment dosyaları oluşturuldu."
    info "Production domain: https://$DOMAIN_NAME"
    info "API URL: https://$DOMAIN_NAME/api"
    warn "Güvenlik için .env dosyasındaki şifreleri değiştirmeyi unutmayın!"
}

# Veritabanını kurulum
setup_database() {
    log "Veritabanı kurulumu başlatılıyor..."
    
    # PostgreSQL kullanıcısı ve veritabanı oluştur
    sudo -u postgres psql << EOF
CREATE DATABASE oto_parca_panel;
CREATE USER oto_user WITH PASSWORD '$POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
\q
EOF
    
    log "Veritabanı kurulumu tamamlandı."
}

# Servisleri başlat
start_services() {
    log "Servisler başlatılıyor..."
    
    # Docker Compose ile servisleri başlat
    docker-compose -f docker-compose.prod.yml up -d
    
    # Servislerin başlamasını bekle
    sleep 30
    
    # Servis durumlarını kontrol et
    docker-compose -f docker-compose.prod.yml ps
    
    log "Servisler başlatıldı."
}

# Sistem optimizasyonu
optimize_system() {
    log "Sistem optimizasyonu yapılıyor..."
    
    # Swap ayarları
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    
    # File descriptor limitleri
    echo '* soft nofile 65536' >> /etc/security/limits.conf
    echo '* hard nofile 65536' >> /etc/security/limits.conf
    
    # Kernel parametreleri
    echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
    echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf
    
    sysctl -p
    
    log "Sistem optimizasyonu tamamlandı."
}

# Log rotation kurulumu
setup_log_rotation() {
    log "Log rotation kurulumu yapılıyor..."
    
    cat > /etc/logrotate.d/oto-parca-panel << EOF
/opt/oto-parca-panel/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SUDO_USER $SUDO_USER
    postrotate
        docker-compose -f /opt/oto-parca-panel/docker-compose.prod.yml restart
    endscript
}
EOF
    
    log "Log rotation kurulumu tamamlandı."
}

# Kurulum sonrası bilgilendirme
post_install_info() {
    log "Kurulum tamamlandı!"
    
    echo -e "\n${GREEN}=== Kurulum Özeti ===${NC}"
    echo -e "${BLUE}Proje Dizini:${NC} /opt/oto-parca-panel"
    echo -e "${BLUE}Frontend URL:${NC} http://$(hostname -I | awk '{print $1}'):3000"
    echo -e "${BLUE}Backend API:${NC} http://$(hostname -I | awk '{print $1}'):3001/api"
    echo -e "${BLUE}Scraper API:${NC} http://$(hostname -I | awk '{print $1}'):5000"
    
    echo -e "\n${YELLOW}=== Sonraki Adımlar ===${NC}"
    echo -e "1. Domain adresinizi .env dosyasında güncelleyin"
    echo -e "2. SSL sertifikası oluşturun: certbot --nginx -d yourdomain.com"
    echo -e "3. WooCommerce ayarlarını .env dosyasında yapılandırın"
    echo -e "4. Backup ayarlarını yapılandırın"
    echo -e "5. Monitoring'i etkinleştirin: docker-compose --profile monitoring up -d"
    
    echo -e "\n${RED}=== Güvenlik Uyarıları ===${NC}"
    echo -e "1. .env dosyasındaki varsayılan şifreleri değiştirin"
    echo -e "2. SSH key-only authentication'ı etkinleştirin"
    echo -e "3. Düzenli backup'ları kontrol edin"
    echo -e "4. Sistem güncellemelerini takip edin"
    
    echo -e "\n${GREEN}Kurulum başarıyla tamamlandı!${NC}"
}

# Ana kurulum fonksiyonu
main() {
    log "Oto Parça Panel kurulumu başlatılıyor..."
    
    check_system
    check_and_resolve_port_conflicts
    update_system
    install_docker
    install_nodejs
    # install_python kaldırıldı - Scraper local bilgisayarda çalışacak
    install_postgresql
    install_nginx
    setup_firewall
    install_ssl
    setup_project_directory
    setup_environment
    setup_database
    optimize_system
    setup_log_rotation
    start_services
    post_install_info
    
    log "Kurulum tamamlandı!"
}

# Script'i çalıştır
main "$@"