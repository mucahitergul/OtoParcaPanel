# Oto Parça Panel - Otomotiv Yedek Parça Stok ve Fiyat Takip Sistemi

## 📋 Proje Açıklaması

Oto Parça Panel, otomotiv yedek parça satıcıları için geliştirilmiş kapsamlı bir stok ve fiyat takip sistemidir. Sistem, tedarikçi fiyatlarını otomatik olarak takip eder, stok durumlarını günceller ve WooCommerce entegrasyonu ile e-ticaret sitelerinizi senkronize eder.

### 🚀 Özellikler

- **Tedarikçi Fiyat Takibi**: Dinamik, Başbuğ, Doğuş gibi tedarikçilerden otomatik fiyat çekme
- **Python Scraper Bot**: Gerçek zamanlı fiyat ve stok bilgisi toplama
- **WooCommerce Entegrasyonu**: E-ticaret sitenizle otomatik senkronizasyon
- **Kullanıcı Yönetimi**: JWT tabanlı güvenli authentication sistemi
- **Responsive Tasarım**: Masaüstü ve mobil uyumlu modern arayüz
- **Real-time Updates**: Anlık fiyat ve stok güncellemeleri
- **Bulk Operations**: Toplu fiyat güncelleme ve stok yönetimi

## 🛠️ Teknoloji Stack

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Veritabanı
- **TypeORM** - ORM
- **JWT** - Authentication
- **Swagger** - API documentation

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **React Hook Form** - Form handling

### Scraper
- **Python 3.11+** - Scraping engine
- **Flask** - API server
- **Requests** - HTTP client
- **BeautifulSoup4** - HTML parsing

### DevOps
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy
- **PM2** - Process management
- **PostgreSQL** - Database

## 📋 Sistem Gereksinimleri

### Minimum Gereksinimler
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Disk**: 20 GB SSD
- **OS**: Ubuntu 20.04+ / Debian 11+
- **Network**: 100 Mbps

### Önerilen Gereksinimler
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 1 Gbps

## 🌐 Hetzner Ubuntu Sunucu Kurulumu

### 1. Hetzner Cloud Server Oluşturma

1. [Hetzner Cloud Console](https://console.hetzner.cloud/) üzerinden giriş yapın
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. **"Add Server"** butonuna tıklayın
4. Sunucu konfigürasyonu:
   - **Location**: Nuremberg (en yakın lokasyon)
   - **Image**: Ubuntu 22.04
   - **Type**: CPX21 (2 vCPU, 4 GB RAM) veya daha üstü
   - **Volume**: 40 GB+ SSD
   - **SSH Key**: SSH anahtarınızı ekleyin
   - **Firewall**: HTTP (80), HTTPS (443), SSH (22) portlarını açın

### 2. Sunucuya Bağlanma

```bash
# SSH ile sunucuya bağlanın
ssh root@YOUR_SERVER_IP

# Sistem güncellemesi
apt update && apt upgrade -y

# Gerekli paketleri yükleyin
apt install -y curl wget git unzip software-properties-common
```

### 3. Otomatik Kurulum (Önerilen)

```bash
# Projeyi klonlayın
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git
cd OtoParcaPanel

# Kurulum scriptini çalıştırın
chmod +x install.sh
./install.sh
```

### 4. Manuel Kurulum

#### 4.1 Docker ve Docker Compose Kurulumu

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose kurulumu
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Docker servisini başlatın
systemctl enable docker
systemctl start docker
```

#### 4.2 Node.js ve Python Kurulumu

```bash
# Node.js 20.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Python 3.11 kurulumu
apt install -y python3.11 python3.11-pip python3.11-venv

# PM2 kurulumu
npm install -g pm2
```

#### 4.3 PostgreSQL Kurulumu

```bash
# PostgreSQL kurulumu
apt install -y postgresql postgresql-contrib

# PostgreSQL servisini başlatın
systemctl enable postgresql
systemctl start postgresql

# Veritabanı oluşturma
sudo -u postgres psql
CREATE DATABASE oto_parca_panel;
CREATE USER oto_user WITH PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
\q
```

#### 4.4 Nginx Kurulumu

```bash
# Nginx kurulumu
apt install -y nginx

# Nginx servisini başlatın
systemctl enable nginx
systemctl start nginx

# Firewall ayarları
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

### 5. Proje Kurulumu

#### 5.1 Environment Dosyalarını Hazırlama

```bash
# Backend environment
cp backend/.env.example backend/.env
nano backend/.env
```

**Backend .env dosyası:**
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=oto_user
DATABASE_PASSWORD=secure_password_123
DATABASE_NAME=oto_parca_panel

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_EXPIRES_IN=7d

# App
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL=https://yourdomain.com

# WooCommerce
WOOCOMMERCE_URL=https://your-woocommerce-site.com
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret
```

```bash
# Frontend environment
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

**Frontend .env.local dosyası:**
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://yourdomain.com
```

#### 5.2 Bağımlılıkları Yükleme

```bash
# Backend bağımlılıkları
cd backend
npm install
npm run build

# Frontend bağımlılıkları
cd ../frontend
npm install
npm run build

# Python scraper bağımlılıkları
cd ../scraper
pip3 install -r requirements.txt
```

#### 5.3 Veritabanı Migration

```bash
cd backend
npm run migration:run
npm run seed:run
```

### 6. Nginx Konfigürasyonu

```bash
# Nginx site konfigürasyonu
nano /etc/nginx/sites-available/oto-parca-panel
```

**Nginx konfigürasyonu:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL sertifikaları (Let's Encrypt ile oluşturun)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend (Next.js)
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

    # Backend API (NestJS)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Python Scraper (Remote bağlantı için CORS ayarları)
    location /scraper {
        # Remote scraper için CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Backend API'ye proxy (scraper sunucuda çalışmıyor)
        proxy_pass http://localhost:3001/api/scraper;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Site'ı etkinleştirin
ln -s /etc/nginx/sites-available/oto-parca-panel /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
apt install -y certbot python3-certbot-nginx

# SSL sertifikası oluşturma
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Otomatik yenileme
crontab -e
# Aşağıdaki satırı ekleyin:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. PM2 ile Servisleri Başlatma

```bash
# PM2 ecosystem dosyası
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'oto-parca-backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
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
      }
    }
    // Python scraper kaldırıldı - Local bilgisayarda çalışacak
  ]
};
```

```bash
# Servisleri başlatın
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🐍 Local Python Scraper Kurulumu

**ÖNEMLİ**: Python scraper artık sunucuda değil, local bilgisayarınızda çalışacak ve sunucuya remote bağlantı yapacaktır.

### 1. Local Bilgisayarda Python Kurulumu

#### Windows:
```bash
# Python 3.11+ indirin ve yükleyin
# https://www.python.org/downloads/

# Proje klasörüne gidin
cd scraper

# Virtual environment oluşturun
python -m venv venv
venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt
```

#### macOS/Linux:
```bash
# Python 3.11+ yükleyin
sudo apt install python3.11 python3.11-pip python3.11-venv  # Ubuntu/Debian
brew install python@3.11  # macOS

# Proje klasörüne gidin
cd scraper

# Virtual environment oluşturun
python3.11 -m venv venv
source venv/bin/activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt
```

### 2. Scraper Konfigürasyonu

```bash
# Scraper environment dosyası
cp .env.example .env
nano .env
```

**Scraper .env dosyası:**
```env
# Remote sunucu bilgileri
REMOTE_SERVER_URL=https://yourdomain.com
REMOTE_API_URL=https://yourdomain.com/api

# Flask ayarları
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_ENV=development

# Scraper ayarları
SCRAPER_TIMEOUT=30
SCRAPER_RETRY_COUNT=3
SCRAPER_DELAY=2

# Log ayarları
LOG_LEVEL=INFO
LOG_FILE=scraper.log
```

### 3. Scraper'ı Başlatma

#### Console Versiyonu (Önerilen):
```bash
# Console-based scraper'ı başlatın
python main_console.py
```

#### GUI Versiyonu:
```bash
# GUI scraper'ı başlatın (tkinter gerekli)
python main.py
```

### 4. Remote Bağlantı Testi

```bash
# Scraper health check
curl http://localhost:5000/health

# Test scraping request
curl -X POST http://localhost:5000/scrape \
  -H "Content-Type: application/json" \
  -d '{"stockCode":"TEST123","supplier":"Dinamik"}'
```

### 5. Firewall ve Network Ayarları

#### Sunucu Tarafında:
```bash
# Scraper API için port açın
ufw allow 5000

# Backend CORS ayarlarını kontrol edin
# backend/.env dosyasında:
CORS_ORIGINS=http://localhost:5000,https://yourdomain.com
```

#### Local Bilgisayar:
- Windows Firewall'da port 5000'i açın
- Router'da gerekirse port forwarding yapın
- VPN kullanıyorsanız bağlantı ayarlarını kontrol edin

### 6. Scraper Monitoring

```bash
# Scraper loglarını takip edin
tail -f scraper.log

# Process durumunu kontrol edin
ps aux | grep python

# Network bağlantısını test edin
ping yourdomain.com
telnet yourdomain.com 443
```

### 7. Troubleshooting

#### Bağlantı Sorunları:
```bash
# DNS çözümleme testi
nslookup yourdomain.com

# SSL sertifika kontrolü
openssl s_client -connect yourdomain.com:443

# CORS hatası durumunda backend loglarını kontrol edin
docker logs oto-parca-backend
```

#### Python Hataları:
```bash
# Bağımlılık sorunları
pip install --upgrade -r requirements.txt

# Python version kontrolü
python --version

# Virtual environment kontrolü
which python
which pip
```

## 🔧 Local Development Kurulumu

### Gereksinimler
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Git

### Kurulum Adımları

```bash
# Projeyi klonlayın
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git
cd OtoParcaPanel

# Backend kurulumu
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenleyin
npm run migration:run
npm run seed:run
npm run start:dev

# Frontend kurulumu (yeni terminal)
cd frontend
npm install
cp .env.example .env.local
# .env.local dosyasını düzenleyin
npm run dev

# Python scraper kurulumu (yeni terminal)
cd scraper
pip install -r requirements.txt
python main_console.py
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Çıkış

### Products
- `GET /api/products` - Ürün listesi
- `GET /api/products/:id` - Ürün detayı
- `POST /api/products` - Ürün oluşturma
- `PUT /api/products/:id` - Ürün güncelleme
- `DELETE /api/products/:id` - Ürün silme

### Suppliers
- `GET /api/suppliers` - Tedarikçi listesi
- `POST /api/suppliers/update-prices` - Toplu fiyat güncelleme
- `POST /api/suppliers/update-single-price` - Tekil fiyat güncelleme

### Scraper
- `GET /api/scraper/health` - Scraper durumu
- `POST /api/scraper/request-update` - Fiyat güncelleme talebi
- `GET /api/scraper/suppliers` - Tedarikçi listesi

### WooCommerce
- `GET /api/woocommerce/products` - WooCommerce ürünleri
- `POST /api/woocommerce/sync` - Senkronizasyon
- `PUT /api/woocommerce/update-prices` - Fiyat güncelleme

## 🔍 Troubleshooting

### Yaygın Sorunlar

#### 1. Database Connection Error
```bash
# PostgreSQL servisini kontrol edin
sudo systemctl status postgresql

# Veritabanı bağlantısını test edin
psql -h localhost -U oto_user -d oto_parca_panel
```

#### 2. Port Çakışması
```bash
# Kullanılan portları kontrol edin
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :5000

# Process'i sonlandırın
sudo kill -9 PID
```

#### 3. PM2 Servisleri Çalışmıyor
```bash
# PM2 durumunu kontrol edin
pm2 status
pm2 logs

# Servisleri yeniden başlatın
pm2 restart all
pm2 reload all
```

#### 4. Nginx 502 Bad Gateway
```bash
# Nginx loglarını kontrol edin
sudo tail -f /var/log/nginx/error.log

# Backend servislerinin çalıştığını kontrol edin
curl http://localhost:3001/api/health
curl http://localhost:3000
```

#### 5. SSL Sertifika Sorunları
```bash
# Sertifika durumunu kontrol edin
certbot certificates

# Sertifikayı yenileyin
certbot renew --dry-run
```

### Log Dosyaları

```bash
# PM2 logları
pm2 logs
pm2 logs oto-parca-backend
pm2 logs oto-parca-frontend
pm2 logs oto-parca-scraper

# Nginx logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logları
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Performance Monitoring

```bash
# Sistem kaynaklarını izleyin
htop
iotop
df -h
free -h

# PM2 monitoring
pm2 monit

# Database performansı
sudo -u postgres psql -d oto_parca_panel -c "SELECT * FROM pg_stat_activity;"
```

## 🔒 Güvenlik

### Önerilen Güvenlik Ayarları

1. **Firewall Konfigürasyonu**
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

2. **SSH Güvenliği**
```bash
# SSH key-only authentication
nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin no
systemctl restart ssh
```

3. **Database Güvenliği**
```bash
# PostgreSQL güvenlik ayarları
nano /etc/postgresql/14/main/postgresql.conf
# listen_addresses = 'localhost'
nano /etc/postgresql/14/main/pg_hba.conf
# local connections only
```

4. **Environment Variables**
- Güçlü şifreler kullanın
- JWT secret'ları düzenli olarak değiştirin
- API key'leri güvenli saklayın

## 📈 Backup ve Maintenance

### Otomatik Backup

```bash
# Backup scripti
nano /opt/backup.sh
```

**backup.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

# Database backup
pg_dump -h localhost -U oto_user oto_parca_panel > $BACKUP_DIR/db_backup_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /opt/OtoParcaPanel

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Crontab'a ekleyin
crontab -e
# 0 2 * * * /opt/backup.sh
```

### Güncelleme

```bash
# Proje güncellemesi
cd /opt/OtoParcaPanel
git pull origin main

# Backend güncelleme
cd backend
npm install
npm run build
pm2 restart oto-parca-backend

# Frontend güncelleme
cd ../frontend
npm install
npm run build
pm2 restart oto-parca-frontend

# Migration çalıştırma
cd ../backend
npm run migration:run
```

## 📞 Destek

Sorularınız için:
- **Email**: support@otoparcapanel.com
- **GitHub Issues**: [GitHub Repository](https://github.com/YOUR_USERNAME/OtoParcaPanel/issues)
- **Documentation**: [Wiki](https://github.com/YOUR_USERNAME/OtoParcaPanel/wiki)

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

---

**Not**: Bu dokümantasyon sürekli güncellenmektedir. En güncel versiyonu için GitHub repository'sini kontrol ediniz.