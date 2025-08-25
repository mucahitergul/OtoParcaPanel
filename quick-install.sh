#!/bin/bash

# OtoParcaPanel Quick Installer
# Bu script otomatik kurulum aracını hızlıca başlatır

echo "🚗 OtoParcaPanel Hızlı Kurulum Başlatılıyor..."
echo "==========================================="
echo
echo "Kullanım seçenekleri:"
echo "1. İnteraktif kurulum (varsayılan)"
echo "2. Otomatik kurulum (non-interactive)"
echo "3. Debug modunda kurulum"
echo "4. Otomatik + Debug kurulum"
echo

# Script'in bulunduğu dizini al
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kullanıcı seçimi
echo "Seçiminizi yapın [1-4] (varsayılan: 1):"
read -t 30 -r choice || choice=1

case $choice in
    1)
        echo "İnteraktif kurulum başlatılıyor..."
        PARAMS=""
        ;;
    2)
        echo "Otomatik kurulum başlatılıyor..."
        PARAMS="--non-interactive"
        ;;
    3)
        echo "Debug modunda kurulum başlatılıyor..."
        PARAMS="--debug"
        ;;
    4)
        echo "Otomatik + Debug kurulum başlatılıyor..."
        PARAMS="--non-interactive --debug"
        ;;
    *)
        echo "Geçersiz seçim. İnteraktif kurulum başlatılıyor..."
        PARAMS=""
        ;;
esac

echo

# Ana installer'ı çalıştır
if [ -f "$SCRIPT_DIR/auto-installer.sh" ]; then
    chmod +x "$SCRIPT_DIR/auto-installer.sh"
    sudo bash "$SCRIPT_DIR/auto-installer.sh" $PARAMS
else
    echo "❌ HATA: auto-installer.sh dosyası bulunamadı!"
    echo "Lütfen dosyaların tam olduğundan emin olun."
    exit 1
fi

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Banner
show_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              🚀 OtoParcaPanel Quick Installer 🚀              ║"
    echo "║                                                              ║"
    echo "║                 Hızlı Kurulum Başlatıcısı                   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

# Mesaj fonksiyonları
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Ön kontroller
check_prerequisites() {
    print_info "Ön kontroller yapılıyor..."
    
    # Root kontrolü
    if [ "$EUID" -ne 0 ]; then
        print_error "Bu script root yetkisiyle çalıştırılmalıdır!"
        echo -e "${CYAN}Kullanım: sudo bash quick-install.sh${NC}"
        exit 1
    fi
    
    # Ubuntu kontrolü
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$NAME" != *"Ubuntu"* ]] || [[ "$VERSION_ID" != "24.04" ]]; then
            print_warning "Bu installer Ubuntu 24.04 için optimize edilmiştir."
            print_warning "Mevcut sistem: $NAME $VERSION_ID"
            echo -e "${YELLOW}Devam etmek istiyor musunuz? (y/N)${NC}"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                print_info "Kurulum iptal edildi."
                exit 0
            fi
        fi
    fi
    
    # İnternet bağlantısı
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "İnternet bağlantısı gerekli!"
        exit 1
    fi
    
    print_success "Ön kontroller tamamlandı"
}

# Gerekli paketleri kur
install_basic_packages() {
    print_info "Temel paketler kuruluyor..."
    
    apt update -qq
    apt install -y curl wget git unzip &> /dev/null
    
    print_success "Temel paketler kuruldu"
}

# Kurulum dosyalarını hazırla
prepare_installer() {
    print_info "Kurulum dosyaları hazırlanıyor..."
    
    # Script dizini
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Kurulum dosyalarının varlığını kontrol et
    if [ ! -f "$SCRIPT_DIR/auto-installer.sh" ]; then
        print_error "auto-installer.sh dosyası bulunamadı!"
        exit 1
    fi
    
    if [ ! -f "$SCRIPT_DIR/install-helper.sh" ]; then
        print_error "install-helper.sh dosyası bulunamadı!"
        exit 1
    fi
    
    # Çalıştırma izinleri ver
    chmod +x "$SCRIPT_DIR/auto-installer.sh"
    chmod +x "$SCRIPT_DIR/install-helper.sh"
    
    print_success "Kurulum dosyaları hazırlandı"
}

# Sistem bilgilerini göster
show_system_info() {
    print_info "Sistem Bilgileri:"
    echo -e "${CYAN}• İşletim Sistemi:${NC} $(lsb_release -d | cut -f2)"
    echo -e "${CYAN}• Kernel:${NC} $(uname -r)"
    echo -e "${CYAN}• RAM:${NC} $(free -h | awk '/^Mem:/{print $2}')"
    echo -e "${CYAN}• Disk:${NC} $(df -h / | awk 'NR==2{print $4}') boş alan"
    echo -e "${CYAN}• CPU:${NC} $(nproc) çekirdek"
    echo
}

# Kurulum öncesi uyarılar
show_warnings() {
    print_warning "ÖNEMLI UYARILAR:"
    echo -e "${YELLOW}• Bu kurulum mevcut Nginx, PostgreSQL konfigürasyonlarını değiştirebilir${NC}"
    echo -e "${YELLOW}• Domain adınızın bu sunucuya yönlendirilmiş olması gerekir${NC}"
    echo -e "${YELLOW}• SSL sertifikası için geçerli bir email adresi gereklidir${NC}"
    echo -e "${YELLOW}• Kurulum yaklaşık 10-15 dakika sürebilir${NC}"
    echo
}

# Kullanıcı onayı
get_confirmation() {
    echo -e "${WHITE}OtoParcaPanel otomatik kurulumunu başlatmak istiyor musunuz?${NC}"
    echo -e "${CYAN}Bu işlem sisteminizde değişiklikler yapacaktır.${NC}"
    echo
    echo -e "${YELLOW}Devam etmek için 'EVET' yazın (büyük harflerle):${NC}"
    read -r confirmation
    
    if [ "$confirmation" != "EVET" ]; then
        print_info "Kurulum iptal edildi."
        exit 0
    fi
}

# Ana kurulumu başlat
start_main_installer() {
    print_info "Ana kurulum başlatılıyor..."
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"
    
    # Script dizini
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Ana installer'ı çalıştır
    bash "$SCRIPT_DIR/auto-installer.sh"
}

# Ana fonksiyon
main() {
    show_banner
    
    print_info "OtoParcaPanel Hızlı Kurulum Başlatıcısı"
    print_info "Bu script ana kurulum aracını hazırlar ve başlatır."
    echo
    
    check_prerequisites
    install_basic_packages
    prepare_installer
    show_system_info
    show_warnings
    get_confirmation
    
    print_success "Ön hazırlıklar tamamlandı!"
    echo
    
    start_main_installer
}

# Hata yakalama
trap 'print_error "Beklenmeyen hata oluştu!"; exit 1' ERR
trap 'print_info "İşlem iptal edildi"; exit 130' INT

# Script'i çalıştır
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi