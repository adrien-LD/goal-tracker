#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${APP_ROOT}/deploy/docker-compose.yml"
ENV_FILE="$(cd "${APP_ROOT}/.." && pwd)/.env"
BACKUP_SCRIPT="${APP_ROOT}/deploy/backup-sqlite.sh"
CRON_SCHEDULE="${BACKUP_CRON:-0 3 * * *}"
CRON_LOG_FILE="/opt/goal-tracker/backups/backup.log"
CRON_COMMAND="/bin/bash ${BACKUP_SCRIPT} >> ${CRON_LOG_FILE} 2>&1"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "missing compose file: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing env file: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed on target server" >&2
  exit 1
fi

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab is not available; install cronie first" >&2
  exit 1
fi

chmod +x "${BACKUP_SCRIPT}"
mkdir -p /opt/goal-tracker/backups

docker compose -f "${COMPOSE_FILE}" down
docker compose -f "${COMPOSE_FILE}" up -d --build
docker compose -f "${COMPOSE_FILE}" exec -T app npx prisma db push
docker compose -f "${COMPOSE_FILE}" ps

CURRENT_CRON="$(crontab -l 2>/dev/null || true)"
UPDATED_CRON="$(printf "%s\n" "${CURRENT_CRON}" | grep -Fv "${BACKUP_SCRIPT}" || true)"
{
  printf "%s\n" "${UPDATED_CRON}"
  printf "%s %s\n" "${CRON_SCHEDULE}" "${CRON_COMMAND}"
} | crontab -

echo "Deployment succeeded."
echo "Backup cron installed: ${CRON_SCHEDULE}"
