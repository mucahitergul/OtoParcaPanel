#!/bin/bash

# Oto Parça Panel - Automated Backup Script
# Performs database and file backups with optional cloud storage

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

# Environment variables with defaults
BACKUP_DIR=${BACKUP_DIR:-/backups}
LOG_DIR=${LOG_DIR:-/var/log/backup}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/backup_$TIMESTAMP.log"

# Database configuration
DB_HOST=${POSTGRES_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-oto_parca_panel}
DB_USER=${DATABASE_USERNAME:-oto_user}
DB_PASS=${DATABASE_PASSWORD}

# AWS S3 configuration (optional)
S3_BUCKET=${S3_BACKUP_BUCKET}
AWS_REGION=${AWS_REGION:-eu-central-1}

# Backup paths
DB_BACKUP_DIR="$BACKUP_DIR/database"
FILE_BACKUP_DIR="$BACKUP_DIR/files"
LOGS_BACKUP_DIR="$BACKUP_DIR/logs"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Logging function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

error() {
    local message="$1"
    log "ERROR: $message"
    exit 1
}

warn() {
    local message="$1"
    log "WARNING: $message"
}

info() {
    local message="$1"
    log "INFO: $message"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Format file size
format_size() {
    local size=$1
    if [ $size -gt 1073741824 ]; then
        echo "$(( size / 1073741824 ))GB"
    elif [ $size -gt 1048576 ]; then
        echo "$(( size / 1048576 ))MB"
    elif [ $size -gt 1024 ]; then
        echo "$(( size / 1024 ))KB"
    else
        echo "${size}B"
    fi
}

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

# Initialize backup environment
init_backup() {
    info "Initializing backup environment..."
    
    # Create backup directories
    mkdir -p "$DB_BACKUP_DIR" "$FILE_BACKUP_DIR" "$LOGS_BACKUP_DIR" "$LOG_DIR"
    
    # Check required tools
    if ! command_exists pg_dump; then
        error "pg_dump not found. Please install postgresql-client."
    fi
    
    # Check database connection
    if ! PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        error "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
    fi
    
    info "Backup environment initialized successfully"
}

# Backup PostgreSQL database
backup_database() {
    info "Starting database backup..."
    
    local backup_file="$DB_BACKUP_DIR/oto_parca_panel_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    # Create database dump
    if PGPASSWORD="$DB_PASS" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$backup_file" 2>>"$LOG_FILE"; then
        
        # Compress the backup
        if gzip "$backup_file"; then
            local file_size=$(stat -c%s "$compressed_file" 2>/dev/null || echo "0")
            info "Database backup completed: $(basename "$compressed_file") ($(format_size $file_size))"
            echo "$compressed_file"
        else
            error "Failed to compress database backup"
        fi
    else
        error "Database backup failed"
    fi
}

# Backup application files
backup_files() {
    info "Starting file backup..."
    
    local backup_file="$FILE_BACKUP_DIR/files_$TIMESTAMP.tar.gz"
    local source_dirs=("/app/uploads" "/app/logs")
    local existing_dirs=()
    
    # Check which directories exist
    for dir in "${source_dirs[@]}"; do
        if [ -d "$dir" ]; then
            existing_dirs+=("$dir")
        else
            warn "Directory $dir does not exist, skipping"
        fi
    done
    
    if [ ${#existing_dirs[@]} -eq 0 ]; then
        warn "No application directories found to backup"
        return 0
    fi
    
    # Create tar archive
    if tar -czf "$backup_file" "${existing_dirs[@]}" 2>>"$LOG_FILE"; then
        local file_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
        info "File backup completed: $(basename "$backup_file") ($(format_size $file_size))"
        echo "$backup_file"
    else
        error "File backup failed"
    fi
}

# Backup system logs
backup_logs() {
    info "Starting log backup..."
    
    local backup_file="$LOGS_BACKUP_DIR/logs_$TIMESTAMP.tar.gz"
    local log_dirs=("/var/log/nginx" "/var/log/postgresql")
    local existing_dirs=()
    
    # Check which log directories exist
    for dir in "${log_dirs[@]}"; do
        if [ -d "$dir" ]; then
            existing_dirs+=("$dir")
        fi
    done
    
    if [ ${#existing_dirs[@]} -eq 0 ]; then
        warn "No log directories found to backup"
        return 0
    fi
    
    # Create tar archive
    if tar -czf "$backup_file" "${existing_dirs[@]}" 2>>"$LOG_FILE"; then
        local file_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
        info "Log backup completed: $(basename "$backup_file") ($(format_size $file_size))"
        echo "$backup_file"
    else
        warn "Log backup failed"
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    local file_path="$1"
    
    if [ -z "$S3_BUCKET" ]; then
        info "S3 backup not configured, skipping upload"
        return 0
    fi
    
    if ! command_exists aws; then
        warn "AWS CLI not found, skipping S3 upload"
        return 0
    fi
    
    info "Uploading $(basename "$file_path") to S3..."
    
    local s3_key="oto-parca-panel/$(date +%Y/%m/%d)/$(basename "$file_path")"
    
    if aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" --region "$AWS_REGION" 2>>"$LOG_FILE"; then
        info "Successfully uploaded to S3: s3://$S3_BUCKET/$s3_key"
    else
        warn "Failed to upload $(basename "$file_path") to S3"
    fi
}

# Clean old backups
cleanup_old_backups() {
    info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Clean local backups
    for backup_dir in "$DB_BACKUP_DIR" "$FILE_BACKUP_DIR" "$LOGS_BACKUP_DIR"; do
        if [ -d "$backup_dir" ]; then
            while IFS= read -r -d '' file; do
                rm -f "$file"
                ((deleted_count++))
                info "Deleted old backup: $(basename "$file")"
            done < <(find "$backup_dir" -type f -mtime +"$RETENTION_DAYS" -print0 2>/dev/null)
        fi
    done
    
    # Clean old log files
    if [ -d "$LOG_DIR" ]; then
        while IFS= read -r -d '' file; do
            rm -f "$file"
            ((deleted_count++))
            info "Deleted old log: $(basename "$file")"
        done < <(find "$LOG_DIR" -name "backup_*.log" -type f -mtime +"$RETENTION_DAYS" -print0 2>/dev/null)
    fi
    
    info "Cleanup completed: $deleted_count files deleted"
}

# Generate backup report
generate_report() {
    local db_backup="$1"
    local file_backup="$2"
    local log_backup="$3"
    
    info "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
Oto Parça Panel - Backup Report
==============================

Backup Date: $(date '+%Y-%m-%d %H:%M:%S')
Backup ID: $TIMESTAMP

Database Backup:
$([ -n "$db_backup" ] && echo "✓ $(basename "$db_backup") ($(format_size $(stat -c%s "$db_backup" 2>/dev/null || echo "0")))" || echo "✗ Failed")

File Backup:
$([ -n "$file_backup" ] && echo "✓ $(basename "$file_backup") ($(format_size $(stat -c%s "$file_backup" 2>/dev/null || echo "0")))" || echo "✗ Failed or Skipped")

Log Backup:
$([ -n "$log_backup" ] && echo "✓ $(basename "$log_backup") ($(format_size $(stat -c%s "$log_backup" 2>/dev/null || echo "0")))" || echo "✗ Failed or Skipped")

S3 Upload:
$([ -n "$S3_BUCKET" ] && echo "✓ Enabled (s3://$S3_BUCKET)" || echo "✗ Not configured")

Retention Policy: $RETENTION_DAYS days

Backup Location: $BACKUP_DIR
Log File: $LOG_FILE

==============================
Backup completed successfully!
EOF
    
    info "Backup report generated: $report_file"
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    local start_time=$(date +%s)
    
    info "=== Oto Parça Panel Backup Started ==="
    info "Backup ID: $TIMESTAMP"
    
    # Initialize
    init_backup
    
    # Perform backups
    local db_backup=$(backup_database)
    local file_backup=$(backup_files)
    local log_backup=$(backup_logs)
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        [ -n "$db_backup" ] && upload_to_s3 "$db_backup"
        [ -n "$file_backup" ] && upload_to_s3 "$file_backup"
        [ -n "$log_backup" ] && upload_to_s3 "$log_backup"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_report "$db_backup" "$file_backup" "$log_backup"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    info "=== Backup Completed Successfully ==="
    info "Duration: ${duration} seconds"
    info "Log file: $LOG_FILE"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi