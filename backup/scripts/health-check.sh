#!/bin/bash

# Backup Service Health Check Script
# Verifies backup service is functioning properly

set -e

# Configuration
BACKUP_DIR=${BACKUP_DIR:-/backups}
LOG_DIR=${LOG_DIR:-/var/log/backup}
MAX_AGE_HOURS=${BACKUP_MAX_AGE_HOURS:-25} # 25 hours to account for daily backups

# Check if backup directory exists and is writable
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory $BACKUP_DIR does not exist"
    exit 1
fi

if [ ! -w "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory $BACKUP_DIR is not writable"
    exit 1
fi

# Check if log directory exists and is writable
if [ ! -d "$LOG_DIR" ]; then
    echo "ERROR: Log directory $LOG_DIR does not exist"
    exit 1
fi

if [ ! -w "$LOG_DIR" ]; then
    echo "ERROR: Log directory $LOG_DIR is not writable"
    exit 1
fi

# Check for recent backups
recent_backup_found=false
current_time=$(date +%s)
max_age_seconds=$((MAX_AGE_HOURS * 3600))

# Check database backups
if [ -d "$BACKUP_DIR/database" ]; then
    while IFS= read -r -d '' file; do
        file_time=$(stat -c %Y "$file" 2>/dev/null || echo "0")
        age=$((current_time - file_time))
        if [ $age -lt $max_age_seconds ]; then
            recent_backup_found=true
            break
        fi
    done < <(find "$BACKUP_DIR/database" -name "*.gz" -type f -print0 2>/dev/null)
fi

if [ "$recent_backup_found" = false ]; then
    echo "WARNING: No recent database backup found (within $MAX_AGE_HOURS hours)"
    exit 1
fi

# Check disk space
available_space=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
if [ "$available_space" -lt 1048576 ]; then # Less than 1GB
    echo "WARNING: Low disk space in backup directory: $(( available_space / 1024 ))MB available"
    exit 1
fi

# Check if backup process is running (optional)
if pgrep -f "backup.sh" > /dev/null; then
    echo "INFO: Backup process is currently running"
fi

echo "OK: Backup service is healthy"
exit 0