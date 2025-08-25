#!/bin/bash

# Oto Parça Panel - Servis Başlatma Scripti
# Tüm servisleri başlatır ve durumlarını kontrol eder

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

# Komut satırı argümanları
MODE="${1:-production}"  # production, development, monitoring
ACTION="${2:-start}"     # start, stop, restart, status

# Environment dosyasını yükle
if [ -f .env ]; then
    source .env
else
    error ".env dosyası bulunamadı. Önce install.sh scriptini çalıştırın."
fi

# Docker ve Docker Compose kontrolü
check_docker() {
    log "Docker servisleri kontrol ediliyor..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker yüklü değil. Önce install.sh scriptini çalıştırın."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose yüklü değil. Önce install.sh scriptini çalıştırın."
    fi
    
    if ! systemctl is-active --quiet docker; then
        log "Docker servisi başlatılıyor..."
        systemctl start docker
    fi
    
    log "Docker servisleri hazır."
}

# Sistem kaynaklarını kontrol et
check_system_resources() {
    log "Sistem kaynakları kontrol ediliyor..."
    
    # Memory kontrolü
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    
    if [ "$AVAILABLE_MEM" -lt 1000 ]; then
        warn "Kullanılabilir RAM düşük: ${AVAILABLE_MEM}MB. Performans sorunları yaşayabilirsiniz."
    fi
    
    # Disk kontrolü
    AVAILABLE_DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    
    if [ "$AVAILABLE_DISK" -lt 5 ]; then
        warn "Kullanılabilir disk alanı düşük: ${AVAILABLE_DISK}GB."
    fi
    
    # CPU load kontrolü
    CPU_LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | sed 's/^[ \t]*//')
    CPU_CORES=$(nproc)
    
    if (( $(echo "$CPU_LOAD > $CPU_CORES" | bc -l) )); then
        warn "CPU yükü yüksek: $CPU_LOAD (Çekirdek sayısı: $CPU_CORES)"
    fi
    
    log "Sistem kaynakları kontrol edildi."
}

# Gelişmiş port kontrolü ve çakışma çözümü
check_ports() {
    log "Port kullanımı kontrol ediliyor..."
    
    PORTS=("80" "443" "3000" "3001" "5000" "5432" "6379")
    CONFLICTED_PORTS=()
    
    for port in "${PORTS[@]}"; do
        if netstat -tlnp | grep ":$port " > /dev/null 2>&1; then
            PROCESS=$(netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f2)
            PID=$(netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
            if [[ "$PROCESS" != "docker-proxy" && "$PROCESS" != "nginx" && "$PROCESS" != "-" ]]; then
                warn "Port $port kullanımda: $PROCESS (PID: $PID)"
                CONFLICTED_PORTS+=("$port:$PROCESS:$PID")
            fi
        fi
    done
    
    if [ ${#CONFLICTED_PORTS[@]} -gt 0 ]; then
        echo -e "\n${RED}=== PORT ÇAKIŞMASI TESPİT EDİLDİ ===${NC}"
        echo -e "Aşağıdaki portlar kullanımda:"
        for conflict in "${CONFLICTED_PORTS[@]}"; do
            port=$(echo $conflict | cut -d':' -f1)
            process=$(echo $conflict | cut -d':' -f2)
            pid=$(echo $conflict | cut -d':' -f3)
            echo -e "${YELLOW}Port $port: $process (PID: $pid)${NC}"
        done
        
        echo -e "\n${BLUE}Çözüm seçenekleri:${NC}"
        echo -e "1. Çakışan servisleri otomatik durdur (önerilen)"
        echo -e "2. Manuel çözüm (servisleri kendiniz durdurun)"
        echo -e "3. Port çakışmasını yoksay ve devam et"
        echo -e "4. Çıkış"
        
        read -p "Seçiminizi yapın (1-4): " -n 1 -r
        echo ""
        
        case $REPLY in
            1)
                log "Çakışan servisler otomatik olarak durduruluyor..."
                for conflict in "${CONFLICTED_PORTS[@]}"; do
                    port=$(echo $conflict | cut -d':' -f1)
                    process=$(echo $conflict | cut -d':' -f2)
                    pid=$(echo $conflict | cut -d':' -f3)
                    if [[ "$pid" != "-" && "$pid" =~ ^[0-9]+$ ]]; then
                        kill -TERM "$pid" 2>/dev/null || true
                        sleep 2
                        if kill -0 "$pid" 2>/dev/null; then
                            kill -KILL "$pid" 2>/dev/null || true
                        fi
                        log "$process servisi durduruldu (Port $port, PID: $pid)"
                    fi
                done
                sleep 3
                ;;
            2)
                warn "Manuel çözüm seçildi. Çakışan servisleri durdurup tekrar çalıştırın."
                return 1
                ;;
            3)
                warn "Port çakışması yoksayıldı. Servisler başlatılmaya devam ediliyor."
                ;;
            4)
                error "Kullanıcı tarafından iptal edildi."
                ;;
            *)
                error "Geçersiz seçim. İşlem iptal edildi."
                ;;
        esac
    fi
    
    log "Port kontrolü tamamlandı."
}

# Servisleri başlat
start_services() {
    log "Servisler başlatılıyor... (Mode: $MODE)"
    
    case $MODE in
        "production")
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        "development")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "monitoring")
            COMPOSE_FILE="docker-compose.yml"
            PROFILES="--profile monitoring"
            ;;
        *)
            error "Geçersiz mode: $MODE. Kullanılabilir modlar: production, development, monitoring"
            ;;
    esac
    
    # Docker Compose ile servisleri başlat
    log "Docker Compose ile servisler başlatılıyor..."
    docker-compose -f "$COMPOSE_FILE" $PROFILES up -d
    
    # Servislerin başlamasını bekle
    log "Servislerin başlaması bekleniyor..."
    sleep 30
    
    log "Servisler başlatıldı."
}

# Servisleri durdur
stop_services() {
    log "Servisler durduruluyor..."
    
    case $MODE in
        "production")
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        "development")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "monitoring")
            COMPOSE_FILE="docker-compose.yml"
            PROFILES="--profile monitoring"
            ;;
        *)
            error "Geçersiz mode: $MODE"
            ;;
    esac
    
    docker-compose -f "$COMPOSE_FILE" $PROFILES down
    
    log "Servisler durduruldu."
}

# Servisleri yeniden başlat
restart_services() {
    log "Servisler yeniden başlatılıyor..."
    
    stop_services
    sleep 10
    start_services
    
    log "Servisler yeniden başlatıldı."
}

# Servis durumlarını kontrol et
check_service_status() {
    log "Servis durumları kontrol ediliyor..."
    
    case $MODE in
        "production")
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        "development")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "monitoring")
            COMPOSE_FILE="docker-compose.yml"
            PROFILES="--profile monitoring"
            ;;
        *)
            error "Geçersiz mode: $MODE"
            ;;
    esac
    
    echo -e "\n${BLUE}=== Docker Container Durumları ===${NC}"
    docker-compose -f "$COMPOSE_FILE" $PROFILES ps
    
    echo -e "\n${BLUE}=== Servis Health Check'leri ===${NC}"
    
    # Domain adını environment'tan al
    DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}
    
    # Frontend kontrolü
    if [[ "$DOMAIN_NAME" == "localhost" ]]; then
        FRONTEND_URL="http://localhost:3000"
    else
        FRONTEND_URL="https://$DOMAIN_NAME"
    fi
    
    if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend ($FRONTEND_URL): Çalışıyor${NC}"
    else
        echo -e "${RED}✗ Frontend ($FRONTEND_URL): Çalışmıyor${NC}"
    fi
    
    # Backend kontrolü
    if [[ "$DOMAIN_NAME" == "localhost" ]]; then
        BACKEND_URL="http://localhost:3001/api/health"
    else
        BACKEND_URL="https://$DOMAIN_NAME/api/health"
    fi
    
    if curl -f "$BACKEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ($BACKEND_URL): Çalışıyor${NC}"
    else
        echo -e "${RED}✗ Backend ($BACKEND_URL): Çalışmıyor${NC}"
    fi
    
    # Scraper kontrolü (local development için)
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Scraper (localhost:5000): Çalışıyor${NC}"
    else
        echo -e "${YELLOW}⚠ Scraper (localhost:5000): Çalışmıyor (Normal - Remote scraper kullanılıyor)${NC}"
    fi
    
    # PostgreSQL kontrolü
    if docker exec oto-parca-postgres-prod pg_isready -U oto_user > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL (5432): Çalışıyor${NC}"
    else
        echo -e "${RED}✗ PostgreSQL (5432): Çalışmıyor${NC}"
    fi
    
    # Redis kontrolü
    if docker exec oto-parca-redis-prod redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis (6379): Çalışıyor${NC}"
    else
        echo -e "${RED}✗ Redis (6379): Çalışmıyor${NC}"
    fi
    
    # Nginx kontrolü
    if curl -f http://localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx (80): Çalışıyor${NC}"
    else
        echo -e "${RED}✗ Nginx (80): Çalışmıyor${NC}"
    fi
    
    echo -e "\n${BLUE}=== Sistem Kaynakları ===${NC}"
    echo -e "${BLUE}CPU Kullanımı:${NC} $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo -e "${BLUE}RAM Kullanımı:${NC} $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
    echo -e "${BLUE}Disk Kullanımı:${NC} $(df -h / | awk 'NR==2{print $5}')"
    
    echo -e "\n${BLUE}=== Docker Kaynak Kullanımı ===${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    log "Servis durumları kontrol edildi."
}

# Log'ları göster
show_logs() {
    log "Servis log'ları gösteriliyor..."
    
    case $MODE in
        "production")
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        "development")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "monitoring")
            COMPOSE_FILE="docker-compose.yml"
            PROFILES="--profile monitoring"
            ;;
        *)
            error "Geçersiz mode: $MODE"
            ;;
    esac
    
    # Son 100 satır log göster
    docker-compose -f "$COMPOSE_FILE" $PROFILES logs --tail=100 -f
}

# Backup işlemi
backup_data() {
    log "Veri backup'ı başlatılıyor..."
    
    # Veritabanı backup'ı
    if [ -f "/opt/oto-parca-panel/backup-db.sh" ]; then
        /opt/oto-parca-panel/backup-db.sh
    else
        warn "Veritabanı backup scripti bulunamadı."
    fi
    
    # Dosya backup'ı
    BACKUP_DIR="/opt/oto-parca-panel/backups"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="logs" \
        --exclude="backups" \
        /opt/oto-parca-panel/
    
    log "Backup tamamlandı: $BACKUP_DIR/files_backup_$DATE.tar.gz"
}

# Güncelleme işlemi
update_services() {
    log "Servisler güncelleniyor..."
    
    # Git'ten son değişiklikleri çek
    git pull origin main
    
    # Docker image'larını güncelle
    case $MODE in
        "production")
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        "development")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        *)
            COMPOSE_FILE="docker-compose.yml"
            ;;
    esac
    
    docker-compose -f "$COMPOSE_FILE" pull
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Servisleri yeniden başlat
    restart_services
    
    log "Servisler güncellendi."
}

# Temizlik işlemi
cleanup() {
    log "Sistem temizliği yapılıyor..."
    
    # Kullanılmayan Docker image'larını temizle
    docker image prune -f
    
    # Kullanılmayan volume'ları temizle
    docker volume prune -f
    
    # Kullanılmayan network'leri temizle
    docker network prune -f
    
    # Eski log dosyalarını temizle
    find /opt/oto-parca-panel/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Eski backup dosyalarını temizle
    find /opt/oto-parca-panel/backups -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    find /opt/oto-parca-panel/backups -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    
    log "Sistem temizliği tamamlandı."
}

# Yardım mesajı
show_help() {
    echo -e "${BLUE}Oto Parça Panel - Servis Yönetim Scripti${NC}"
    echo -e "\nKullanım: $0 [MODE] [ACTION]"
    echo -e "\n${YELLOW}Modlar:${NC}"
    echo -e "  production   - Production ortamı (varsayılan)"
    echo -e "  development  - Development ortamı"
    echo -e "  monitoring   - Monitoring ile birlikte"
    echo -e "\n${YELLOW}Aksiyonlar:${NC}"
    echo -e "  start        - Servisleri başlat (varsayılan)"
    echo -e "  stop         - Servisleri durdur"
    echo -e "  restart      - Servisleri yeniden başlat"
    echo -e "  status       - Servis durumlarını göster"
    echo -e "  logs         - Log'ları göster"
    echo -e "  backup       - Veri backup'ı al"
    echo -e "  update       - Servisleri güncelle"
    echo -e "  cleanup      - Sistem temizliği yap"
    echo -e "  help         - Bu yardım mesajını göster"
    echo -e "\n${YELLOW}Örnekler:${NC}"
    echo -e "  $0                          # Production modunda servisleri başlat"
    echo -e "  $0 development start        # Development modunda servisleri başlat"
    echo -e "  $0 production status        # Production servis durumlarını göster"
    echo -e "  $0 monitoring start         # Monitoring ile servisleri başlat"
    echo -e "  $0 production logs          # Production log'larını göster"
}

# Ana fonksiyon
main() {
    case $ACTION in
        "start")
            check_docker
            check_system_resources
            check_ports
            start_services
            sleep 10
            check_service_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            check_docker
            restart_services
            sleep 10
            check_service_status
            ;;
        "status")
            check_service_status
            ;;
        "logs")
            show_logs
            ;;
        "backup")
            backup_data
            ;;
        "update")
            backup_data
            update_services
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            show_help
            ;;
        *)
            error "Geçersiz aksiyon: $ACTION. Yardım için '$0 help' çalıştırın."
            ;;
    esac
}

# Script'i çalıştır
main "$@"