#!/bin/bash

# Oto Parça Panel - Sistem Sağlık Kontrolü Scripti
# Production ortamında sistem durumunu kontrol eder

set -e

# =============================================================================
# RENKLI OUTPUT
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================

HEALTH_STATUS=0
CHECK_COUNT=0
FAILED_CHECKS=0
WARNING_CHECKS=0
LOG_FILE="/var/log/oto-parca-health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Log fonksiyonu
log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"
}

warn() {
    echo "[$TIMESTAMP] WARNING: $1" >> "$LOG_FILE"
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ WARNING: $1${NC}"
    ((WARNING_CHECKS++))
}

error() {
    echo "[$TIMESTAMP] ERROR: $1" >> "$LOG_FILE"
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗ ERROR: $1${NC}"
    ((FAILED_CHECKS++))
    HEALTH_STATUS=1
}

info() {
    echo "[$TIMESTAMP] INFO: $1" >> "$LOG_FILE"
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ INFO: $1${NC}"
}

success() {
    echo "[$TIMESTAMP] SUCCESS: $1" >> "$LOG_FILE"
    echo -e "${GREEN}[$(date +'%H:%M:%S')] 🎉 $1${NC}"
}

# Progress gösterimi
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[%3d%%]${NC} [" "$percent"
    printf "%*s" "$filled" | tr ' ' '█'
    printf "%*s" "$empty" | tr ' ' '░'
    printf "] ${WHITE}%s${NC}" "$message"
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

# Docker servis kontrolü
check_docker_services() {
    info "Docker servisleri kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    if ! command -v docker &> /dev/null; then
        error "Docker kurulu değil"
        return 1
    fi
    
    if ! systemctl is-active --quiet docker; then
        error "Docker servisi çalışmıyor"
        return 1
    fi
    
    # Docker Compose servisleri kontrol et
    local services=("oto-parca-postgres" "oto-parca-redis" "oto-parca-backend" "oto-parca-frontend" "oto-parca-nginx")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            if docker ps --filter "name=$service" --filter "status=running" --format "table {{.Names}}" | grep -q "$service"; then
                log "✓ $service servisi çalışıyor"
            else
                error "$service servisi durmuş"
                failed_services+=("$service")
            fi
        else
            error "$service servisi bulunamadı"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log "Tüm Docker servisleri sağlıklı"
        return 0
    else
        error "Başarısız servisler: ${failed_services[*]}"
        return 1
    fi
}

# Database bağlantı kontrolü
check_database() {
    info "PostgreSQL veritabanı kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    # Docker container içinden PostgreSQL kontrolü
    if docker exec oto-parca-postgres pg_isready -U oto_user -d oto_parca_panel &> /dev/null; then
        log "PostgreSQL veritabanı erişilebilir"
        
        # Veritabanı boyutu kontrolü
        local db_size=$(docker exec oto-parca-postgres psql -U oto_user -d oto_parca_panel -t -c "SELECT pg_size_pretty(pg_database_size('oto_parca_panel'));" 2>/dev/null | xargs)
        if [ -n "$db_size" ]; then
            info "Veritabanı boyutu: $db_size"
        fi
        
        return 0
    else
        error "PostgreSQL veritabanına bağlanılamıyor"
        return 1
    fi
}

# Redis kontrolü
check_redis() {
    info "Redis cache kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    if docker exec oto-parca-redis redis-cli ping &> /dev/null; then
        log "Redis cache erişilebilir"
        
        # Redis memory kullanımı
        local redis_memory=$(docker exec oto-parca-redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        if [ -n "$redis_memory" ]; then
            info "Redis memory kullanımı: $redis_memory"
        fi
        
        return 0
    else
        error "Redis cache'e bağlanılamıyor"
        return 1
    fi
}

# Backend API kontrolü
check_backend_api() {
    info "Backend API kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    local backend_url="http://localhost:3001/api/health"
    
    if curl -f -s --max-time 10 "$backend_url" &> /dev/null; then
        log "Backend API erişilebilir"
        
        # API response time kontrolü
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$backend_url" 2>/dev/null || echo "timeout")
        if [ "$response_time" != "timeout" ]; then
            local response_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
            if [ "$response_ms" -gt 2000 ]; then
                warn "Backend API yavaş yanıt veriyor: ${response_ms}ms"
            else
                info "Backend API yanıt süresi: ${response_ms}ms"
            fi
        fi
        
        return 0
    else
        error "Backend API'ye erişilemiyor"
        return 1
    fi
}

# Frontend kontrolü
check_frontend() {
    info "Frontend kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    local frontend_url="http://localhost:3000"
    
    if curl -f -s --max-time 10 "$frontend_url" &> /dev/null; then
        log "Frontend erişilebilir"
        
        # Frontend response time kontrolü
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$frontend_url" 2>/dev/null || echo "timeout")
        if [ "$response_time" != "timeout" ]; then
            local response_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
            if [ "$response_ms" -gt 3000 ]; then
                warn "Frontend yavaş yanıt veriyor: ${response_ms}ms"
            else
                info "Frontend yanıt süresi: ${response_ms}ms"
            fi
        fi
        
        return 0
    else
        error "Frontend'e erişilemiyor"
        return 1
    fi
}

# Nginx kontrolü
check_nginx() {
    info "Nginx reverse proxy kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    if curl -f -s --max-time 10 "http://localhost/health" &> /dev/null; then
        log "Nginx reverse proxy çalışıyor"
        return 0
    else
        error "Nginx reverse proxy'ye erişilemiyor"
        return 1
    fi
}

# Sistem kaynak kontrolü
check_system_resources() {
    info "Sistem kaynakları kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    # CPU kullanımı
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        warn "Yüksek CPU kullanımı: %$cpu_usage"
    else
        info "CPU kullanımı: %$cpu_usage"
    fi
    
    # Memory kullanımı
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_percent=$(echo "scale=1; $used_mem * 100 / $total_mem" | bc)
    
    if (( $(echo "$memory_percent > 85" | bc -l) )); then
        warn "Yüksek memory kullanımı: %$memory_percent"
    else
        info "Memory kullanımı: %$memory_percent"
    fi
    
    # Disk kullanımı
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    if [ "$disk_usage" -gt 85 ]; then
        warn "Yüksek disk kullanımı: %$disk_usage"
    else
        info "Disk kullanımı: %$disk_usage"
    fi
    
    log "Sistem kaynakları kontrol edildi"
}

# SSL sertifika kontrolü
check_ssl_certificate() {
    info "SSL sertifikası kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    if [ -f "/etc/nginx/ssl/cert.pem" ]; then
        local cert_expiry=$(openssl x509 -enddate -noout -in /etc/nginx/ssl/cert.pem 2>/dev/null | cut -d= -f2)
        if [ -n "$cert_expiry" ]; then
            local expiry_timestamp=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_until_expiry" -lt 30 ]; then
                warn "SSL sertifikası $days_until_expiry gün içinde sona erecek"
            else
                info "SSL sertifikası geçerli ($days_until_expiry gün kaldı)"
            fi
        fi
        log "SSL sertifikası mevcut"
    else
        warn "SSL sertifikası bulunamadı"
    fi
}

# Log dosyası boyut kontrolü
check_log_sizes() {
    info "Log dosyası boyutları kontrol ediliyor..."
    ((CHECK_COUNT++))
    
    local log_dirs=("/var/log/nginx" "/app/logs" "/var/log")
    local large_logs=()
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            while IFS= read -r -d '' file; do
                local size=$(stat -c%s "$file" 2>/dev/null || echo "0")
                local size_mb=$((size / 1024 / 1024))
                if [ "$size_mb" -gt 100 ]; then
                    large_logs+=("$file ($size_mb MB)")
                fi
            done < <(find "$log_dir" -name "*.log" -type f -print0 2>/dev/null)
        fi
    done
    
    if [ ${#large_logs[@]} -gt 0 ]; then
        warn "Büyük log dosyaları tespit edildi: ${large_logs[*]}"
    else
        log "Log dosyası boyutları normal"
    fi
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    OTO PARÇA PANEL                           ║${NC}"
    echo -e "${PURPLE}║                 Sistem Sağlık Kontrolü                      ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    info "Sağlık kontrolü başlatılıyor..."
    
    # Log dosyası oluştur
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    echo "" >> "$LOG_FILE"
    echo "=== HEALTH CHECK STARTED AT $TIMESTAMP ===" >> "$LOG_FILE"
    
    # Tüm kontrolleri çalıştır
    local total_checks=9
    local current_check=0
    
    ((current_check++)); show_progress $current_check $total_checks "Docker servisleri"; echo
    check_docker_services
    
    ((current_check++)); show_progress $current_check $total_checks "PostgreSQL veritabanı"; echo
    check_database
    
    ((current_check++)); show_progress $current_check $total_checks "Redis cache"; echo
    check_redis
    
    ((current_check++)); show_progress $current_check $total_checks "Backend API"; echo
    check_backend_api
    
    ((current_check++)); show_progress $current_check $total_checks "Frontend"; echo
    check_frontend
    
    ((current_check++)); show_progress $current_check $total_checks "Nginx reverse proxy"; echo
    check_nginx
    
    ((current_check++)); show_progress $current_check $total_checks "Sistem kaynakları"; echo
    check_system_resources
    
    ((current_check++)); show_progress $current_check $total_checks "SSL sertifikası"; echo
    check_ssl_certificate
    
    ((current_check++)); show_progress $current_check $total_checks "Log dosyaları"; echo
    check_log_sizes
    
    echo ""
    echo "=== HEALTH CHECK COMPLETED AT $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"
    
    # Sonuçları göster
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                        SONUÇLAR                              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${WHITE}Toplam Kontrol: $CHECK_COUNT${NC}"
    echo -e "${GREEN}Başarılı: $((CHECK_COUNT - FAILED_CHECKS - WARNING_CHECKS))${NC}"
    echo -e "${YELLOW}Uyarı: $WARNING_CHECKS${NC}"
    echo -e "${RED}Hata: $FAILED_CHECKS${NC}"
    echo ""
    
    if [ $HEALTH_STATUS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            success "🎉 Sistem tamamen sağlıklı!"
        else
            warn "⚠️ Sistem çalışıyor ancak $WARNING_CHECKS uyarı var"
        fi
    else
        error "❌ Sistem sağlık kontrolünde $FAILED_CHECKS hata tespit edildi"
        echo -e "${RED}Lütfen hataları giderin ve tekrar kontrol edin.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Detaylı log: $LOG_FILE${NC}"
    echo ""
    
    exit $HEALTH_STATUS
}

# Script'i çalıştır
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi