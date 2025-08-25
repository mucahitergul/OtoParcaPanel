# OtoParcaPanel Production Deployment Rehberi

Bu rehber, OtoParcaPanel projesini Hetzner Ubuntu 24.04 sunucusuna Docker olmadan kurmanız için adım adım talimatları içerir.

## Gereksinimler

- Hetzner Ubuntu 24.04 sunucusu
- Domain: `otopanel.isletmemdijitalde.com`
- SSL sertifikası (Let's Encrypt)
- Python Scraper API bağlantısı
- GitHub repository erişimi

## 1. Sunucu Hazırlığı

### 1.1 Sunucuya Bağlanma
```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Sistem Güncellemesi
```bash
apt update && apt upgrade -y
```

### 1.3 Gerekli Paketlerin Kurulumu
```bash
apt install -y curl wget git unzip software-properties-common
```

### 1.4 Firewall Ayarları
```bash
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 3001
ufw status
```

## 2. Node.js Kurulumu

### 2.1 NodeSource Repository Ekleme
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

### 2.2 Node.js Kurulumu
```bash
apt install -y nodejs
```

### 2.3 Kurulum Kontrolü
```bash
node --version
npm --version
```

### 2.4 PM2 Global Kurulumu
```bash
npm install -g pm2
```

## 3. PostgreSQL Kurulumu

### 3.1 PostgreSQL Kurulumu
```bash
apt install -y postgresql postgresql-contrib
```

### 3.2 PostgreSQL Servisini Başlatma
```bash
systemctl start postgresql
systemctl enable postgresql
```

### 3.3 PostgreSQL Kullanıcısı ve Veritabanı Oluşturma
```bash
sudo -u postgres psql
```

PostgreSQL içinde:
```sql
CREATE USER otoparca WITH PASSWORD 'GucluSifre123!';
CREATE DATABASE oto_parca_panel OWNER otoparca;
GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO otoparca;
\q
```

### 3.4 PostgreSQL Bağlantı Ayarları
```bash
nano /etc/postgresql/16/main/postgresql.conf
```

Dosyada şu satırı bulun ve düzenleyin:
```
listen_addresses = 'localhost'
```

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Dosyanın sonuna ekleyin:
```
local   oto_parca_panel    otoparca                     md5
```

PostgreSQL'i yeniden başlatın:
```bash
systemctl restart postgresql
```

## 4. Nginx Kurulumu

### 4.1 Nginx Kurulumu
```bash
apt install -y nginx
```

### 4.2 Nginx Servisini Başlatma
```bash
systemctl start nginx
systemctl enable nginx
```

## 5. Domain ve DNS Ayarları

### 5.1 Domain DNS Ayarları
Domain sağlayıcınızda (Cloudflare, GoDaddy vb.) şu DNS kayıtlarını ekleyin:

```
A Record: otopanel.isletmemdijitalde.com -> YOUR_SERVER_IP
CNAME Record: www.otopanel.isletmemdijitalde.com -> otopanel.isletmemdijitalde.com
```

### 5.2 DNS Propagation Kontrolü
```bash
nslookup otopanel.isletmemdijitalde.com
```

## 6. SSL Sertifikası Kurulumu (Let's Encrypt)

### 6.1 Certbot Kurulumu
```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 SSL Sertifikası Alma
```bash
certbot --nginx -d otopanel.isletmemdijitalde.com -d www.otopanel.isletmemdijitalde.com
```

### 6.3 Otomatik Yenileme Ayarı
```bash
crontab -e
```

Ekleyin:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## 7. Proje Kurulumu

### 7.1 Proje Dizini Oluşturma
```bash
mkdir -p /var/www/otoparcapanel
cd /var/www/otoparcapanel
```

### 7.2 GitHub'dan Proje Çekme
```bash
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git .
```

### 7.3 Proje Sahipliği Ayarlama
```bash
chown -R www-data:www-data /var/www/otoparcapanel
chmod -R 755 /var/www/otoparcapanel
```

## 8. Backend Kurulumu

### 8.1 Backend Dizinine Geçme
```bash
cd /var/www/otoparcapanel/backend
```

### 8.2 Dependencies Kurulumu
```bash
npm install
```

### 8.3 Production Environment Dosyası
```bash
cp .env.example .env.production
nano .env.production
```

### 8.4 TypeScript Build
```bash
npm run build
```

### 8.5 Database Migration
```bash
npm run migration:run
```

### 8.6 Demo Veriler (Opsiyonel)
```bash
npm run seed
```

## 9. Frontend Kurulumu

### 9.1 Frontend Dizinine Geçme
```bash
cd /var/www/otoparcapanel/frontend
```

### 9.2 Dependencies Kurulumu
```bash
npm install
```

### 9.3 Production Environment Dosyası
```bash
cp .env.local.example .env.production
nano .env.production
```

### 9.4 Production Build
```bash
npm run build
```

## 10. PM2 ile Process Management

### 10.1 PM2 Konfigürasyon Dosyası
Proje ana dizininde `ecosystem.config.js` dosyası oluşturun.

### 10.2 Uygulamaları Başlatma
```bash
cd /var/www/otoparcapanel
pm2 start ecosystem.config.js
```

### 10.3 PM2 Otomatik Başlatma
```bash
pm2 startup
pm2 save
```

### 10.4 PM2 Komutları
```bash
# Durumu kontrol etme
pm2 status

# Logları görme
pm2 logs

# Yeniden başlatma
pm2 restart all

# Durdurma
pm2 stop all
```

## 11. Nginx Reverse Proxy Konfigürasyonu

### 11.1 Nginx Site Konfigürasyonu
```bash
nano /etc/nginx/sites-available/otoparcapanel
```

### 11.2 Site Aktifleştirme
```bash
ln -s /etc/nginx/sites-available/otoparcapanel /etc/nginx/sites-enabled/
```

### 11.3 Default Site Deaktifleştirme
```bash
rm /etc/nginx/sites-enabled/default
```

### 11.4 Nginx Konfigürasyon Testi
```bash
nginx -t
```

### 11.5 Nginx Yeniden Başlatma
```bash
systemctl restart nginx
```

## 12. Python Scraper API Bağlantısı

### 12.1 Scraper API URL Ayarları
`.env.production` dosyasında:
```
PYTHON_SCRAPER_API_URL=http://YOUR_SCRAPER_SERVER:5000
```

### 12.2 Scraper API Health Check
```bash
curl http://YOUR_SCRAPER_SERVER:5000/health
```

## 13. Güvenlik Ayarları

### 13.1 SSH Güvenlik Ayarları
```bash
nano /etc/ssh/sshd_config
```

Değiştirin:
```
PermitRootLogin no
PasswordAuthentication no
Port 2222
```

```bash
systemctl restart ssh
ufw allow 2222
ufw delete allow ssh
```

### 13.2 Fail2Ban Kurulumu
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 13.3 Automatic Security Updates
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## 14. Monitoring ve Log Yönetimi

### 14.1 Log Rotasyonu
```bash
nano /etc/logrotate.d/otoparcapanel
```

Ekleyin:
```
/var/www/otoparcapanel/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### 14.2 System Monitoring
```bash
# Sistem durumu
htop

# Disk kullanımı
df -h

# Memory kullanımı
free -h

# Process durumu
pm2 monit
```

### 14.3 Log Dosyaları
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PM2 logs
pm2 logs

# System logs
journalctl -f
```

## 15. Backup Stratejisi

### 15.1 Database Backup Script
```bash
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/otoparcapanel"
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U otoparca -d oto_parca_panel > $BACKUP_DIR/db_backup_$DATE.sql

# 7 günden eski backupları sil
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh
```

### 15.2 Otomatik Backup Cron Job
```bash
crontab -e
```

Ekleyin:
```
0 2 * * * /usr/local/bin/backup-db.sh
```

## 16. Deployment Script

### 16.1 Otomatik Deployment
`deploy.sh` scriptini kullanarak otomatik deployment yapabilirsiniz.

```bash
chmod +x deploy.sh
./deploy.sh
```

## 17. Troubleshooting

### 17.1 Yaygın Sorunlar

**Problem**: Site açılmıyor
```bash
# Nginx durumu kontrol et
systemctl status nginx

# PM2 durumu kontrol et
pm2 status

# Port kontrolü
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

**Problem**: Database bağlantı hatası
```bash
# PostgreSQL durumu
systemctl status postgresql

# Database bağlantı testi
psql -h localhost -U otoparca -d oto_parca_panel
```

**Problem**: SSL sertifika hatası
```bash
# Sertifika durumu
certbot certificates

# Sertifika yenileme
certbot renew --dry-run
```

### 17.2 Log Kontrolleri
```bash
# Nginx error logs
tail -f /var/log/nginx/error.log

# PM2 logs
pm2 logs otoparcapanel-backend
pm2 logs otoparcapanel-frontend

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f
```

## 18. Performans Optimizasyonu

### 18.1 Nginx Optimizasyonu
```bash
nano /etc/nginx/nginx.conf
```

Ekleyin:
```nginx
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 18.2 PostgreSQL Optimizasyonu
```bash
nano /etc/postgresql/16/main/postgresql.conf
```

Ayarlayın:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

## 19. Güncelleme Prosedürü

### 19.1 Kod Güncellemesi
```bash
cd /var/www/otoparcapanel
git pull origin main

# Backend güncelleme
cd backend
npm install
npm run build

# Frontend güncelleme
cd ../frontend
npm install
npm run build

# Servisleri yeniden başlat
pm2 restart all
```

### 19.2 Database Migration
```bash
cd /var/www/otoparcapanel/backend
npm run migration:run
```

## 20. İletişim ve Destek

Kurulum sırasında sorun yaşarsanız:

1. Log dosyalarını kontrol edin
2. Troubleshooting bölümünü inceleyin
3. GitHub Issues sayfasını kontrol edin
4. Sistem gereksinimlerini doğrulayın

---

**Not**: Bu rehber Ubuntu 24.04 için hazırlanmıştır. Farklı işletim sistemleri için komutlar değişebilir.

**Güvenlik Uyarısı**: Production ortamında güçlü şifreler kullanın ve düzenli güvenlik güncellemelerini takip edin.