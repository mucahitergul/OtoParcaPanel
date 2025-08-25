#!/bin/bash

# Nginx Güvenli Başlatma Scripti
# Nginx'i güvenli bir şekilde başlatır ve tüm kontrolleri yapar

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

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Sistem gereksinimlerini kontrol et
check_system_requirements() {
    log "Sistem gereksinimleri kontrol ediliyor..."
    
    # Nginx kurulu mu?
    if ! command -v nginx &> /dev/null; then
        error "Nginx kurulu değil"
        read -p "Nginx'i kurmak ister misiniz? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Nginx kuruluyor..."
            apt update
            apt install -y nginx
            info "✓ Nginx kuruldu"
        else
            error "Nginx olmadan devam edilemez"
            exit 1
        fi
    else
        info "✓ Nginx kurulu"
    fi
    
    # Gerekli dizinleri kontrol et
    local required_dirs=(
        "/etc/nginx"
        "/var/log/nginx"
        "/var/www"
        "/etc/nginx/sites-available"
        "/etc/nginx/sites-enabled"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            info "✓ Dizin mevcut: $dir"
        else
            warn "Dizin bulunamadı: $dir"
            mkdir -p "$dir" 2>/dev/null || true
        fi
    done
    
    # Nginx kullanıcısı var mı?
    if id "www-data" &>/dev/null; then
        info "✓ www-data kullanıcısı mevcut"
    else
        warn "www-data kullanıcısı bulunamadı"
    fi
}

# Nginx konfigürasyonunu doğrula ve düzelt
validate_and_fix_config() {
    log "Nginx konfigürasyonu doğrulanıyor ve düzeltiliyor..."
    
    # Ana nginx.conf dosyasını kontrol et
    if [ -f "/etc/nginx/nginx.conf" ]; then
        info "Ana nginx.conf dosyası mevcut"
    else
        warn "Ana nginx.conf dosyası bulunamadı, varsayılan oluşturuluyor..."
        create_default_nginx_conf
    fi
    
    # Proje konfigürasyon dosyasını kontrol et
    local project_config="./nginx/conf.d/default.conf"
    if [ -f "$project_config" ]; then
        info "Proje konfigürasyon dosyası mevcut: $project_config"
        
        # Konfigürasyonu test et
        if nginx -t -c /dev/stdin < "$project_config" 2>/dev/null; then
            info "✓ Proje konfigürasyonu geçerli"
        else
            warn "Proje konfigürasyonunda sorun var, düzeltiliyor..."
            fix_project_config "$project_config"
        fi
    else
        warn "Proje konfigürasyon dosyası bulunamadı, oluşturuluyor..."
        create_project_config
    fi
    
    # Konfigürasyonu sistem dizinine kopyala
    copy_config_to_system
    
    # Final syntax kontrolü
    log "Final nginx konfigürasyon testi yapılıyor..."
    if nginx -t; then
        success "✓ Nginx konfigürasyonu geçerli"
        return 0
    else
        error "✗ Nginx konfigürasyonunda hala hatalar var"
        return 1
    fi
}

# Varsayılan nginx.conf oluştur
create_default_nginx_conf() {
    log "Varsayılan nginx.conf oluşturuluyor..."
    
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
    # multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    ##
    # Logging Settings
    ##
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
    
    info "✓ Varsayılan nginx.conf oluşturuldu"
}

# Proje konfigürasyonunu düzelt
fix_project_config() {
    local config_file="$1"
    log "Proje konfigürasyonu düzeltiliyor: $config_file"
    
    # Yedek oluştur
    cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Yaygın hataları düzelt
    sed -i 's/proxy_pass http:\/\/backend;/proxy_pass http:\/\/localhost:3001;/g' "$config_file"
    sed -i 's/proxy_pass http:\/\/frontend;/proxy_pass http:\/\/localhost:3000;/g' "$config_file"
    
    info "✓ Proje konfigürasyonu düzeltildi"
}

# Yeni proje konfigürasyonu oluştur
create_project_config() {
    log "Yeni proje konfigürasyonu oluşturuluyor..."
    
    mkdir -p "./nginx/conf.d"
    
    cat > "./nginx/conf.d/default.conf" << 'EOF'
# Oto Parça Panel - HTTP Configuration
# Production domain için optimize edilmiş konfigürasyon

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://otoparca.isletmemdijitalde.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://otoparca.isletmemdijitalde.com";
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
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF
    
    info "✓ Yeni proje konfigürasyonu oluşturuldu"
}

# Konfigürasyonu sistem dizinine kopyala
copy_config_to_system() {
    log "Konfigürasyon sistem dizinine kopyalanıyor..."
    
    local project_config="./nginx/conf.d/default.conf"
    local system_config="/etc/nginx/sites-available/default"
    
    if [ -f "$project_config" ]; then
        # Mevcut sistem konfigürasyonunu yedekle
        if [ -f "$system_config" ]; then
            cp "$system_config" "${system_config}.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        
        # Yeni konfigürasyonu kopyala
        cp "$project_config" "$system_config"
        
        # Sembolik link oluştur
        ln -sf "$system_config" "/etc/nginx/sites-enabled/default"
        
        info "✓ Konfigürasyon sistem dizinine kopyalandı"
    else
        error "Proje konfigürasyon dosyası bulunamadı"
        return 1
    fi
}

# Port çakışmalarını çöz
resolve_port_conflicts() {
    log "Port çakışmaları çözülüyor..."
    
    # Port 80 kontrolü
    if netstat -tlnp | grep ":80 " | grep -v nginx > /dev/null 2>&1; then
        warn "Port 80'de çakışma tespit edildi"
        
        # Apache'yi durdur
        if systemctl is-active --quiet apache2 2>/dev/null; then
            log "Apache durdruluyor..."
            systemctl stop apache2
            systemctl disable apache2
            info "✓ Apache durduruldu"
        fi
        
        # Diğer çakışan process'leri durdur
        local conflicting_pids=$(netstat -tlnp | grep ":80 " | grep -v nginx | awk '{print $7}' | cut -d'/' -f1 | grep -v '^-$')
        for pid in $conflicting_pids; do
            if ps -p $pid > /dev/null 2>&1; then
                local cmd=$(ps -p $pid -o cmd --no-headers)
                warn "Port 80'de çakışan process durdruluyor: $cmd (PID: $pid)"
                kill -TERM $pid 2>/dev/null || true
                sleep 2
                if ps -p $pid > /dev/null 2>&1; then
                    kill -KILL $pid 2>/dev/null || true
                fi
            fi
        done
    fi
    
    info "✓ Port çakışmaları çözüldü"
}

# Nginx'i güvenli başlat
safe_start_nginx() {
    log "Nginx güvenli başlatma işlemi başlıyor..."
    
    # Önce nginx'i durdur
    if systemctl is-active --quiet nginx; then
        log "Mevcut nginx servisi durduruluyor..."
        systemctl stop nginx
    fi
    
    # Konfigürasyon testini yap
    if ! nginx -t; then
        error "Nginx konfigürasyonunda hata var, başlatma iptal edildi"
        return 1
    fi
    
    # Nginx'i başlat
    log "Nginx servisi başlatılıyor..."
    if systemctl start nginx; then
        success "✓ Nginx başarıyla başlatıldı"
        
        # Servisi etkinleştir
        systemctl enable nginx
        
        # Durum kontrolü
        sleep 3
        if systemctl is-active --quiet nginx; then
            success "✓ Nginx servisi aktif ve çalışıyor"
            
            # Port kontrolü
            if netstat -tlnp | grep ":80.*nginx" > /dev/null; then
                success "✓ Nginx port 80'de dinliyor"
            else
                warn "Nginx port 80'de dinlemiyor"
            fi
            
            # Test isteği gönder
            if curl -s -f http://localhost/health > /dev/null; then
                success "✓ Nginx health check başarılı"
            else
                warn "Nginx health check başarısız"
            fi
        else
            error "Nginx servisi başlatılamadı"
            systemctl status nginx --no-pager
            return 1
        fi
    else
        error "Nginx başlatılamadı"
        journalctl -xeu nginx.service --no-pager -n 20
        return 1
    fi
}

# Servis durumunu göster
show_service_status() {
    log "Nginx servis durumu gösteriliyor..."
    
    echo -e "\n${BLUE}=== Nginx Servis Durumu ===${NC}"
    systemctl status nginx --no-pager || true
    
    echo -e "\n${BLUE}=== Port Durumu ===${NC}"
    netstat -tlnp | grep nginx || echo "Nginx portları bulunamadı"
    
    echo -e "\n${BLUE}=== Son Nginx Logları ===${NC}"
    tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "Error log bulunamadı"
    
    echo -e "\n${BLUE}=== Nginx Konfigürasyon Test ===${NC}"
    nginx -t || true
}

# Ana fonksiyon
main() {
    echo -e "${GREEN}=== Nginx Güvenli Başlatma Aracı ===${NC}"
    echo -e "${BLUE}Nginx'i güvenli bir şekilde başlatır ve tüm kontrolleri yapar${NC}\n"
    
    # Root kontrolü
    if [[ $EUID -ne 0 ]]; then
        error "Bu script root kullanıcısı ile çalıştırılmalıdır"
        exit 1
    fi
    
    log "Nginx güvenli başlatma işlemi başlıyor..."
    
    # Adım adım işlemler
    check_system_requirements
    resolve_port_conflicts
    validate_and_fix_config
    safe_start_nginx
    show_service_status
    
    echo -e "\n${GREEN}=== Nginx Güvenli Başlatma Tamamlandı ===${NC}"
    
    # Sonuç özeti
    if systemctl is-active --quiet nginx; then
        success "🎉 Nginx başarıyla çalışıyor!"
        echo -e "${BLUE}Test URL: http://otoparca.isletmemdijitalde.com/health${NC}"
        echo -e "${BLUE}Admin Panel: http://otoparca.isletmemdijitalde.com${NC}"
    else
        error "❌ Nginx başlatılamadı"
        echo -e "${YELLOW}Troubleshooting için şu komutları çalıştırın:${NC}"
        echo "  - systemctl status nginx"
        echo "  - journalctl -xeu nginx.service"
        echo "  - nginx -t"
        echo "  - ./nginx-debug.sh"
    fi
}

# Script'i çalıştır
main "$@"