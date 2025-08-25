#!/bin/bash

# Oto Parça Panel - PostgreSQL Troubleshooting Aracı
# PostgreSQL sorunlarını tespit etme ve otomatik düzeltme aracı

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Log fonksiyonları
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

# Banner
show_banner() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                PostgreSQL Troubleshooting Tool              ║${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}║  PostgreSQL sorunlarını tespit etme ve düzeltme aracı       ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# PostgreSQL servis durumunu kontrol et
check_postgresql_service() {
    info "PostgreSQL servis durumu kontrol ediliyor..."
    
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL servisi çalışıyor"
        
        if sudo -u postgres pg_isready >/dev/null 2>&1; then
            success "PostgreSQL bağlantıları kabul ediyor"
            return 0
        else
            warn "PostgreSQL servisi çalışıyor ama bağlantı kabul etmiyor"
            return 1
        fi
    else
        error "PostgreSQL servisi çalışmıyor"
        
        info "PostgreSQL servisini başlatmaya çalışılıyor..."
        if systemctl start postgresql; then
            success "PostgreSQL servisi başlatıldı"
            sleep 3
            return 0
        else
            error "PostgreSQL servisi başlatılamadı"
            return 1
        fi
    fi
}

# PostgreSQL kurulumunu kontrol et
check_postgresql_installation() {
    info "PostgreSQL kurulumu kontrol ediliyor..."
    
    if command -v psql >/dev/null 2>&1; then
        local pg_version=$(sudo -u postgres psql --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)
        if [[ -n "$pg_version" ]]; then
            success "PostgreSQL $pg_version kurulu"
            return 0
        else
            warn "PostgreSQL kurulu ama sürüm tespit edilemiyor"
            return 1
        fi
    else
        error "PostgreSQL kurulu değil"
        
        info "PostgreSQL kurulumu başlatılıyor..."
        if apt update && apt install -y postgresql postgresql-contrib; then
            success "PostgreSQL kuruldu"
            return 0
        else
            error "PostgreSQL kurulumu başarısız"
            return 1
        fi
    fi
}

# Veritabanı ve kullanıcı durumunu kontrol et
check_database_and_user() {
    info "Veritabanı ve kullanıcı durumu kontrol ediliyor..."
    
    # PostgreSQL bağlantısını test et
    if ! sudo -u postgres pg_isready >/dev/null 2>&1; then
        error "PostgreSQL bağlantısı kurulamıyor"
        return 1
    fi
    
    # Kullanıcı kontrolü
    local user_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='oto_user'" 2>/dev/null || echo "")
    if [[ "$user_exists" == "1" ]]; then
        success "oto_user kullanıcısı mevcut"
    else
        warn "oto_user kullanıcısı bulunamadı"
        return 1
    fi
    
    # Veritabanı kontrolü
    local db_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='oto_parca_panel'" 2>/dev/null || echo "")
    if [[ "$db_exists" == "1" ]]; then
        success "oto_parca_panel veritabanı mevcut"
    else
        warn "oto_parca_panel veritabanı bulunamadı"
        return 1
    fi
    
    return 0
}

# Authentication ayarlarını kontrol et
check_authentication() {
    info "PostgreSQL authentication ayarları kontrol ediliyor..."
    
    # PostgreSQL sürümünü tespit et
    local pg_version=$(sudo -u postgres psql -tAc "SELECT version()" | grep -oP 'PostgreSQL \K[0-9]+\.[0-9]+' | head -1)
    local pg_config_dir="/etc/postgresql/$pg_version/main"
    
    if [[ ! -d "$pg_config_dir" ]]; then
        # Alternatif yolları dene
        for dir in /etc/postgresql/*/main; do
            if [[ -d "$dir" ]]; then
                pg_config_dir="$dir"
                break
            fi
        done
    fi
    
    if [[ ! -d "$pg_config_dir" ]]; then
        error "PostgreSQL konfigürasyon dizini bulunamadı"
        return 1
    fi
    
    local pg_hba_conf="$pg_config_dir/pg_hba.conf"
    
    if [[ -f "$pg_hba_conf" ]]; then
        info "pg_hba.conf dosyası: $pg_hba_conf"
        
        # oto_user için md5 authentication kontrolü
        if grep -q "local.*oto_user.*md5" "$pg_hba_conf"; then
            success "oto_user için md5 authentication yapılandırılmış"
            return 0
        else
            warn "oto_user için md5 authentication yapılandırılmamış"
            return 1
        fi
    else
        error "pg_hba.conf dosyası bulunamadı: $pg_hba_conf"
        return 1
    fi
}

# Bağlantı testi yap
test_database_connection() {
    info "Veritabanı bağlantısı test ediliyor..."
    
    # Şifre dosyasından oku
    local postgres_password=""
    if [[ -f "/opt/oto-parca-panel/.env" ]]; then
        postgres_password=$(grep "^POSTGRES_PASSWORD=" /opt/oto-parca-panel/.env | cut -d'=' -f2 | tr -d '"')
    fi
    
    if [[ -z "$postgres_password" ]]; then
        warn "PostgreSQL şifresi bulunamadı (.env dosyasından)"
        read -s -p "PostgreSQL şifresini girin: " postgres_password
        echo
    fi
    
    export PGPASSWORD="$postgres_password"
    
    if psql -h localhost -U oto_user -d oto_parca_panel -c "SELECT version();" >/dev/null 2>&1; then
        success "Veritabanı bağlantısı başarılı"
        unset PGPASSWORD
        return 0
    else
        error "Veritabanı bağlantısı başarısız"
        unset PGPASSWORD
        return 1
    fi
}

# PostgreSQL loglarını göster
show_postgresql_logs() {
    info "PostgreSQL logları gösteriliyor..."
    
    # PostgreSQL log dizinini bul
    local log_dirs=(
        "/var/log/postgresql"
        "/var/lib/postgresql/*/main/log"
        "/var/lib/postgresql/data/log"
    )
    
    for log_dir in "${log_dirs[@]}"; do
        if [[ -d "$log_dir" ]]; then
            info "Log dizini: $log_dir"
            
            # Son log dosyasını bul
            local latest_log=$(find "$log_dir" -name "*.log" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
            
            if [[ -n "$latest_log" ]]; then
                info "Son log dosyası: $latest_log"
                echo -e "\n${BLUE}=== Son 20 satır ===${NC}"
                tail -20 "$latest_log"
                return 0
            fi
        fi
    done
    
    # Systemd loglarını kontrol et
    info "Systemd logları kontrol ediliyor..."
    echo -e "\n${BLUE}=== PostgreSQL Systemd Logları ===${NC}"
    journalctl -u postgresql -n 20 --no-pager
}

# Otomatik düzeltme
auto_fix() {
    info "Otomatik düzeltme başlatılıyor..."
    
    # 1. PostgreSQL kurulumunu kontrol et
    if ! check_postgresql_installation; then
        error "PostgreSQL kurulum sorunu düzeltilemedi"
        return 1
    fi
    
    # 2. Servisi kontrol et
    if ! check_postgresql_service; then
        error "PostgreSQL servis sorunu düzeltilemedi"
        return 1
    fi
    
    # 3. Authentication ayarlarını düzelt
    if ! check_authentication; then
        info "Authentication ayarları düzeltiliyor..."
        
        # pg_hba.conf'u düzelt
        local pg_version=$(sudo -u postgres psql -tAc "SELECT version()" | grep -oP 'PostgreSQL \K[0-9]+\.[0-9]+' | head -1)
        local pg_config_dir="/etc/postgresql/$pg_version/main"
        
        if [[ ! -d "$pg_config_dir" ]]; then
            for dir in /etc/postgresql/*/main; do
                if [[ -d "$dir" ]]; then
                    pg_config_dir="$dir"
                    break
                fi
            done
        fi
        
        local pg_hba_conf="$pg_config_dir/pg_hba.conf"
        
        if [[ -f "$pg_hba_conf" ]]; then
            # Backup oluştur
            cp "$pg_hba_conf" "$pg_hba_conf.backup.$(date +%Y%m%d_%H%M%S)"
            
            # oto_user için md5 authentication ekle
            if ! grep -q "local.*oto_user.*md5" "$pg_hba_conf"; then
                sed -i '/^local.*all.*all.*peer/i local   oto_parca_panel oto_user                               md5' "$pg_hba_conf"
                info "pg_hba.conf güncellendi"
                
                # PostgreSQL'i yeniden yükle
                systemctl reload postgresql
                sleep 3
            fi
        fi
    fi
    
    # 4. Veritabanı ve kullanıcıyı kontrol et
    if ! check_database_and_user; then
        info "Veritabanı ve kullanıcı oluşturuluyor..."
        
        # Şifre iste
        read -s -p "PostgreSQL şifresi girin: " postgres_password
        echo
        
        # Kullanıcı oluştur
        local user_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='oto_user'" 2>/dev/null || echo "")
        if [[ "$user_exists" != "1" ]]; then
            sudo -u postgres psql -c "CREATE USER oto_user WITH PASSWORD '$postgres_password';"
            success "oto_user kullanıcısı oluşturuldu"
        fi
        
        # Veritabanı oluştur
        local db_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='oto_parca_panel'" 2>/dev/null || echo "")
        if [[ "$db_exists" != "1" ]]; then
            sudo -u postgres psql -c "CREATE DATABASE oto_parca_panel OWNER oto_user;"
            success "oto_parca_panel veritabanı oluşturuldu"
        fi
        
        # İzinleri ver
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE oto_parca_panel TO oto_user;"
        success "Veritabanı izinleri verildi"
    fi
    
    # 5. Bağlantı testi
    if test_database_connection; then
        success "Tüm sorunlar düzeltildi!"
        return 0
    else
        error "Bazı sorunlar düzeltilemedi"
        return 1
    fi
}

# Ana menü
show_menu() {
    echo -e "\n${BLUE}=== PostgreSQL Troubleshooting Menüsü ===${NC}"
    echo "1. Tam sistem kontrolü"
    echo "2. PostgreSQL servis durumu"
    echo "3. Veritabanı ve kullanıcı kontrolü"
    echo "4. Authentication ayarları"
    echo "5. Bağlantı testi"
    echo "6. PostgreSQL logları"
    echo "7. Otomatik düzeltme"
    echo "8. Çıkış"
    echo ""
    read -p "Seçiminizi yapın (1-8): " choice
}

# Ana fonksiyon
main() {
    # Root kontrolü
    if [[ $EUID -ne 0 ]]; then
        error "Bu script root olarak çalıştırılmalıdır"
        exit 1
    fi
    
    show_banner
    
    while true; do
        show_menu
        
        case $choice in
            1)
                info "Tam sistem kontrolü başlatılıyor..."
                check_postgresql_installation
                check_postgresql_service
                check_database_and_user
                check_authentication
                test_database_connection
                ;;
            2)
                check_postgresql_service
                ;;
            3)
                check_database_and_user
                ;;
            4)
                check_authentication
                ;;
            5)
                test_database_connection
                ;;
            6)
                show_postgresql_logs
                ;;
            7)
                auto_fix
                ;;
            8)
                info "Çıkılıyor..."
                exit 0
                ;;
            *)
                warn "Geçersiz seçim. Lütfen 1-8 arası bir sayı girin."
                ;;
        esac
        
        echo ""
        read -p "Devam etmek için Enter'a basın..."
    done
}

# Script'i çalıştır
main "$@"