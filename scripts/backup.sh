#!/bin/bash
# ============================================
# MoviePlatform — Database Backup Script
# Usage: ./scripts/backup.sh
# Crontab: 0 3 * * * /home/deploy/apps/movieplatform/scripts/backup.sh
# ============================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DAYS_TO_KEEP=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/movieplatform_${TIMESTAMP}.sql.gz"

cd "$PROJECT_DIR"

# Load env vars
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-movieplatform}"
POSTGRES_DB="${POSTGRES_DB:-movieplatform}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."

# Dump database and compress
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl | \
    gzip > "$BACKUP_FILE"

# Check backup was created
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Rotate old backups (keep last N days)
echo "Removing backups older than $DAYS_TO_KEEP days..."
find "$BACKUP_DIR" -name "movieplatform_*.sql.gz" -mtime +$DAYS_TO_KEEP -delete

# Show remaining backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/movieplatform_*.sql.gz 2>/dev/null || echo "  (none)"
echo ""
echo "Backup complete."
