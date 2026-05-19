# Client Management API

**Base URL:** `/api/v1`  
**Version:** 1.0

---

## Table of Contents

- [Conventions](#conventions)
- [Headers](#headers)
- [Response Envelopes](#response-envelopes)
- [Error Codes](#error-codes)
- [Auth](#auth)
- [Topics](#topics)
- [Questions](#questions)
- [Question Banks](#question-banks)
- [Assessments](#assessments)
- [Assessment Settings](#assessment-settings)
- [Assessment Participants](#assessment-participants)
- [Runtime API](#runtime-api)
- [Internal APIs](#internal-apis)

---

## Conventions

- All request and response bodies are `application/json`
- All IDs are UUIDs
- All timestamps are ISO 8601 UTC — `2024-01-15T10:30:00.000Z`
- Soft-deleted resources are excluded from all list and detail responses
- `PATCH` accepts partial payloads — only send fields you want to update
- `PUT` replaces the entire resource or collection

---

## Headers

### Request Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes | `Bearer <jwt_token>` |
| `X-Client-Id` | Yes | Client UUID — must match JWT claim in production |
| `Content-Type` | Yes (POST/PATCH/PUT) | `application/json` |
| `Accept` | Recommended | `application/json` |
| `X-Request-Id` | Recommended | UUID for request tracing |

> **Production note:** `X-Client-Id` must be read from the verified JWT claim (`req.user.clientId`), not the raw header. The raw header is for development only.

### Response Headers

| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `X-Request-Id` | Echoed back from request for tracing |
| `X-Response-Time` | Response time in ms (e.g. `42ms`) |

---

## Response Envelopes

### Single Resource

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Introduction to NestJS",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Collection with Pagination

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Introduction to NestJS"
    }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 10,
    "pageCount": 9
  }
}
```

### Error

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Topic not found",
    "statusCode": 404,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/v1/topics/bad-id"
  }
}
```

### Validation Error (422)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 422,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/v1/topics",
    "details": [
      { "field": "title", "message": "title must be a string" },
      { "field": "visibility", "message": "visibility must be one of: public, private" }
    ]
  }
}
```

---

## Error Codes

| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request or invalid UUID param |
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 401 | `MISSING_CLIENT_CONTEXT` | No clientId in JWT |
| 403 | `FORBIDDEN` | Valid auth but insufficient role |
| 404 | `RESOURCE_NOT_FOUND` | Record does not exist for this client |
| 409 | `CONFLICT` | Duplicate unique field |
| 422 | `VALIDATION_ERROR` | DTO validation failed |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

---

## Auth

### POST /auth/token

Login — returns access and refresh tokens.

**Request**
```
POST /api/v1/auth/token
Content-Type: application/json
```
```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

**Response 200**
```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token>",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/refresh

Exchange a refresh token for a new access token.

**Request**
```json
{
  "refreshToken": "<token>"
}
```

**Response 200**
```json
{
  "data": {
    "accessToken": "<jwt>",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/revoke

Revoke refresh token (logout).

**Request**
```json
{
  "refreshToken": "<token>"
}
```

**Response 200**
```json
{
  "data": {
    "revoked": true
  }
}
```

---

## Topics

### GET /topics

List all topics for this client (paginated).

**Request**
```
GET /api/v1/topics?page=1&limit=10&search=nestjs&sortBy=createdAt&order=desc
Authorization: Bearer <token>
X-Client-Id: <uuid>
```

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `search` | string | — | Search by title |
| `sortBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | `asc` or `desc` |
| `visibility` | string | — | Filter by `public` or `private` |

**Response 200**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Introduction to NestJS",
      "visibility": "public",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 10,
    "pageCount": 9
  }
}
```

---

### POST /topics

Create a topic.

**Request**
```json
{
  "title": "Introduction to NestJS",
  "visibility": "public"
}
```

**Response 201**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Introduction to NestJS",
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /topics/:topicId

Topic detail. Includes nested question banks, assessments, and summary counts. Questions are never embedded — use the questions endpoint.

**Response 200**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Introduction to NestJS",
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "questionBanks": [
      {
        "id": "aaa00001-0000-0000-0000-000000000001",
        "name": "NestJS Core Concepts Bank",
        "questionCount": 42,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "assessments": [
      {
        "id": "bbb00001-0000-0000-0000-000000000001",
        "title": "NestJS Fundamentals Quiz",
        "type": "quiz",
        "status": "draft",
        "questionCount": 10,
        "duration": 30,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalQuestions": 284,
      "totalQuestionBanks": 1,
      "totalAssessments": 1
    }
  }
}
```

---

### PATCH /topics/:topicId

Update a topic.

**Request**
```json
{
  "title": "Updated Title"
}
```

**Response 200**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Title",
    "visibility": "public",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /topics/:topicId

Soft delete a topic.

**Response 200**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deletedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

## Questions

### GET /topics/:topicId/questions

List questions under a topic (paginated).

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page |
| `search` | string | — | Search by question text |
| `sortBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | `asc` or `desc` |
| `difficulty` | string | — | Filter by `easy`, `medium`, `hard` |
| `type` | string | — | Filter by question type |

**Response 200**
```json
{
  "data": [
    {
      "id": "661f9511-f30c-52e5-b827-557766551111",
      "text": "What is a NestJS module?",
      "type": "multiple_choice",
      "difficulty": "easy",
      "order": 1,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 284,
    "page": 1,
    "limit": 20,
    "pageCount": 15,
    "topicId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### POST /topics/:topicId/questions

Create a new question under a topic.

**Request**
```json
{
  "text": "What is a NestJS module?",
  "type": "multiple_choice",
  "difficulty": "easy",
  "options": [
    { "label": "A", "text": "A container for providers", "isCorrect": true },
    { "label": "B", "text": "A HTTP handler", "isCorrect": false }
  ]
}
```

**Response 201**
```json
{
  "data": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "text": "What is a NestJS module?",
    "type": "multiple_choice",
    "difficulty": "easy",
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "options": [
      { "label": "A", "text": "A container for providers", "isCorrect": true },
      { "label": "B", "text": "A HTTP handler", "isCorrect": false }
    ],
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### GET /questions/:questionId

Single question detail.

**Response 200**
```json
{
  "data": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "text": "What is a NestJS module?",
    "type": "multiple_choice",
    "difficulty": "easy",
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "options": [
      { "label": "A", "text": "A container for providers", "isCorrect": true },
      { "label": "B", "text": "A HTTP handler", "isCorrect": false }
    ],
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### PATCH /questions/:questionId

Update a question.

**Request**
```json
{
  "difficulty": "medium"
}
```

**Response 200**
```json
{
  "data": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "text": "What is a NestJS module?",
    "type": "multiple_choice",
    "difficulty": "medium",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /questions/:questionId

Soft delete a question.

**Response 200**
```json
{
  "data": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "deletedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### POST /topics/:topicId/questions/import

Bulk import questions from CSV or JSON.

**Request**
```json
{
  "format": "json",
  "questions": [
    {
      "text": "What is dependency injection?",
      "type": "multiple_choice",
      "difficulty": "medium",
      "options": [
        { "label": "A", "text": "A design pattern", "isCorrect": true }
      ]
    }
  ]
}
```

**Response 201**
```json
{
  "data": {
    "imported": 24,
    "failed": 1,
    "errors": [
      { "index": 3, "message": "Missing required field: text" }
    ]
  }
}
```

---



## Question Banks

### GET /topics/:topicId/banks

List question banks under a topic.

**Response 200**
```json
{
  "data": [
    {
      "id": "aaa00001-0000-0000-0000-000000000001",
      "name": "NestJS Core Concepts Bank",
      "questionCount": 42,
      "topicId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "pageCount": 1
  }
}
```

---

### POST /topics/:topicId/banks

Create a question bank under a topic.

**Request**
```json
{
  "name": "NestJS Core Concepts Bank"
}
```

**Response 201**
```json
{
  "data": {
    "id": "aaa00001-0000-0000-0000-000000000001",
    "name": "NestJS Core Concepts Bank",
    "questionCount": 0,
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /banks/:bankId

Bank detail.

**Response 200**
```json
{
  "data": {
    "id": "aaa00001-0000-0000-0000-000000000001",
    "name": "NestJS Core Concepts Bank",
    "questionCount": 42,
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PATCH /banks/:bankId

Update a bank.

**Request**
```json
{
  "name": "Updated Bank Name"
}
```

**Response 200**
```json
{
  "data": {
    "id": "aaa00001-0000-0000-0000-000000000001",
    "name": "Updated Bank Name",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /banks/:bankId

Soft delete a bank.

**Response 200**
```json
{
  "data": {
    "id": "aaa00001-0000-0000-0000-000000000001",
    "deletedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### GET /banks/:bankId/questions

List questions in a bank (paginated).

**Response 200**
```json
{
  "data": [
    {
      "id": "661f9511-f30c-52e5-b827-557766551111",
      "text": "What is a NestJS module?",
      "type": "multiple_choice",
      "difficulty": "easy",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pageCount": 3,
    "bankId": "aaa00001-0000-0000-0000-000000000001"
  }
}
```

---

### POST /banks/:bankId/questions

Add an existing question to a bank. Does not create a new question.

**Request**
```json
{
  "questionId": "661f9511-f30c-52e5-b827-557766551111"
}
```

**Response 201**
```json
{
  "data": {
    "bankId": "aaa00001-0000-0000-0000-000000000001",
    "questionId": "661f9511-f30c-52e5-b827-557766551111",
    "addedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /banks/:bankId/questions/:questionId

Remove a question from a bank. The question is not deleted — only unlinked.

**Response 200**
```json
{
  "data": {
    "bankId": "aaa00001-0000-0000-0000-000000000001",
    "questionId": "661f9511-f30c-52e5-b827-557766551111",
    "removedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

## Assessments

### Assessment Lifecycle

```
draft → published → archived
```

- `PATCH /assessments/:assessmentId` is only allowed in `draft` state
- Once published, only `archive` is permitted
- To modify a published assessment, create a new version

---

### GET /topics/:topicId/assessments

List assessments under a topic.

**Response 200**
```json
{
  "data": [
    {
      "id": "bbb00001-0000-0000-0000-000000000001",
      "title": "NestJS Fundamentals Quiz",
      "type": "quiz",
      "status": "draft",
      "questionCount": 10,
      "duration": 30,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pageCount": 1
  }
}
```

---

### POST /topics/:topicId/assessments

Create an assessment under a topic. Created in `draft` status.

**Request**
```json
{
  "title": "NestJS Fundamentals Quiz",
  "type": "quiz"
}
```

**Response 201**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "title": "NestJS Fundamentals Quiz",
    "type": "quiz",
    "status": "draft",
    "questionCount": 0,
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /assessments/:assessmentId

Assessment detail.

**Response 200**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "title": "NestJS Fundamentals Quiz",
    "type": "quiz",
    "status": "draft",
    "questionCount": 10,
    "topicId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PATCH /assessments/:assessmentId

Update an assessment. Only allowed in `draft` status.

**Request**
```json
{
  "title": "Updated Quiz Title"
}
```

**Response 200**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "title": "Updated Quiz Title",
    "status": "draft",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

**Response 409 — if not in draft**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Assessment can only be edited in draft status",
    "statusCode": 409
  }
}
```

---

### DELETE /assessments/:assessmentId

Soft delete an assessment.

**Response 200**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "deletedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### POST /assessments/:assessmentId/publish

Publish an assessment — makes it available to participants.

**Response 200**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "status": "published",
    "publishedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### POST /assessments/:assessmentId/archive

Archive a published assessment.

**Response 200**
```json
{
  "data": {
    "id": "bbb00001-0000-0000-0000-000000000001",
    "status": "archived",
    "archivedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### GET /assessments/:assessmentId/questions

List questions in an assessment (ordered).

**Response 200**
```json
{
  "data": [
    {
      "id": "ccc00001-0000-0000-0000-000000000001",
      "questionId": "661f9511-f30c-52e5-b827-557766551111",
      "order": 1,
      "question": {
        "id": "661f9511-f30c-52e5-b827-557766551111",
        "text": "What is a NestJS module?",
        "type": "multiple_choice",
        "difficulty": "easy"
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pageCount": 1,
    "assessmentId": "bbb00001-0000-0000-0000-000000000001"
  }
}
```

---

### POST /assessments/:assessmentId/questions

Manually add an existing question to an assessment.

**Request**
```json
{
  "questionId": "661f9511-f30c-52e5-b827-557766551111"
}
```

**Response 201**
```json
{
  "data": {
    "id": "ccc00001-0000-0000-0000-000000000001",
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "questionId": "661f9511-f30c-52e5-b827-557766551111",
    "order": 11,
    "addedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### PUT /assessments/:assessmentId/questions

Replace all questions in an assessment.

**Request**
```json
{
  "questionIds": [
    "661f9511-f30c-52e5-b827-557766551111",
    "772g0622-g41d-63f6-c938-668877662222"
  ]
}
```

**Response 200**
```json
{
  "data": {
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "questionCount": 2,
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /assessments/:assessmentId/questions/:assessmentQuestionId

Remove a question from an assessment. The question is not deleted — only unlinked.

**Response 200**
```json
{
  "data": {
    "assessmentQuestionId": "ccc00001-0000-0000-0000-000000000001",
    "removedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### POST /assessments/:assessmentId/questions/generate

Randomly generate questions from a bank and add them to an assessment.

**Request**
```json
{
  "bankId": "aaa00001-0000-0000-0000-000000000001",
  "count": 10,
  "difficulty": "medium"
}
```

**Response 201**
```json
{
  "data": {
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "generated": 10,
    "totalQuestions": 20
  }
}
```

---

## Assessment Settings

### GET /assessments/:assessmentId/settings

**Response 200**
```json
{
  "data": {
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "duration": 30,
    "maxAttempts": 1,
    "shuffleQuestions": true,
    "shuffleOptions": false,
    "showResultsAfterSubmit": true,
    "passingScore": 70,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PATCH /assessments/:assessmentId/settings

**Request**
```json
{
  "duration": 60,
  "shuffleQuestions": false,
  "passingScore": 80
}
```

**Response 200**
```json
{
  "data": {
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "duration": 60,
    "maxAttempts": 1,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResultsAfterSubmit": true,
    "passingScore": 80,
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

## Assessment Participants

Participants only exist in the context of an assessment.

### GET /assessments/:assessmentId/participants

List participants assigned to an assessment.

**Response 200**
```json
{
  "data": [
    {
      "id": "ddd00001-0000-0000-0000-000000000001",
      "assessmentId": "bbb00001-0000-0000-0000-000000000001",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "status": "pending",
      "assignedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 30,
    "page": 1,
    "limit": 10,
    "pageCount": 3,
    "assessmentId": "bbb00001-0000-0000-0000-000000000001"
  }
}
```

---

### POST /assessments/:assessmentId/participants

Add a participant to an assessment.

**Request**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response 201**
```json
{
  "data": {
    "id": "ddd00001-0000-0000-0000-000000000001",
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "status": "pending",
    "assignedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /assessments/:assessmentId/participants/:participantId

Single participant detail within an assessment.

**Response 200**
```json
{
  "data": {
    "id": "ddd00001-0000-0000-0000-000000000001",
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "status": "completed",
    "assignedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-16T09:00:00.000Z"
  }
}
```

---

### PATCH /assessments/:assessmentId/participants/:participantId

Update a participant.

**Request**
```json
{
  "name": "Jane Smith",
  "email": "janesmith@example.com"
}
```

**Response 200**
```json
{
  "data": {
    "id": "ddd00001-0000-0000-0000-000000000001",
    "name": "Jane Smith",
    "email": "janesmith@example.com",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### DELETE /assessments/:assessmentId/participants/:participantId

Remove a participant from an assessment.

**Response 200**
```json
{
  "data": {
    "id": "ddd00001-0000-0000-0000-000000000001",
    "removedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

---

## Runtime API

> Documented separately. Uses a different auth scope — participants authenticate with a session token, not the client JWT.

---

### POST /assessment-sessions/start

Start an assessment session for a participant.

**Request**
```json
{
  "assessmentId": "bbb00001-0000-0000-0000-000000000001",
  "participantId": "ddd00001-0000-0000-0000-000000000001"
}
```

**Response 201**
```json
{
  "data": {
    "sessionId": "eee00001-0000-0000-0000-000000000001",
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "participantId": "ddd00001-0000-0000-0000-000000000001",
    "startedAt": "2024-01-16T09:00:00.000Z",
    "expiresAt": "2024-01-16T09:30:00.000Z",
    "questions": [
      {
        "id": "661f9511-f30c-52e5-b827-557766551111",
        "text": "What is a NestJS module?",
        "type": "multiple_choice",
        "options": [
          { "label": "A", "text": "A container for providers" },
          { "label": "B", "text": "A HTTP handler" }
        ]
      }
    ]
  }
}
```

> `isCorrect` is never returned in runtime responses.

---

### POST /assessment-sessions/:sessionId/submit

Submit a completed session.

**Request**
```json
{
  "submittedAt": "2024-01-16T09:25:00.000Z"
}
```

**Response 200**
```json
{
  "data": {
    "sessionId": "eee00001-0000-0000-0000-000000000001",
    "status": "submitted",
    "submittedAt": "2024-01-16T09:25:00.000Z"
  }
}
```

---

### POST /assessment-sessions/:sessionId/answers

Save an answer during a session.

**Request**
```json
{
  "questionId": "661f9511-f30c-52e5-b827-557766551111",
  "answer": "A"
}
```

**Response 201**
```json
{
  "data": {
    "id": "fff00001-0000-0000-0000-000000000001",
    "sessionId": "eee00001-0000-0000-0000-000000000001",
    "questionId": "661f9511-f30c-52e5-b827-557766551111",
    "answer": "A",
    "savedAt": "2024-01-16T09:10:00.000Z"
  }
}
```

---

### PATCH /assessment-sessions/:sessionId/answers/:entryId

Update a saved answer before submission.

**Request**
```json
{
  "answer": "B"
}
```

**Response 200**
```json
{
  "data": {
    "id": "fff00001-0000-0000-0000-000000000001",
    "answer": "B",
    "updatedAt": "2024-01-16T09:15:00.000Z"
  }
}
```

---

### GET /assessment-sessions/:sessionId/result

Get result after submission. Only available once session status is `submitted`.

**Response 200**
```json
{
  "data": {
    "sessionId": "eee00001-0000-0000-0000-000000000001",
    "participantId": "ddd00001-0000-0000-0000-000000000001",
    "assessmentId": "bbb00001-0000-0000-0000-000000000001",
    "score": 80,
    "passed": true,
    "totalQuestions": 10,
    "correctAnswers": 8,
    "duration": 25,
    "submittedAt": "2024-01-16T09:25:00.000Z"
  }
}
```

---

## Internal APIs

> Not publicly exposed. Service-to-service only. Requires internal service auth header.

```
POST /internal/ai-grading-jobs/:jobId/retry       # Retry a failed AI grading job
POST /internal/assessments/:id/recalculate        # Recalculate scores after grading change
POST /internal/webhooks/deliver                   # Trigger webhook delivery
```
