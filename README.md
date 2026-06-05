# Assessment Service Backend

A NestJS API for configuring, distributing, and grading educational 
and certification assessments. Supports multi-tenant isolation, 
9 question types, real-time Kahoot-style sessions, AI grading, 
and webhook event dispatch.

→ **API Reference**: Run the server and visit `/docs` (Swagger UI)  
→ **Integration Guide**: `docs/integration.md`  
→ **Architecture**: `docs/architecture.md`

---

## 📋 Prerequisites

| Tool     | Version  |
|----------|----------|
| Node.js  | >= 20.x  |
| pnpm     | >= 9.x   |
| Docker   | >= 24.x  |

---

## 🛠️ Local Setup

```bash
# 1. Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.development
# Fill in required values — see table below

# 4. Run migrations
pnpm migration:run

# 5. Start development server
pnpm start:dev
```

API available at `http://localhost:3001`
Swagger UI at `http://localhost:3001/docs`

---

## ⚙️ Environment Variables

| Variable            | Required | Description |
|---------------------|----------|-------------|
| DATABASE_URL        | ✅       | PostgreSQL connection string |
| REDIS_HOST          | ✅       | Redis hostname |
| REDIS_PORT          | ✅       | Redis port |
| JWT_SECRET          | ✅       | Min 32 chars random string |
| ADMIN_API_KEY       | ✅       | Super admin header key |
| AI_PROVIDER         | ✅       | `gemini│claude│deepseek│groq│ollama` |
| AI_GEMINI_API_KEY   | ⚠️       | Required if AI_PROVIDER=gemini |
| AI_DEEPSEEK_API_KEY | ⚠️       | Required if AI_PROVIDER=deepseek |
| ACCESS_TOKEN_TTL    | ❌       | Token lifetime in seconds (default: 3600) |

---

## 📦 Database Migrations

```bash
pnpm migration:generate   # generate from entity changes
pnpm migration:run        # apply pending migrations
pnpm migration:revert     # revert last migration
```

---

## 🧪 Testing

```bash
pnpm test           # unit + integration
pnpm test:watch     # watch mode
pnpm test:cov       # coverage report
pnpm test:e2e       # E2E against running server
```

---

## 📮 API Testing with Postman

A Postman collection is in `postman/`. Run against a live dev server:

```bash
pnpm start:dev
pnpm dlx newman run postman/assessment-service.postman_collection.json
```

---

## 🏗️ Key Design Decisions

| Decision | Choice | See |
|---|---|---|
| Auth | OAuth2 client credentials | `docs/adr/001-auth.md` |
| Secret hashing | Argon2id | `docs/adr/002-argon2id.md` |
| AI grading | Provider-agnostic (Gemini default) | `docs/adr/003-ai-grading.md` |
| Rate limiting | Redis-backed per clientId | `docs/adr/004-rate-limiting.md` |
