# 🚗 OtoParcaPanel Otomatik Kurulum Aracı

Bu otomatik kurulum aracı, OtoParcaPanel projesini Hetzner Ubuntu 24.04 sunucusuna Docker kullanmadan, SSL sertifikası ile birlikte tek komutla kurar.

## 📋 Özellikler

- ✅ **Tam Otomatik Kurulum**: Tek komutla tüm sistem kurulur
- 🎨 **Renkli ve İnteraktif Arayüz**: Progress bar ve status gösterimi
- 🔒 **Güvenlik**: UFW, Fail2ban, SSL sertifikası otomatik kurulumu
- 📊 **İzleme**: Detaylı loglama ve hata takibi
- 🔄 **Rollback**: Hata durumunda otomatik geri alma
- 💾 **Yedekleme**: Mevcut dosyaların otomatik yedeklenmesi
- ✔️ **Doğrulama**: Kurulum sonrası otomatik testler

## 🚀 Hızlı Başlangıç

### Tek Komutla Kurulum
```bash
sudo bash quick-install.sh
```

### Manuel Kurulum Seçenekleri

#### İnteraktif Kurulum (Varsayılan)
```bash
chmod +x auto-installer.sh
sudo ./auto-installer.sh
```

#### Otomatik Kurulum (Non-Interactive)
```bash
sudo ./auto-installer.sh --non-interactive
```

#### Debug Modunda Kurulum
```bash
sudo ./auto-installer.sh --debug
```

#### Otomatik + Debug Kurulum
```bash
sudo ./auto-installer.sh --non-interactive --debug
```

#### Yardım
```bash
sudo ./auto-installer.sh --help
```

## 🛠️ Kurulum Adımları

### 1. Ön Gereksinimler

- Ubuntu 24.04 LTS sunucu
- Root erişimi (sudo)
- Minimum 2GB RAM
- Minimum 10GB disk alanı
- İnternet bağlantısı
- Domain adının sunucuya yönlendirilmiş olması

### 2. Kurulum Dosyalarını İndirin

```bash
# GitHub'dan projeyi klonlayın
git clone https://github.com/yourusername/OtoParcaPanel.git
cd OtoParcaPanel

# Kurulum dosyalarına çalıştırma izni verin
chmod +x auto-installer.sh install-helper.sh
```

### 3. Otomatik Kurulumu Başlatın

```bash
sudo bash auto-installer.sh
```

### 4. Kurulum Sırasında İstenen Bilgiler

Kurulum sırasında aşağıdaki bilgiler istenecek:

- **Domain Adı**: Örn: `otopanel.isletmemdijitalde.com`
- **Email Adresi**: SSL sertifikası için
- **PostgreSQL Şifresi**: Veritabanı için güçlü bir şifre
- **GitHub Repository**: (Opsiyonel, varsayılan kullanılabilir)

## 📦 Kurulum İçeriği

Otomatik kurulum aşağıdaki bileşenleri kurar ve yapılandırır:

### Sistem Bileşenleri
- Node.js 20.x
- PostgreSQL 16
- Nginx (Reverse Proxy)
- PM2 (Process Manager)
- Certbot (SSL)
- UFW (Firewall)
- Fail2ban (Güvenlik)

### Proje Kurulumu
- GitHub'dan proje indirme
- Bağımlılıkların kurulumu
- Veritabanı migration
- Demo verilerin yüklenmesi
- Environment dosyalarının oluşturulması
- SSL sertifikası kurulumu
- Nginx konfigürasyonu

## 🔧 Kurulum Sonrası

### Erişim Bilgileri

- **Website**: `https://yourdomain.com`
- **Admin Panel**: `https://yourdomain.com/admin`
- **API**: `https://yourdomain.com/api`

### Varsayılan Giriş

- **Email**: `admin@otoparcapanel.com`
- **Şifre**: `Admin123!`

### Yönetim Komutları

```bash
# PM2 durumu
pm2 status

# PM2 logları
pm2 logs

# Uygulamayı yeniden başlat
pm2 restart all

# Nginx test
nginx -t

# Nginx yeniden yükle
sudo systemctl reload nginx

# SSL sertifikası yenile
sudo certbot renew

# Sistem durumu
sudo systemctl status nginx postgresql
```

## 📁 Dosya Konumları

- **Proje Dizini**: `/opt/otoparcapanel`
- **Nginx Konfigürasyonu**: `/etc/nginx/sites-available/yourdomain.com`
- **Environment Dosyaları**: `/opt/otoparcapanel/.env`
- **Log Dosyaları**: `/var/log/pm2/`
- **Kurulum Logları**: `/var/log/otoparca-installer.log`
- **Yedek Dosyalar**: `/opt/otoparca-backup-YYYYMMDD_HHMMSS/`

## ⚙️ Yapılandırma

### WooCommerce API Ayarları

Kurulum sonrası aşağıdaki ayarları yapmanız gerekir:

1. Admin panele giriş yapın
2. Ayarlar sayfasına gidin
3. WooCommerce API bilgilerini girin:
   - WooCommerce URL
   - Consumer Key
   - Consumer Secret

### Python Scraper API

Python Scraper API'sini ayrıca kurmanız gerekir. Varsayılan olarak `http://localhost:5000` adresinde çalışması beklenir.

### Email SMTP Ayarları

Email bildirimleri için SMTP ayarlarını `.env` dosyasından yapılandırın:

```bash
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🔍 Sorun Giderme

### Log Dosyalarını Kontrol Edin

```bash
# Kurulum logları
sudo tail -f /var/log/otoparca-installer.log

# Hata logları
sudo tail -f /var/log/otoparca-installer-error.log

# PM2 logları
pm2 logs

# Nginx logları
sudo tail -f /var/log/nginx/error.log
```

### Yaygın Sorunlar

#### 1. SSL Sertifikası Hatası
```bash
# DNS kontrolü
nslookup yourdomain.com

# Manuel SSL kurulumu
sudo certbot --nginx -d yourdomain.com
```

#### 2. Veritabanı Bağlantı Hatası
```bash
# PostgreSQL durumu
sudo systemctl status postgresql

# Veritabanı test
sudo -u postgres psql -c "\l"
```

#### 3. PM2 Uygulama Hatası
```bash
# PM2 durumu
pm2 status

# Uygulamayı yeniden başlat
pm2 restart all

# PM2 logları
pm2 logs otoparcapanel-backend
```

### Rollback (Geri Alma)

Kurulum sırasında hata oluşursa, otomatik rollback mekanizması devreye girer. Manuel rollback için:

```bash
# Yedek dizinini bulun
ls -la /opt/otoparca-backup-*

# Helper fonksiyonları yükleyin
source install-helper.sh

# Rollback fonksiyonunu çalıştırın
rollback
```

## 🔒 Güvenlik

### Firewall Kuralları

```bash
# UFW durumu
sudo ufw status

# Açık portlar
sudo netstat -tlnp
```

### Fail2ban Durumu

```bash
# Fail2ban durumu
sudo fail2ban-client status

# SSH koruması
sudo fail2ban-client status sshd
```

### SSL Sertifikası

```bash
# Sertifika durumu
sudo certbot certificates

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

## 📊 İzleme ve Bakım

### Düzenli Kontroller

```bash
# Sistem kaynaklarını kontrol et
htop
df -h
free -h

# Servis durumları
sudo systemctl status nginx postgresql
pm2 status

# Log boyutları
sudo du -sh /var/log/*
```

### Yedekleme

```bash
# Veritabanı yedeği
sudo -u postgres pg_dump oto_parca_panel > backup_$(date +%Y%m%d).sql

# Proje dosyaları yedeği
tar -czf otoparcapanel_backup_$(date +%Y%m%d).tar.gz /opt/otoparcapanel
```

## 📞 Destek

- **Log Dosyası**: `/var/log/otoparca-installer.log`
- **Hata Logları**: `/var/log/otoparca-installer-error.log`
- **Backup Dizini**: `/var/backups/otoparca-installer/`

### Sorun Giderme

#### Script Takılma Sorunları

Eğer script bir adımda takılıyorsa:

1. **Debug modunda çalıştırın**:
   ```bash
   sudo ./auto-installer.sh --debug
   ```

2. **Non-interactive mode kullanın**:
   ```bash
   sudo ./auto-installer.sh --non-interactive
   ```

3. **Timeout ayarları**: Script artık 30-60 saniye timeout kullanır

4. **Log dosyalarını kontrol edin**:
   ```bash
   tail -f /var/log/otoparca-installer.log
   tail -f /var/log/otoparca-installer-error.log
   ```

#### Genel Sorun Giderme

1. **Sistem gereksinimlerini doğrulayın**
2. **İnternet bağlantısını test edin**
3. **DNS ayarlarını kontrol edin**
4. **Root yetkisiyle çalıştırdığınızdan emin olun**

#### Yaygın Hatalar

- **"Permission denied"**: `sudo` kullanın
- **"Command not found"**: Sistem güncellemesi yapın
- **"Timeout"**: Non-interactive mode deneyin
- **"DNS resolution failed"**: Domain DNS ayarlarını kontrol edin

Sorun yaşadığınızda:

1. Log dosyalarını kontrol edin
2. GitHub Issues sayfasında sorun bildirin
3. Log dosyalarını ve hata mesajlarını paylaşın

### Önemli Log Dosyaları

- Kurulum: `/var/log/otoparca-installer.log`
- Hatalar: `/var/log/otoparca-installer-error.log`
- PM2: `/var/log/pm2/otoparcapanel.log`
- Nginx: `/var/log/nginx/error.log`

---

**Not**: Bu kurulum aracı Ubuntu 24.04 LTS için optimize edilmiştir. Diğer işletim sistemlerinde çalışmayabilir.