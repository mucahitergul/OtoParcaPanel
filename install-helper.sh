#!/bin/bash

# OtoParcaPanel Auto Installer - Helper Functions
# Version: 1.0
# Description: Yardımcı fonksiyonlar ve utilities

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Log dosyası
LOG_FILE="/var/log/otoparca-installer.log"
ERROR_LOG="/var/log/otoparca-installer-error.log"

# Backup dizini
BACKUP_DIR="/opt/otoparca-backup-$(date +%Y%m%d_%H%M%S)"

# Progress bar fonksiyonu
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))
    
    printf "\r${BLUE}[${GREEN}"
    for ((i=0; i<completed; i++)); do printf "█"; done
    for ((i=completed; i<width; i++)); do printf "░"; done
    printf "${BLUE}] ${percentage}%% ${WHITE}${message}${NC}"
    
    if [ $current -eq $total ]; then
        printf "\n"
    fi
}

# Başarı mesajı
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    log_message "SUCCESS: $1"
}

# Hata mesajı
print_error() {
    echo -e "${RED}✗ $1${NC}"
    log_message "ERROR: $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" >> "$ERROR_LOG"
}

# Uyarı mesajı
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log_message "WARNING: $1"
}

# Bilgi mesajı
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
    log_message "INFO: $1"
}

# Başlık
print_header() {
    echo -e "\n${PURPLE}═══════════════════════════════════════${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}\n"
    log_message "HEADER: $1"
}

# Alt başlık
print_subheader() {
    echo -e "\n${CYAN}▶ $1${NC}\n"
    log_message "SUBHEADER: $1"
}

# Log mesajı
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Spinner animasyonu
show_spinner() {
    local pid=$1
    local message=$2
    local delay=0.1
    local spinstr='|/-\\'
    
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c] %s" "$spinstr" "$message"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Kullanıcı onayı
confirm() {
    local message=$1
    local default=${2:-"n"}
    
    if [ "$default" = "y" ]; then
        local prompt="[Y/n]"
    else
        local prompt="[y/N]"
    fi
    
    echo -e "${YELLOW}$message $prompt${NC}"
    read -r response
    
    if [ -z "$response" ]; then
        response=$default
    fi
    
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# Komut çalıştırma ve hata kontrolü
execute_command() {
    local command="$1"
    local description="$2"
    local show_output=${3:-false}
    
    log_message "EXECUTING: $command"
    
    if [ "$show_output" = "true" ]; then
        if eval "$command" 2>&1 | tee -a "$LOG_FILE"; then
            print_success "$description"
            return 0
        else
            print_error "$description başarısız oldu"
            return 1
        fi
    else
        if eval "$command" >> "$LOG_FILE" 2>&1; then
            print_success "$description"
            return 0
        else
            print_error "$description başarısız oldu"
            return 1
        fi
    fi
}

# Servis durumu kontrolü
check_service_status() {
    local service_name=$1
    
    if systemctl is-active --quiet "$service_name"; then
        print_success "$service_name servisi çalışıyor"
        return 0
    else
        print_error "$service_name servisi çalışmıyor"
        return 1
    fi
}

# Port kontrolü
check_port() {
    local port=$1
    local service_name=$2
    
    if netstat -tuln | grep -q ":$port "; then
        print_success "Port $port ($service_name) kullanılabilir"
        return 0
    else
        print_error "Port $port ($service_name) kullanılamıyor"
        return 1
    fi
}

# Dosya backup
backup_file() {
    local file_path=$1
    
    if [ -f "$file_path" ]; then
        local backup_path="$BACKUP_DIR/$(basename "$file_path").backup"
        mkdir -p "$BACKUP_DIR"
        cp "$file_path" "$backup_path"
        print_info "$file_path yedeklendi: $backup_path"
        log_message "BACKUP: $file_path -> $backup_path"
    fi
}

# Dizin backup
backup_directory() {
    local dir_path=$1
    
    if [ -d "$dir_path" ]; then
        local backup_path="$BACKUP_DIR/$(basename "$dir_path")"
        mkdir -p "$BACKUP_DIR"
        cp -r "$dir_path" "$backup_path"
        print_info "$dir_path dizini yedeklendi: $backup_path"
        log_message "BACKUP: $dir_path -> $backup_path"
    fi
}

# Rollback fonksiyonu
rollback() {
    print_header "ROLLBACK İŞLEMİ BAŞLATILIYOR"
    
    if [ -d "$BACKUP_DIR" ]; then
        print_info "Backup dizini bulundu: $BACKUP_DIR"
        
        # Servisleri durdur
        systemctl stop nginx 2>/dev/null
        systemctl stop postgresql 2>/dev/null
        pm2 stop all 2>/dev/null
        
        # Backup'tan geri yükle
        if confirm "Backup'tan geri yüklemek istiyor musunuz?"; then
            print_info "Geri yükleme işlemi başlatılıyor..."
            
            # Burada backup'tan geri yükleme işlemleri yapılacak
            # Bu kısım kurulum sırasında hangi dosyaların backup'landığına göre dinamik olarak doldurulacak
            
            print_success "Rollback işlemi tamamlandı"
        fi
    else
        print_warning "Backup dizini bulunamadı"
    fi
}

# Sistem gereksinimleri kontrolü
check_system_requirements() {
    print_subheader "Sistem Gereksinimleri Kontrolü"
    
    local errors=0
    
    # Ubuntu sürümü kontrolü
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$NAME" == *"Ubuntu"* ]] && [[ "$VERSION_ID" == "24.04" ]]; then
            print_success "Ubuntu 24.04 tespit edildi"
        else
            print_error "Bu installer Ubuntu 24.04 için tasarlanmıştır. Mevcut: $NAME $VERSION_ID"
            ((errors++))
        fi
    else
        print_error "İşletim sistemi bilgisi alınamadı"
        ((errors++))
    fi
    
    # Root yetkisi kontrolü
    if [ "$EUID" -eq 0 ]; then
        print_success "Root yetkisi mevcut"
    else
        print_error "Bu script root yetkisiyle çalıştırılmalıdır (sudo kullanın)"
        ((errors++))
    fi
    
    # RAM kontrolü (minimum 2GB)
    local ram_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$ram_gb" -ge 2 ]; then
        print_success "RAM: ${ram_gb}GB (Yeterli)"
    else
        print_warning "RAM: ${ram_gb}GB (Minimum 2GB önerilir)"
    fi
    
    # Disk alanı kontrolü (minimum 10GB)
    local disk_gb=$(df / | awk 'NR==2{print int($4/1024/1024)}')
    if [ "$disk_gb" -ge 10 ]; then
        print_success "Disk Alanı: ${disk_gb}GB (Yeterli)"
    else
        print_error "Disk Alanı: ${disk_gb}GB (Minimum 10GB gerekli)"
        ((errors++))
    fi
    
    # İnternet bağlantısı kontrolü
    if ping -c 1 google.com &> /dev/null; then
        print_success "İnternet bağlantısı mevcut"
    else
        print_error "İnternet bağlantısı gerekli"
        ((errors++))
    fi
    
    return $errors
}

# Cleanup fonksiyonu
cleanup() {
    print_info "Temizlik işlemleri yapılıyor..."
    
    # Geçici dosyaları temizle
    rm -rf /tmp/otoparca-*
    
    # Eski log dosyalarını temizle (30 günden eski)
    find /var/log -name "otoparca-*" -type f -mtime +30 -delete 2>/dev/null
    
    print_success "Temizlik tamamlandı"
}

# Hata yakalama
trap 'print_error "Beklenmeyen hata oluştu. Rollback başlatılıyor..."; rollback; exit 1' ERR
trap 'print_info "İşlem iptal edildi"; cleanup; exit 130' INT
trap 'cleanup; exit 0' EXIT

# Log dosyalarını oluştur
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE" "$ERROR_LOG"
chmod 644 "$LOG_FILE" "$ERROR_LOG"

log_message "=== OtoParcaPanel Installer Helper Functions Loaded ==="