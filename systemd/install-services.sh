#!/bin/bash

# Oto Parça Panel - Systemd Services Installation Script
# Systemd servislerini kurar ve aktifleştirir

set -e

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonları
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root olarak çalıştırılmalıdır!"
   echo "Kullanım: sudo $0"
   exit 1
fi

log "Systemd servisleri kurulumu başlatılıyor..."

# Proje dizini kontrolü
PROJECT_DIR="/opt/otoparcapanel"
if [ ! -d "$PROJECT_DIR" ]; then
    error "Proje dizini bulunamadı: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Systemd dizini kontrolü
if [ ! -d "./systemd" ]; then
    error "Systemd konfigürasyon dizini bulunamadı!"
    exit 1
fi

# Backup scripti kontrolü ve oluşturma
log "Backup scripti kontrol ediliyor..."
mkdir -p ./scripts

if [ ! -f "./scripts/backup.sh" ]; then
    log "Backup scripti oluşturuluyor..."
    cat > ./scripts/backup.sh << 'EOF'
#!/bin/bash

# Oto Parça Panel - Database Backup Script

set -e

# Konfigürasyon
BACKUP_DIR="${BACKUP_DIR:-/opt/otoparcapanel/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="otoparcapanel_backup_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Log fonksiyonu
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Backup dizini oluştur
mkdir -p "$BACKUP_DIR"

log "Database backup başlatılıyor..."

# PostgreSQL container'ından backup al
docker exec otoparcapanel-postgres pg_dump -U postgres -d otoparcapanel > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Database backup başarılı: $BACKUP_FILE"
    
    # Sıkıştır
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    log "Backup sıkıştırıldı: $COMPRESSED_FILE"
    
    # Eski backupları temizle
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    log "Eski backuplar temizlendi (${RETENTION_DAYS} günden eski)"
    
    # Backup boyutunu göster
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
    log "Backup boyutu: $BACKUP_SIZE"
    
    # Toplam backup sayısını göster
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    log "Toplam backup sayısı: $BACKUP_COUNT"
else
    log "ERROR: Database backup başarısız!"
    exit 1
fi

log "Backup işlemi tamamlandı."
EOF

    chmod +x ./scripts/backup.sh
fi

# Systemd servis dosyalarını kopyala
log "Systemd servis dosyaları kopyalanıyor..."

# Ana servis
cp ./systemd/otoparcapanel.service /etc/systemd/system/
log "✓ otoparcapanel.service kopyalandı"

# Backup servisi
cp ./systemd/otoparcapanel-backup.service /etc/systemd/system/
log "✓ otoparcapanel-backup.service kopyalandı"

# Backup timer
cp ./systemd/otoparcapanel-backup.timer /etc/systemd/system/
log "✓ otoparcapanel-backup.timer kopyalandı"

# Systemd daemon reload
log "Systemd daemon yeniden yükleniyor..."
systemctl daemon-reload

# Servisleri aktifleştir
log "Servisler aktifleştiriliyor..."

# Ana servis
systemctl enable otoparcapanel.service
log "✓ otoparcapanel.service aktifleştirildi"

# Backup timer
systemctl enable otoparcapanel-backup.timer
log "✓ otoparcapanel-backup.timer aktifleştirildi"

# Servisleri başlat
log "Servisler başlatılıyor..."

# Ana servisi başlat
systemctl start otoparcapanel.service
if systemctl is-active --quiet otoparcapanel.service; then
    log "✓ otoparcapanel.service başlatıldı"
else
    error "✗ otoparcapanel.service başlatılamadı"
    systemctl status otoparcapanel.service
fi

# Backup timer'ı başlat
systemctl start otoparcapanel-backup.timer
if systemctl is-active --quiet otoparcapanel-backup.timer; then
    log "✓ otoparcapanel-backup.timer başlatıldı"
else
    error "✗ otoparcapanel-backup.timer başlatılamadı"
    systemctl status otoparcapanel-backup.timer
fi

# Servis durumlarını göster
log "Servis durumları:"
echo ""
info "Ana Servis:"
systemctl status otoparcapanel.service --no-pager -l
echo ""
info "Backup Timer:"
systemctl status otoparcapanel-backup.timer --no-pager -l
echo ""
info "Backup Servisi:"
systemctl status otoparcapanel-backup.service --no-pager -l

# Timer listesi
echo ""
info "Aktif Timer'lar:"
systemctl list-timers otoparcapanel-backup.timer --no-pager

# Kullanışlı komutlar
echo ""
log "🎉 Systemd servisleri başarıyla kuruldu!"
echo ""
info "Kullanışlı Komutlar:"
echo "  • Servis durumu:        systemctl status otoparcapanel"
echo "  • Servisi yeniden başlat: systemctl restart otoparcapanel"
echo "  • Servisi durdur:      systemctl stop otoparcapanel"
echo "  • Servisi başlat:      systemctl start otoparcapanel"
echo "  • Logları görüntüle:   journalctl -u otoparcapanel -f"
echo "  • Backup durumu:       systemctl status otoparcapanel-backup.timer"
echo "  • Manuel backup:       systemctl start otoparcapanel-backup.service"
echo "  • Backup logları:      journalctl -u otoparcapanel-backup -f"
echo ""
info "Backup Bilgileri:"
echo "  • Otomatik backup:     Her gün saat 03:00"
echo "  • Backup dizini:       /opt/otoparcapanel/backups"
echo "  • Saklama süresi:      30 gün"
echo "  • Manuel backup:       /opt/otoparcapanel/scripts/backup.sh"