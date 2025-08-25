#!/bin/bash

# OtoParcaPanel Auto Installer
# Version: 1.1
# Description: Otomatik kurulum scripti - Ubuntu 24.04 için
# Usage: sudo bash auto-installer.sh [--non-interactive] [--debug]

set -e  # Hata durumunda çık

# Komut satırı argümanları
NON_INTERACTIVE=false
DEBUG=false

for arg in "$@"; do
    case $arg in
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        --debug)
            DEBUG=true
            set -x  # Debug mode
            shift
            ;;
        --help)
            echo "Kullanım: sudo bash auto-installer.sh [seçenekler]"
            echo "Seçenekler:"
            echo "  --non-interactive    Kullanıcı etkileşimi olmadan çalıştır"
            echo "  --debug             Debug modunda çalıştır"
            echo "  --help              Bu yardım mesajını göster"
            exit 0
            ;;
        *)
            echo "Bilinmeyen argüman: $arg"
            echo "Yardım için: sudo bash auto-installer.sh --help"
            exit 1
            ;;
    esac
done

# Debug output
if [ "$DEBUG" = "true" ]; then
    echo "DEBUG: Non-interactive mode: $NON_INTERACTIVE"
    echo "DEBUG: Debug mode: $DEBUG"
fi

# Script dizini
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Helper fonksiyonları yükle
if [ -f "$SCRIPT_DIR/install-helper.sh" ]; then
    source "$SCRIPT_DIR/install-helper.sh"
else
    echo "HATA: install-helper.sh dosyası bulunamadı!"
    exit 1
fi

# Global değişkenler
DOMAIN_NAME=""
EMAIL_ADDRESS=""
DB_PASSWORD=""
GITHUB_REPO="https://github.com/yourusername/OtoParcaPanel.git"
PROJECT_DIR="/opt/otoparcapanel"
NODE_VERSION="20"
POSTGRES_VERSION="16"
TOTAL_STEPS=15
CURRENT_STEP=0

# Adım sayacı
next_step() {
    ((CURRENT_STEP++))
    if [ "$DEBUG" = "true" ]; then
        echo "DEBUG: Step $CURRENT_STEP/$TOTAL_STEPS: $1"
    fi
    show_progress $CURRENT_STEP $TOTAL_STEPS "$1"
    log_message "STEP $CURRENT_STEP/$TOTAL_STEPS: $1"
}

# Başlangıç banner
show_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║                 🚗 OtoParcaPanel Installer 🔧                ║"
    echo "║                                                              ║"
    echo "║                    Otomatik Kurulum Aracı                   ║"
    echo "║                      Ubuntu 24.04 LTS                       ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

# Kullanıcı bilgilerini al
collect_user_input() {
    print_header "KURULUM BİLGİLERİ"
    
    # Non-interactive mode için varsayılan değerler
    if [ "$NON_INTERACTIVE" = "true" ]; then
        DOMAIN_NAME="otopanel.isletmemdijitalde.com"
        EMAIL_ADDRESS="admin@otopanel.isletmemdijitalde.com"
        DB_PASSWORD="OtoParca123!"
        print_info "Non-interactive mode: Varsayılan değerler kullanılıyor"
        print_info "Domain: $DOMAIN_NAME"
        print_info "Email: $EMAIL_ADDRESS"
        print_info "DB Password: [HIDDEN]"
        return 0
    fi
    
    # Domain adı
    while [ -z "$DOMAIN_NAME" ]; do
        echo -e "${CYAN}Domain adınızı girin (örn: otopanel.isletmemdijitalde.com):${NC}"
        if read -t 60 -r DOMAIN_NAME; then
            if [ -z "$DOMAIN_NAME" ]; then
                print_error "Domain adı boş olamaz!"
            fi
        else
            print_warning "Timeout! Varsayılan domain kullanılıyor: otopanel.isletmemdijitalde.com"
            DOMAIN_NAME="otopanel.isletmemdijitalde.com"
        fi
    done
    
    # Email adresi
    while [ -z "$EMAIL_ADDRESS" ]; do
        echo -e "${CYAN}Email adresinizi girin (SSL sertifikası için):${NC}"
        if read -t 60 -r EMAIL_ADDRESS; then
            if [ -z "$EMAIL_ADDRESS" ]; then
                print_error "Email adresi boş olamaz!"
            fi
        else
            print_warning "Timeout! Varsayılan email kullanılıyor: admin@$DOMAIN_NAME"
            EMAIL_ADDRESS="admin@$DOMAIN_NAME"
        fi
    done
    
    # Veritabanı şifresi
    while [ -z "$DB_PASSWORD" ]; do
        echo -e "${CYAN}PostgreSQL veritabanı şifresi oluşturun:${NC}"
        if read -t 60 -s DB_PASSWORD; then
            echo
            if [ -z "$DB_PASSWORD" ]; then
                print_error "Veritabanı şifresi boş olamaz!"
            elif [ ${#DB_PASSWORD} -lt 8 ]; then
                print_error "Şifre en az 8 karakter olmalıdır!"
                DB_PASSWORD=""
            fi
        else
            echo
            print_warning "Timeout! Güçlü varsayılan şifre oluşturuluyor"
            DB_PASSWORD="OtoParca$(date +%s)!"
        fi
    done
    
    # GitHub repo (opsiyonel)
    echo -e "${CYAN}GitHub repository URL'si (Enter ile varsayılan):${NC}"
    echo -e "${YELLOW}Varsayılan: $GITHUB_REPO${NC}"
    if read -t 30 -r github_input; then
        if [ -n "$github_input" ]; then
            GITHUB_REPO="$github_input"
        fi
    else
        print_warning "Timeout! Varsayılan GitHub repo kullanılıyor"
    fi
    
    # Bilgileri onaylat
    print_subheader "Kurulum Bilgileri Özeti"
    echo -e "${WHITE}Domain:${NC} $DOMAIN_NAME"
    echo -e "${WHITE}Email:${NC} $EMAIL_ADDRESS"
    echo -e "${WHITE}GitHub Repo:${NC} $GITHUB_REPO"
    echo -e "${WHITE}Proje Dizini:${NC} $PROJECT_DIR"
    echo
    
    if ! confirm "Bu bilgilerle kuruluma devam edilsin mi?" "y" 30; then
        print_info "Kurulum iptal edildi."
        exit 0
    fi
}

# Sistem güncellemesi
update_system() {
    next_step "Sistem güncelleniyor"
    
    execute_command "apt update" "Paket listesi güncellendi"
    execute_command "apt upgrade -y" "Sistem paketleri güncellendi"
    execute_command "apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release" "Temel paketler kuruldu"
}

# Node.js kurulumu
install_nodejs() {
    next_step "Node.js kurulumu"
    
    if command -v node &> /dev/null; then
        local current_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge "$NODE_VERSION" ]; then
            print_success "Node.js zaten kurulu (v$(node --version))"
            return 0
        fi
    fi
    
    execute_command "curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -" "NodeSource repository eklendi"
    execute_command "apt install -y nodejs" "Node.js kuruldu"
    execute_command "npm install -g pm2" "PM2 process manager kuruldu"
    
    print_info "Node.js sürümü: $(node --version)"
    print_info "NPM sürümü: $(npm --version)"
}

# PostgreSQL kurulumu
install_postgresql() {
    next_step "PostgreSQL kurulumu"
    
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL zaten kurulu"
    else
        execute_command "apt install -y postgresql postgresql-contrib" "PostgreSQL kuruldu"
    fi
    
    execute_command "systemctl start postgresql" "PostgreSQL servisi başlatıldı"
    execute_command "systemctl enable postgresql" "PostgreSQL otomatik başlatma etkinleştirildi"
    
    # Veritabanı ve kullanıcı oluştur
    execute_command "sudo -u postgres psql -c \"ALTER USER postgres PASSWORD '$DB_PASSWORD';\"" "PostgreSQL şifresi ayarlandı"
    execute_command "sudo -u postgres createdb oto_parca_panel" "Veritabanı oluşturuldu"
}

# Nginx kurulumu
install_nginx() {
    next_step "Nginx kurulumu"
    
    if command -v nginx &> /dev/null; then
        print_success "Nginx zaten kurulu"
    else
        execute_command "apt install -y nginx" "Nginx kuruldu"
    fi
    
    execute_command "systemctl start nginx" "Nginx servisi başlatıldı"
    execute_command "systemctl enable nginx" "Nginx otomatik başlatma etkinleştirildi"
    
    # Varsayılan site dosyasını yedekle
    backup_file "/etc/nginx/sites-available/default"
}

# Certbot kurulumu (SSL için)
install_certbot() {
    next_step "Certbot (SSL) kurulumu"
    
    if command -v certbot &> /dev/null; then
        print_success "Certbot zaten kurulu"
    else
        execute_command "apt install -y certbot python3-certbot-nginx" "Certbot kuruldu"
    fi
}

# Güvenlik duvarı ayarları
setup_firewall() {
    next_step "Güvenlik duvarı ayarları"
    
    execute_command "ufw --force enable" "UFW etkinleştirildi"
    execute_command "ufw allow ssh" "SSH erişimi açıldı"
    execute_command "ufw allow 'Nginx Full'" "Nginx erişimi açıldı"
    execute_command "ufw allow 5432" "PostgreSQL erişimi açıldı"
    
    print_info "Güvenlik duvarı kuralları:"
    ufw status numbered
}

# Fail2ban kurulumu
install_fail2ban() {
    next_step "Fail2ban güvenlik kurulumu"
    
    execute_command "apt install -y fail2ban" "Fail2ban kuruldu"
    
    # Fail2ban konfigürasyonu
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF
    
    execute_command "systemctl restart fail2ban" "Fail2ban yeniden başlatıldı"
    execute_command "systemctl enable fail2ban" "Fail2ban otomatik başlatma etkinleştirildi"
}

# Proje dosyalarını indir
download_project() {
    next_step "Proje dosyaları indiriliyor"
    
    if [ -d "$PROJECT_DIR" ]; then
        backup_directory "$PROJECT_DIR"
        rm -rf "$PROJECT_DIR"
    fi
    
    execute_command "git clone $GITHUB_REPO $PROJECT_DIR" "Proje GitHub'dan indirildi"
    execute_command "chown -R www-data:www-data $PROJECT_DIR" "Dosya izinleri ayarlandı"
}

# Environment dosyalarını oluştur
setup_environment() {
    next_step "Environment dosyaları oluşturuluyor"
    
    # Backend .env dosyası
    cat > "$PROJECT_DIR/.env" << EOF
# Database
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@localhost:5432/oto_parca_panel"

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://$DOMAIN_NAME

# API Keys (kullanıcı tarafından doldurulacak)
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=

PYTHON_SCRAPER_URL=http://localhost:5000

# Email (opsiyonel)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=$EMAIL_ADDRESS
EOF
    
    # Frontend .env.local dosyası
    cat > "$PROJECT_DIR/.env.local" << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME/api
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_BACKEND_URL=https://$DOMAIN_NAME/api
NODE_ENV=production
EOF
    
    execute_command "chown www-data:www-data $PROJECT_DIR/.env $PROJECT_DIR/.env.local" "Environment dosya izinleri ayarlandı"
    print_success "Environment dosyaları oluşturuldu"
}

# Bağımlılıkları kur
install_dependencies() {
    next_step "Proje bağımlılıkları kuruluyor"
    
    cd "$PROJECT_DIR"
    
    # Backend bağımlılıkları
    if [ -f "package.json" ]; then
        execute_command "npm install --production" "Backend bağımlılıkları kuruldu"
    fi
    
    # Frontend bağımlılıkları ve build
    execute_command "npm run build" "Frontend build edildi"
}

# Veritabanı migration
setup_database() {
    next_step "Veritabanı kurulumu"
    
    cd "$PROJECT_DIR"
    
    # Migration dosyalarını çalıştır
    if [ -d "migrations" ]; then
        execute_command "npm run migrate" "Veritabanı migration tamamlandı"
    fi
    
    # Seed data
    if [ -f "scripts/seed.js" ]; then
        execute_command "npm run seed" "Demo veriler yüklendi"
    fi
}

# PM2 konfigürasyonu
setup_pm2() {
    next_step "PM2 process manager ayarları"
    
    cd "$PROJECT_DIR"
    
    # PM2 ecosystem dosyası oluştur
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'otoparcapanel-backend',
    script: './api/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/otoparcapanel-error.log',
    out_file: '/var/log/pm2/otoparcapanel-out.log',
    log_file: '/var/log/pm2/otoparcapanel.log',
    time: true
  }]
};
EOF
    
    # PM2 log dizini oluştur
    execute_command "mkdir -p /var/log/pm2" "PM2 log dizini oluşturuldu"
    execute_command "chown -R www-data:www-data /var/log/pm2" "PM2 log izinleri ayarlandı"
    
    # PM2 ile uygulamayı başlat
    execute_command "pm2 start ecosystem.config.js" "Backend PM2 ile başlatıldı"
    execute_command "pm2 save" "PM2 konfigürasyonu kaydedildi"
    execute_command "pm2 startup" "PM2 otomatik başlatma ayarlandı"
}

# Nginx konfigürasyonu
setup_nginx_config() {
    next_step "Nginx konfigürasyonu"
    
    # Nginx site konfigürasyonu
    cat > "/etc/nginx/sites-available/$DOMAIN_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # HTTP'den HTTPS'e yönlendirme
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;
    
    # SSL sertifikaları (Certbot tarafından otomatik eklenecek)
    
    # Güvenlik başlıkları
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip sıkıştırma
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static dosyalar
    location /_next/static {
        alias $PROJECT_DIR/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # API istekleri
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Ana uygulama
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Dosya yükleme limiti
    client_max_body_size 50M;
}
EOF
    
    # Site'ı etkinleştir
    execute_command "ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/" "Nginx site etkinleştirildi"
    execute_command "rm -f /etc/nginx/sites-enabled/default" "Varsayılan site devre dışı bırakıldı"
    execute_command "nginx -t" "Nginx konfigürasyonu test edildi"
    execute_command "systemctl reload nginx" "Nginx yeniden yüklendi"
}

# SSL sertifikası
setup_ssl() {
    next_step "SSL sertifikası kurulumu"
    
    # DNS kontrolü
    print_info "DNS kontrolü yapılıyor..."
    if ! nslookup "$DOMAIN_NAME" &> /dev/null; then
        print_warning "DNS kaydı bulunamadı. Lütfen domain'in bu sunucuya yönlendirildiğinden emin olun."
        if ! confirm "DNS ayarları tamamlandı ve devam etmek istiyor musunuz?" "y" 60; then
            print_error "SSL kurulumu iptal edildi"
            return 1
        fi
    fi
    
    # Certbot ile SSL sertifikası al
    execute_command "certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL_ADDRESS" "SSL sertifikası kuruldu"
    
    # Otomatik yenileme
    execute_command "systemctl enable certbot.timer" "SSL otomatik yenileme etkinleştirildi"
}

# Final testler
run_final_tests() {
    next_step "Final testler yapılıyor"
    
    print_subheader "Servis Durumları"
    check_service_status "nginx"
    check_service_status "postgresql"
    
    print_subheader "Port Kontrolü"
    check_port "80" "HTTP"
    check_port "443" "HTTPS"
    check_port "3001" "Backend API"
    check_port "5432" "PostgreSQL"
    
    print_subheader "PM2 Durumu"
    pm2 status
    
    print_subheader "SSL Sertifikası"
    if certbot certificates | grep -q "$DOMAIN_NAME"; then
        print_success "SSL sertifikası aktif"
    else
        print_warning "SSL sertifikası kontrolü başarısız"
    fi
}

# Kurulum özeti
show_installation_summary() {
    print_header "KURULUM TAMAMLANDI! 🎉"
    
    echo -e "${GREEN}✅ OtoParcaPanel başarıyla kuruldu!${NC}\n"
    
    echo -e "${WHITE}📋 Kurulum Bilgileri:${NC}"
    echo -e "${CYAN}• Website URL:${NC} https://$DOMAIN_NAME"
    echo -e "${CYAN}• Admin Panel:${NC} https://$DOMAIN_NAME/admin"
    echo -e "${CYAN}• API Endpoint:${NC} https://$DOMAIN_NAME/api"
    echo -e "${CYAN}• Proje Dizini:${NC} $PROJECT_DIR"
    echo -e "${CYAN}• Log Dosyaları:${NC} /var/log/pm2/"
    echo -e "${CYAN}• Backup Dizini:${NC} $BACKUP_DIR"
    
    echo -e "\n${WHITE}🔐 Varsayılan Giriş Bilgileri:${NC}"
    echo -e "${CYAN}• Email:${NC} admin@otoparcapanel.com"
    echo -e "${CYAN}• Şifre:${NC} Admin123!"
    
    echo -e "\n${WHITE}⚙️ Yönetim Komutları:${NC}"
    echo -e "${CYAN}• PM2 Durumu:${NC} pm2 status"
    echo -e "${CYAN}• PM2 Logları:${NC} pm2 logs"
    echo -e "${CYAN}• PM2 Yeniden Başlat:${NC} pm2 restart all"
    echo -e "${CYAN}• Nginx Test:${NC} nginx -t"
    echo -e "${CYAN}• Nginx Yeniden Yükle:${NC} systemctl reload nginx"
    echo -e "${CYAN}• SSL Yenile:${NC} certbot renew"
    
    echo -e "\n${WHITE}📝 Önemli Notlar:${NC}"
    echo -e "${YELLOW}• WooCommerce API bilgilerini ayarlar sayfasından güncelleyin${NC}"
    echo -e "${YELLOW}• Python Scraper API'sini ayrıca kurmanız gerekiyor${NC}"
    echo -e "${YELLOW}• Email SMTP ayarlarını yapılandırın${NC}"
    echo -e "${YELLOW}• Düzenli yedekleme ayarlayın${NC}"
    
    echo -e "\n${WHITE}📞 Destek:${NC}"
    echo -e "${CYAN}• Log Dosyası:${NC} $LOG_FILE"
    echo -e "${CYAN}• Hata Logları:${NC} $ERROR_LOG"
    
    print_success "Kurulum başarıyla tamamlandı!"
}

# Ana kurulum fonksiyonu
main() {
    show_banner
    
    # Sistem gereksinimleri kontrolü
    if ! check_system_requirements; then
        print_error "Sistem gereksinimleri karşılanmıyor. Kurulum durduruluyor."
        exit 1
    fi
    
    # Kullanıcı bilgilerini al
    collect_user_input
    
    print_header "KURULUM BAŞLATILIYOR"
    print_info "Toplam $TOTAL_STEPS adım gerçekleştirilecek..."
    
    # Kurulum adımları
    update_system
    install_nodejs
    install_postgresql
    install_nginx
    install_certbot
    setup_firewall
    install_fail2ban
    download_project
    setup_environment
    install_dependencies
    setup_database
    setup_pm2
    setup_nginx_config
    setup_ssl
    run_final_tests
    
    # Kurulum özeti
    show_installation_summary
    
    # Cleanup
    cleanup
}

# Script'i çalıştır
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi