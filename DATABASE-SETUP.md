# 🗄️ Database Setup - Local Development

## PostgreSQL Kurulumu

### Windows

1. **PostgreSQL İndir ve Kur**
   - [PostgreSQL resmi sitesinden](https://www.postgresql.org/download/windows/) indirin
   - Kurulum sırasında şifre belirleyin (örn: `password123`)
   - Port: `5432` (varsayılan)

2. **pgAdmin Kullanarak Database Oluştur**
   - pgAdmin'i açın
   - Servers > PostgreSQL > Databases'e sağ tıklayın
   - "Create > Database" seçin
   - Database name: `oto_parca_panel`
   - Save edin

3. **User Oluştur**
   ```sql
   -- pgAdmin Query Tool'da çalıştırın
   CREATE USER oto_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
   GRANT ALL ON SCHEMA public TO oto_user;
   ```

### macOS

1. **Homebrew ile Kurulum**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```

2. **Database ve User Oluştur**
   ```bash
   createdb oto_parca_panel
   psql oto_parca_panel
   ```
   
   ```sql
   CREATE USER oto_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
   GRANT ALL ON SCHEMA public TO oto_user;
   ```

### Linux (Ubuntu/Debian)

1. **PostgreSQL Kurulum**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Database ve User Oluştur**
   ```bash
   sudo -u postgres psql
   ```
   
   ```sql
   CREATE DATABASE oto_parca_panel;
   CREATE USER oto_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
   GRANT ALL ON SCHEMA public TO oto_user;
   \q
   ```

## Environment Variables

`.env` dosyasında database bağlantı bilgilerini güncelleyin:

```env
DATABASE_URL=postgresql://oto_user:password123@localhost:5432/oto_parca_panel
POSTGRES_USER=oto_user
POSTGRES_PASSWORD=password123
POSTGRES_DB=oto_parca_panel
```

## Database Migration

Backend çalıştırıldığında TypeORM otomatik olarak tabloları oluşturacaktır.

```bash
cd backend
npm run start:dev
```

## Test Verisi (Opsiyonel)

Test verisi eklemek için:

```bash
cd backend
npm run seed
```

## Bağlantı Testi

Database bağlantısını test etmek için:

```bash
psql -h localhost -U oto_user -d oto_parca_panel
```

Şifre istendiğinde: `password123`

## Sorun Giderme

### Bağlantı Hatası

1. **PostgreSQL çalışıyor mu?**
   ```bash
   # Windows
   services.msc -> PostgreSQL servisi
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Port çakışması**
   - Varsayılan port 5432 kullanımda olabilir
   - `.env` dosyasında farklı port belirtin

3. **Yetki sorunu**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
   GRANT ALL ON SCHEMA public TO oto_user;
   ```

### Faydalı Komutlar

```bash
# Database listesi
\l

# Tablo listesi
\dt

# User listesi
\du

# Database değiştir
\c oto_parca_panel

# Çıkış
\q
```