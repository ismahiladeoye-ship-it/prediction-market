#!/usr/bin/env bash
# Creates a compressed, timestamped MongoDB backup and prunes old ones.
#   MONGODB_URI=mongodb://... BACKUP_DIR=./backups RETENTION_DAYS=14 scripts/backup.sh
# Requires mongodump (MongoDB Database Tools). With docker compose:
#   docker compose exec mongo sh -c 'mongodump --archive=/backups/scrollme-$(date -u +%Y%m%dT%H%M%SZ).archive.gz --gzip --db scrollme'
set -euo pipefail

: "${MONGODB_URI:?Set MONGODB_URI}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/scrollme-${STAMP}.archive.gz"

mkdir -p "${BACKUP_DIR}"
mongodump --uri="${MONGODB_URI}" --archive="${FILE}.partial" --gzip --quiet
# Only a complete dump gets its final name, so a failed run never looks like a backup.
mv "${FILE}.partial" "${FILE}"
# Checksum lets the restore step detect a corrupted copy.
sha256sum "${FILE}" > "${FILE}.sha256"
echo "Backup written: ${FILE} ($(du -h "${FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name 'scrollme-*.archive.gz*' -type f -mtime "+${RETENTION_DAYS}" -print -delete
