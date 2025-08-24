#!/bin/bash

# Oto Parça Panel - SSL Certificate Setup Script
# Let's Encrypt ile SSL sertifikası kurulumu

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
if [ -z "$1" ]; then
    error "Domain adı belirtilmedi!"
    echo "Kullanım: $0 <domain_name> [email]"
    echo "Örnek: $0 otoparca.example.com admin@example.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@${DOMAIN}}"

log "SSL sertifikası kurulumu başlatılıyor..."
info "Domain: $DOMAIN"
info "Email: $EMAIL"

# Sistem kontrolü
if ! command -v docker &> /dev/null; then
    error "Docker kurulu değil!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose kurulu değil!"
    exit 1
fi

# Certbot dizinlerini oluştur
log "Certbot dizinleri oluşturuluyor..."
mkdir -p ./certbot/conf
mkdir -p ./certbot/www
mkdir -p ./certbot/logs

# Nginx konfigürasyonunu güncelle (domain ile)
log "Nginx konfigürasyonu güncelleniyor..."
cp ./nginx/conf.d/default.conf ./nginx/conf.d/default.conf.backup

# Domain adını konfigürasyonda güncelle
sed -i "s/yourdomain.com/$DOMAIN/g" ./nginx/conf.d/default.conf
sed -i "s/server_name _;/server_name $DOMAIN;/g" ./nginx/conf.d/default.conf

# Geçici HTTP-only konfigürasyonu oluştur
log "Geçici HTTP konfigürasyonu oluşturuluyor..."
cat > ./nginx/conf.d/temp-http.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Ana konfigürasyonu geçici olarak devre dışı bırak
mv ./nginx/conf.d/default.conf ./nginx/conf.d/default.conf.ssl

# Docker Compose ile Nginx'i başlat (HTTP only)
log "Nginx HTTP modunda başlatılıyor..."
docker-compose up -d nginx

# Nginx'in başlamasını bekle
sleep 10

# SSL sertifikası al
log "SSL sertifikası alınıyor..."
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/logs:/var/log/letsencrypt" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    log "SSL sertifikası başarıyla alındı!"
else
    error "SSL sertifikası alınamadı!"
    # Konfigürasyonu geri al
    rm -f ./nginx/conf.d/temp-http.conf
    mv ./nginx/conf.d/default.conf.ssl ./nginx/conf.d/default.conf
    docker-compose restart nginx
    exit 1
fi

# SSL konfigürasyonunu aktifleştir
log "SSL konfigürasyonu aktifleştiriliyor..."
rm -f ./nginx/conf.d/temp-http.conf
mv ./nginx/conf.d/default.conf.ssl ./nginx/conf.d/default.conf

# Nginx'i yeniden başlat
log "Nginx SSL modunda yeniden başlatılıyor..."
docker-compose restart nginx

# SSL sertifikası bilgilerini göster
log "SSL sertifikası bilgileri:"
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    certbot/certbot certificates

# Otomatik yenileme için cron job oluştur
log "Otomatik yenileme cron job'u oluşturuluyor..."
cat > ./certbot/renew.sh << 'EOF'
#!/bin/bash

# SSL sertifikası otomatik yenileme
cd /opt/otoparcapanel

# Sertifikayı yenile
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/logs:/var/log/letsencrypt" \
    certbot/certbot renew --quiet

# Nginx'i yeniden başlat
if [ $? -eq 0 ]; then
    docker-compose restart nginx
    echo "$(date): SSL sertifikası yenilendi" >> /var/log/ssl-renew.log
fi
EOF

chmod +x ./certbot/renew.sh

# Cron job ekle (her gün saat 02:00'da çalışır)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/otoparcapanel/certbot/renew.sh") | crontab -

log "SSL kurulumu tamamlandı!"
info "Sertifika yenileme: Her gün saat 02:00'da otomatik olarak kontrol edilir"
info "Manuel yenileme: ./certbot/renew.sh"
info "Sertifika durumu: docker run --rm -v \"\$(pwd)/certbot/conf:/etc/letsencrypt\" certbot/certbot certificates"

# Test et
log "SSL bağlantısı test ediliyor..."
if command -v curl &> /dev/null; then
    if curl -s -I "https://$DOMAIN" | grep -q "200 OK"; then
        log "✅ HTTPS bağlantısı başarılı!"
    else
        warn "⚠️  HTTPS bağlantısı test edilemedi"
    fi
fi

log "🎉 SSL kurulumu başarıyla tamamlandı!"
echo ""
info "Sitenize şu adresten erişebilirsiniz: https://$DOMAIN"
info "SSL sertifikası 90 gün geçerlidir ve otomatik olarak yenilenecektir."