#!/bin/bash

# Oto Parça Panel - Port Yönetim Scripti
# Port çakışmalarını tespit eder, çözer ve yönetir

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Gerekli portlar ve açıklamaları
declare -A REQUIRED_PORTS=(
    ["80"]="HTTP (Nginx)"
    ["443"]="HTTPS (Nginx SSL)"
    ["3000"]="Frontend (Next.js)"
    ["3001"]="Backend (NestJS)"
    ["5000"]="Scraper (Python Flask)"
    ["5432"]="PostgreSQL Database"
    ["6379"]="Redis Cache"
)

# Alternatif portlar
declare -A ALTERNATIVE_PORTS=(
    ["3000"]="3002 3003 3004"
    ["3001"]="3011 3012 3013"
    ["5000"]="5001 5002 5003"
    ["5432"]="5433 5434 5435"
    ["6379"]="6380 6381 6382"
)

# Port kullanımını kontrol et
check_port_usage() {
    local port=$1
    local detailed=${2:-false}
    
    if netstat -tlnp 2>/dev/null | grep ":$port " > /dev/null; then
        if [[ "$detailed" == "true" ]]; then
            local process_info=$(netstat -tlnp 2>/dev/null | grep ":$port " | head -1)
            local pid=$(echo "$process_info" | awk '{print $7}' | cut -d'/' -f1)
            local process=$(echo "$process_info" | awk '{print $7}' | cut -d'/' -f2)
            local address=$(echo "$process_info" | awk '{print $4}')
            
            echo "$port:$process:$pid:$address"
        else
            return 0  # Port kullanımda
        fi
    else
        if [[ "$detailed" == "true" ]]; then
            echo "$port:free:0:0.0.0.0:$port"
        else
            return 1  # Port boş
        fi
    fi
}

# Tüm portları listele
list_all_ports() {
    log "Port kullanım durumu kontrol ediliyor..."
    
    echo -e "\n${CYAN}=== OTO PARÇA PANEL PORT DURUMU ===${NC}"
    printf "%-8s %-25s %-15s %-10s %-15s\n" "PORT" "AÇIKLAMA" "DURUM" "PID" "PROCESS"
    echo "────────────────────────────────────────────────────────────────────────"
    
    for port in "${!REQUIRED_PORTS[@]}"; do
        local description="${REQUIRED_PORTS[$port]}"
        local port_info=$(check_port_usage "$port" true)
        local process=$(echo "$port_info" | cut -d':' -f2)
        local pid=$(echo "$port_info" | cut -d':' -f3)
        
        if [[ "$process" == "free" ]]; then
            printf "%-8s %-25s ${GREEN}%-15s${NC} %-10s %-15s\n" "$port" "$description" "BOŞTA" "-" "-"
        else
            if [[ "$process" == "docker-proxy" || "$process" == "nginx" ]]; then
                printf "%-8s %-25s ${GREEN}%-15s${NC} %-10s %-15s\n" "$port" "$description" "NORMAL" "$pid" "$process"
            else
                printf "%-8s %-25s ${RED}%-15s${NC} %-10s %-15s\n" "$port" "$description" "ÇAKIŞMA" "$pid" "$process"
            fi
        fi
    done
    
    echo ""
}

# Çakışan portları tespit et
detect_conflicts() {
    log "Port çakışmaları tespit ediliyor..."
    
    local conflicts=()
    
    for port in "${!REQUIRED_PORTS[@]}"; do
        local port_info=$(check_port_usage "$port" true)
        local process=$(echo "$port_info" | cut -d':' -f2)
        local pid=$(echo "$port_info" | cut -d':' -f3)
        
        if [[ "$process" != "free" && "$process" != "docker-proxy" && "$process" != "nginx" && "$process" != "-" ]]; then
            conflicts+=("$port:$process:$pid")
        fi
    done
    
    if [ ${#conflicts[@]} -eq 0 ]; then
        success "Port çakışması tespit edilmedi."
        return 0
    fi
    
    echo -e "\n${RED}=== PORT ÇAKIŞMALARI TESPİT EDİLDİ ===${NC}"
    for conflict in "${conflicts[@]}"; do
        local port=$(echo "$conflict" | cut -d':' -f1)
        local process=$(echo "$conflict" | cut -d':' -f2)
        local pid=$(echo "$conflict" | cut -d':' -f3)
        local description="${REQUIRED_PORTS[$port]}"
        
        echo -e "${YELLOW}Port $port ($description): $process (PID: $pid)${NC}"
    done
    
    return 1
}

# Çakışan servisleri durdur
stop_conflicting_services() {
    log "Çakışan servisler durduruluyor..."
    
    local stopped_count=0
    
    for port in "${!REQUIRED_PORTS[@]}"; do
        local port_info=$(check_port_usage "$port" true)
        local process=$(echo "$port_info" | cut -d':' -f2)
        local pid=$(echo "$port_info" | cut -d':' -f3)
        
        if [[ "$process" != "free" && "$process" != "docker-proxy" && "$process" != "nginx" && "$process" != "-" ]]; then
            if [[ "$pid" =~ ^[0-9]+$ ]]; then
                info "Port $port'daki $process servisi durduruluyor (PID: $pid)..."
                
                # Önce SIGTERM gönder
                if kill -TERM "$pid" 2>/dev/null; then
                    sleep 3
                    
                    # Hala çalışıyorsa SIGKILL gönder
                    if kill -0 "$pid" 2>/dev/null; then
                        kill -KILL "$pid" 2>/dev/null || true
                        warn "$process zorla durduruldu (SIGKILL)"
                    else
                        success "$process başarıyla durduruldu (SIGTERM)"
                    fi
                    
                    ((stopped_count++))
                else
                    warn "$process durdurulamadı (PID: $pid)"
                fi
            fi
        fi
    done
    
    if [ $stopped_count -gt 0 ]; then
        success "$stopped_count servis durduruldu."
        sleep 2
    else
        info "Durdurulacak çakışan servis bulunamadı."
    fi
}

# Alternatif portları öner
suggest_alternatives() {
    log "Alternatif portlar öneriliyor..."
    
    echo -e "\n${CYAN}=== ALTERNATİF PORT ÖNERİLERİ ===${NC}"
    
    for port in "${!ALTERNATIVE_PORTS[@]}"; do
        if check_port_usage "$port" > /dev/null 2>&1; then
            local description="${REQUIRED_PORTS[$port]}"
            local alternatives="${ALTERNATIVE_PORTS[$port]}"
            
            echo -e "${YELLOW}$port ($description) için alternatifler:${NC}"
            
            for alt_port in $alternatives; do
                if ! check_port_usage "$alt_port" > /dev/null 2>&1; then
                    echo -e "  ${GREEN}✓ Port $alt_port: Kullanılabilir${NC}"
                else
                    echo -e "  ${RED}✗ Port $alt_port: Kullanımda${NC}"
                fi
            done
            echo ""
        fi
    done
}

# Port temizleme işlemi
cleanup_ports() {
    log "Port temizleme işlemi başlatılıyor..."
    
    echo -e "\n${YELLOW}Bu işlem aşağıdaki adımları gerçekleştirecek:${NC}"
    echo -e "1. Çakışan servisleri tespit et"
    echo -e "2. Güvenli olmayan servisleri durdur"
    echo -e "3. Zombie process'leri temizle"
    echo -e "4. Port durumunu yeniden kontrol et"
    
    read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Port temizleme işlemi iptal edildi."
        return 1
    fi
    
    # Çakışan servisleri durdur
    stop_conflicting_services
    
    # Zombie process'leri temizle
    info "Zombie process'ler temizleniyor..."
    pkill -f "defunct" 2>/dev/null || true
    
    # Port durumunu yeniden kontrol et
    sleep 2
    list_all_ports
    
    success "Port temizleme işlemi tamamlandı."
}

# Sistem bilgilerini göster
show_system_info() {
    echo -e "\n${CYAN}=== SİSTEM BİLGİLERİ ===${NC}"
    echo -e "${BLUE}İşletim Sistemi:${NC} $(uname -s) $(uname -r)"
    echo -e "${BLUE}Hostname:${NC} $(hostname)"
    echo -e "${BLUE}Uptime:${NC} $(uptime -p 2>/dev/null || uptime)"
    echo -e "${BLUE}Aktif Bağlantılar:${NC} $(netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l)"
    echo -e "${BLUE}Dinlenen Portlar:${NC} $(netstat -tln 2>/dev/null | grep LISTEN | wc -l)"
}

# Yardım mesajı
show_help() {
    echo -e "${BLUE}Oto Parça Panel - Port Yönetim Scripti${NC}"
    echo -e "\nKullanım: $0 [KOMUT]"
    echo -e "\n${YELLOW}Komutlar:${NC}"
    echo -e "  list        - Tüm portların durumunu listele (varsayılan)"
    echo -e "  check       - Port çakışmalarını kontrol et"
    echo -e "  stop        - Çakışan servisleri durdur"
    echo -e "  cleanup     - Kapsamlı port temizleme işlemi"
    echo -e "  suggest     - Alternatif portları öner"
    echo -e "  info        - Sistem bilgilerini göster"
    echo -e "  help        - Bu yardım mesajını göster"
    echo -e "\n${YELLOW}Örnekler:${NC}"
    echo -e "  $0                    # Port durumunu listele"
    echo -e "  $0 check              # Çakışmaları kontrol et"
    echo -e "  $0 cleanup            # Kapsamlı temizlik yap"
    echo -e "  $0 suggest            # Alternatif portları göster"
}

# Ana fonksiyon
main() {
    local command=${1:-"list"}
    
    case $command in
        "list")
            list_all_ports
            ;;
        "check")
            if detect_conflicts; then
                success "Tüm portlar temiz!"
            else
                suggest_alternatives
            fi
            ;;
        "stop")
            stop_conflicting_services
            ;;
        "cleanup")
            cleanup_ports
            ;;
        "suggest")
            suggest_alternatives
            ;;
        "info")
            show_system_info
            list_all_ports
            ;;
        "help")
            show_help
            ;;
        *)
            error "Geçersiz komut: $command. Yardım için '$0 help' çalıştırın."
            ;;
    esac
}

# Root kontrolü
if [[ $EUID -eq 0 ]]; then
    warn "Bu script root kullanıcısı ile çalıştırılıyor. Dikkatli olun!"
fi

# Script'i çalıştır
main "$@"