#!/bin/bash

# Nginx Port Çakışması Çözüm Scripti
# Port 80 ve 443'te çakışan servisleri tespit eder ve çözer

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Port kullanımını kontrol et
check_port_usage() {
    local port=$1
    local service_name=$2
    
    log "Port $port kullanımı kontrol ediliyor..."
    
    if netstat -tlnp | grep ":$port " > /dev/null 2>&1; then
        local processes=$(netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f1,2 | sort -u)
        
        echo -e "\n${YELLOW}Port $port kullanımda:${NC}"
        netstat -tlnp | grep ":$port "
        
        for process in $processes; do
            local pid=$(echo $process | cut -d'/' -f1)
            local name=$(echo $process | cut -d'/' -f2)
            
            if [[ "$name" != "nginx" && "$name" != "-" ]]; then
                warn "Port $port çakışması tespit edildi: $name (PID: $pid)"
                
                # Process detaylarını göster
                if ps -p $pid > /dev/null 2>&1; then
                    info "Process detayları:"
                    ps -p $pid -o pid,ppid,cmd --no-headers
                    
                    # Çözüm öner
                    suggest_port_solution $port $name $pid
                fi
            else
                info "✓ Port $port nginx tarafından kullanılıyor"
            fi
        done
    else
        info "✓ Port $port kullanılabilir"
    fi
}

# Port çakışması çözüm önerileri
suggest_port_solution() {
    local port=$1
    local service=$2
    local pid=$3
    
    echo -e "\n${BLUE}=== Port $port Çözüm Önerileri ===${NC}"
    
    case $service in
        "apache2"|"httpd")
            echo -e "${YELLOW}Apache web server tespit edildi:${NC}"
            echo "1. Apache'yi durdurun: sudo systemctl stop apache2"
            echo "2. Apache'yi devre dışı bırakın: sudo systemctl disable apache2"
            echo "3. Apache'yi kaldırın: sudo apt remove apache2"
            
            read -p "Apache'yi otomatik olarak durdurmak ister misiniz? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Apache durdruluyor..."
                systemctl stop apache2 2>/dev/null || true
                systemctl disable apache2 2>/dev/null || true
                info "✓ Apache durduruldu"
            fi
            ;;
        "lighttpd")
            echo -e "${YELLOW}Lighttpd web server tespit edildi:${NC}"
            echo "1. Lighttpd'yi durdurun: sudo systemctl stop lighttpd"
            echo "2. Lighttpd'yi devre dışı bırakın: sudo systemctl disable lighttpd"
            
            read -p "Lighttpd'yi otomatik olarak durdurmak ister misiniz? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Lighttpd durdruluyor..."
                systemctl stop lighttpd 2>/dev/null || true
                systemctl disable lighttpd 2>/dev/null || true
                info "✓ Lighttpd durduruldu"
            fi
            ;;
        "node"|"nodejs")
            echo -e "${YELLOW}Node.js uygulaması tespit edildi:${NC}"
            echo "1. Node.js process'ini durdurun: sudo kill $pid"
            echo "2. PM2 ile yönetiliyorsa: pm2 stop all"
            echo "3. Port değiştirin veya uygulamayı farklı portta çalıştırın"
            
            read -p "Node.js process'ini durdurmak ister misiniz? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Node.js process durdruluyor..."
                kill -TERM $pid 2>/dev/null || true
                sleep 3
                if ps -p $pid > /dev/null 2>&1; then
                    warn "Process hala çalışıyor, SIGKILL gönderiliyor..."
                    kill -KILL $pid 2>/dev/null || true
                fi
                info "✓ Node.js process durduruldu"
            fi
            ;;
        "python"|"python3")
            echo -e "${YELLOW}Python uygulaması tespit edildi:${NC}"
            echo "1. Python process'ini durdurun: sudo kill $pid"
            echo "2. Flask/Django uygulamasını farklı portta çalıştırın"
            
            read -p "Python process'ini durdurmak ister misiniz? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Python process durdruluyor..."
                kill -TERM $pid 2>/dev/null || true
                sleep 3
                if ps -p $pid > /dev/null 2>&1; then
                    warn "Process hala çalışıyor, SIGKILL gönderiliyor..."
                    kill -KILL $pid 2>/dev/null || true
                fi
                info "✓ Python process durduruldu"
            fi
            ;;
        *)
            echo -e "${YELLOW}Bilinmeyen servis tespit edildi: $service${NC}"
            echo "1. Process'i durdurun: sudo kill $pid"
            echo "2. Servis ise durdurun: sudo systemctl stop $service"
            echo "3. Manuel olarak araştırın: ps -p $pid -o pid,ppid,cmd"
            
            read -p "Process'i durdurmak ister misiniz? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Process durdruluyor..."
                kill -TERM $pid 2>/dev/null || true
                sleep 3
                if ps -p $pid > /dev/null 2>&1; then
                    warn "Process hala çalışıyor, SIGKILL gönderiliyor..."
                    kill -KILL $pid 2>/dev/null || true
                fi
                info "✓ Process durduruldu"
            fi
            ;;
    esac
}

# Tüm web servisleri durdur
stop_conflicting_services() {
    log "Çakışan web servislerini durduruyor..."
    
    local services=("apache2" "httpd" "lighttpd" "caddy")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            warn "$service servisi çalışıyor, durduruluyor..."
            systemctl stop $service 2>/dev/null || true
            systemctl disable $service 2>/dev/null || true
            info "✓ $service durduruldu"
        fi
    done
}

# Port temizleme
clean_ports() {
    log "Port temizleme işlemi başlatılıyor..."
    
    # Port 80 temizleme
    local port80_pids=$(netstat -tlnp | grep ":80 " | awk '{print $7}' | cut -d'/' -f1 | grep -v '^-$' | sort -u)
    for pid in $port80_pids; do
        if ps -p $pid > /dev/null 2>&1; then
            local cmd=$(ps -p $pid -o cmd --no-headers)
            if [[ $cmd != *"nginx"* ]]; then
                warn "Port 80'de nginx olmayan process bulundu (PID: $pid): $cmd"
                read -p "Bu process'i durdurmak ister misiniz? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    kill -TERM $pid 2>/dev/null || true
                    sleep 2
                    if ps -p $pid > /dev/null 2>&1; then
                        kill -KILL $pid 2>/dev/null || true
                    fi
                    info "✓ Process durduruldu"
                fi
            fi
        fi
    done
    
    # Port 443 temizleme
    local port443_pids=$(netstat -tlnp | grep ":443 " | awk '{print $7}' | cut -d'/' -f1 | grep -v '^-$' | sort -u)
    for pid in $port443_pids; do
        if ps -p $pid > /dev/null 2>&1; then
            local cmd=$(ps -p $pid -o cmd --no-headers)
            if [[ $cmd != *"nginx"* ]]; then
                warn "Port 443'te nginx olmayan process bulundu (PID: $pid): $cmd"
                read -p "Bu process'i durdurmak ister misiniz? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    kill -TERM $pid 2>/dev/null || true
                    sleep 2
                    if ps -p $pid > /dev/null 2>&1; then
                        kill -KILL $pid 2>/dev/null || true
                    fi
                    info "✓ Process durduruldu"
                fi
            fi
        fi
    done
}

# Nginx test ve başlatma
test_and_start_nginx() {
    log "Nginx konfigürasyon testi yapılıyor..."
    
    if nginx -t 2>&1; then
        info "✓ Nginx konfigürasyonu geçerli"
        
        log "Nginx servisi başlatılıyor..."
        if systemctl start nginx 2>&1; then
            info "✓ Nginx başarıyla başlatıldı"
            systemctl enable nginx 2>/dev/null || true
            
            # Servis durumunu kontrol et
            sleep 3
            if systemctl is-active --quiet nginx; then
                info "✓ Nginx servisi aktif"
                
                # Port kontrolü
                if netstat -tlnp | grep ":80.*nginx" > /dev/null; then
                    info "✓ Nginx port 80'de dinliyor"
                else
                    warn "Nginx port 80'de dinlemiyor"
                fi
            else
                error "Nginx servisi başlatılamadı"
                systemctl status nginx --no-pager
            fi
        else
            error "Nginx başlatılamadı"
            journalctl -xeu nginx.service --no-pager -n 20
        fi
    else
        error "Nginx konfigürasyonunda hata var"
        return 1
    fi
}

# Ana fonksiyon
main() {
    echo -e "${GREEN}=== Nginx Port Çakışması Çözüm Aracı ===${NC}"
    echo -e "${BLUE}Port 80 ve 443'teki çakışmaları tespit eder ve çözer${NC}\n"
    
    # Mevcut durumu kontrol et
    check_port_usage 80 "HTTP"
    check_port_usage 443 "HTTPS"
    
    echo -e "\n${YELLOW}=== Çözüm Seçenekleri ===${NC}"
    echo "1. Otomatik çakışan servisleri durdur"
    echo "2. Manuel port temizleme"
    echo "3. Nginx test ve başlatma"
    echo "4. Tümünü yap (önerilen)"
    echo "5. Çıkış"
    
    read -p "Seçiminizi yapın (1-5): " choice
    
    case $choice in
        1)
            stop_conflicting_services
            ;;
        2)
            clean_ports
            ;;
        3)
            test_and_start_nginx
            ;;
        4)
            stop_conflicting_services
            clean_ports
            test_and_start_nginx
            ;;
        5)
            info "Çıkış yapılıyor..."
            exit 0
            ;;
        *)
            error "Geçersiz seçim: $choice"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}=== İşlem Tamamlandı ===${NC}"
    
    # Final durum kontrolü
    echo -e "\n${BLUE}=== Final Durum Kontrolü ===${NC}"
    if systemctl is-active --quiet nginx; then
        info "✓ Nginx servisi çalışıyor"
        netstat -tlnp | grep nginx || true
    else
        warn "Nginx servisi çalışmıyor"
        echo "Manuel başlatma: sudo systemctl start nginx"
    fi
}

# Script'i çalıştır
main "$@"