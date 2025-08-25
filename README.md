# Oto Parça Panel - Otomotiv Yedek Parça Stok ve Fiyat Takip Sistemi

## 📋 Proje Açıklaması

Oto Parça Panel, otomotiv yedek parça satıcıları için geliştirilmiş kapsamlı bir stok ve fiyat takip sistemidir. Sistem, tedarikçi fiyatlarını otomatik olarak takip eder, stok durumlarını günceller ve WooCommerce entegrasyonu ile e-ticaret sitelerinizi senkronize eder.

## ⚡ Hızlı Başlangıç

**Sıfır temiz Ubuntu sunucuya 5 dakikada kurulum:**

```bash
# Tek komutla tam kurulum
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/one-click-install.sh | sudo bash
```

**Kurulum sırasında sadece 2 bilgi istenir:**
1. 🌐 **Domain adınız** (örn: otoparca.example.com)
2. 📧 **Email adresiniz** (SSL sertifikası için)

**Kurulum otomatik olarak:**
- ✅ Tüm bağımlılıkları kurar (Docker, Node.js, PostgreSQL, Nginx)
- ✅ Port çakışmalarını çözer
- ✅ SSL sertifikası oluşturur
- ✅ Güvenli şifreler üretir
- ✅ Servisleri başlatır ve test eder

**Kurulum sonrası siteniz hazır:** `https://yourdomain.com` 🎉

### 🚀 Özellikler

#### 💼 İş Özellikleri
- **Tedarikçi Fiyat Takibi**: Dinamik, Başbuğ, Doğuş gibi tedarikçilerden otomatik fiyat çekme
- **Python Scraper Bot**: Gerçek zamanlı fiyat ve stok bilgisi toplama
- **WooCommerce Entegrasyonu**: E-ticaret sitenizle otomatik senkronizasyon
- **Kullanıcı Yönetimi**: JWT tabanlı güvenli authentication sistemi
- **Responsive Tasarım**: Masaüstü ve mobil uyumlu modern arayüz
- **Real-time Updates**: Anlık fiyat ve stok güncellemeleri
- **Bulk Operations**: Toplu fiyat güncelleme ve stok yönetimi

#### 🛠️ Teknik Özellikler (v2.0)
- **🚀 One-Click Installation**: Sıfır temiz sunucuya tek komutla tam kurulum
- **🔧 Akıllı Port Yönetimi**: Otomatik port çakışması tespiti ve çözümü
- **🔒 Güvenli CORS Ayarları**: Production domain için optimize edilmiş CORS
- **📊 Real-time Monitoring**: Sistem durumu ve performans izleme
- **🔄 Auto-Recovery**: Başarısız işlemlerde otomatik kurtarma
- **📝 Kapsamlı Logging**: Detaylı hata takibi ve debugging
- **🛡️ SSL Auto-Setup**: Let's Encrypt ile otomatik HTTPS kurulumu
- **⚡ Performance Optimized**: Nginx, PM2 ve database optimizasyonları
- **🆕 Otomatik Port Yönetimi**: Port çakışması tespiti ve otomatik çözüm
- **🆕 CORS Optimizasyonu**: Production domain için optimize edilmiş CORS ayarları
- **🆕 Gelişmiş Kurulum**: Tek komutla otomatik kurulum ve yapılandırma
- **🆕 Port Manager**: Kapsamlı port yönetim ve monitoring aracı

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

### 3. One-Click Otomatik Kurulum (Önerilen)

**Sıfır temiz sunucuya tek komutla tam kurulum:**

```bash
# GitHub'dan direkt kurulum (Önerilen)
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/one-click-install.sh | sudo bash
```

**Veya yerel dosyadan kurulum:**

```bash
# Projeyi klonlayın
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git
cd OtoParcaPanel

# One-click kurulum scriptini çalıştırın
chmod +x one-click-install.sh
sudo ./one-click-install.sh
```

**🆕 Akıllı Proje Tespit Sistemi:**

Kurulum scripti artık mevcut proje dosyalarını akıllıca tespit eder:

- ✅ **Tam Proje Tespiti**: Eğer `package.json`, `frontend/`, `backend/` ve `scraper/` dizinleri mevcutsa GitHub clone işlemi atlanır
- ✅ **Kısmi Proje Tespiti**: Bazı dosyalar eksikse sadece eksik olanlar GitHub'dan indirilir
- ✅ **Güvenli Kopyalama**: Mevcut dosyalar yedeklenir ve güvenli şekilde kopyalanır
- ✅ **Bütünlük Kontrolü**: Kopyalanan dosyaların doğruluğu kontrol edilir
- ✅ **Rollback Desteği**: Hata durumunda otomatik geri alma

```bash
# Örnek çıktı:
# ✅ Tam proje dosyaları tespit edildi!
# 📁 Bulunan dosyalar:
#    ✓ package.json
#    ✓ frontend/ dizini
#    ✓ backend/ dizini
#    ✓ scraper/ dizini
#    ✓ docker-compose.yml
# 🚀 GitHub clone işlemi atlanacak, mevcut dosyalar kullanılacak
```

**One-Click Kurulum Özellikleri:**
- ✅ **Otomatik Sistem Kontrolü**: RAM, disk, internet bağlantısı
- ✅ **Akıllı Port Yönetimi**: Çakışan portları otomatik çözer
- ✅ **Güvenli Şifre Üretimi**: Tüm şifreler otomatik oluşturulur
- ✅ **SSL Sertifika Kurulumu**: Let's Encrypt ile otomatik HTTPS
- ✅ **CORS Optimizasyonu**: Production domain için optimize edilmiş
- ✅ **Hata Yönetimi**: Her adımda hata kontrolü ve recovery
- ✅ **Progress Tracking**: Renkli output ve ilerleme çubuğu
- ✅ **Kurulum Doğrulama**: Tüm servislerin health check'i
- ✅ **Rollback Desteği**: Başarısız kurumda otomatik geri alma
- 🆕 **Gelişmiş PostgreSQL Kurulumu**: Otomatik authentication ve retry mekanizması
- 🆕 **PostgreSQL Troubleshooting**: Otomatik sorun tespit ve düzeltme aracı

#### 🆕 Gelişmiş Kurulum Özellikleri

- **Otomatik Port Çakışması Tespiti**: Kullanılan portları tespit eder ve çözüm önerir
- **Production Domain Yapılandırması**: HTTPS domain'i otomatik olarak yapılandırır
- **CORS Optimizasyonu**: Production ortamı için CORS ayarlarını optimize eder
- **Güvenlik Kontrolü**: Sistem gereksinimlerini ve güvenlik ayarlarını kontrol eder
- **Otomatik SSL**: Let's Encrypt ile otomatik SSL sertifikası kurulumu

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

#### 🆕 PostgreSQL Sorun Giderme

PostgreSQL kurulumu sırasında sorun yaşarsanız, otomatik troubleshooting aracını kullanabilirsiniz:

```bash
# PostgreSQL troubleshooting aracını çalıştırın
chmod +x postgresql-troubleshoot.sh
sudo ./postgresql-troubleshoot.sh
```

**Troubleshooting Aracı Özellikleri:**
- 🔍 **Otomatik Sorun Tespiti**: PostgreSQL kurulum ve servis durumu kontrolü
- 🔧 **Authentication Düzeltme**: pg_hba.conf ayarlarını otomatik düzeltir
- 🗄️ **Veritabanı Kontrolü**: Kullanıcı ve veritabanı varlığını kontrol eder
- 🔗 **Bağlantı Testi**: Veritabanı bağlantısını test eder
- 📋 **Log Analizi**: PostgreSQL loglarını analiz eder
- ⚡ **Otomatik Düzeltme**: Tespit edilen sorunları otomatik olarak düzeltir

**Manuel PostgreSQL Sorun Giderme:**

```bash
# PostgreSQL servis durumunu kontrol et
systemctl status postgresql

# PostgreSQL bağlantısını test et
sudo -u postgres pg_isready

# Veritabanı kullanıcısını kontrol et
sudo -u postgres psql -c "\du"

# Veritabanlarını listele
sudo -u postgres psql -c "\l"

# pg_hba.conf dosyasını kontrol et
sudo nano /etc/postgresql/*/main/pg_hba.conf

# PostgreSQL loglarını kontrol et
sudo journalctl -u postgresql -f
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
# Domain Configuration (🆕 Production Domain)
DOMAIN_NAME=otoparca.isletmemdijitalde.com
SSL_EMAIL=admin@otoparca.isletmemdijitalde.com

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

# CORS (🆕 Production Optimized)
FRONTEND_URL=https://otoparca.isletmemdijitalde.com
CORS_ORIGINS=https://otoparca.isletmemdijitalde.com

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
# 🆕 Production Domain Configuration
NEXT_PUBLIC_API_URL=https://otoparca.isletmemdijitalde.com/api
NEXT_PUBLIC_APP_URL=https://otoparca.isletmemdijitalde.com
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://otoparca.isletmemdijitalde.com

# 🆕 CORS Optimized URLs
NEXT_PUBLIC_BACKEND_URL=https://otoparca.isletmemdijitalde.com
NEXT_PUBLIC_SCRAPER_URL=https://otoparca.isletmemdijitalde.com/scraper
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
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name otoparca.isletmemdijitalde.com www.otoparca.isletmemdijitalde.com;

    # SSL sertifikaları (Let's Encrypt ile oluşturun)
    ssl_certificate /etc/letsencrypt/live/otoparca.isletmemdijitalde.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/otoparca.isletmemdijitalde.com/privkey.pem;

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

    # 🆕 Backend API (NestJS) - CORS Optimized
    location /api {
        # CORS headers for production domain
        add_header 'Access-Control-Allow-Origin' 'https://otoparca.isletmemdijitalde.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://otoparca.isletmemdijitalde.com';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
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
        add_header 'Access-Control-Allow-Origin' 'https://otoparca.isletmemdijitalde.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://otoparca.isletmemdijitalde.com';
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
certbot --nginx -d otoparca.isletmemdijitalde.com -d www.otoparca.isletmemdijitalde.com

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

## 🔧 Port Yönetimi ve Çakışma Çözümü

### 🆕 Port Manager Aracı

Yeni `port-manager.sh` scripti ile port yönetimi ve çakışma çözümü:

```bash
# Port durumunu kontrol et
./port-manager.sh status

# Çakışan portları tespit et
./port-manager.sh check

# Çakışan portları temizle
./port-manager.sh cleanup

# Alternatif portları göster
./port-manager.sh alternatives

# Tüm portları temizle
./port-manager.sh kill-all
```

#### Port Manager Özellikleri

- **Kapsamlı Port Analizi**: Tüm kullanılan portları PID ile birlikte listeler
- **Çakışma Tespiti**: Proje portları (80, 443, 3000, 3001, 5000, 5432, 6379) için çakışma kontrolü
- **Güvenli Temizleme**: SIGTERM → SIGKILL sırası ile güvenli process sonlandırma
- **Alternatif Önerileri**: Kullanılabilir alternatif portları önerir
- **Zombie Process Temizleme**: Ölü process'leri temizler

### 🆕 Gelişmiş Servis Yönetimi

```bash
# Servisleri port kontrolü ile başlat
./start-services.sh production start

# Port çakışması durumunda otomatik çözüm
./start-services.sh production restart --force

# Detaylı port durumu raporu
./start-services.sh production status --detailed
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
# 🆕 Production Domain Configuration
REMOTE_SERVER_URL=https://otoparca.isletmemdijitalde.com
REMOTE_API_URL=https://otoparca.isletmemdijitalde.com/api

# Flask ayarları
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_ENV=development

# Scraper ayarları
SCRAPER_TIMEOUT=30
SCRAPER_RETRY_COUNT=3
SCRAPER_DELAY=2

# 🆕 CORS Configuration
CORS_ORIGINS=https://otoparca.isletmemdijitalde.com
CORS_METHODS=GET,POST,OPTIONS

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
ping otoparca.isletmemdijitalde.com
telnet otoparca.isletmemdijitalde.com 443
```

### 7. Troubleshooting

#### Bağlantı Sorunları:
```bash
# DNS çözümleme testi
nslookup otoparca.isletmemdijitalde.com

# SSL sertifika kontrolü
openssl s_client -connect otoparca.isletmemdijitalde.com:443

# 🆕 CORS hatası durumunda backend loglarını kontrol edin
docker logs oto-parca-backend

# 🆕 CORS ayarlarını kontrol et
curl -H "Origin: https://otoparca.isletmemdijitalde.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS https://otoparca.isletmemdijitalde.com/api/auth/login
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

### 🆕 CORS Sorunları

#### CORS Policy Hatası
```bash
# Backend CORS ayarlarını kontrol et
grep -r "enableCors" backend/src/
grep -r "origin" backend/src/main.ts

# Frontend environment kontrolü
cat frontend/.env.local | grep API_URL

# Nginx CORS ayarlarını test et
curl -H "Origin: https://otoparca.isletmemdijitalde.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS https://otoparca.isletmemdijitalde.com/api/auth/login -v

# Backend loglarında CORS hatalarını kontrol et
docker logs oto-parca-backend | grep -i cors
pm2 logs oto-parca-backend | grep -i cors
```

#### CORS Ayarlarını Düzeltme
```bash
# Backend main.ts dosyasını kontrol et
cat backend/src/main.ts | grep -A 10 "enableCors"

# Nginx konfigürasyonunu yeniden yükle
nginx -t
sudo systemctl reload nginx

# Environment dosyalarını güncelle
./port-manager.sh check-cors
```

### 🚀 Hızlı Çözüm Araçları

**One-Click kurulum ile birlikte gelen otomatik troubleshooting araçları:**

```bash
# Port yönetimi ve çakışma çözümü
sudo ./port-manager.sh status          # Port durumunu kontrol et
sudo ./port-manager.sh cleanup         # Çakışan portları temizle
sudo ./port-manager.sh alternatives    # Alternatif portlar öner

# Nginx hata analizi ve çözümü
sudo ./nginx-debug.sh                  # Kapsamlı nginx analizi
sudo ./nginx-safe-start.sh             # Güvenli nginx başlatma
sudo ./fix-nginx-ports.sh              # Nginx port çakışmalarını çöz

# SSL sertifika yönetimi
sudo ./ssl-check.sh                    # SSL durumu kontrol et
sudo ./ssl-check.sh --create           # SSL sertifika oluştur
sudo ./ssl-check.sh --renew            # SSL sertifika yenile
```

### Yaygın Sorunlar ve Çözümleri

#### 1. CORS Policy Hataları
```bash
# CORS ayarlarını kontrol et
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS https://yourdomain.com/api/auth/login

# Nginx CORS konfigürasyonunu yenile
sudo nginx -t && sudo systemctl reload nginx

# Backend CORS ayarlarını kontrol et
cat /opt/oto-parca-panel/backend/.env | grep CORS
```

#### 2. Port Çakışması (Otomatik Çözüm)
```bash
# Otomatik port çakışması tespiti ve çözümü
sudo ./port-manager.sh cleanup

# Manuel port kontrolü
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# Çakışan servisleri durdur
sudo systemctl stop apache2    # Apache çakışması
sudo pkill -f "node.*3000"     # Node.js çakışması
```

#### 3. Database Connection Error
```bash
# PostgreSQL servisini kontrol edin
sudo systemctl status postgresql

# Veritabanı bağlantısını test edin
psql -h localhost -U oto_user -d oto_parca_panel

# Database şifresini kontrol et
cat /opt/oto-parca-panel/.env | grep POSTGRES_PASSWORD
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

## 🆕 Yeni Özellikler ve İyileştirmeler

### v2.0 Güncellemeleri

#### 🔧 Port Yönetimi
- **Otomatik Port Çakışması Tespiti**: Kurulum sırasında kullanılan portları tespit eder
- **Güvenli Process Sonlandırma**: SIGTERM → SIGKILL sırası ile güvenli temizleme
- **Alternatif Port Önerileri**: Çakışma durumunda kullanılabilir portları önerir
- **Zombie Process Temizleme**: Ölü process'leri otomatik temizler

#### 🌐 CORS Optimizasyonu
- **Production Domain Desteği**: `otoparca.isletmemdijitalde.com` için optimize edildi
- **Güvenli CORS Ayarları**: Wildcard yerine spesifik domain kullanımı
- **Preflight Request Desteği**: OPTIONS request'leri için optimize edilmiş yanıtlar
- **Credential Support**: Authentication için güvenli cookie desteği

#### 🚀 Gelişmiş Kurulum
- **Tek Komut Kurulum**: `./install.sh` ile tam otomatik kurulum
- **Domain Yapılandırması**: Kurulum sırasında domain otomatik yapılandırması
- **SSL Otomasyonu**: Let's Encrypt ile otomatik SSL kurulumu
- **Güvenlik Kontrolü**: Sistem gereksinimlerini otomatik kontrol

#### 📊 Monitoring ve Yönetim
- **Gelişmiş Health Checks**: Servis durumlarını detaylı kontrol
- **Resource Monitoring**: CPU, RAM, Disk kullanımını izleme
- **Log Aggregation**: Merkezi log toplama ve analiz
- **Performance Metrics**: Sistem performans metrikleri

### Kullanım Örnekleri

```bash
# Hızlı kurulum
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git
cd OtoParcaPanel
./install.sh

# Port yönetimi
./port-manager.sh status
./port-manager.sh cleanup

# Servis yönetimi
./start-services.sh production start
./start-services.sh production status --detailed

# CORS test
curl -H "Origin: https://otoparca.isletmemdijitalde.com" \
     https://otoparca.isletmemdijitalde.com/api/health
```

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
- **🆕 Production Site**: [https://otoparca.isletmemdijitalde.com](https://otoparca.isletmemdijitalde.com)

### 🆕 Hızlı Başlangıç

1. **Kurulum**: `./install.sh` çalıştırın
2. **Port Kontrolü**: `./port-manager.sh status` ile kontrol edin
3. **Servis Başlatma**: `./start-services.sh production start`
4. **CORS Test**: Browser'da `https://otoparca.isletmemdijitalde.com` açın
5. **Monitoring**: `./start-services.sh production status` ile durumu kontrol edin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

---

**Not**: Bu dokümantasyon sürekli güncellenmektedir. En güncel versiyonu için GitHub repository'sini kontrol ediniz.