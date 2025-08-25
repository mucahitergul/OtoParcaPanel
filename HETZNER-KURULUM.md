# 🚀 Hetzner Cloud Docker Kurulum Rehberi

## 📋 Ön Gereksinimler

### Hetzner Cloud Sunucu Gereksinimleri
- **Minimum**: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
- **Önerilen**: CX31 (2 vCPU, 8GB RAM, 80GB SSD)
- **İşletim Sistemi**: Ubuntu 22.04 LTS
- **Network**: İnternet bağlantısı

### Domain Ayarları (Opsiyonel)
Eğer kendi domain'inizi kullanacaksanız:
1. Domain DNS ayarlarında A kaydını Hetzner sunucu IP'nize yönlendirin
2. Subdomain kullanacaksanız (örn: `panel.example.com`) CNAME veya A kaydı oluşturun

## 🚀 Tek Komutla Kurulum

### 1. Sunucuya Bağlanın
```bash
ssh root@YOUR_HETZNER_SERVER_IP
```

### 2. Kurulum Aracını İndirin
```bash
wget -O hetzner-install.sh https://raw.githubusercontent.com/YOUR_USERNAME/OtoParcaPanel/main/hetzner-install.sh
chmod +x hetzner-install.sh
```

### 3. Kurulumu Başlatın

#### Domain ile Kurulum (Let's Encrypt SSL)
```bash
sudo ./hetzner-install.sh yourdomain.com
```

#### Subdomain ile Kurulum
```bash
sudo ./hetzner-install.sh panel.yourdomain.com
```

#### Localhost Kurulum (Self-signed SSL)
```bash
sudo ./hetzner-install.sh
```

## 📊 Kurulum Süreci

Kurulum aracı şu adımları otomatik olarak gerçekleştirir:

1. **Sistem Kontrolü** (1/15) - Hetzner sunucu tipini tespit eder
2. **Domain Girişi** (2/15) - Domain bilgilerini alır ve doğrular
3. **Gereksinim Kontrolü** (3/15) - Sistem gereksinimlerini kontrol eder
4. **Şifre Üretimi** (4/15) - Güvenli şifreler oluşturur
5. **Sistem Güncelleme** (5/15) - Ubuntu paketlerini günceller
6. **Docker Kurulumu** (6/15) - Docker Engine ve Compose kurar
7. **Proje İndirme** (7/15) - Git repository'den projeyi indirir
8. **Environment Setup** (8/15) - Yapılandırma dosyalarını oluşturur
9. **Firewall Ayarları** (9/15) - UFW firewall'ı yapılandırır
10. **SSL Kurulumu** (10/15) - Let's Encrypt veya self-signed SSL
11. **Docker Optimize** (11/15) - Hetzner için Docker ayarlarını optimize eder
12. **Nginx Config** (12/15) - Reverse proxy yapılandırması
13. **Servis Build** (13/15) - Docker images'ları build eder
14. **Monitoring Setup** (14/15) - Prometheus ve Grafana kurar
15. **Sağlık Kontrolü** (15/15) - Final sistem testleri

## 🎯 Kurulum Sonrası

### Erişim Bilgileri
- **Ana Site**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api`
- **Grafana**: `https://yourdomain.com:3002`
- **Prometheus**: `https://yourdomain.com:9090`

### Giriş Bilgileri
- **Grafana**: `admin` / (kurulum sırasında oluşturulan şifre)

## 🔧 Yönetim Komutları

### Temel Docker Komutları
```bash
# Kurulum dizinine geç
cd /opt/oto-parca-panel

# Servisleri durumunu kontrol et
docker-compose ps

# Logları görüntüle
docker-compose logs -f

# Belirli bir servisin logunu görüntüle
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Servisleri durdur
docker-compose down

# Servisleri başlat
docker-compose up -d

# Servisleri yeniden başlat
docker-compose restart

# Monitoring servislerini başlat
docker-compose --profile monitoring up -d
```

### Sistem Yönetimi
```bash
# Disk kullanımını kontrol et
df -h

# RAM kullanımını kontrol et
free -h

# Sistem yükünü kontrol et
htop

# Firewall durumunu kontrol et
ufw status

# SSL sertifika durumunu kontrol et (Let's Encrypt)
certbot certificates

# SSL sertifikasını manuel olarak yenile
certbot renew
```

## 🛠️ Sorun Giderme

### Yaygın Sorunlar

#### 1. Docker Servisleri Başlamıyor
```bash
# Sistem kaynaklarını kontrol et
docker-compose ps
docker system df

# Logları incele
docker-compose logs

# Servisleri temizle ve yeniden başlat
docker-compose down
docker system prune -f
docker-compose up -d
```

#### 2. SSL Sertifika Sorunları
```bash
# Certbot durumunu kontrol et
certbot certificates

# Manuel sertifika yenileme
certbot renew --dry-run

# Nginx yapılandırmasını test et
nginx -t

# Nginx'i yeniden başlat
systemctl restart nginx
```

#### 3. Domain Erişim Sorunları
```bash
# DNS kontrolü
nslookup yourdomain.com

# Port kontrolü
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Firewall kontrolü
ufw status
```

#### 4. Veritabanı Bağlantı Sorunları
```bash
# PostgreSQL container durumu
docker-compose exec postgres pg_isready

# Veritabanına bağlan
docker-compose exec postgres psql -U oto_user -d oto_parca_panel

# Veritabanı logları
docker-compose logs postgres
```

### Log Dosyaları
```bash
# Kurulum logları
tail -f /var/log/oto-parca-panel-install.log

# Nginx logları
tail -f /opt/oto-parca-panel/nginx/logs/access.log
tail -f /opt/oto-parca-panel/nginx/logs/error.log

# Application logları
tail -f /opt/oto-parca-panel/logs/backend.log
```

## 📈 Performans Optimizasyonu

### Hetzner Server Tipi Önerileri

#### CX11 (1 vCPU, 4GB RAM) - Test/Demo
- Sadece test ve demo amaçlı
- Production kullanımı önerilmez
- Monitoring servisleri kapatılabilir

#### CX21 (2 vCPU, 4GB RAM) - Küçük İşletmeler
- 100-500 ürün için uygun
- Temel monitoring aktif
- Günde 1000-5000 istek kapasitesi

#### CX31 (2 vCPU, 8GB RAM) - Orta İşletmeler
- 500-2000 ürün için uygun
- Full monitoring aktif
- Günde 5000-20000 istek kapasitesi

#### CX41+ (4+ vCPU, 16+ GB RAM) - Büyük İşletmeler
- 2000+ ürün için uygun
- High-availability setup önerilir
- Günde 20000+ istek kapasitesi

### Resource Monitoring
```bash
# Container resource kullanımı
docker stats

# Sistem resource kullanımı
htop

# Disk kullanımı
ncdu /opt/oto-parca-panel
```

## 🔄 Backup ve Recovery

### Otomatik Backup
Kurulum otomatik olarak şu backup'ları yapar:
- **PostgreSQL**: Günlük veritabanı yedeği
- **Uploads**: Dosya yedekleri
- **Config**: Yapılandırma dosyası yedekleri

### Manuel Backup
```bash
# Veritabanı backup
docker-compose exec postgres pg_dump -U oto_user oto_parca_panel > backup_$(date +%Y%m%d).sql

# Tam sistem backup
tar -czf oto-parca-backup-$(date +%Y%m%d).tar.gz /opt/oto-parca-panel
```

### Recovery
```bash
# Veritabanı restore
docker-compose exec -T postgres psql -U oto_user oto_parca_panel < backup_20240101.sql

# Tam sistem restore
tar -xzf oto-parca-backup-20240101.tar.gz -C /
```

## 🔐 Güvenlik

### Güvenlik Önlemleri
- ✅ UFW Firewall aktif
- ✅ SSL/TLS encryption
- ✅ Rate limiting
- ✅ Security headers
- ✅ Non-root containers
- ✅ Network isolation

### Güvenlik Kontrolleri
```bash
# Firewall durumu
ufw status

# SSL sertifika kontrolü
openssl s_client -connect yourdomain.com:443

# Port tarama
nmap -sT -O localhost
```

## 📞 Destek

### Logları Topla
Sorun yaşadığınızda aşağıdaki bilgileri toplayın:

```bash
# Sistem bilgileri
uname -a
free -h
df -h

# Docker durumu
docker-compose ps
docker-compose logs --tail=100

# Kurulum logları
tail -100 /var/log/oto-parca-panel-install.log
```

### Destek Kanalları
- **GitHub Issues**: Teknik sorunlar için
- **Email**: Kritik sorunlar için
- **Documentation**: Detaylı rehberler için

---

**🎯 Hetzner Cloud ile OTO PARÇA PANEL - Profesyonel, Güvenli, Ölçeklenebilir**

*Kurulum ve yönetim konusunda sorularınız için GitHub Issues'ı kullanabilirsiniz.*
