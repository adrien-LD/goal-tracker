#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${APP_ROOT}/deploy/docker-compose.yml"
BACKUP_DIR="${BACKUP_DIR:-/opt/goal-tracker/backups}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/dev-${TIMESTAMP}.db"

mkdir -p "${BACKUP_DIR}"

if ! docker compose -f "${COMPOSE_FILE}" ps app | grep -q "Up"; then
  echo "app service is not running; backup aborted" >&2
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" cp app:/data/dev.db "${BACKUP_FILE}"
gzip -f "${BACKUP_FILE}"

find "${BACKUP_DIR}" -type f -name "dev-*.db.gz" -mtime +14 -delete

echo "Backup created: ${BACKUP_FILE}.gz"
