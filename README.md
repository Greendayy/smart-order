# Smart Order (V1 Scaffold)

Bun + Turborepo + TanStack Start + Elysia + Postgres.js（纯 SQL） 的项目脚手架，包含基础冒烟测试与开发环境（Docker Compose）。

## Prerequisites

- Bun `>= 1.3`
- Docker Desktop（用于本地 Postgres）

## Quick Start

1) 安装依赖

```bash
bun install
```

2) 配置环境变量

```bash
cp .env.example .env
```

3) 启动 Postgres（dev）

```bash
bun run db:up
```

4) 初始化数据库（纯 SQL migrations）

```bash
bun run db:migrate
```

5) 启动开发服务（API + Web + Docs）

```bash
bun run dev
```

### 如果端口被占用

默认端口：

- API: `3001`
- Web: `3000`（如果被占用会自动尝试下一个可用端口）
- Docs: `4321`（如果被占用会自动尝试下一个可用端口）

如果你的 `3001` 被占用，请在 `.env` 里改：

- `API_PORT=3101`
- `BETTER_AUTH_URL=http://localhost:3101`
- `VITE_API_URL=http://localhost:3101`

## Endpoints

- API health: `http://localhost:3001/health`
- Web: `http://localhost:3000/`
- Docs: `http://localhost:4321/`
- Adminer（DB UI）: `http://localhost:8080/`

## Scripts

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run db:up` / `bun run db:down`
- `bun run db:migrate`

## LLM (disabled by default)

默认禁用，不需要填写任何 Key：

- `.env`: `LLM_ENABLED=false`

如需启用：

- `.env`: `LLM_ENABLED=true`
- 选择 provider：`LLM_PROVIDER=openai|kimi|qwen`
- 配置对应 `*_API_KEY`

## Notes

- 目前只搭建“可跑通”的架子（TypeScript/Lint/Test/Docs），业务模块（客户/商品/订单/退货/打印/导出）后续按用例与 TDD 逐步实现。
