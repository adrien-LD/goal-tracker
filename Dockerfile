FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --no-frozen-lockfile

FROM base AS builder

ENV DATABASE_URL="file:./prisma/dev.db"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/data/dev.db"

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
