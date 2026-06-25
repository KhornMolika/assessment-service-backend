# NBFSA Assessment Service — Integration Guide

## Quick Start (5 minutes)

### 1. Get your credentials
Contact the NBFSA ops team to provision your client.
You will receive:
- `clientId` — your permanent identifier
- `clientSecret` — shown once, store securely

### 2. Authenticate

```bash
curl -X POST https://api.nbfsa.gov.kh/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "grant_type": "client_credentials"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

> [!WARNING]
> **Cache this token for its full lifetime (1 hour).**
> Do not request a new token on every API call.

### 3. Make your first request

```bash
curl https://api.nbfsa.gov.kh/api/v1/topics \
  -H "Authorization: Bearer eyJ..."
```

---

## Token Management (Important)

Your token expires after 1 hour. Implement a token manager in your backend system:

```typescript
class NbfsaTokenManager {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    const data = await this.fetchToken();
    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in - 300) * 1000; // 5 minute buffer
    return this.token;
  }
}
```

> [!TIP]
> If you run multiple server instances, store the token in a centralized cache (like Redis) — not in-memory — so all instances share one token.

---

## Common Integration Scenarios

### Start a Participant Session (Self-Paced)

To start an assessment session for a user, call the runtime endpoint:

```bash
curl -X POST https://api.nbfsa.gov.kh/api/v1/runtime/sessions/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentId": "<assessment-uuid>",
    "participantId": "<participant-uuid-optional>"
  }'
```
This returns the session configuration and the first set of questions (with correct answers safely stripped).

### Submit Answers

As the participant progresses, submit their answers incrementally:

```bash
curl -X POST https://api.nbfsa.gov.kh/api/v1/runtime/sessions/<session-uuid>/answers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentQuestionId": "<question-uuid>",
    "response": { "optionId": "opt_123" }
  }'
```

### Get Results

When the session is submitted, you can immediately fetch the full session report:

```bash
curl https://api.nbfsa.gov.kh/api/v1/assessments/<assessment-uuid>/sessions/<session-uuid>/report \
  -H "Authorization: Bearer <token>"
```

---

## Rate Limits

| Endpoint type  | Limit              |
|----------------|--------------------|
| POST /auth/token | 10 req/min       |
| GET  (reads)   | 500 req/min        |
| POST (writes)  | 200 req/min        |

> [!IMPORTANT]
> If you exceed the limits, you will receive a `429 Too Many Requests` status. Read the `Retry-After` header and pause your requests for that many seconds.

---

## Error Handling

All API errors follow a standardized JSON structure:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Assessment abc-123 not found",
  "path": "/api/v1/assessments/abc-123",
  "timestamp": "2026-01-15T09:23:01.123Z"
}
```

---

## Webhook Events

You can configure a `webhookUrl` to receive real-time updates when important lifecycle events occur. We strongly recommend configuring a `webhookSecret` to cryptographically verify incoming payloads.

**Supported Events:**
- `assessment.completed`: Fires when a participant finishes a session.
- `assessment.graded`: Fires when all questions (including AI-graded ones) are fully evaluated.

Webhook payloads are sent as `POST` requests and include an `x-webhook-signature` header containing the HMAC-SHA256 signature of the payload.
