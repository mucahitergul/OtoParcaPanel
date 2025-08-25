# 🚀 Oto Parça Panel - Otomotiv Yedek Parça Stok ve Fiyat Takip Sistemi

[![Ubuntu 22.04 LTS](https://img.shields.io/badge/Ubuntu-22.04%20LTS-orange.svg)](https://ubuntu.com/)
[![Docker](https://img.shields.io/badge/Docker-20.10+-blue.svg)](https://docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Proje Açıklaması

Oto Parça Panel, otomotiv yedek parça satıcıları için geliştirilmiş **enterprise-grade** stok ve fiyat takip sistemidir. Sistem, tedarikçi fiyatlarını otomatik olarak takip eder, stok durumlarını günceller ve WooCommerce entegrasyonu ile e-ticaret sitelerinizi senkronize eder.

## ⚡ Hızlı Kurulum - Ubuntu 22.04 LTS

### 🎯 Tek Komutla Tam Kurulum (5 Dakika)

```bash
# Ubuntu 22.04 sunucusunda tek komut ile kurulum:
wget -O ubuntu-installer.sh https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/ubuntu-installer.sh
chmod +x ubuntu-installer.sh
sudo ./ubuntu-installer.sh yourdomain.com
```

**Kurulum sırasında sadece 2 bilgi istenir:**
1. 🌐 **Domain adınız** (örn: otoparca.example.com)
2. 📧 **Email adresiniz** (SSL sertifikası için)

**Kurulum otomatik olarak:**
- ✅ Tüm bağımlılıkları kurar (Docker, PostgreSQL, Redis, Nginx)
- ✅ Port çakışmalarını tespit eder ve çözer
- ✅ Let's Encrypt SSL sertifikası oluşturur
- ✅ Güvenli şifreler üretir ve yapılandırır
- ✅ Production-ready servisleri başlatır
- ✅ Health check ve monitoring kurar
- ✅ Otomatik backup sistemi yapılandırır

**Kurulum sonrası siteniz hazır:** `https://yourdomain.com` 🎉

### 🔒 SSL Kurulum Seçenekleri

**Production (Let's Encrypt - Önerilen):**
```bash
# Ana domain ile kurulum
sudo ./ubuntu-installer.sh otoparca.com

# Subdomain ile kurulum
sudo ./ubuntu-installer.sh panel.otoparca.com
sudo ./ubuntu-installer.sh api.otoparca.com
```

**Development (Self-Signed):**
```bash
# Domain parametresi olmadan
sudo ./ubuntu-installer.sh
```

## 🛠️ Teknoloji Stack

### Backend
- **NestJS** - Enterprise Node.js framework
- **TypeScript** - Type-safe development
- **PostgreSQL 15** - Production database
- **TypeORM** - Database ORM
- **JWT** - Secure authentication
- **Redis** - Caching & session store
- **Swagger** - API documentation

### Frontend
- **Next.js 14** - React production framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Modern UI components
- **Zustand** - State management
- **React Hook Form** - Form handling

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy & load balancer
- **Let's Encrypt** - Free SSL certificates
- **Prometheus** - Monitoring & metrics
- **Grafana** - Visualization dashboard

### Scraper
- **Python 3.11+** - Scraping engine
- **Flask** - API server
- **Requests** - HTTP client
- **BeautifulSoup4** - HTML parsing

## 📋 Sistem Gereksinimleri

### Minimum Gereksinimler
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Disk**: 20 GB SSD
- **Network**: 100 Mbps

### Önerilen Gereksinimler (Production)
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **Network**: 1 Gbps

## 🚀 Özellikler

### 💼 İş Özellikleri
- **Tedarikçi Fiyat Takibi**: Dinamik, Başbuğ, Doğuş gibi tedarikçilerden otomatik fiyat çekme
- **Python Scraper Bot**: Gerçek zamanlı fiyat ve stok bilgisi toplama
- **WooCommerce Entegrasyonu**: E-ticaret sitenizle otomatik senkronizasyon
- **Kullanıcı Yönetimi**: JWT tabanlı güvenli authentication sistemi
- **Responsive Tasarım**: Masaüstü ve mobil uyumlu modern arayüz
- **Real-time Updates**: Anlık fiyat ve stok güncellemeleri
- **Bulk Operations**: Toplu fiyat güncelleme ve stok yönetimi

### 🛠️ Teknik Özellikler (v3.0)
- **🚀 One-Click Installation**: Ubuntu 22.04 için optimize edilmiş tek komut kurulum
- **🔧 Akıllı Port Yönetimi**: Otomatik port çakışması tespiti ve çözümü
- **🔒 Production Security**: SSL/TLS, CORS, security headers, rate limiting
- **📊 Real-time Monitoring**: Prometheus + Grafana ile sistem izleme
- **🔄 Auto-Recovery**: Health checks ve otomatik restart policies
- **📝 Advanced Logging**: Centralized logging ve error tracking
- **🛡️ SSL Auto-Setup**: Let's Encrypt ile otomatik HTTPS kurulumu
- **⚡ Performance Optimized**: Multi-stage builds, resource limits, caching
- **💾 Backup Strategy**: Otomatik PostgreSQL backup ve recovery
- **🔐 Security Hardening**: Non-root containers, firewall, security scanning

## 🏗️ ubuntu-installer.sh Özellikleri

### ✨ Kurulum Aracının Avantajları

- **✅ Ubuntu 22.04 LTS Uyumluluğu** - Tam optimize edilmiş
- **✅ Tek Komutla Kurulum** - 5-10 dakikada hazır sistem
- **✅ Akıllı Hata Yönetimi** - Rollback mekanizması ile güvenli kurulum
- **✅ Port Çakışması Çözümü** - Otomatik tespit ve çözüm
- **✅ SSL Otomasyonu** - Let's Encrypt otomatik kurulum ve yenileme
- **✅ Güvenlik Optimizasyonu** - Production-ready güvenlik ayarları
- **✅ Performance Tuning** - Sistem kaynaklarına göre optimizasyon
- **✅ Monitoring Setup** - Prometheus ve Grafana otomatik kurulum
- **✅ Backup Configuration** - Otomatik backup stratejisi
- **✅ Health Checks** - Sistem sağlık kontrolü ve alerting

### 🔧 Kurulum Süreci

1. **Sistem Kontrolü** - OS, RAM, disk alanı kontrolü
2. **Bağımlılık Kurulumu** - Docker, Node.js, PostgreSQL, Redis
3. **Port Yönetimi** - Çakışan portları tespit et ve çöz
4. **SSL Kurulumu** - Let's Encrypt veya self-signed sertifika
5. **Database Setup** - PostgreSQL kurulum ve initialization
6. **Container Build** - Production Docker images
7. **Service Start** - Tüm servisleri başlat ve test et
8. **Health Check** - Sistem sağlık kontrolü
9. **Monitoring** - Prometheus ve Grafana kurulum
10. **Backup Setup** - Otomatik backup konfigürasyonu
11. **Security Hardening** - Firewall ve güvenlik ayarları
12. **Final Verification** - Tam sistem testi

## 🛡️ Production Security

### 🔒 Güvenlik Önlemleri

- **SSL/TLS Encryption** - Let's Encrypt ile ücretsiz SSL
- **Security Headers** - XSS, CSRF, clickjacking koruması
- **Rate Limiting** - DDoS ve brute force koruması
- **CORS Optimization** - Production domain için optimize edilmiş CORS
- **Non-root Containers** - Docker güvenlik best practices
- **Firewall Configuration** - UFW ile port güvenliği
- **JWT Security** - Secure token management
- **Input Validation** - SQL injection ve XSS koruması
- **Password Hashing** - bcrypt ile güvenli şifreleme
- **Environment Security** - Sensitive data protection

### 🔐 SSL/TLS Konfigürasyonu

```bash
# Let's Encrypt otomatik kurulum
sudo ./ubuntu-installer.sh yourdomain.com

# SSL sertifikası otomatik yenileme (crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Health Checks

### 🔍 Sistem İzleme

- **Prometheus Metrics** - Sistem ve uygulama metrikleri
- **Grafana Dashboard** - Görsel monitoring interface
- **Health Check Endpoints** - Otomatik servis durumu kontrolü
- **Log Aggregation** - Centralized logging sistemi
- **Alert Manager** - Kritik durum bildirimleri
- **Performance Monitoring** - Response time ve throughput izleme

### 📈 Monitoring Endpoints

```bash
# Health check
curl https://yourdomain.com/health

# Prometheus metrics
curl https://yourdomain.com/metrics

# Grafana dashboard
https://yourdomain.com:3002
```

## 💾 Backup & Recovery

### 🔄 Otomatik Backup Sistemi

- **Daily PostgreSQL Backup** - Günlük veritabanı yedeği
- **Incremental Backups** - Artımlı yedekleme stratejisi
- **Backup Verification** - Yedek dosyası doğrulama
- **Retention Policy** - 30 günlük yedek saklama
- **Recovery Scripts** - Hızlı geri yükleme araçları
- **Cloud Backup** - S3 compatible storage desteği

### 📦 Backup Konfigürasyonu

```bash
# Manuel backup
./backup/scripts/backup.sh

# Backup restore
./backup/scripts/restore.sh backup_file.sql

# Backup verification
./backup/scripts/verify.sh
```

## 🐳 Docker Production Setup

### 📁 Production Dockerfile'ları

- **`backend/Dockerfile.prod`** - Multi-stage NestJS build
- **`frontend/Dockerfile.prod`** - Optimized Next.js build
- **`nginx/nginx.prod.conf`** - Production nginx configuration
- **`docker-compose.prod.yml`** - Production orchestration

### ⚙️ Container Optimizasyonları

- **Multi-stage Builds** - Küçük production images
- **Non-root Users** - Security best practices
- **Health Checks** - Container durumu izleme
- **Resource Limits** - Memory ve CPU limitleri
- **Restart Policies** - Otomatik recovery
- **Volume Management** - Persistent data storage

## 🌐 Deployment Rehberi

### 🚀 Production Deployment

1. **Sunucu Hazırlığı**
   ```bash
   # Ubuntu 22.04 LTS sunucu
   apt update && apt upgrade -y
   ```

2. **Kurulum Aracını İndir**
   ```bash
   wget -O ubuntu-installer.sh https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/ubuntu-installer.sh
   chmod +x ubuntu-installer.sh
   ```

3. **Production Kurulum**
   ```bash
   sudo ./ubuntu-installer.sh yourdomain.com
   ```

4. **Kurulum Doğrulama**
   ```bash
   # Health check
   curl https://yourdomain.com/health
   
   # Service status
   docker-compose ps
   
   # Logs
   docker-compose logs -f
   ```

### 🔧 Environment Konfigürasyonu

```bash
# Production environment dosyası
cp .env.production.example .env.production

# Gerekli değişkenleri düzenle
vim .env.production
```

## 🛠️ Development Setup

### 💻 Local Development

```bash
# Repository clone
git clone https://github.com/YOUR_USERNAME/OtoParcaPanel.git
cd OtoParcaPanel

# Development environment
cp .env.example .env

# Docker development
docker-compose up -d

# Frontend development
cd frontend
npm install
npm run dev

# Backend development
cd backend
npm install
npm run start:dev
```

## 🔧 Troubleshooting

### ❗ Yaygın Sorunlar ve Çözümleri

#### 🚫 Port Çakışması
```bash
# Port kullanımını kontrol et
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Çakışan servisi durdur
sudo systemctl stop apache2
sudo systemctl stop nginx

# Kurulumu tekrar çalıştır
sudo ./ubuntu-installer.sh yourdomain.com
```

#### 🔒 SSL Sertifika Sorunları
```bash
# Let's Encrypt debug
sudo certbot certificates
sudo certbot renew --dry-run

# SSL test
ssl-check.sh yourdomain.com
```

#### 🐳 Docker Sorunları
```bash
# Docker servis durumu
sudo systemctl status docker

# Container logları
docker-compose logs -f

# Container restart
docker-compose restart

# Tam rebuild
docker-compose down
docker-compose up -d --build
```

#### 💾 Database Bağlantı Sorunları
```bash
# PostgreSQL durumu
docker-compose exec postgres pg_isready

# Database logs
docker-compose logs postgres

# Database connection test
psql -h localhost -p 5433 -U oto_user -d oto_parca_panel
```

### 🔍 Log Dosyaları

```bash
# Kurulum logları
tail -f /var/log/oto-parca-install.log

# Nginx logları
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logları
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 🆘 Acil Durum Kurtarma

```bash
# Rollback işlemi
sudo ./ubuntu-installer.sh --rollback

# Backup restore
./backup/scripts/restore.sh latest

# Service restart
sudo systemctl restart otoparcapanel

# Health check
./healthcheck.sh
```

## 📚 API Dokümantasyonu

### 🔗 Endpoints

- **API Documentation**: `https://yourdomain.com/api/docs`
- **Health Check**: `https://yourdomain.com/health`
- **Metrics**: `https://yourdomain.com/metrics`
- **Grafana**: `https://yourdomain.com:3002`

### 🔑 Authentication

```bash
# Login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}

# JWT Token kullanımı
Authorization: Bearer <token>
```

## 🤝 Katkıda Bulunma

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

## 📞 Destek

- **Email**: support@otoparcapanel.com
- **Documentation**: [Wiki](https://github.com/YOUR_USERNAME/OtoParcaPanel/wiki)
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/OtoParcaPanel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/OtoParcaPanel/discussions)

---

**🎯 Oto Parça Panel - Modern, Güvenli, Ölçeklenebilir Stok Yönetim Sistemi**

*Ubuntu 22.04 LTS için optimize edilmiş, production-ready, enterprise-grade çözüm.*