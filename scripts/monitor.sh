#!/bin/bash

# Oto Parça Panel - System Monitor Script
# Sistem kaynaklarını izler ve uyarı verir

set -e

# Konfigürasyon
MONITOR_INTERVAL="${MONITOR_INTERVAL:-60}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-90}"
CPU_THRESHOLD="${CPU_THRESHOLD:-95}"
LOG_FILE="/var/log/otoparcapanel-monitor.log"
ALERT_COOLDOWN=3600  # 1 saat
LAST_ALERT_FILE="/tmp/otoparcapanel-last-alert"

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonları
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

warn() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

info() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Alert gönderme fonksiyonu
send_alert() {
    local subject="$1"
    local message="$2"
    local current_time=$(date +%s)
    
    # Cooldown kontrolü
    if [ -f "$LAST_ALERT_FILE" ]; then
        local last_alert=$(cat "$LAST_ALERT_FILE")
        local time_diff=$((current_time - last_alert))
        
        if [ $time_diff -lt $ALERT_COOLDOWN ]; then
            info "Alert cooldown aktif, alert gönderilmedi"
            return
        fi
    fi
    
    # Email gönder (eğer mail komutu varsa)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        info "Alert email gönderildi: $subject"
    fi
    
    # Webhook gönder (eğer konfigüre edilmişse)
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$subject: $message\"}" &> /dev/null
        info "Webhook alert gönderildi"
    fi
    
    # Son alert zamanını kaydet
    echo "$current_time" > "$LAST_ALERT_FILE"
}

# CPU kullanımını kontrol et
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Ondalık kısmı kaldır
    
    info "CPU kullanımı: ${cpu_usage}%"
    
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        error "Yüksek CPU kullanımı tespit edildi: ${cpu_usage}%"
        send_alert "Oto Parça Panel - Yüksek CPU Kullanımı" "CPU kullanımı %${cpu_usage} seviyesinde. Eşik: %${CPU_THRESHOLD}"
    fi
}

# Memory kullanımını kontrol et
check_memory() {
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    info "Memory kullanımı: ${memory_usage}%"
    
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        error "Yüksek memory kullanımı tespit edildi: ${memory_usage}%"
        send_alert "Oto Parça Panel - Yüksek Memory Kullanımı" "Memory kullanımı %${memory_usage} seviyesinde. Eşik: %${MEMORY_THRESHOLD}"
    fi
}

# Disk kullanımını kontrol et
check_disk() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    info "Disk kullanımı: ${disk_usage}%"
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        error "Yüksek disk kullanımı tespit edildi: ${disk_usage}%"
        send_alert "Oto Parça Panel - Yüksek Disk Kullanımı" "Disk kullanımı %${disk_usage} seviyesinde. Eşik: %${DISK_THRESHOLD}"
    fi
}

# Docker container'larını kontrol et
check_containers() {
    local containers=("otoparcapanel-postgres" "otoparcapanel-redis" "otoparcapanel-backend" "otoparcapanel-frontend" "otoparcapanel-scraper" "otoparcapanel-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
            if [ "$status" = "running" ]; then
                info "Container $container: ✓ Çalışıyor"
            else
                error "Container $container: ✗ Durmuş ($status)"
                send_alert "Oto Parça Panel - Container Hatası" "Container $container durmuş. Status: $status"
            fi
        else
            error "Container $container: ✗ Bulunamadı"
            send_alert "Oto Parça Panel - Container Hatası" "Container $container bulunamadı"
        fi
    done
}

# Database bağlantısını kontrol et
check_database() {
    if docker exec otoparcapanel-postgres pg_isready -U postgres &> /dev/null; then
        info "Database: ✓ Erişilebilir"
    else
        error "Database: ✗ Erişilemiyor"
        send_alert "Oto Parça Panel - Database Hatası" "PostgreSQL database'e erişilemiyor"
    fi
}

# Redis bağlantısını kontrol et
check_redis() {
    if docker exec otoparcapanel-redis redis-cli ping | grep -q "PONG"; then
        info "Redis: ✓ Erişilebilir"
    else
        error "Redis: ✗ Erişilemiyor"
        send_alert "Oto Parça Panel - Redis Hatası" "Redis cache'e erişilemiyor"
    fi
}

# HTTP endpoint'lerini kontrol et
check_endpoints() {
    local endpoints=(
        "http://localhost/health:Frontend Health Check"
        "http://localhost/api/health:Backend Health Check"
        "http://localhost/scraper/health:Scraper Health Check"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d':' -f1)
        local description=$(echo "$endpoint_info" | cut -d':' -f2)
        
        if curl -s -f "$endpoint" &> /dev/null; then
            info "$description: ✓ Erişilebilir"
        else
            error "$description: ✗ Erişilemiyor ($endpoint)"
            send_alert "Oto Parça Panel - Endpoint Hatası" "$description endpoint'i erişilemiyor: $endpoint"
        fi
    done
}

# Log dosyası boyutlarını kontrol et
check_log_sizes() {
    local log_dirs=("/var/log/nginx" "/opt/otoparcapanel/logs")
    local max_size_mb=1000  # 1GB
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            local total_size=$(du -sm "$log_dir" 2>/dev/null | cut -f1)
            info "Log dizini $log_dir: ${total_size}MB"
            
            if [ "$total_size" -gt "$max_size_mb" ]; then
                warn "Log dizini çok büyük: $log_dir (${total_size}MB)"
                # Eski logları temizle
                find "$log_dir" -name "*.log" -mtime +7 -delete 2>/dev/null || true
                find "$log_dir" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
            fi
        fi
    done
}

# Ana monitoring döngüsü
main() {
    log "Oto Parça Panel System Monitor başlatıldı"
    info "Monitoring interval: ${MONITOR_INTERVAL}s"
    info "Alert email: $ALERT_EMAIL"
    info "Thresholds - CPU: ${CPU_THRESHOLD}%, Memory: ${MEMORY_THRESHOLD}%, Disk: ${DISK_THRESHOLD}%"
    
    while true; do
        info "=== Monitoring döngüsü başlatıldı ==="
        
        # Sistem kaynaklarını kontrol et
        check_cpu
        check_memory
        check_disk
        
        # Docker container'larını kontrol et
        check_containers
        
        # Servis bağlantılarını kontrol et
        check_database
        check_redis
        
        # HTTP endpoint'lerini kontrol et
        check_endpoints
        
        # Log dosyası boyutlarını kontrol et
        check_log_sizes
        
        info "=== Monitoring döngüsü tamamlandı ==="
        
        # Bekleme
        sleep "$MONITOR_INTERVAL"
    done
}

# Script başlatıldığında
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Log dosyası oluştur
    touch "$LOG_FILE"
    
    # Trap signals
    trap 'log "Monitor durduruldu"; exit 0' SIGTERM SIGINT
    
    # Ana fonksiyonu çalıştır
    main
fi