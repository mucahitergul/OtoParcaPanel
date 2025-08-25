#!/bin/bash

# SSL Sertifika Kontrol ve Yönetim Scripti
# SSL sertifikalarını kontrol eder ve gerekli düzenlemeleri yapar

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Domain adını al
DOMAIN="otoparca.isletmemdijitalde.com"

# SSL sertifika durumunu kontrol et
check_ssl_status() {
    log "SSL sertifika durumu kontrol ediliyor..."
    
    echo -e "\n${BLUE}=== SSL Sertifika Durumu ===${NC}"
    
    # Let's Encrypt sertifika dizini kontrolü
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        info "✓ Let's Encrypt sertifika dizini mevcut: /etc/letsencrypt/live/$DOMAIN"
        
        # Sertifika dosyalarını kontrol et
        local cert_files=("fullchain.pem" "privkey.pem" "cert.pem" "chain.pem")
        for file in "${cert_files[@]}"; do
            if [ -f "/etc/letsencrypt/live/$DOMAIN/$file" ]; then
                info "✓ $file mevcut"
                
                # Dosya izinlerini kontrol et
                local perms=$(stat -c "%a" "/etc/letsencrypt/live/$DOMAIN/$file")
                info "  İzinler: $perms"
            else
                error "✗ $file bulunamadı"
            fi
        done
        
        # Sertifika geçerlilik tarihi
        if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then
            local expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)
            info "Sertifika geçerlilik tarihi: $expiry"
            
            # Sertifika ne kadar süre geçerli
            local expiry_epoch=$(date -d "$expiry" +%s)
            local current_epoch=$(date +%s)
            local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [ $days_left -gt 30 ]; then
                info "✓ Sertifika $days_left gün daha geçerli"
            elif [ $days_left -gt 0 ]; then
                warn "⚠ Sertifika $days_left gün sonra sona erecek"
            else
                error "✗ Sertifika süresi dolmuş ($days_left gün önce)"
            fi
        fi
    else
        warn "Let's Encrypt sertifika dizini bulunamadı: /etc/letsencrypt/live/$DOMAIN"
    fi
    
    # Certbot kurulu mu kontrol et
    if command -v certbot &> /dev/null; then
        info "✓ Certbot kurulu"
        
        # Certbot sertifika listesi
        echo -e "\n${BLUE}Certbot sertifika listesi:${NC}"
        certbot certificates 2>/dev/null || warn "Certbot sertifika listesi alınamadı"
    else
        warn "Certbot kurulu değil"
    fi
}

# Nginx SSL konfigürasyonunu kontrol et
check_nginx_ssl_config() {
    log "Nginx SSL konfigürasyonu kontrol ediliyor..."
    
    echo -e "\n${BLUE}=== Nginx SSL Konfigürasyonu ===${NC}"
    
    local nginx_configs=(
        "/etc/nginx/sites-available/default"
        "/etc/nginx/sites-enabled/default"
        "/etc/nginx/conf.d/default.conf"
        "./nginx/conf.d/default.conf"
    )
    
    for config in "${nginx_configs[@]}"; do
        if [ -f "$config" ]; then
            info "Nginx konfigürasyon dosyası bulundu: $config"
            
            # SSL direktiflerini kontrol et
            if grep -q "ssl_certificate" "$config"; then
                local ssl_cert=$(grep "ssl_certificate " "$config" | head -1 | awk '{print $2}' | sed 's/;//')
                local ssl_key=$(grep "ssl_certificate_key " "$config" | head -1 | awk '{print $2}' | sed 's/;//')
                
                info "SSL sertifika yolu: $ssl_cert"
                info "SSL private key yolu: $ssl_key"
                
                # Dosyaların varlığını kontrol et
                if [ -n "$ssl_cert" ] && [ -f "$ssl_cert" ]; then
                    info "✓ SSL sertifika dosyası mevcut"
                else
                    error "✗ SSL sertifika dosyası bulunamadı: $ssl_cert"
                fi
                
                if [ -n "$ssl_key" ] && [ -f "$ssl_key" ]; then
                    info "✓ SSL private key dosyası mevcut"
                else
                    error "✗ SSL private key dosyası bulunamadı: $ssl_key"
                fi
            else
                warn "SSL konfigürasyonu bulunamadı (HTTP-only mode)"
            fi
            
            # HTTPS listen direktifi kontrol et
            if grep -q "listen.*443.*ssl" "$config"; then
                info "✓ HTTPS (443) port konfigürasyonu mevcut"
            else
                warn "HTTPS (443) port konfigürasyonu bulunamadı"
            fi
            
            break
        fi
    done
}

# SSL sertifika oluşturma
create_ssl_certificate() {
    log "SSL sertifika oluşturma işlemi başlatılıyor..."
    
    # Certbot kurulu mu kontrol et
    if ! command -v certbot &> /dev/null; then
        warn "Certbot kurulu değil, kuruluyor..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Domain'in DNS'e yönlendirildiğini kontrol et
    echo -e "\n${BLUE}=== DNS Kontrolü ===${NC}"
    local domain_ip=$(dig +short $DOMAIN)
    local server_ip=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    
    info "Domain IP: $domain_ip"
    info "Sunucu IP: $server_ip"
    
    if [ "$domain_ip" = "$server_ip" ]; then
        info "✓ Domain doğru sunucuya yönlendirilmiş"
    else
        warn "⚠ Domain farklı bir IP'ye yönlendirilmiş"
        echo "SSL sertifika oluşturmadan önce domain'in DNS ayarlarını kontrol edin."
        read -p "Devam etmek ister misiniz? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "İşlem iptal edildi"
            return 1
        fi
    fi
    
    # Nginx'in çalıştığından emin ol
    if ! systemctl is-active --quiet nginx; then
        warn "Nginx çalışmıyor, başlatılıyor..."
        systemctl start nginx || {
            error "Nginx başlatılamadı"
            return 1
        }
    fi
    
    # SSL sertifika oluştur
    echo -e "\n${BLUE}=== SSL Sertifika Oluşturma ===${NC}"
    info "Let's Encrypt ile SSL sertifika oluşturuluyor..."
    
    # Email adresini al
    read -p "SSL sertifikası için email adresinizi girin: " ssl_email
    
    if [ -z "$ssl_email" ]; then
        ssl_email="admin@$DOMAIN"
        warn "Email adresi girilmedi, varsayılan kullanılıyor: $ssl_email"
    fi
    
    # Certbot komutunu çalıştır
    if certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $ssl_email --agree-tos --non-interactive; then
        info "✓ SSL sertifika başarıyla oluşturuldu"
        
        # Otomatik yenileme için crontab ekle
        if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            info "✓ Otomatik sertifika yenileme eklendi"
        fi
    else
        error "SSL sertifika oluşturulamadı"
        return 1
    fi
}

# HTTP-only konfigürasyon oluştur
create_http_only_config() {
    log "HTTP-only nginx konfigürasyonu oluşturuluyor..."
    
    local config_file="./nginx/conf.d/default.conf"
    
    # Mevcut konfigürasyonu yedekle
    if [ -f "$config_file" ]; then
        cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        info "Mevcut konfigürasyon yedeklendi"
    fi
    
    # HTTP-only konfigürasyon oluştur
    cat > "$config_file" << 'EOF'
# Oto Parça Panel - HTTP Configuration (Temporary)
# SSL kurulumu sonrası HTTPS'e geçilecek

# =============================================================================
# UPSTREAM DEFINITIONS
# =============================================================================
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

# =============================================================================
# MAIN HTTP SERVER
# =============================================================================
server {
    listen 80;
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    
    # Root directory
    root /var/www/html;
    index index.html index.htm;
    
    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    info "✓ HTTP-only konfigürasyon oluşturuldu: $config_file"
}

# Ana fonksiyon
main() {
    echo -e "${GREEN}=== SSL Sertifika Kontrol ve Yönetim Aracı ===${NC}"
    echo -e "${BLUE}Domain: $DOMAIN${NC}\n"
    
    check_ssl_status
    check_nginx_ssl_config
    
    echo -e "\n${YELLOW}=== SSL Yönetim Seçenekleri ===${NC}"
    echo "1. SSL sertifika oluştur (Let's Encrypt)"
    echo "2. HTTP-only konfigürasyon oluştur (geçici)"
    echo "3. SSL sertifika yenile"
    echo "4. SSL sertifika test et"
    echo "5. Çıkış"
    
    read -p "Seçiminizi yapın (1-5): " choice
    
    case $choice in
        1)
            create_ssl_certificate
            ;;
        2)
            create_http_only_config
            ;;
        3)
            if command -v certbot &> /dev/null; then
                log "SSL sertifika yenileniyor..."
                certbot renew --dry-run
            else
                error "Certbot kurulu değil"
            fi
            ;;
        4)
            if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then
                log "SSL sertifika test ediliyor..."
                openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" -text -noout | head -20
            else
                error "SSL sertifika dosyası bulunamadı"
            fi
            ;;
        5)
            info "Çıkış yapılıyor..."
            exit 0
            ;;
        *)
            error "Geçersiz seçim: $choice"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}=== İşlem Tamamlandı ===${NC}"
}

# Script'i çalıştır
main "$@"