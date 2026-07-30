#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${APP_ROOT}/deploy/docker-compose.yml"
ENV_FILE="${APP_ROOT}/.env"
BACKUP_SCRIPT="${APP_ROOT}/deploy/backup-sqlite.sh"
CRON_SCHEDULE="${BACKUP_CRON:-0 3 * * *}"
CRON_LOG_FILE="/opt/goal-tracker/backups/backup.log"
CRON_COMMAND="/bin/bash ${BACKUP_SCRIPT} >> ${CRON_LOG_FILE} 2>&1"
DOCKER_CHECK_TIMEOUT="${DOCKER_CHECK_TIMEOUT:-1m}"
COMPOSE_DOWN_TIMEOUT="${COMPOSE_DOWN_TIMEOUT:-2m}"
COMPOSE_BUILD_TIMEOUT="${COMPOSE_BUILD_TIMEOUT:-45m}"
COMPOSE_UP_TIMEOUT="${COMPOSE_UP_TIMEOUT:-3m}"
PRISMA_TIMEOUT="${PRISMA_TIMEOUT:-5m}"
CRON_TIMEOUT="${CRON_TIMEOUT:-1m}"
CURRENT_STEP="initialization"

log() {
  printf '[deploy][%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

run_step() {
  local name="$1"
  local duration="$2"
  shift 2

  CURRENT_STEP="${name}"
  local started_at="${SECONDS}"
  log "START ${name} (timeout: ${duration})"
  timeout --foreground --kill-after=30s "${duration}" "$@"
  log "DONE ${name} ($((SECONDS - started_at))s)"
}

collect_diagnostics() {
  log "Collecting diagnostics after failure in: ${CURRENT_STEP}"
  uptime || true
  df -h "${APP_ROOT}" /var/lib/docker 2>/dev/null || true
  if command -v free >/dev/null 2>&1; then
    free -h || true
  fi

  timeout --foreground 30s docker compose -f "${COMPOSE_FILE}" ps --all || true
  timeout --foreground 30s docker ps -a || true
  timeout --foreground 30s docker stats --no-stream || true

  if command -v journalctl >/dev/null 2>&1; then
    timeout --foreground 30s journalctl -u docker --since "30 minutes ago" \
      --no-pager -n 120 || true
  fi
  if command -v dmesg >/dev/null 2>&1; then
    timeout --foreground 15s dmesg -T 2>/dev/null \
      | grep -Ei 'out of memory|oom|killed process' \
      | tail -50 || true
  fi
}

on_error() {
  local exit_code="$?"
  local line_number="$1"
  trap - ERR
  log "FAILED ${CURRENT_STEP} at line ${line_number} (exit: ${exit_code})"
  collect_diagnostics
  exit "${exit_code}"
}

trap 'on_error "${LINENO}"' ERR

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

if ! command -v timeout >/dev/null 2>&1; then
  echo "timeout is not available; install GNU coreutils first" >&2
  exit 1
fi

chmod +x "${BACKUP_SCRIPT}"
mkdir -p /opt/goal-tracker/backups

log "Deployment diagnostics"
uname -a
uptime
df -h "${APP_ROOT}" /var/lib/docker 2>/dev/null || true
if command -v free >/dev/null 2>&1; then
  free -h || true
fi

run_step "Docker daemon check" "${DOCKER_CHECK_TIMEOUT}" docker info
run_step "Docker Compose check" "${DOCKER_CHECK_TIMEOUT}" docker compose version
run_step "Stop existing services" "${COMPOSE_DOWN_TIMEOUT}" \
  docker compose -f "${COMPOSE_FILE}" down --timeout 30
run_step "Build app image" "${COMPOSE_BUILD_TIMEOUT}" \
  env BUILDKIT_PROGRESS=plain docker compose -f "${COMPOSE_FILE}" build app
run_step "Start app service" "${COMPOSE_UP_TIMEOUT}" \
  docker compose -f "${COMPOSE_FILE}" up -d --no-build app
run_step "Push Prisma schema" "${PRISMA_TIMEOUT}" \
  docker compose -f "${COMPOSE_FILE}" exec -T app npx prisma db push
run_step "Backfill legacy goal data" "${PRISMA_TIMEOUT}" \
  docker compose -f "${COMPOSE_FILE}" exec -T app npx prisma db execute --stdin <<'SQL'
UPDATE "Goal"
SET "targetCount" = CAST((julianday(date("endDate")) - julianday(date("startDate")) + 1) AS INTEGER)
WHERE "targetCount" IS NULL;
SQL
run_step "Show service status" "${DOCKER_CHECK_TIMEOUT}" \
  docker compose -f "${COMPOSE_FILE}" ps

CURRENT_CRON="$(timeout --foreground "${CRON_TIMEOUT}" crontab -l 2>/dev/null || true)"
UPDATED_CRON="$(printf "%s\n" "${CURRENT_CRON}" | grep -Fv "${BACKUP_SCRIPT}" || true)"
{
  printf "%s\n" "${UPDATED_CRON}"
  printf "%s %s\n" "${CRON_SCHEDULE}" "${CRON_COMMAND}"
} | run_step "Install backup cron" "${CRON_TIMEOUT}" crontab -

log "Deployment succeeded."
log "Backup cron installed: ${CRON_SCHEDULE}"
