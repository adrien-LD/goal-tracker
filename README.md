# Goal Tracker

A Next.js + SQLite goal management app with daily check-ins, multi-goal tracking, and bilingual UI (中文/EN).

## Local Setup

```bash
cp .env.example .env
pnpm install
npx prisma db push
npm run dev
```

## Notes

- Prisma uses `DATABASE_URL` from environment variables.
- Sessions are stored server-side with HttpOnly cookies.
- Goals generate daily check-ins for the full date range at creation time.

## Existing Data Backfill (`targetCount`)

After schema changes are applied with `npx prisma db push`, run this once for old data:

```bash
npx prisma db execute --stdin <<'SQL'
UPDATE "Goal"
SET "targetCount" = CAST((julianday(date("endDate")) - julianday(date("startDate")) + 1) AS INTEGER)
WHERE "targetCount" IS NULL;
SQL
```

`deploy/remote-deploy.sh` already runs this backfill automatically on each deployment.

## Production Deployment (CentOS/RHEL/Alma)

### 1) Server bootstrap

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin cronie rsync
sudo systemctl enable --now docker
sudo systemctl enable --now crond
sudo mkdir -p /opt/goal-tracker/app /opt/goal-tracker/backups
sudo chown -R "$USER":"$USER" /opt/goal-tracker
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

Create server runtime env file at `/opt/goal-tracker/app/.env`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=file:/data/dev.db
SESSION_COOKIE_SECURE=false
```

### 2) GitHub Actions secrets

Add these repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH` (set to `/opt/goal-tracker/app`)

### 3) Auto deploy behavior

On every push to `main`, workflow `.github/workflows/deploy.yml` will:

1. Sync code to server via SSH + rsync.
2. Run `deploy/remote-deploy.sh` on server.
3. Rebuild and restart container with `docker compose`.
4. Apply schema with `npx prisma db push`.
5. Ensure daily SQLite backup cron exists (`deploy/backup-sqlite.sh`).

Service endpoint: `http://<server-ip>:3000`
