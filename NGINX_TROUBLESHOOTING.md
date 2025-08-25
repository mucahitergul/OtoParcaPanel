# Nginx Troubleshooting Rehberi

Bu rehber, Oto Parça Panel projesinde karşılaşılan nginx sorunlarının çözümü için hazırlanmıştır.

## 🚨 Hızlı Çözüm Komutları

```bash
# Nginx servis hatası için hızlı çözüm
sudo ./nginx-safe-start.sh

# Port çakışması çözümü
sudo ./fix-nginx-ports.sh

# SSL sertifika kontrolü
sudo ./ssl-check.sh

# Detaylı hata analizi
sudo ./nginx-debug.sh
```

## 📋 Yaygın Nginx Hataları ve Çözümleri

### 1. "Job for nginx.service failed because the control process exited with error code"

**Neden:** Nginx konfigürasyon hatası, port çakışması veya eksik dosyalar.

**Çözüm Adımları:**

```bash
# 1. Detaylı hata analizi
sudo systemctl status nginx.service
sudo journalctl -xeu nginx.service

# 2. Konfigürasyon syntax kontrolü
sudo nginx -t

# 3. Port çakışması kontrolü
sudo netstat -tlnp | grep ':80\|:443'

# 4. Otomatik çözüm
sudo ./nginx-safe-start.sh
```

### 2. "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"

**Neden:** Port 80 başka bir servis tarafından kullanılıyor.

**Çözüm:**

```bash
# Çakışan servisi bul
sudo netstat -tlnp | grep ':80'

# Apache varsa durdur
sudo systemctl stop apache2
sudo systemctl disable apache2

# Çakışan process'i durdur
sudo kill -9 PID_NUMBER

# Otomatik port temizleme
sudo ./fix-nginx-ports.sh
```

### 3. "nginx: [emerg] cannot load certificate"

**Neden:** SSL sertifika dosyaları bulunamıyor veya izin sorunu.

**Çözüm:**

```bash
# SSL sertifika kontrolü
sudo ./ssl-check.sh

# Geçici HTTP-only konfigürasyon
sudo cp ./nginx/conf.d/default.conf /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl restart nginx

# SSL sertifika oluştur
sudo certbot --nginx -d otoparca.isletmemdijitalde.com
```

### 4. "nginx: [emerg] upstream "backend" not found"

**Neden:** Upstream tanımları eksik.

**Çözüm:**

```bash
# Konfigürasyon dosyasını düzelt
sudo nano /etc/nginx/sites-available/default

# Upstream tanımlarını ekle:
upstream backend {
    server localhost:3001;
    keepalive 32;
}

upstream frontend {
    server localhost:3000;
    keepalive 32;
}

# Test ve yeniden başlat
sudo nginx -t && sudo systemctl restart nginx
```

### 5. "502 Bad Gateway" Hatası

**Neden:** Backend servisleri çalışmıyor.

**Çözüm:**

```bash
# Backend servislerini kontrol et
curl http://localhost:3001/api/health
curl http://localhost:3000

# Servisleri başlat
sudo ./start-services.sh production start

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

### 6. CORS Policy Hataları

**Neden:** Yanlış CORS konfigürasyonu.

**Çözüm:**

```bash
# Nginx konfigürasyonunda CORS headers'ı kontrol et
sudo nano /etc/nginx/sites-available/default

# Production domain için CORS ayarları:
add_header Access-Control-Allow-Origin "https://otoparca.isletmemdijitalde.com" always;
add_header Access-Control-Allow-Credentials "true" always;

# Test ve yeniden başlat
sudo nginx -t && sudo systemctl reload nginx
```

## 🔧 Adım Adım Troubleshooting

### Adım 1: Sistem Durumu Kontrolü

```bash
# Nginx durumu
sudo systemctl status nginx

# Sistem kaynakları
free -h
df -h
top

# Port kullanımı
sudo netstat -tlnp | grep nginx
```

### Adım 2: Log Analizi

```bash
# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Systemd journal
sudo journalctl -xeu nginx.service -f
```

### Adım 3: Konfigürasyon Kontrolü

```bash
# Syntax test
sudo nginx -t

# Konfigürasyon dosyalarını listele
sudo nginx -T

# Aktif konfigürasyon
sudo nginx -s reload
```

### Adım 4: Network ve Port Kontrolü

```bash
# Tüm dinlenen portlar
sudo netstat -tlnp

# Nginx portları
sudo ss -tlnp | grep nginx

# Firewall durumu
sudo ufw status
```

### Adım 5: Backend Servis Kontrolü

```bash
# Backend API test
curl -I http://localhost:3001/api/health

# Frontend test
curl -I http://localhost:3000

# PM2 durumu (varsa)
pm2 status
```

## 🛠️ Konfigürasyon Şablonları

### HTTP-Only Konfigürasyon (Geçici)

```nginx
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
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    }
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### HTTPS Konfigürasyon (Production)

```nginx
server {
    listen 80;
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    
    ssl_certificate /etc/letsencrypt/live/otoparca.isletmemdijitalde.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/otoparca.isletmemdijitalde.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # API ve Frontend proxy ayarları...
}
```

## 🔍 Hata Kodları ve Anlamları

| Hata Kodu | Açıklama | Çözüm |
|-----------|----------|-------|
| 502 | Bad Gateway | Backend servisleri kontrol et |
| 503 | Service Unavailable | Nginx overload, worker process sayısını artır |
| 504 | Gateway Timeout | Proxy timeout ayarlarını artır |
| 403 | Forbidden | Dosya izinlerini kontrol et |
| 404 | Not Found | Route konfigürasyonunu kontrol et |

## 📊 Performance Optimizasyonu

### Worker Process Ayarları

```nginx
worker_processes auto;
worker_connections 1024;
worker_rlimit_nofile 2048;
```

### Buffer Ayarları

```nginx
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
```

### Timeout Ayarları

```nginx
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;
```

## 🚨 Acil Durum Komutları

```bash
# Nginx'i hemen durdur
sudo systemctl stop nginx

# Nginx'i force restart
sudo systemctl kill nginx
sudo systemctl start nginx

# Konfigürasyonu varsayılana döndür
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf

# Tüm nginx process'lerini öldür
sudo pkill -f nginx

# Port 80'i kullanan tüm process'leri öldür
sudo fuser -k 80/tcp
```

## 📞 Destek ve Yardım

### Log Dosyaları

- **Nginx Error Log:** `/var/log/nginx/error.log`
- **Nginx Access Log:** `/var/log/nginx/access.log`
- **Systemd Journal:** `journalctl -xeu nginx.service`

### Yararlı Komutlar

```bash
# Nginx versiyonu
nginx -v

# Nginx modülleri
nginx -V

# Aktif konfigürasyon
nginx -T

# Konfigürasyon test
nginx -t

# Graceful reload
nginx -s reload

# Hızlı stop
nginx -s stop
```

### Monitoring

```bash
# Real-time nginx status
watch -n 1 'systemctl status nginx'

# Real-time log monitoring
sudo tail -f /var/log/nginx/error.log /var/log/nginx/access.log

# Connection monitoring
watch -n 1 'netstat -an | grep :80 | wc -l'
```

## 🔄 Otomatik Çözüm Scriptleri

Proje içinde bulunan otomatik çözüm scriptleri:

1. **nginx-debug.sh** - Kapsamlı hata analizi
2. **fix-nginx-ports.sh** - Port çakışması çözümü
3. **ssl-check.sh** - SSL sertifika yönetimi
4. **nginx-safe-start.sh** - Güvenli nginx başlatma
5. **port-manager.sh** - Port yönetimi

### Script Kullanımı

```bash
# Scriptleri çalıştırılabilir yap
chmod +x *.sh

# Hata analizi
sudo ./nginx-debug.sh

# Port sorunlarını çöz
sudo ./fix-nginx-ports.sh

# SSL kurulumu
sudo ./ssl-check.sh

# Güvenli başlatma
sudo ./nginx-safe-start.sh
```

---

**Not:** Bu rehber Oto Parça Panel projesi için özelleştirilmiştir. Genel nginx sorunları için resmi nginx dokümantasyonunu da inceleyiniz.