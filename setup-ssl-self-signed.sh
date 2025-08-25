#!/bin/bash

# Oto Parça Panel - Self-Signed SSL Certificate Setup Script
# Self-signed SSL sertifikası ile HTTPS kurulumu

set -e

# Renkli output için
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
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Domain kontrolü
DOMAIN="${1:-localhost}"
if [ "$DOMAIN" = "localhost" ]; then
    warn "Domain belirtilmedi, localhost kullanılıyor"
fi

log "Self-signed SSL sertifikası kurulumu başlatılıyor..."
info "Domain: $DOMAIN"

# SSL dizini oluştur
log "SSL dizini oluşturuluyor..."
mkdir -p ./nginx/ssl

# Self-signed sertifika oluştur
log "Self-signed SSL sertifikası oluşturuluyor..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ./nginx/ssl/nginx-selfsigned.key \
    -out ./nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=TR/ST=Istanbul/L=Istanbul/O=OtoParcaPanel/CN=$DOMAIN"

if [ $? -eq 0 ]; then
    log "✅ SSL sertifikası başarıyla oluşturuldu!"
else
    error "❌ SSL sertifikası oluşturulamadı!"
    exit 1
fi

# İzinleri ayarla
chmod 600 ./nginx/ssl/nginx-selfsigned.key
chmod 644 ./nginx/ssl/nginx-selfsigned.crt

log "SSL sertifika izinleri ayarlandı"

# HTTPS server block'u ekle
log "Nginx HTTPS yapılandırması ekleniyor..."

# Mevcut konfigürasyonu yedekle
cp ./nginx/conf.d/default.conf ./nginx/conf.d/default.conf.backup

# HTTPS server block'u ekle
cat >> ./nginx/conf.d/default.conf << EOF

# =============================================================================
# HTTPS SERVER (SSL)
# =============================================================================
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
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
    
    # Root directory
    root /var/www/html;
    index index.html index.htm;
    
    # =============================================================================
    # API ROUTES (Backend - NestJS)
    # =============================================================================
    location /api/ {
        # Proxy settings
        proxy_pass http://backend;
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
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Cache bypass for API
        proxy_cache_bypass 1;
        proxy_no_cache 1;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # =============================================================================
    # SCRAPER ROUTES
    # =============================================================================
    location /scraper/ {
        # CORS headers for remote scraper
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
        
        # Proxy to backend API
        proxy_pass http://backend/api/scraper/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Longer timeouts for scraping operations
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 300s;
        
        # No caching for scraper
        proxy_cache_bypass 1;
        proxy_no_cache 1;
    }
    
    # =============================================================================
    # UPLOADS AND STATIC FILES
    # =============================================================================
    location /uploads/ {
        alias /app/uploads/;
        
        # Cache static files
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Security
        location ~* \.(php|jsp|cgi|asp|aspx)\$ {
            deny all;
        }
    }
    
    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        
        # Try files first, then proxy to frontend
        try_files \$uri @frontend;
    }
    
    # =============================================================================
    # FRONTEND ROUTES (Next.js)
    # =============================================================================
    
    # Next.js static files
    location /_next/static/ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Next.js API routes
    location /_next/webpack-hmr {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Main frontend proxy
    location @frontend {
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
    
    # Default location - frontend
    location / {
        # Try files first, then proxy to frontend
        try_files \$uri \$uri/ @frontend;
    }
    
    # =============================================================================
    # SPECIAL ROUTES
    # =============================================================================
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
    
    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # =============================================================================
    # SECURITY RULES
    # =============================================================================
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Deny access to backup files
    location ~ ~\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Deny access to configuration files
    location ~* \.(conf|config|sql|log)\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Block common exploit attempts
    location ~* (eval\(|base64_decode|gzinflate|\.\.\/) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # =============================================================================
    # ERROR PAGES
    # =============================================================================
    
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
EOF

log "✅ HTTPS server block eklendi"

# Nginx syntax kontrolü
log "Nginx yapılandırması test ediliyor..."
if nginx -t 2>/dev/null; then
    log "✅ Nginx yapılandırması geçerli"
else
    error "❌ Nginx yapılandırması hatalı!"
    # Yedekten geri yükle
    cp ./nginx/conf.d/default.conf.backup ./nginx/conf.d/default.conf
    exit 1
fi

log "🎉 Self-signed SSL kurulumu tamamlandı!"
info "Sertifika konumu: ./nginx/ssl/"
info "Sertifika geçerlilik süresi: 365 gün"
info "HTTPS erişim: https://$DOMAIN"
info "HTTP otomatik olarak HTTPS'e yönlendirilecek"

warn "⚠️  Self-signed sertifika kullanıldığı için tarayıcıda güvenlik uyarısı alabilirsiniz"
info "Üretim ortamında Let's Encrypt sertifikası kullanmanız önerilir"

log "Nginx'i yeniden başlatmayı unutmayın: docker-compose restart nginx"