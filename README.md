# Goal Tracker

一个基于 Next.js 14、Prisma 和 SQLite 的轻量目标管理应用，支持账号注册登录、目标管理、每日打卡、进度统计，以及中英文双语界面切换。

## 项目概览

- 面向个人目标跟踪场景，核心流程是“创建目标 → 自动生成每日打卡 → 按天完成 → 累积进度”
- 使用 Next.js App Router 构建前后端一体应用，API 路由与页面共用同一套 TypeScript 代码
- 使用 Prisma 连接 SQLite，本地开发和单机部署都很轻量
- 通过服务端 Session + HttpOnly Cookie 做认证，未登录用户会被中间件统一重定向到登录页
- 内置中文 / English 双语资源，语言偏好保存在 `localStorage` 和 `cookie`

## 功能清单

- 用户注册、登录、退出
- 创建、编辑、删除目标
- 为目标设置标题、描述、开始日期、结束日期、目标完成次数
- 创建目标时，自动为目标日期区间内的每一天生成 `CheckIn`
- 按某一天查看打卡项，或按日期范围拉取打卡数据
- 在打卡页切换完成状态，并同步更新目标累计进度
- 桌面端月历视图 + 移动端列表视图
- 进度环展示每个目标的完成比例
- 中英文界面一键切换

## 用户流程

1. 访问首页 `/`，系统根据登录状态跳转到 `/login` 或 `/checkins`
2. 新用户在 `/register` 创建账号，已存在用户在 `/login` 登录
3. 登录后进入目标页 `/goals` 创建目标
4. 提交目标时，后端会按开始/结束日期自动生成所有每日打卡记录
5. 在 `/checkins` 页面选择某一天，逐项勾选完成状态
6. 编辑目标日期区间时，系统会自动补齐新增日期的打卡项，并删除移除日期的打卡项
7. 删除目标时，会级联删除该目标关联的打卡数据

## 技术栈

| 类别 | 方案 |
| --- | --- |
| 应用框架 | Next.js 14（App Router） |
| 语言 | TypeScript |
| UI | React 18 |
| 样式 | Tailwind CSS |
| 数据库 | SQLite |
| ORM | Prisma |
| 密码加密 | `bcryptjs` |
| 认证 | 服务端 Session + HttpOnly Cookie |
| 部署 | Docker Compose + GitHub Actions |

## 页面与模块

### 页面

- `/login`：登录页，提交用户名和密码到 `POST /api/auth/login`
- `/register`：注册页，注册成功后自动创建会话
- `/goals`：目标列表和目标表单，支持新增、编辑、删除
- `/checkins`：每日打卡页，桌面端显示日历，移动端显示列表

### 核心模块

- `middleware.ts`：保护非公开页面和 API，未登录时重定向到 `/login`
- `src/lib/auth.ts`：密码哈希、Session 创建/清除、当前用户读取
- `src/lib/db.ts`：Prisma Client 单例
- `src/lib/date.ts`：本地日期格式化、解析、日期区间展开
- `src/lib/goal-target-count.ts`：目标次数校验、默认值解析、兼容旧数据
- `src/components/i18n.tsx`：双语字典和语言状态管理

## 数据模型

Prisma Schema 位于 `prisma/schema.prisma`，核心模型如下：

### `User`

- 用户主表
- 字段：`id`、`username`、`passwordHash`、`createdAt`
- 关联：一个用户可拥有多个 `Session` 和多个 `Goal`

### `Session`

- 服务端会话表
- 字段：`id`、`userId`、`expiresAt`、`createdAt`
- 登录后会将 `session.id` 写入 `goal_session` Cookie

### `Goal`

- 目标主表
- 字段：`id`、`userId`、`title`、`description`、`targetCount`、`startDate`、`endDate`
- 一个目标关联多条 `CheckIn`
- `targetCount` 在数据库层允许为空，用于兼容旧数据；读取时会按日期跨度补齐默认值

### `CheckIn`

- 每日打卡表
- 字段：`id`、`goalId`、`date`、`completed`、`createdAt`
- 唯一约束：`@@unique([goalId, date])`

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 注册账号，写入用户和会话 |
| `POST` | `/api/auth/login` | 登录并创建会话 |
| `POST` | `/api/auth/logout` | 清除会话和 Cookie |
| `GET` | `/api/goals` | 获取当前用户的目标列表 |
| `POST` | `/api/goals` | 创建目标并生成日期区间内的打卡项 |
| `PATCH` | `/api/goals/[id]` | 更新目标，并根据日期差异增删打卡项 |
| `DELETE` | `/api/goals/[id]` | 删除目标及其关联打卡项 |
| `GET` | `/api/checkins` | 按 `date` 或 `startDate/endDate` 获取打卡项 |
| `PATCH` | `/api/checkins/[id]` | 更新单条打卡的完成状态 |

### API 设计特点

- 除登录、注册、退出外，其余 API 都依赖 `requireUser()`
- `/api/checkins` 会额外聚合每个目标已完成的打卡数量，用于前端即时展示进度
- 创建和更新目标时都会校验目标次数必须是大于等于 `1` 的整数
- 修改目标日期区间时，通过差集计算仅新增或删除必要的 `CheckIn`

## 目录结构

```text
.
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── checkins/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── checkins/
│   │   │   └── goals/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── checkins/
│   │   ├── AppShell.tsx
│   │   ├── AuthShell.tsx
│   │   ├── ProgressRing.tsx
│   │   └── i18n.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── date.ts
│   │   ├── db.ts
│   │   └── goal-target-count.ts
│   └── locales/
│       ├── en.json
│       └── zh.json
├── deploy/
│   ├── backup-sqlite.sh
│   ├── docker-compose.yml
│   └── remote-deploy.sh
├── .github/workflows/deploy.yml
├── Dockerfile
└── middleware.ts
```

## 本地开发

### 环境要求

- Node.js 20+
- pnpm

### 启动步骤

```bash
cp .env.example .env
pnpm install
npx prisma db push
pnpm dev
```

默认开发地址：

```text
http://localhost:3000
```

如果 `3000` 端口被占用，可临时指定：

```bash
PORT=3001 pnpm dev
```

### 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
npx prisma db push
```

## 环境变量

`.env.example` 当前包含以下变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | Prisma 数据库连接，默认本地 SQLite 文件 |
| `NODE_ENV` | 运行环境 |
| `PORT` | 服务端口 |
| `SESSION_COOKIE_SECURE` | 是否为 Cookie 打开 `Secure` 标记 |

本地默认示例：

```env
DATABASE_URL=file:./dev.db
NODE_ENV=production
PORT=3000
SESSION_COOKIE_SECURE=false
```

## 部署说明

项目内置了面向单机 Docker 部署的完整流程。

### 部署组成

- `Dockerfile`：多阶段构建 Next.js 应用
- `deploy/docker-compose.yml`：启动应用容器并挂载 SQLite 数据卷
- `.github/workflows/deploy.yml`：监听 `main` 分支推送并执行部署
- `deploy/remote-deploy.sh`：远端重建容器、同步数据库结构、安装备份任务
- `deploy/backup-sqlite.sh`：每天备份 SQLite，并清理 14 天前备份

### 自动部署流程

每次 push 到 `main` 后，GitHub Actions 会：

1. 校验部署密钥和目标主机配置
2. 通过 SSH + `rsync` 同步代码到服务器
3. 执行远端部署脚本
4. `docker compose up -d --build`
5. 运行 `npx prisma db push`
6. 执行旧数据 `targetCount` 回填 SQL
7. 安装每日备份 cron

### 服务器运行环境变量

生产容器默认使用：

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:/data/dev.db
SESSION_COOKIE_SECURE=false
```

## 旧数据回填

如果历史数据中 `Goal.targetCount` 为空，在执行 `npx prisma db push` 后可运行以下 SQL 回填：

```bash
npx prisma db execute --stdin <<'SQL'
UPDATE "Goal"
SET "targetCount" = CAST((julianday(date("endDate")) - julianday(date("startDate")) + 1) AS INTEGER)
WHERE "targetCount" IS NULL;
SQL
```

`deploy/remote-deploy.sh` 已内置这段回填逻辑。

## 当前项目特点总结

- 代码体量小，适合快速迭代和单机部署
- 前后端共享一套 TypeScript 模型和校验逻辑，维护成本低
- 目标和打卡的关系建模清晰，业务语义简单直接
- 认证、多语言、日历视图、进度统计都已具备，适合作为习惯追踪类应用的基础模板
