---
title: Dev Setup
head: []
---

## 1) 启动 Postgres（Docker Compose）

```bash
bun run db:up
```

## 2) 迁移数据库（纯 SQL）

```bash
cp .env.example .env
bun run db:migrate
```

## 3) 启动 API 与 Web

```bash
bun install
bun run dev
```

默认：

- API: `http://localhost:3001/health`
- Web: `http://localhost:3000/`

