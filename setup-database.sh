#!/bin/bash

# Oto Parça Panel - Veritabanı Kurulum Scripti
# PostgreSQL veritabanı kurulumu ve yapılandırması

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Environment dosyasını yükle
if [ -f .env ]; then
    source .env
else
    error ".env dosyası bulunamadı. Önce install.sh scriptini çalıştırın."
fi

# PostgreSQL bağlantısını test et
test_postgres_connection() {
    log "PostgreSQL bağlantısı test ediliyor..."
    
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client yüklü değil. 'apt install postgresql-client' çalıştırın."
    fi
    
    # PostgreSQL servisinin çalıştığını kontrol et
    if ! systemctl is-active --quiet postgresql; then
        error "PostgreSQL servisi çalışmıyor. 'systemctl start postgresql' çalıştırın."
    fi
    
    log "PostgreSQL bağlantısı başarılı."
}

# Veritabanı ve kullanıcı oluştur
create_database() {
    log "Veritabanı ve kullanıcı oluşturuluyor..."
    
    # Veritabanının var olup olmadığını kontrol et
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='oto_parca_panel'")
    
    if [ "$DB_EXISTS" = "1" ]; then
        warn "Veritabanı zaten mevcut. Yeniden oluşturmak için önce silin."
        read -p "Mevcut veritabanını silip yeniden oluşturmak istiyor musunuz? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS oto_parca_panel;"
            sudo -u postgres psql -c "DROP USER IF EXISTS oto_user;"
            log "Mevcut veritabanı silindi."
        else
            info "Mevcut veritabanı korundu."
            return 0
        fi
    fi
    
    # Veritabanı ve kullanıcı oluştur
    sudo -u postgres psql << EOF
CREATE DATABASE oto_parca_panel;
CREATE USER oto_user WITH PASSWORD '$POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;
ALTER USER oto_user CREATEDB;
\q
EOF
    
    log "Veritabanı ve kullanıcı başarıyla oluşturuldu."
}

# Veritabanı bağlantısını test et
test_database_connection() {
    log "Veritabanı bağlantısı test ediliyor..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT version();" > /dev/null 2>&1; then
        log "Veritabanı bağlantısı başarılı."
    else
        error "Veritabanı bağlantısı başarısız. Şifre veya kullanıcı adını kontrol edin."
    fi
    
    unset PGPASSWORD
}

# PostgreSQL konfigürasyonu
configure_postgresql() {
    log "PostgreSQL konfigürasyonu yapılıyor..."
    
    PG_VERSION=$(sudo -u postgres psql -tAc "SELECT version()" | grep -oP 'PostgreSQL \K[0-9]+\.[0-9]+')
    PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
    
    if [ ! -d "$PG_CONFIG_DIR" ]; then
        error "PostgreSQL konfigürasyon dizini bulunamadı: $PG_CONFIG_DIR"
    fi
    
    # postgresql.conf ayarları
    log "postgresql.conf ayarları yapılıyor..."
    
    # Backup oluştur
    cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Performance ayarları
    cat >> "$PG_CONFIG_DIR/postgresql.conf" << EOF

# Oto Parça Panel Optimizasyonları
# $(date)

# Memory ayarları
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint ayarları
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Connection ayarları
max_connections = 200

# Logging ayarları
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'

# Autovacuum ayarları
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
EOF
    
    # pg_hba.conf ayarları
    log "pg_hba.conf ayarları yapılıyor..."
    
    # Backup oluştur
    cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Local bağlantılar için MD5 authentication
    sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' "$PG_CONFIG_DIR/pg_hba.conf"
    
    # PostgreSQL'i yeniden başlat
    systemctl restart postgresql
    
    log "PostgreSQL konfigürasyonu tamamlandı."
}

# Veritabanı şemasını oluştur
create_schema() {
    log "Veritabanı şeması oluşturuluyor..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Schema dosyasının varlığını kontrol et
    if [ -f "database/schema.sql" ]; then
        psql -h localhost -U oto_user -d oto_parca_panel -f "database/schema.sql"
        log "Veritabanı şeması başarıyla oluşturuldu."
    else
        warn "database/schema.sql dosyası bulunamadı. Manuel olarak migration çalıştırın."
    fi
    
    unset PGPASSWORD
}

# İlk veri yükleme
load_initial_data() {
    log "İlk veriler yükleniyor..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Seed dosyasının varlığını kontrol et
    if [ -f "database/seeds.sql" ]; then
        psql -h localhost -U oto_user -d oto_parca_panel -f "database/seeds.sql"
        log "İlk veriler başarıyla yüklendi."
    else
        warn "database/seeds.sql dosyası bulunamadı. Manuel olarak seed çalıştırın."
    fi
    
    unset PGPASSWORD
}

# Backup dizini oluştur
setup_backup_directory() {
    log "Backup dizini oluşturuluyor..."
    
    BACKUP_DIR="/opt/oto-parca-panel/backups"
    mkdir -p "$BACKUP_DIR"
    chown postgres:postgres "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
    
    log "Backup dizini oluşturuldu: $BACKUP_DIR"
}

# Backup scripti oluştur
create_backup_script() {
    log "Backup scripti oluşturuluyor..."
    
    cat > /opt/oto-parca-panel/backup-db.sh << 'EOF'
#!/bin/bash

# Oto Parça Panel - Veritabanı Backup Scripti

set -e

# Environment dosyasını yükle
source /opt/oto-parca-panel/.env

# Backup dizini
BACKUP_DIR="/opt/oto-parca-panel/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/oto_parca_panel_backup_$DATE.sql"

# Veritabanı backup'ı al
export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump -h localhost -U oto_user -d oto_parca_panel > "$BACKUP_FILE"
unset PGPASSWORD

# Backup'ı sıkıştır
gzip "$BACKUP_FILE"

# Eski backup'ları temizle (30 günden eski)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup tamamlandı: $BACKUP_FILE.gz"
EOF
    
    chmod +x /opt/oto-parca-panel/backup-db.sh
    
    # Crontab'a ekle (günlük 2:00'da)
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/oto-parca-panel/backup-db.sh") | crontab -
    
    log "Backup scripti oluşturuldu ve crontab'a eklendi."
}

# Restore scripti oluştur
create_restore_script() {
    log "Restore scripti oluşturuluyor..."
    
    cat > /opt/oto-parca-panel/restore-db.sh << 'EOF'
#!/bin/bash

# Oto Parça Panel - Veritabanı Restore Scripti

set -e

if [ $# -eq 0 ]; then
    echo "Kullanım: $0 <backup_file.sql.gz>"
    echo "Mevcut backup dosyaları:"
    ls -la /opt/oto-parca-panel/backups/*.sql.gz 2>/dev/null || echo "Backup dosyası bulunamadı."
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup dosyası bulunamadı: $BACKUP_FILE"
    exit 1
fi

# Environment dosyasını yükle
source /opt/oto-parca-panel/.env

echo "UYARI: Bu işlem mevcut veritabanını tamamen silecek!"
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "İşlem iptal edildi."
    exit 1
fi

# Veritabanını yeniden oluştur
export PGPASSWORD="$POSTGRES_PASSWORD"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS oto_parca_panel;"
sudo -u postgres psql -c "CREATE DATABASE oto_parca_panel;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;"

# Backup'ı restore et
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h localhost -U oto_user -d oto_parca_panel
else
    psql -h localhost -U oto_user -d oto_parca_panel < "$BACKUP_FILE"
fi

unset PGPASSWORD

echo "Restore tamamlandı: $BACKUP_FILE"
EOF
    
    chmod +x /opt/oto-parca-panel/restore-db.sh
    
    log "Restore scripti oluşturuldu."
}

# Veritabanı durumunu kontrol et
check_database_status() {
    log "Veritabanı durumu kontrol ediliyor..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    echo -e "\n${BLUE}=== Veritabanı Bilgileri ===${NC}"
    psql -h localhost -U oto_user -d oto_parca_panel -c "\l+" | grep oto_parca_panel
    
    echo -e "\n${BLUE}=== Tablo Listesi ===${NC}"
    psql -h localhost -U oto_user -d oto_parca_panel -c "\dt"
    
    echo -e "\n${BLUE}=== Veritabanı Boyutu ===${NC}"
    psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT pg_size_pretty(pg_database_size('oto_parca_panel')) AS database_size;"
    
    echo -e "\n${BLUE}=== Aktif Bağlantılar ===${NC}"
    psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname='oto_parca_panel';"
    
    unset PGPASSWORD
    
    log "Veritabanı durumu kontrol edildi."
}

# Ana fonksiyon
main() {
    log "Veritabanı kurulumu başlatılıyor..."
    
    test_postgres_connection
    create_database
    test_database_connection
    configure_postgresql
    create_schema
    load_initial_data
    setup_backup_directory
    create_backup_script
    create_restore_script
    check_database_status
    
    echo -e "\n${GREEN}=== Veritabanı Kurulumu Tamamlandı ===${NC}"
    echo -e "${BLUE}Veritabanı:${NC} oto_parca_panel"
    echo -e "${BLUE}Kullanıcı:${NC} oto_user"
    echo -e "${BLUE}Host:${NC} localhost:5432"
    echo -e "${BLUE}Backup Script:${NC} /opt/oto-parca-panel/backup-db.sh"
    echo -e "${BLUE}Restore Script:${NC} /opt/oto-parca-panel/restore-db.sh"
    
    echo -e "\n${YELLOW}=== Sonraki Adımlar ===${NC}"
    echo -e "1. Backend migration'ları çalıştırın: cd backend && npm run migration:run"
    echo -e "2. Seed verilerini yükleyin: cd backend && npm run seed:run"
    echo -e "3. İlk backup'ı test edin: /opt/oto-parca-panel/backup-db.sh"
    
    log "Veritabanı kurulumu başarıyla tamamlandı!"
}

# Script'i çalıştır
main "$@"