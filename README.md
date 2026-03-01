# Goal Tracker

A Next.js + SQLite goal management app with daily check-ins, multi-goal tracking, and bilingual UI (中文/EN).

## Setup

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

## Notes

- Prisma uses `prisma/dev.db` (SQLite).
- Sessions are stored server-side with HttpOnly cookies.
- Goals generate daily check-ins for the full date range at creation time.
