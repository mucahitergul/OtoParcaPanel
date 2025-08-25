# Backup Service Dockerfile for Oto Parça Panel
# Automated database and file backup service

FROM alpine:3.18

# Set environment variables
ENV BACKUP_DIR=/backups
ENV SCRIPTS_DIR=/scripts
ENV LOG_DIR=/var/log/backup

# Install required packages
RUN apk add --no-cache \
    postgresql-client \
    aws-cli \
    curl \
    bash \
    gzip \
    tar \
    coreutils \
    findutils \
    dcron \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Europe/Istanbul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create directories
RUN mkdir -p $BACKUP_DIR $SCRIPTS_DIR $LOG_DIR

# Create backup user
RUN addgroup -g 1001 backup && \
    adduser -D -u 1001 -G backup backup

# Copy backup scripts
COPY scripts/ $SCRIPTS_DIR/
COPY crontab /etc/crontabs/backup

# Make scripts executable
RUN chmod +x $SCRIPTS_DIR/*.sh

# Set ownership
RUN chown -R backup:backup $BACKUP_DIR $SCRIPTS_DIR $LOG_DIR

# Switch to backup user
USER backup

# Health check
HEALTHCHECK --interval=1h --timeout=30s --start-period=10s --retries=3 \
    CMD $SCRIPTS_DIR/health-check.sh

# Start cron daemon
CMD ["crond", "-f", "-d", "8"]