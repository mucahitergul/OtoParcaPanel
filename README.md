# 🚀 Oto Parça Panel - Local Development

## 📋 Proje Hakkında

Oto Parça Panel, otomotiv yedek parça satışı yapan işletmeler için geliştirilmiş modern bir web uygulamasıdır. Bu sistem, ürün yönetimi, stok takibi, müşteri yönetimi ve satış süreçlerini dijitalleştirerek işletmelerin verimliliğini artırmayı hedefler.

## 🚀 Local Development Kurulumu

### Ön Gereksinimler

- Node.js 18+ 
- PostgreSQL 15+
- npm veya yarn
- Git

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/mucahitergul/OtoParcaPanel.git
cd OtoParcaPanel
```

### 2. Environment Variables Ayarlayın

```bash
# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin ve gerekli değerleri doldurun
```

### 3. PostgreSQL Database Oluşturun

```sql
-- PostgreSQL'e bağlanın ve database oluşturun
CREATE DATABASE oto_parca_panel;
CREATE USER oto_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
```

### 4. Backend Kurulumu

```bash
cd backend
npm install
npm run build
npm run start:dev
```

### 5. Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

### 6. Uygulamaya Erişim

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Dokümantasyonu**: http://localhost:3001/api/docs

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

### Hetzner Cloud Gereksinimleri

#### Minimum (Test/Demo)
- **Server**: CX11 (1 vCPU, 4GB RAM, 40GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Network**: 20 TB trafik

#### Önerilen (Küçük İşletme)
- **Server**: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Network**: 20 TB trafik

#### Production (Orta/Büyük İşletme)
- **Server**: CX31+ (2+ vCPU, 8+ GB RAM, 80+ GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Network**: 20 TB trafik

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

## 🏗️ hetzner-install.sh Özellikleri

### ✨ Kurulum Aracının Avantajları

- **✅ Hetzner Cloud Optimizasyonu** - CX11/CX21/CX31+ için optimize edilmiş
- **✅ Tek Komutla Kurulum** - 5-10 dakikada hazır sistem
- **✅ Subdomain Desteği** - panel.domain.com gibi subdomainler desteklenir
- **✅ Akıllı Hata Yönetimi** - Rollback mekanizması ile güvenli kurulum
- **✅ Resource Optimizasyonu** - Hetzner server tipine göre otomatik ayarlama
- **✅ SSL Otomasyonu** - Let's Encrypt otomatik kurulum ve yenileme
- **✅ UFW Firewall** - Production-ready güvenlik ayarları
- **✅ Docker Optimizasyonu** - Hetzner SSD'leri için optimize edilmiş
- **✅ Monitoring Setup** - Prometheus ve Grafana otomatik kurulum
- **✅ Log Management** - Otomatik log rotation ve temizlik

### 🔧 Kurulum Süreci (15 Adım)

1. **Sistem Kontrolü** - Hetzner server tipi tespiti
2. **Domain Girişi** - İnteraktif domain ve SSL yapılandırması
3. **Gereksinim Kontrolü** - OS, RAM, disk alanı kontrolü
4. **Şifre Üretimi** - Güvenli şifreler oluşturma
5. **Sistem Güncelleme** - Ubuntu paketlerini güncelleme
6. **Docker Kurulumu** - Docker Engine ve Compose kurulumu
7. **Proje İndirme** - Git repository'den proje indirme
8. **Environment Setup** - Yapılandırma dosyalarını oluşturma
9. **Firewall Ayarları** - UFW firewall yapılandırması
10. **SSL Kurulumu** - Let's Encrypt veya self-signed sertifika
11. **Docker Optimizasyonu** - Hetzner için resource optimizasyonu
12. **Nginx Konfigürasyonu** - Reverse proxy yapılandırması
13. **Servis Build** - Docker images'ları build etme
14. **Monitoring Setup** - Prometheus ve Grafana kurulumu
15. **Sağlık Kontrolü** - Final sistem testleri

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
sudo ./hetzner-install.sh yourdomain.com

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
   wget -O hetzner-install.sh https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/hetzner-install.sh
   chmod +x hetzner-install.sh
   ```

3. **Production Kurulum**
   ```bash
   sudo ./hetzner-install.sh yourdomain.com
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
sudo ./hetzner-install.sh yourdomain.com
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
# Servisleri durdur ve temizle
cd /opt/oto-parca-panel
docker-compose down
docker system prune -f

# Backup restore
./backups/restore.sh latest

# Servisleri yeniden başlat
docker-compose up -d

# Health check
curl https://yourdomain.com/health
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