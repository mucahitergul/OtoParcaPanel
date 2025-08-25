#!/bin/bash

# Oto Parça Panel - Security Check Script
# Production deployment güvenlik kontrolü

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

SECURITY_ISSUES=0
WARNINGS=0
CHECKS_PASSED=0
TOTAL_CHECKS=0

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_pass() {
    echo -e "${GREEN}[✓] $1${NC}"
    ((CHECKS_PASSED++))
    ((TOTAL_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}[⚠] WARNING: $1${NC}"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

log_fail() {
    echo -e "${RED}[✗] SECURITY ISSUE: $1${NC}"
    ((SECURITY_ISSUES++))
    ((TOTAL_CHECKS++))
}

log_info() {
    echo -e "${BLUE}[ℹ] $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

# =============================================================================
# SECURITY CHECK FUNCTIONS
# =============================================================================

# Environment dosyaları kontrolü
check_environment_files() {
    log_header "Environment Files Security Check"
    
    # .env dosyalarının varlığını kontrol et
    if [ -f ".env" ]; then
        log_fail ".env file found in repository root - should not be committed"
    else
        log_pass "No .env file in repository root"
    fi
    
    # .env.production.example var mı kontrol et
    if [ -f ".env.production.example" ]; then
        log_pass ".env.production.example template exists"
    else
        log_warn ".env.production.example template not found"
    fi
    
    # Backend .env dosyaları
    if [ -f "backend/.env" ]; then
        log_fail "backend/.env file found - should not be committed"
    else
        log_pass "No backend/.env file committed"
    fi
    
    # Frontend .env dosyaları
    if [ -f "frontend/.env" ] || [ -f "frontend/.env.local" ]; then
        log_fail "frontend environment files found - should not be committed"
    else
        log_pass "No frontend environment files committed"
    fi
}

# SSL/TLS sertifika kontrolü
check_ssl_certificates() {
    log_header "SSL/TLS Certificate Security Check"
    
    # Private key dosyalarının varlığını kontrol et
    if find . -name "*.key" -type f | grep -q .; then
        log_fail "Private key files found in repository"
        find . -name "*.key" -type f | while read file; do
            echo -e "  ${RED}Found: $file${NC}"
        done
    else
        log_pass "No private key files in repository"
    fi
    
    # Certificate dosyalarının varlığını kontrol et
    if find . -name "*.pem" -o -name "*.crt" -type f | grep -q .; then
        log_warn "Certificate files found in repository"
        find . -name "*.pem" -o -name "*.crt" -type f | while read file; do
            echo -e "  ${YELLOW}Found: $file${NC}"
        done
    else
        log_pass "No certificate files in repository"
    fi
}

# Şifre ve secret kontrolü
check_secrets_and_passwords() {
    log_header "Secrets and Passwords Security Check"
    
    # Hardcoded şifreleri ara
    local password_patterns=(
        "password.*=.*['\"][^'\"]{8,}['\"]" 
        "secret.*=.*['\"][^'\"]{16,}['\"]" 
        "key.*=.*['\"][^'\"]{16,}['\"]" 
        "token.*=.*['\"][^'\"]{16,}['\"]" 
        "api_key.*=.*['\"][^'\"]{16,}['\"]" 
    )
    
    local found_secrets=false
    
    for pattern in "${password_patterns[@]}"; do
        if grep -r -i -E "$pattern" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.yaml" . 2>/dev/null | grep -v node_modules | grep -q .; then
            found_secrets=true
            log_fail "Potential hardcoded secrets found"
            break
        fi
    done
    
    if [ "$found_secrets" = false ]; then
        log_pass "No obvious hardcoded secrets found"
    fi
    
    # Default şifreleri kontrol et
    local default_passwords=("admin" "password" "123456" "admin123" "root" "test")
    
    for pwd in "${default_passwords[@]}"; do
        if grep -r -i "$pwd" --include="*.js" --include="*.ts" --include="*.sql" . 2>/dev/null | grep -v node_modules | grep -q .; then
            log_warn "Default password '$pwd' found in code"
        fi
    done
}

# Docker güvenlik kontrolü
check_docker_security() {
    log_header "Docker Security Check"
    
    # Dockerfile'larda root kullanıcı kontrolü
    if find . -name "Dockerfile*" -type f -exec grep -l "USER root" {} \; | grep -q .; then
        log_warn "Dockerfile(s) running as root user found"
    else
        log_pass "Dockerfiles use non-root users"
    fi
    
    # .dockerignore dosyalarının varlığını kontrol et
    if [ -f "backend/.dockerignore" ] && [ -f "frontend/.dockerignore" ]; then
        log_pass ".dockerignore files exist"
    else
        log_warn "Missing .dockerignore files"
    fi
    
    # Docker Compose'da exposed portları kontrol et
    if [ -f "docker-compose.yml" ]; then
        if grep -q "5432:5432" docker-compose.yml; then
            log_warn "PostgreSQL port exposed in docker-compose.yml"
        fi
        
        if grep -q "6379:6379" docker-compose.yml; then
            log_warn "Redis port exposed in docker-compose.yml"
        fi
    fi
}

# Nginx güvenlik kontrolü
check_nginx_security() {
    log_header "Nginx Security Check"
    
    if [ -f "nginx/nginx.conf" ] || [ -f "nginx/nginx.prod.conf" ]; then
        # Server tokens kontrolü
        if grep -q "server_tokens off" nginx/*.conf 2>/dev/null; then
            log_pass "Nginx server tokens disabled"
        else
            log_warn "Nginx server tokens not disabled"
        fi
        
        # Security headers kontrolü
        local security_headers=("X-Frame-Options" "X-XSS-Protection" "X-Content-Type-Options" "Strict-Transport-Security")
        
        for header in "${security_headers[@]}"; do
            if grep -q "$header" nginx/*.conf 2>/dev/null; then
                log_pass "Security header '$header' configured"
            else
                log_warn "Security header '$header' not configured"
            fi
        done
        
        # Rate limiting kontrolü
        if grep -q "limit_req" nginx/*.conf 2>/dev/null; then
            log_pass "Rate limiting configured"
        else
            log_warn "Rate limiting not configured"
        fi
    else
        log_warn "Nginx configuration files not found"
    fi
}

# Database güvenlik kontrolü
check_database_security() {
    log_header "Database Security Check"
    
    # SQL injection koruması
    if find . -name "*.js" -o -name "*.ts" -type f -exec grep -l "query.*+.*req\|query.*\${" {} \; 2>/dev/null | grep -v node_modules | grep -q .; then
        log_fail "Potential SQL injection vulnerabilities found"
    else
        log_pass "No obvious SQL injection patterns found"
    fi
    
    # Database initialization script kontrolü
    if [ -f "database/init/01-init.sql" ]; then
        # Default şifrelerin varlığını kontrol et
        if grep -i "admin123\|password123\|test123" database/init/01-init.sql; then
            log_warn "Default passwords found in database initialization"
        else
            log_pass "No default passwords in database initialization"
        fi
    fi
}

# Dependency güvenlik kontrolü
check_dependencies() {
    log_header "Dependencies Security Check"
    
    # package.json dosyalarında known vulnerable packages
    local vulnerable_packages=("lodash@4.17.15" "minimist@1.2.0" "yargs-parser@13.1.1")
    
    for package in "${vulnerable_packages[@]}"; do
        if find . -name "package.json" -exec grep -l "$package" {} \; 2>/dev/null | grep -q .; then
            log_warn "Potentially vulnerable package '$package' found"
        fi
    done
    
    # npm audit varsa çalıştır
    if command -v npm >/dev/null 2>&1; then
        if [ -f "package.json" ]; then
            log_info "Running npm audit..."
            if npm audit --audit-level=high >/dev/null 2>&1; then
                log_pass "No high-severity vulnerabilities found"
            else
                log_warn "High-severity vulnerabilities found - run 'npm audit' for details"
            fi
        fi
    fi
}

# CORS güvenlik kontrolü
check_cors_configuration() {
    log_header "CORS Configuration Security Check"
    
    # Wildcard CORS kontrolü
    if find . -name "*.js" -o -name "*.ts" -type f -exec grep -l "Access-Control-Allow-Origin.*\*" {} \; 2>/dev/null | grep -v node_modules | grep -q .; then
        log_warn "Wildcard CORS configuration found"
    else
        log_pass "No wildcard CORS configuration found"
    fi
    
    # Nginx CORS kontrolü
    if grep -q "Access-Control-Allow-Origin.*\*" nginx/*.conf 2>/dev/null; then
        log_warn "Wildcard CORS in Nginx configuration"
    else
        log_pass "Nginx CORS configuration looks secure"
    fi
}

# File permissions kontrolü
check_file_permissions() {
    log_header "File Permissions Security Check"
    
    # Executable olmayan dosyaların execute permission'ı var mı
    if find . -name "*.js" -o -name "*.ts" -o -name "*.json" -type f -perm /111 2>/dev/null | grep -v node_modules | grep -q .; then
        log_warn "Non-executable files with execute permissions found"
    else
        log_pass "File permissions look correct"
    fi
    
    # Script dosyalarının execute permission'ı var mı
    local script_files=("ubuntu-installer.sh" "healthcheck.sh" "backup/scripts/backup.sh")
    
    for script in "${script_files[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                log_pass "Script '$script' has execute permission"
            else
                log_warn "Script '$script' missing execute permission"
            fi
        fi
    done
}

# Git güvenlik kontrolü
check_git_security() {
    log_header "Git Security Check"
    
    # .git klasörünün production'da olmaması gerekir
    if [ -d ".git" ]; then
        log_warn ".git directory present (should be excluded in production)"
    fi
    
    # .gitignore dosyasının varlığını kontrol et
    if [ -f ".gitignore" ]; then
        log_pass ".gitignore file exists"
        
        # Kritik dosyaların .gitignore'da olup olmadığını kontrol et
        local critical_patterns=(".env" "*.key" "*.pem" "secrets/" "uploads/")
        
        for pattern in "${critical_patterns[@]}"; do
            if grep -q "$pattern" .gitignore; then
                log_pass "Critical pattern '$pattern' in .gitignore"
            else
                log_warn "Critical pattern '$pattern' not in .gitignore"
            fi
        done
    else
        log_fail ".gitignore file missing"
    fi
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    OTO PARÇA PANEL                           ║${NC}"
    echo -e "${PURPLE}║                 Security Check Script                        ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_info "Starting security check..."
    
    # Tüm güvenlik kontrollerini çalıştır
    check_environment_files
    check_ssl_certificates
    check_secrets_and_passwords
    check_docker_security
    check_nginx_security
    check_database_security
    check_dependencies
    check_cors_configuration
    check_file_permissions
    check_git_security
    
    # Sonuçları göster
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                     SECURITY REPORT                         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${WHITE}Total Checks: $TOTAL_CHECKS${NC}"
    echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Security Issues: $SECURITY_ISSUES${NC}"
    echo ""
    
    # Güvenlik skoru hesapla
    local security_score=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))
    
    if [ $SECURITY_ISSUES -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}🎉 EXCELLENT! No security issues found.${NC}"
            echo -e "${GREEN}Security Score: $security_score/100${NC}"
        else
            echo -e "${YELLOW}⚠️ GOOD! No critical security issues, but $WARNINGS warnings need attention.${NC}"
            echo -e "${YELLOW}Security Score: $security_score/100${NC}"
        fi
        exit 0
    else
        echo -e "${RED}❌ CRITICAL! $SECURITY_ISSUES security issues found.${NC}"
        echo -e "${RED}Security Score: $security_score/100${NC}"
        echo -e "${RED}Please fix all security issues before deployment.${NC}"
        exit 1
    fi
}

# Script'i çalıştır
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi