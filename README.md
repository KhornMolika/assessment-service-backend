# Assessment Service Backend

A high-performance NestJS application built for configuring, distributing, and grading educational and certification assessments. It handles multi-tenant tenant contexts, question banking, timing configurations, and runtime assessment sessions (both **self-paced** and **instructor-led real-time** modes) using PostgreSQL, Redis, and WebSockets (Socket.IO).

---

## 🚀 Key Features

* **Rich Question Types**: 9 distinct question types (single/multiple choice, true/false, fill-in-the-blank, ordering, matching, rating, short answer, and essays).
* **Multi-Tenant Scoping**: Client context isolation implemented via TypeORM base repositories and NestJS interceptors.
* **Auto-Grading & AI Evaluation**: Auto-grades choices, blanks, and matching questions synchronously. Open-ended questions are asynchronously evaluated by Google's Gemini API (defaults to `gemini-2.5-flash`) via Redis-backed Bull Queues.
* **Manual Grading Config**: Toggle `manualGradingAIQues: true` in assessment settings to bypass AI queues and hold subjective answers for human evaluation.
* **Relocated Recalculation Endpoint**: Trigger overall session score updates using a public endpoint `POST /api/v1/assessments/:sessionId/recalculate` after human scoring overrides.
* **Real-Time Instructor-Led Assessments**: A fully synchronized WebSocket and Redis-backed session engine for live, host-controlled exams. Features instant auto-grading for single/multiple choice, true/false, ordering, and matching questions. Includes dynamic connection resilience for participants joining late or recovering from dropped connections.
* **Reports & Aggregated Analytics**: Generates detailed, structure-aware reports.
  * **Session Report** (`GET /api/v1/assessments/:assessmentId/sessions/:sessionId/report`): Deep dive into a single attempt, including AI grading feedback and correctness details.
  * **Assessment Report** (`GET /api/v1/assessments/:assessmentId/report`): Aggregated statistics, score distributions (bucketed into ranges), correct/incorrect answer counts, and a paginated list of top-performing participants. Adapts dynamically for scored tests and survey metrics.
  * **Participant Report** (`GET /api/v1/participants/:participantId/report`): Cross-assessment participant transcript history, overall pass/fail rates, averages, and durations.
* **Database & Query Performance Optimizations**: 
  * Promoted `type` column mapping from JSONB (`questionSnapshot`) to first-class, indexed `questionType` column on `AssessmentQuestion` to use standard B-Tree indexes.
  * Optimized index layout with composite partial indexes on junction/transaction tables (`answer_sheet`, `answer_entry`) to prevent query degradation as dataset scales.

---

## 🔒 Authentication (OAuth2)

The system is secured using a strict **OAuth2 Client Credentials Grant** architecture for server-to-server machine interactions.

* **Client Provisioning**: Clients are provisioned via `POST /api/v1/clients`. The system returns a cryptographically secure `clientSecret` exactly once.
* **Secret Storage**: Client secrets are hashed securely using **Argon2id** (OWASP recommended parameters) before being stored in PostgreSQL.
* **Token Issuance**: Clients authenticate via `POST /api/v1/auth/token` using `grant_type=client_credentials`. The system validates the hash and issues a stateless JWT access token.
* **Global Protection**: All endpoints are protected globally by a custom `ClientAuthGuard`. Valid tokens effortlessly inject the active tenant context via the `@CurrentClient()` decorator.

---

## 🛠️ Project Setup

Ensure you have **PostgreSQL** and **Redis** running (can be started via Docker Compose).

```bash
# Start Docker services (Postgres & Redis)
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies using pnpm
pnpm install
```

---

## 📦 Database Migrations

TypeORM auto-synchronization is disabled in development configurations to ensure schema integrity. Generate and run schema changes using migrations:

```bash
# Generate a new migration
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d src/database/data-source.ts src/database/migrations/AutoMigration

# Run pending migrations
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/database/data-source.ts

# Revert last migration
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d src/database/data-source.ts
```

---

## 🏃 Compile and Run

Configure environmental parameters inside `.env.development`.

```bash
# Development (watch mode)
pnpm run start:dev

# Production build compilation
pnpm run build

# Start production server
pnpm run start:prod
```

---

## 🧪 Testing

We use Jest for unit and integration test suites.

```bash
# Run unit and integration tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Test coverage report
pnpm run test:cov
```

---

## 📮 Postman & Newman Integration Testing

A Postman collection is supplied inside the `postman/` directory for manual and automated API route verification.

### Automated Newman Execution
Start the development server and run Newman to execute the collection requests:

```bash
# Run development server in background
pnpm run start:dev

# Run Newman tests against local endpoints
npx newman run postman/assessment-service.postman_collection.json
```
