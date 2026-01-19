#!/bin/bash
# Sentinel RFP - PostgreSQL Backup Script
# Automated backup of PostgreSQL database with pgvector data
# Usage: ./scripts/backup-postgres.sh [backup-name]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-sentinel_rfp_${TIMESTAMP}}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-sentinel-postgres}"

# Database credentials (from docker-compose.yml or environment)
DB_USER="${POSTGRES_USER:-sentinel_user}"
DB_NAME="${POSTGRES_DB:-sentinel_rfp}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  PostgreSQL Backup Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${YELLOW}⚠️  Container ${CONTAINER_NAME} is not running${NC}"
  exit 1
fi

echo "📦 Backing up database: ${DB_NAME}"
echo "📂 Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
echo ""

# Perform backup using pg_dump
# --format=custom (-Fc): Custom PostgreSQL format (compressed, supports parallel restore)
# --no-owner: Skip ownership commands (for portability)
# --no-acl: Skip access control lists
# --verbose: Show progress
# --compress=9: Maximum compression
docker exec -t "$CONTAINER_NAME" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --compress=9 \
  > "${BACKUP_DIR}/${BACKUP_NAME}.dump"

# Get file size
FILE_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.dump" | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completed successfully${NC}"
echo "   File: ${BACKUP_NAME}.dump"
echo "   Size: ${FILE_SIZE}"
echo ""
echo -e "${GREEN}📋 Restore instructions:${NC}"
echo "   docker exec -i $CONTAINER_NAME pg_restore \\"
echo "     -U $DB_USER \\"
echo "     -d $DB_NAME \\"
echo "     --clean \\"
echo "     --if-exists \\"
echo "     --verbose \\"
echo "     < ${BACKUP_DIR}/${BACKUP_NAME}.dump"
echo ""

# Optional: Keep only last N backups
MAX_BACKUPS="${MAX_BACKUPS:-10}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  echo -e "${YELLOW}🧹 Cleaning old backups (keeping last ${MAX_BACKUPS})...${NC}"
  ls -t "$BACKUP_DIR"/*.dump | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
  echo "   Deleted $((BACKUP_COUNT - MAX_BACKUPS)) old backup(s)"
  echo ""
fi

echo -e "${GREEN}🎉 Backup process complete!${NC}"
