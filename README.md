# 🚀 Oto Parça Panel - Hızlı Başlangıç Kılavuzu

Bu kılavuz, Oto Parça Panel projesini farklı bilgisayarlarda hızlıca başlatmanız için hazırlanmıştır.

## 📋 Ön Gereksinimler

- **Node.js** (v18 veya üzeri)
- **npm** (Node.js ile birlikte gelir)
- **İnternet bağlantısı** (uzak veritabanı için)

## ⚡ Tek Tıkla Kurulum

### Windows için:
```bash
# Proje klasörüne gidin ve çalıştırın:
quick-setup.bat
```

### Manuel Kurulum (Tüm İşletim Sistemleri):

1. **Backend Kurulumu:**
   ```bash
   cd backend
   npm install
   npm run seed  # Veritabanını hazırla
   npm run start:dev  # Backend'i başlat
   ```

2. **Frontend Kurulumu (Yeni terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev  # Frontend'i başlat
   ```

## 🌐 Erişim Bilgileri

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Dokümantasyonu:** http://localhost:3001/api

## 🔐 Admin Giriş Bilgileri

```
Email: admin@admin.com
Şifre: admin123
```

## 🗄️ Veritabanı Yapılandırması

Proje uzak PostgreSQL veritabanını kullanacak şekilde yapılandırılmıştır:

```env
DB_HOST=otoparca.isletmemdijitalde.com
DB_PORT=5432
DB_USER=oto_user
DB_PASS=password123
DB_NAME=oto_parca_panel
```

## 🔧 Yapılandırma Dosyaları

### Backend (.env)
- Uzak veritabanı bağlantı bilgileri
- JWT yapılandırması
- Port ayarları

### Frontend (.env.local)
- API URL'leri
- Uygulama yapılandırması
- Geliştirme ortamı ayarları

## 🚨 Sorun Giderme

### Veritabanı Bağlantı Hatası
- İnternet bağlantınızı kontrol edin
- Firewall ayarlarını kontrol edin
- VPN kullanıyorsanız kapatmayı deneyin

### Port Çakışması
- Backend için port 3001
- Frontend için port 3000
- Bu portların boş olduğundan emin olun

### Dependency Hatası
```bash
# Node modules'ları temizle ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
```

## 📁 Proje Yapısı

```
OtoParcaPanel/
├── backend/          # NestJS API
├── frontend/         # Next.js Web App
├── quick-setup.bat   # Hızlı kurulum scripti
└── README-QUICK-START.md
```

## 🔄 Güncellemeler

Projeyi güncellemek için:
```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install
```

## 📞 Destek

Sorun yaşadığınızda:
1. Bu dokümandaki sorun giderme bölümünü kontrol edin
2. Terminal/konsol hatalarını kaydedin
3. Geliştirici ekibiyle iletişime geçin

---

**Not:** Bu kurulum paketi farklı bilgisayarlarda aynı veritabanıyla çalışacak şekilde optimize edilmiştir.