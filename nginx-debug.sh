#!/bin/bash

# Nginx Debug ve Troubleshooting Script
# Nginx servis hatalarını tespit eder ve çözüm önerir

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

# Nginx servis durumu analizi
analyze_nginx_status() {
    log "Nginx servis durumu analiz ediliyor..."
    
    echo -e "\n${BLUE}=== Nginx Servis Durumu ===${NC}"
    systemctl status nginx.service --no-pager || true
    
    echo -e "\n${BLUE}=== Nginx Hata Logları ===${NC}"
    journalctl -xeu nginx.service --no-pager -n 50 || true
    
    echo -e "\n${BLUE}=== Nginx Error Log ===${NC}"
    if [ -f "/var/log/nginx/error.log" ]; then
        tail -n 20 /var/log/nginx/error.log || true
    else
        warn "Nginx error log dosyası bulunamadı"
    fi
}

# Nginx konfigürasyon syntax kontrolü
check_nginx_config() {
    log "Nginx konfigürasyon syntax kontrolü yapılıyor..."
    
    echo -e "\n${BLUE}=== Nginx Konfigürasyon Test ===${NC}"
    if nginx -t 2>&1; then
        info "✓ Nginx konfigürasyonu geçerli"
        return 0
    else
        error "✗ Nginx konfigürasyonunda hata var"
        return 1
    fi
}

# Port çakışması kontrolü
check_port_conflicts() {
    log "Port çakışması kontrolü yapılıyor..."
    
    echo -e "\n${BLUE}=== Port Kullanım Durumu ===${NC}"
    
    # Port 80 kontrolü
    if netstat -tlnp | grep ":80 " > /dev/null 2>&1; then
        PROCESS_80=$(netstat -tlnp | grep ":80 " | awk '{print $7}' | cut -d'/' -f2 | head -1)
        if [[ "$PROCESS_80" != "nginx" ]]; then
            warn "Port 80 başka bir process tarafından kullanılıyor: $PROCESS_80"
            netstat -tlnp | grep ":80 "
        else
            info "✓ Port 80 nginx tarafından kullanılıyor"
        fi
    else
        info "Port 80 kullanılabilir"
    fi
    
    # Port 443 kontrolü
    if netstat -tlnp | grep ":443 " > /dev/null 2>&1; then
        PROCESS_443=$(netstat -tlnp | grep ":443 " | awk '{print $7}' | cut -d'/' -f2 | head -1)
        if [[ "$PROCESS_443" != "nginx" ]]; then
            warn "Port 443 başka bir process tarafından kullanılıyor: $PROCESS_443"
            netstat -tlnp | grep ":443 "
        else
            info "✓ Port 443 nginx tarafından kullanılıyor"
        fi
    else
        info "Port 443 kullanılabilir"
    fi
}

# SSL sertifika kontrolü
check_ssl_certificates() {
    log "SSL sertifika kontrolü yapılıyor..."
    
    echo -e "\n${BLUE}=== SSL Sertifika Durumu ===${NC}"
    
    # Let's Encrypt sertifikaları
    if [ -d "/etc/letsencrypt/live" ]; then
        info "Let's Encrypt dizini mevcut"
        ls -la /etc/letsencrypt/live/ || true
    else
        warn "Let's Encrypt sertifika dizini bulunamadı"
    fi
    
    # Nginx SSL konfigürasyonunda belirtilen sertifikaları kontrol et
    if [ -f "/etc/nginx/sites-available/default" ]; then
        SSL_CERT=$(grep "ssl_certificate " /etc/nginx/sites-available/default | head -1 | awk '{print $2}' | sed 's/;//')
        SSL_KEY=$(grep "ssl_certificate_key " /etc/nginx/sites-available/default | head -1 | awk '{print $2}' | sed 's/;//')
        
        if [ -n "$SSL_CERT" ]; then
            if [ -f "$SSL_CERT" ]; then
                info "✓ SSL sertifika dosyası mevcut: $SSL_CERT"
            else
                error "✗ SSL sertifika dosyası bulunamadı: $SSL_CERT"
            fi
        fi
        
        if [ -n "$SSL_KEY" ]; then
            if [ -f "$SSL_KEY" ]; then
                info "✓ SSL private key dosyası mevcut: $SSL_KEY"
            else
                error "✗ SSL private key dosyası bulunamadı: $SSL_KEY"
            fi
        fi
    fi
}

# Nginx dosya izinleri kontrolü
check_nginx_permissions() {
    log "Nginx dosya izinleri kontrolü yapılıyor..."
    
    echo -e "\n${BLUE}=== Nginx Dosya İzinleri ===${NC}"
    
    # Nginx konfigürasyon dizini
    if [ -d "/etc/nginx" ]; then
        info "Nginx konfigürasyon dizini izinleri:"
        ls -la /etc/nginx/ | head -10
    fi
    
    # Nginx log dizini
    if [ -d "/var/log/nginx" ]; then
        info "Nginx log dizini izinleri:"
        ls -la /var/log/nginx/ | head -5
    fi
    
    # Nginx PID dosyası
    if [ -f "/var/run/nginx.pid" ]; then
        info "✓ Nginx PID dosyası mevcut"
        ls -la /var/run/nginx.pid
    else
        warn "Nginx PID dosyası bulunamadı"
    fi
}

# Çözüm önerileri
suggest_solutions() {
    log "Çözüm önerileri sunuluyor..."
    
    echo -e "\n${YELLOW}=== Nginx Hata Çözüm Önerileri ===${NC}"
    
    echo -e "\n${BLUE}1. Konfigürasyon Hatası Çözümü:${NC}"
    echo "   - nginx -t komutu ile syntax hatalarını kontrol edin"
    echo "   - /etc/nginx/sites-available/default dosyasını kontrol edin"
    echo "   - Eksik noktalı virgül veya parantez hatalarını düzeltin"
    
    echo -e "\n${BLUE}2. Port Çakışması Çözümü:${NC}"
    echo "   - sudo netstat -tlnp | grep ':80\|:443' ile çakışan process'leri bulun"
    echo "   - sudo systemctl stop apache2 (Apache çalışıyorsa)"
    echo "   - sudo kill -9 PID (çakışan process'i sonlandırın)"
    
    echo -e "\n${BLUE}3. SSL Sertifika Çözümü:${NC}"
    echo "   - Geçici olarak HTTP-only konfigürasyon kullanın"
    echo "   - sudo certbot --nginx -d otoparca.isletmemdijitalde.com"
    echo "   - SSL sertifika yollarını doğru şekilde ayarlayın"
    
    echo -e "\n${BLUE}4. İzin Sorunları Çözümü:${NC}"
    echo "   - sudo chown -R www-data:www-data /var/log/nginx"
    echo "   - sudo chmod 755 /etc/nginx/sites-available/default"
    echo "   - sudo nginx -s reload (konfigürasyon yeniden yükleme)"
    
    echo -e "\n${BLUE}5. Güvenli Başlatma:${NC}"
    echo "   - sudo nginx -t && sudo systemctl start nginx"
    echo "   - sudo systemctl enable nginx"
    echo "   - sudo systemctl status nginx"
}

# Geçici HTTP-only konfigürasyon oluştur
create_temp_http_config() {
    log "Geçici HTTP-only nginx konfigürasyonu oluşturuluyor..."
    
    cat > /tmp/nginx-temp-http.conf << 'EOF'
server {
    listen 80;
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    
    # Root directory
    root /var/www/html;
    index index.html index.htm;
    
    # API routes (Backend - NestJS)
    location /api/ {
        proxy_pass http://localhost:3001;
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
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    info "Geçici HTTP konfigürasyonu oluşturuldu: /tmp/nginx-temp-http.conf"
    echo "Bu dosyayı /etc/nginx/sites-available/default yerine kopyalayabilirsiniz:"
    echo "sudo cp /tmp/nginx-temp-http.conf /etc/nginx/sites-available/default"
}

# Ana fonksiyon
main() {
    echo -e "${GREEN}=== Nginx Debug ve Troubleshooting ===${NC}"
    echo -e "${BLUE}Nginx servis hatalarını analiz ediyor...${NC}\n"
    
    analyze_nginx_status
    check_nginx_config
    check_port_conflicts
    check_ssl_certificates
    check_nginx_permissions
    suggest_solutions
    create_temp_http_config
    
    echo -e "\n${GREEN}=== Analiz Tamamlandı ===${NC}"
    echo -e "${YELLOW}Çözüm önerilerini uygulayın ve 'sudo systemctl start nginx' ile servisi başlatmayı deneyin.${NC}"
}

# Script'i çalıştır
main "$@"