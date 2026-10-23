#!/usr/bin/env bash
# Restores a backup made by backup.sh. Existing collections are REPLACED.
#   MONGODB_URI=mongodb://.../scrollme scripts/restore.sh backups/scrollme-20260101T000000Z.archive.gz [--yes]
# To rehearse safely, restore into another database:
#   MONGODB_URI=... RESTORE_TO_DB=scrollme_restore_test scripts/restore.sh <file> --yes
set -euo pipefail

FILE="${1:?Usage: restore.sh <backup.archive.gz> [--yes]}"
: "${MONGODB_URI:?Set MONGODB_URI}"
SOURCE_DB="${SOURCE_DB:-scrollme}"
TARGET_DB="${RESTORE_TO_DB:-${SOURCE_DB}}"

if [[ -f "${FILE}.sha256" ]]; then
  sha256sum --check --status "${FILE}.sha256" || { echo "Checksum mismatch for ${FILE}; refusing to restore." >&2; exit 1; }
fi

if [[ "${2:-}" != "--yes" ]]; then
  read -r -p "Replace database '${TARGET_DB}' with ${FILE}? Type the database name to confirm: " answer
  [[ "${answer}" == "${TARGET_DB}" ]] || { echo "Aborted."; exit 1; }
fi

mongorestore --uri="${MONGODB_URI}" --archive="${FILE}" --gzip --drop \
  --nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*" --quiet
echo "Restored ${FILE} into ${TARGET_DB}"
