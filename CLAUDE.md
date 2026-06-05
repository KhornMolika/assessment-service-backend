# CLAUDE.md — Assessment Service Backend

NestJS 11 REST API for the Assessment Service Platform. Multi-tenant, OAuth2-secured, with PostgreSQL, Redis, Bull job queues, and Socket.IO real-time capabilities.

## Project Structure

```
assessment-service-backend/
├── src/
│   ├── main.ts                          # Bootstrap: global prefix, pipes, filters, interceptors
│   ├── app.module.ts                    # Root module — imports all feature modules + config
│   ├── config/
│   │   ├── app.config.ts                # registerAs('app', …) — env, port, AI, auth, throttle
│   │   ├── database.config.ts           # TypeORM async config (postgres, autoLoadEntities, no sync)
│   │   └── env.validation.ts            # Joi schema for all env vars
│   ├── database/
│   │   ├── data-source.ts               # CLI DataSource for migrations
│   │   └── migrations/                  # Auto-generated timestamped migrations
│   ├── common/
│   │   ├── base/
│   │   │   ├── system-base.entity.ts    # id (UUID), createdAt, updatedAt, deletedAt (soft delete)
│   │   │   ├── client-scoped.entity.ts  # + clientId (UUID, @Exclude()d)
│   │   │   └── client-repository.ts     # Generic repo auto-scoping queries to clientId
│   │   ├── context/
│   │   │   ├── client.storage.ts        # AsyncLocalStorage<ClientStore>
│   │   │   └── client-context.service.ts
│   │   ├── decorators/
│   │   │   └── current-client.decorator.ts  # @CurrentClient() param decorator
│   │   ├── dto/
│   │   │   └── pagination-query.dto.ts  # page, limit, search, sortBy, order, visibility, tag, topicId
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts       # Normalizes all errors
│   │   │   └── throttler-exception.filter.ts  # 429 with Retry-After
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts        # Wraps success in { success, data, meta }
│   │   │   ├── client-context.interceptor.ts   # Sets AsyncLocalStorage from request.client
│   │   │   └── ws-client-context.interceptor.ts # Same for WebSocket gateways
│   │   ├── middleware/
│   │   │   └── client.middleware.ts       # Reads x-client-id header (legacy, interceptor preferred)
│   │   ├── pipes/
│   │   │   └── question-schema-validation.pipe.ts  # Validates options + correctAnswer per type
│   │   └── cache/
│   │       ├── cache.module.ts
│   │       └── cache.service.ts          # Redis getOrSet, invalidate, invalidatePattern
│   └── modules/
│       ├── auth/           # OAuth2 Client Credentials → JWT
│       ├── clients/        # Tenant provisioning & management
│       ├── topics/         # Organizational topic hierarchy
│       ├── questions/      # 9 question types with type-specific DTOs
│       ├── question-banks/ # Reusable question collections with visibility
│       ├── assessments/    # Assessment config, lifecycle, settings, participants
│       ├── participants/   # Participant CRUD
│       ├── runtime/        # Self-paced assessment execution
│       ├── realtime/       # Instructor-led live sessions (Socket.IO)
│       ├── grading/        # Strategy-pattern auto-grading engine
│       ├── ai/             # AI grading via Gemini/DeepSeek (Bull queue)
│       ├── reports/        # Analytics & aggregated reports (raw SQL)
│       └── webhooks/       # Async webhook dispatch (Bull queue)
├── test/                   # E2E tests (*.e2e-spec.ts)
├── postman/                # Postman collection
├── scripts/                # Utility scripts
├── docker-compose.dev.yml  # PostgreSQL 15 + Redis 7-alpine
└── Dockerfile              # Node 22-alpine, pnpm, build → dist/main.js
```

## Global Request Pipeline

Every incoming HTTP request passes through these layers **in order**:

```
Request
  → ThrottlerGuard (APP_GUARD — rate limiting via Redis)
  → ClientAuthGuard (APP_GUARD — JWT validation; skips @Public() routes)
  → ClientContextInterceptor (APP_INTERCEPTOR — sets AsyncLocalStorage with clientId)
  → ValidationPipe (global — whitelist, forbidNonWhitelisted, transform)
  → Route handler
  → TransformInterceptor (wraps success in { success: true, data, meta? })
  → HttpExceptionFilter (catches all, normalizes to { success: false, error: {...} })
  → Response
```

WebSocket messages go through `WsClientContextInterceptor` which reads clientId from handshake auth/headers/query.

---

## Multi-Tenancy (CRITICAL — read before any data access work)

### The Pattern
1. **Every tenant-owned entity extends `ClientScopedEntity`** (adds `clientId` UUID column with `@Exclude()`).
2. **Every tenant-owned repository extends `ClientRepository<T>`** — it auto-injects `clientId` from `ClientContextService.getClientId()` into all queries.
3. **`ClientContextService.getClientId()`** reads from `AsyncLocalStorage` set by `ClientContextInterceptor` (HTTP) or `WsClientContextInterceptor` (WebSocket).
4. **The `Client` entity itself** extends `SystemBaseEntity` directly (no `clientId` — it IS the tenant root).

### What ClientRepository Does Automatically
- `find(options)` — adds `where: { ...options.where, clientId }`
- `findOne(options)` — adds clientId filter
- `findPaginated(options)` — adds clientId + handles search/sort/pagination, returns `{ data, meta }`
- `create(data)` — adds `clientId` to the entity
- `softDelete(id)` / `hardDelete(id)` — includes clientId in WHERE
- `qb()` — returns a pre-scoped SelectQueryBuilder with `WHERE "alias"."clientId" = :clientId`

### Writing Raw Queries Safely
```typescript
// Option A: Use qb() from ClientRepository
const qb = this.repository.qb('entity');
qb.andWhere('entity.status = :status', { status })
  .orderBy('entity.createdAt', 'DESC');
return qb.getMany();

// Option B: Inject DataSource directly, manually add client filter
const result = await this.dataSource.query(
  'SELECT * FROM answer_sheet WHERE "clientId" = $1 AND "assessmentId" = $2',
  [this.clientContextService.getClientId(), assessmentId]
);
```

**Never use the raw TypeORM `Repository` or `EntityManager` without manually filtering by clientId.** The only exception is the `Client` entity itself, which uses a plain `Repository<Client>`.

---

## Auth Module Deep Dive

### Flow
```
Client Provisioning          Token Issuance               Authenticated Request
─────────────────────        ───────────────              ─────────────────────
POST /api/v1/clients         POST /api/v1/auth/token      Any endpoint
  (temporarily @Public())      (@Public())                  (protected by ClientAuthGuard)
  ↓                            ↓                            ↓
ClientService.create()       AuthService.token()          ClientAuthGuard
  clientId = randomUUID()      verifySecret(               JWT validation
  secret = randomBytes(32)       clientId, rawSecret)        ↓
  clientSecretHash =             ↓                        JwtStrategy.validate()
    argon2id(secret)           Argon2id.verify()            Fetch client from
  saves to DB                   ↓                          Redis cache (getOrSet)
  returns secret ONCE         Sign JWT { sub: clientId,     Verify isActive
                                slug, scopes }              Attach to request.client
                              Return { access_token }       ↓
                                                         ClientContextInterceptor
                                                           Sets AsyncLocalStorage
```

### Key Files
- `auth.controller.ts` — `POST /auth/token` (the only route)
- `auth.service.ts` — validates grant_type, calls ClientService, signs JWT
- `guards/client-auth.guard.ts` — extends `AuthGuard('jwt')`, checks `@Public()` metadata
- `guards/public.decorator.ts` — `@Public()` sets metadata `isPublic: true`
- `guards/auth-throttler.guard.ts` — per-clientId rate limiting on the token endpoint
- `strategies/jwt.strategy.ts` — Passport JWT strategy: validates token, fetches client from Redis cache

### Auth Throttler
The token endpoint has its own `AuthThrottlerGuard` (separate from the global `ThrottlerGuard`). It tracks by `clientId` from the request body (fallback: IP address), limiting to 10 req/min with 2 burst.

---

## Module Reference

### Clients (`modules/clients/`)
- **Purpose:** Tenant provisioning. Each Client is a tenant.
- **Entity:** `Client` extends `SystemBaseEntity` (NOT ClientScopedEntity — it IS the tenant root). Fields: `name`, `slug`, `clientId`, `clientSecretHash` (Argon2id), `isActive`, `webhookUrl`, `webhookSecret`.
- **Controller:** `POST /clients` (temporarily `@Public()` for bootstrapping), `GET /clients/:id`, `PATCH /clients/:id`, `DELETE /clients/:id`.
- **Key behavior:** On create, generates UUID `clientId` + 64-char secret. Returns raw secret **once**. Hash is Argon2id (64MB memory, 3 iterations).

### Topics (`modules/topics/`)
- **Purpose:** Root organizational unit for questions and assessments.
- **Entity:** `Topic` (ClientScopedEntity): `name`, `slug`, `description`.
- **Controller:** Full CRUD.
- **Key behavior:** Questions, banks, and assessments must link to a topic.

### Questions (`modules/questions/`)
- **Purpose:** 9 distinct question types with dynamic JSONB storage.
- **Entity:** `Question` (ClientScopedEntity): `topic`, `type` (enum), `text`, `options` (JSONB), `correctAnswer` (JSONB), `explanation`, `points`, `difficulty`, `tags`.
- **Controllers:** `QuestionsController` (CRUD by id), `TopicQuestionsController` (scoped to topic).
- **Validation:** `QuestionSchemaValidationPipe` validates options and correctAnswer shape per type, cross-validates option IDs exist.
- **9 Types:** SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, ORDERING, FILL_IN_THE_BLANK, MATCHING, RATING, SHORT_ANSWER, ESSAY.
- **DTOs:** Type-specific DTOs in `dto/types/` — each question type has its own options and correctAnswer shape.
- **Config:** `constants/question-types.config.ts` maps each type to its grading strategy, default max score, and AI support flag.

### Question Banks (`modules/question-banks/`)
- **Purpose:** Reusable question collections with visibility control.
- **Entities:** `QuestionBank` (ClientScopedEntity): `name`, `visibility` (PUBLIC/PRIVATE), `tags`. `QuestionBankQuestion` (join table): `question`, `order`.
- **Controllers:** `QuestionBanksController` (CRUD by id, add/remove questions), `TopicBanksController` (scoped to topic).

### Assessments (`modules/assessments/`)
- **Purpose:** Assessment configuration and lifecycle management. The largest module.
- **Entities:**
  - `Assessment` (ClientScopedEntity): `topic`, `type` (QUIZ/EXAM/PRACTICE/SURVEY), `status` (DRAFT/PUBLISHED/ARCHIVED), `deliveryMode` (SELF_PACED/REAL_TIME), `title`, `description`.
  - `AssessmentSettings` (1:1): `mode`, `questionSelection` (MANUAL/DYNAMIC), `timeLimit`, `passMark`, `gradeLabels`, `participantIdentity` (ANONYMOUS/AUTHENTICATED/EXTERNAL), `shuffleQuestions`, `showResults`, `manualGradingAIQues`.
  - `AssessmentQuestion` (M:N join): `question` FK, `questionSnapshot` (JSONB — frozen at publish), `points`, `order`, `questionType` (denormalized for indexing).
  - `AssessmentParticipant` (M:N join): `participant` FK, `status` (PENDING/IN_PROGRESS/COMPLETED/ABSENT).
  - `AnswerSheet`: `participant` FK, `status`, `totalScore`, `grade`, `isPassed`, `startedAt`, `submittedAt`.
  - `AnswerEntry`: `answerSheet` FK, `assessmentQuestion` FK, `response` (JSONB), `scoreAwarded`, `gradingStatus`.
- **Lifecycle:** DRAFT (editable) → PUBLISHED (frozen snapshots) → ARCHIVED (no new sessions, history preserved).
- **Publishing:** On publish, creates `questionSnapshot` JSONB on each `AssessmentQuestion` capturing the full question state at that moment.

### Participants (`modules/participants/`)
- **Purpose:** Simple participant CRUD.
- **Entity:** `Participant` (ClientScopedEntity): `name`, `email`, `phone`.

### Runtime (`modules/runtime/`)
- **Purpose:** Self-paced assessment execution via REST API.
- **Controller:** `POST /runtime/sessions/start`, `POST /runtime/sessions/:id/answers`, `POST /runtime/sessions/:id/submit`, `GET /runtime/sessions/:id/result`.
- **Flow:** Start → save answers incrementally → submit → grade → result.
- **Session expiry:** If `timeLimit` is set, schedules two Bull delayed jobs: `warning` (5 min before) and `expire` (auto-submit at deadline).
- **Answer storage:** `AnswerEntry.response` is JSONB — the structure varies by question type.

### Realtime (`modules/realtime/`)
- **Purpose:** Instructor-led live sessions (Kahoot-style) via Socket.IO.
- **Gateway:** `RealtimeGateway` (`/realtime` namespace) — validates WebSocket connections, handles JOIN_ROOM, START_Q, SUBMIT_ANS, REVEAL_ANSWERS events.
- **Services:**
  - `RealtimeSessionService` — session state machine, question advancement, answer grading, leaderboard.
  - `RealtimeRedisService` — Redis data layer for session state, member tracking, answers, scores.
- **Key behaviors:**
  - First-answer-wins for each question.
  - Time-bonus scoring (up to 500 extra points for fast responses).
  - Reconnection: rejoining participants get current question re-emitted.
  - Session end: atomic flush to DB (AnswerSheets + AnswerEntries with time-bonus scores preserved).
- **Events:** See `constants/realtime.events.ts` and frontend `docs/realtime-websocket-events.md`.

### Grading (`modules/grading/`)
- **Purpose:** Auto-grading engine using the Strategy pattern.
- **Service:** `GradingEngineService` — `gradeSession()` processes all entries, `recalculateSession()` for manual overrides.
- **Strategies** (one per auto-gradable type):
  - `SingleChoiceStrategy` — exact optionId match (binary score).
  - `MultipleChoiceStrategy` — exact set match, order-independent.
  - `TrueFalseStrategy` — exact boolean match.
  - `OrderingStrategy` — exact index-by-index array match.
  - `FillInTheBlankStrategy` — case-insensitive trimmed match, **partial credit**: `(correctCount/totalBlanks) × points`.
  - `MatchingStrategy` — pair-by-pair check, **partial credit**: `(correctPairs/totalPairs) × points`.
  - `RatingStrategy` — full points if any value chosen (survey type).
- **Return type:** `GradeResult { scoreAwarded, gradingStatus, feedback? }`.
- **SHORT_ANSWER and ESSAY are NOT handled here** — they go to AI grading.

### AI (`modules/ai/`)
- **Purpose:** Asynchronous AI grading for subjective questions.
- **Services:**
  - `AIGradingService` — enqueues grading jobs on the `ai-grading` Bull queue.
  - `AIPromptService` — builds structured evaluation prompts (Khmer-language aware).
  - `GeminiService` — Google Gemini API via fetch (model: `gemini-2.5-flash`).
  - `DeepseekService` — DeepSeek API via OpenAI SDK.
- **Flow:** Session submit → `AIGradingService.enqueueGrading()` → Bull queue → `AIGradingProcessor.process()` → AI provider → parse JSON → update AnswerEntry + AIGradingJob.
- **Manual override:** If `manualGradingAIQues: true` on the assessment, AI is bypassed and entries go to `PENDING` status for human review.
- **Recalculation:** `POST /assessments/:sessionId/recalculate` re-aggregates scores after manual grade updates.

### Reports (`modules/reports/`)
- **Purpose:** Read-only aggregated analytics with type-aware routing.
- **Facade pattern:** `ReportController` → `ReportService` (facade) → `SessionReportService` | `AssessmentReportService` | `ParticipantReportService`.
- **Repository:** `ReportRepository` uses raw SQL via `DataSource` for optimized aggregations.
- **Report types:**
  - **Session:** Deep dive into one attempt (per-question detail, AI notes, overrides).
  - **Assessment:** Aggregate across all participants — scored (pass rate, distributions, breakdown) or survey (ratings, text responses).
  - **Participant:** Cross-assessment transcript.
- **Performance:** Promoted `questionType` column on `AssessmentQuestion` enables B-Tree indexes instead of JSONB parsing.

### Webhooks (`modules/webhooks/`)
- **Purpose:** Async webhook dispatch via Bull queue.
- **Service:** `WebhookService` enqueues jobs.
- **Processor:** `WebhookProcessor` POSTs JSON payloads with HMAC-SHA256 signature headers.
- **Events:** Dispatches `assessment.completed` and `assessment.graded`.

---

## Database Conventions

### Entity Base Classes
```typescript
// For tenant-owned data (most entities)
@Entity()
export class MyEntity extends ClientScopedEntity {
  // Inherits: id (UUID PK), createdAt, updatedAt, deletedAt (soft delete), clientId (UUID, @Exclude()d)
}

// For system-level data (only Client currently)
@Entity()
export class Client extends SystemBaseEntity {
  // Inherits: id (UUID PK), createdAt, updatedAt, deletedAt (soft delete)
}
```

### Repository Pattern
```typescript
@Injectable()
export class MyRepository extends ClientRepository<MyEntity> {
  constructor(
    @InjectRepository(MyEntity)
    private readonly repository: Repository<MyEntity>,
    clientContextService: ClientContextService,
  ) {
    super(repository, clientContextService);
  }

  // Custom methods — all auto-scoped to clientId via this.find(), this.findOne(), etc.
  async findByStatus(status: string): Promise<MyEntity[]> {
    return this.find({ where: { status } });
  }
}
```

### Migrations
```bash
cd assessment-service-backend
pnpm migration:generate   # Auto-generate from entity changes
pnpm migration:run        # Apply pending migrations
pnpm migration:revert     # Roll back last migration
```
Migration files go in `src/database/migrations/` with timestamp-prefixed names.

---

## Rate Limiting

8 named throttlers, all Redis-backed, configurable via env vars:

| Throttler | Limit (default) | Burst | Scope |
|-----------|----------------|-------|-------|
| `auth` | 10/min | 2 | Token endpoint (per clientId) |
| `read` | 500/min | 50 | GET requests |
| `write` | 200/min | 20 | POST/PATCH requests |
| `admin` | 100/min | 10 | DELETE requests |
| `websocket` | 30/min | 5 | WebSocket connections |

The `AuthThrottlerGuard` is separate from the global guard — it specifically protects `POST /auth/token` tracking by `clientId` from the request body.

---

## Testing

### Unit Tests
```bash
cd assessment-service-backend
pnpm test              # All unit tests
pnpm test:watch        # Watch mode
pnpm test:cov          # With coverage
```
- Config: `jest` section in `package.json`
- Root dir: `src/`
- Test file pattern: `*.spec.ts` (co-located with source)
- Path aliases: `@common/` → `src/common/`, `@modules/` → `src/modules/`

### E2E Tests
```bash
pnpm test:e2e          # Using test/jest-e2e.json config
```
- Located in `test/*.e2e-spec.ts`
- Covers: auth, clients, topics, questions, question-banks, assessments, participants, runtime, realtime

### Writing Tests
- Use NestJS `Test.createTestingModule()` with mocked providers
- Mock Redis with `jest.mock('ioredis')`
- Mock Bull queues by mocking the `Queue` injection token
- For repository tests, mock the underlying TypeORM `Repository`

---

## Common Pitfalls

1. **Forgetting `@Public()` on new auth routes** — every controller/route is protected by `ClientAuthGuard` by default. Add `@Public()` to the token endpoint and any onboarding route.
2. **Bypassing client scope in raw queries** — when using `DataSource.query()` or `EntityManager.query()`, always add `WHERE "clientId" = $1`.
3. **Not using migrations** — `synchronize: false` means entity changes won't auto-propagate. Always generate and run migrations.
4. **Ignoring soft deletes** — entities with `@DeleteDateColumn()` are soft-deleted. Use `withDeleted: true` in find options if you need to include them.
5. **Missing question snapshots** — when creating assessment questions programmatically, always populate `questionSnapshot` with the full question state.
6. **AI grading not queuing** — ensure Redis is running and the `ai-grading` Bull queue is registered. Check that `AI_PROVIDER` and API keys are set.
7. **WebSocket auth** — realtime connections must pass client context either in handshake `auth` object, `headers`, or `query` params.
8. **CORS** — the backend CORS is configured in `main.ts` for the frontend origin. Update if deploying to different domains.
9. **TSConfig paths** — `@common/*` and `@modules/*` are configured in `tsconfig.json`. Jest has the same aliases in `moduleNameMapper`.

---

## Scripts Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm start:dev` | Dev server with hot reload (NODE_ENV=development) |
| `pnpm start:debug` | Dev server with debugger |
| `pnpm build` | Production build |
| `pnpm start:prod` | Run production build |
| `pnpm lint` | ESLint with auto-fix |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests |
| `pnpm test:cov` | Tests with coverage |
| `pnpm migration:generate` | Generate migration from entity changes |
| `pnpm migration:run` | Apply pending migrations |
| `pnpm migration:revert` | Roll back last migration |

---

## Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose -f docker-compose.dev.yml up -d

# Both services exposed on default ports:
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

---

## References

- **system.md** (in this directory) — comprehensive architecture docs with Mermaid diagrams
- **Frontend API docs:** `../assessment-service/docs/endpoints.md`
- **ERD:** `../assessment-service/docs/ERD.md`
- **Real-time events:** `../assessment-service/docs/realtime-websocket-events.md`
- **Postman collection:** `postman/assessment-service.postman_collection.json`
