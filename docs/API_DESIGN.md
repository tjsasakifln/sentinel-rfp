# API Design Guide - Sentinel RFP

## Overview

This document defines the API design standards, conventions, and specifications for Sentinel RFP. All APIs follow REST principles with selective GraphQL for complex queries.

## API Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                       API GATEWAY                            │    │
│  │  • Authentication                                           │    │
│  │  • Rate limiting                                            │    │
│  │  • Request validation                                       │    │
│  │  • CORS handling                                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│  ┌───────────────────────┐      ┌───────────────────────┐          │
│  │     REST API          │      │    GraphQL API        │          │
│  │                       │      │    (Optional)         │          │
│  │  • CRUD operations    │      │                       │          │
│  │  • Webhooks           │      │  • Complex queries    │          │
│  │  • Integrations       │      │  • Aggregations       │          │
│  │  • Simple queries     │      │  • Subscriptions      │          │
│  └───────────────────────┘      └───────────────────────┘          │
│                                                                      │
│  When to use REST:                When to use GraphQL:              │
│  • Standard CRUD                  • Dashboard data                  │
│  • Webhooks                       • Multi-resource queries          │
│  • File uploads                   • Real-time subscriptions         │
│  • External integrations          • Flexible frontend needs         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## REST API Conventions

### Base URL

```
Production: https://api.sentinel-rfp.com/v1
Staging:    https://api.staging.sentinel-rfp.com/v1
```

### URL Structure

```
/v1/{resource}                    # Collection
/v1/{resource}/{id}               # Item
/v1/{resource}/{id}/{sub-resource} # Nested resource
/v1/{resource}/{id}/actions/{action} # Actions (RPC-style)
```

### Resource Naming

| Pattern         | Example                          | Description               |
| --------------- | -------------------------------- | ------------------------- |
| Plural nouns    | `/proposals`                     | Collections               |
| Lowercase       | `/library-entries`               | Kebab-case for multi-word |
| No verbs in URL | `/proposals` not `/getProposals` | Actions via HTTP methods  |
| Hierarchical    | `/proposals/{id}/questions`      | Nested resources          |

### HTTP Methods

| Method | Usage            | Idempotent | Example                  |
| ------ | ---------------- | ---------- | ------------------------ |
| GET    | Read resource(s) | Yes        | `GET /proposals`         |
| POST   | Create resource  | No         | `POST /proposals`        |
| PUT    | Replace resource | Yes        | `PUT /proposals/{id}`    |
| PATCH  | Partial update   | Yes        | `PATCH /proposals/{id}`  |
| DELETE | Remove resource  | Yes        | `DELETE /proposals/{id}` |

### Status Codes

| Code | Meaning               | Usage                               |
| ---- | --------------------- | ----------------------------------- |
| 200  | OK                    | Successful GET, PUT, PATCH          |
| 201  | Created               | Successful POST                     |
| 204  | No Content            | Successful DELETE                   |
| 400  | Bad Request           | Validation error, malformed request |
| 401  | Unauthorized          | Missing/invalid authentication      |
| 403  | Forbidden             | Authenticated but not authorized    |
| 404  | Not Found             | Resource doesn't exist              |
| 409  | Conflict              | Concurrent modification, duplicate  |
| 422  | Unprocessable Entity  | Semantic validation error           |
| 429  | Too Many Requests     | Rate limit exceeded                 |
| 500  | Internal Server Error | Server-side error                   |
| 503  | Service Unavailable   | Maintenance, overload               |

## Request Format

### Headers

```http
# Required
Content-Type: application/json
Authorization: Bearer {access_token}

# Optional
X-Request-ID: uuid           # Client-generated request ID
X-Idempotency-Key: uuid      # For POST idempotency
Accept-Language: en-US       # Localization
```

### Query Parameters

```
# Pagination
?page=1&limit=20              # Page-based
?cursor=abc123&limit=20       # Cursor-based (preferred)

# Filtering
?status=draft,in_progress     # Multiple values
?created_after=2026-01-01     # Date filters
?client_name=Acme*            # Wildcard search

# Sorting
?sort=created_at:desc         # Single field
?sort=status:asc,created_at:desc  # Multiple fields

# Field selection
?fields=id,title,status       # Sparse fieldsets

# Includes (related resources)
?include=questions,created_by # Eager load relations
```

### Request Body

```json
{
  "title": "Proposal for Government Contract",
  "clientName": "Department of Defense",
  "dueDate": "2026-03-15T23:59:59Z",
  "value": 2500000,
  "metadata": {
    "source": "salesforce",
    "opportunityId": "0061234567"
  }
}
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "prop_abc123",
    "type": "proposal",
    "attributes": {
      "title": "Proposal for Government Contract",
      "clientName": "Department of Defense",
      "status": "draft",
      "dueDate": "2026-03-15T23:59:59Z",
      "value": 2500000,
      "progress": 0.35,
      "questionCount": 120,
      "answeredCount": 42,
      "createdAt": "2026-01-09T10:30:00Z",
      "updatedAt": "2026-01-09T14:45:00Z"
    },
    "relationships": {
      "createdBy": {
        "data": { "type": "user", "id": "usr_xyz789" }
      },
      "organization": {
        "data": { "type": "organization", "id": "org_def456" }
      }
    },
    "links": {
      "self": "/v1/proposals/prop_abc123",
      "questions": "/v1/proposals/prop_abc123/questions"
    }
  },
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2026-01-09T14:45:00Z"
  }
}
```

### Collection Response

```json
{
  "data": [
    { "id": "prop_abc123", "type": "proposal", "attributes": {...} },
    { "id": "prop_def456", "type": "proposal", "attributes": {...} }
  ],
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2026-01-09T14:45:00Z",
    "pagination": {
      "total": 156,
      "limit": 20,
      "offset": 0,
      "hasMore": true,
      "nextCursor": "eyJpZCI6InByb3BfZGVmNDU2In0="
    }
  },
  "links": {
    "self": "/v1/proposals?limit=20",
    "next": "/v1/proposals?cursor=eyJpZCI6InByb3BfZGVmNDU2In0=&limit=20",
    "prev": null
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "field": "dueDate",
        "code": "INVALID_DATE",
        "message": "Due date must be in the future"
      },
      {
        "field": "value",
        "code": "OUT_OF_RANGE",
        "message": "Value must be positive"
      }
    ],
    "requestId": "req_123456",
    "timestamp": "2026-01-09T14:45:00Z",
    "documentation": "https://docs.sentinel-rfp.com/errors/VALIDATION_ERROR"
  }
}
```

## API Endpoints

### Authentication

```yaml
POST /v1/auth/login
  Request:
    email: string
    password: string
  Response:
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: User

POST /v1/auth/refresh
  Request:
    refreshToken: string
  Response:
    accessToken: string
    refreshToken: string
    expiresIn: number

POST /v1/auth/logout
  Response: 204 No Content

POST /v1/auth/password/reset
  Request:
    email: string
  Response: 204 No Content

POST /v1/auth/password/change
  Request:
    currentPassword: string
    newPassword: string
  Response: 204 No Content

POST /v1/auth/mfa/setup
  Response:
    secret: string
    qrCode: string

POST /v1/auth/mfa/verify
  Request:
    code: string
  Response:
    verified: boolean
    backupCodes: string[]
```

### Proposals

```yaml
# List proposals
GET /v1/proposals
  Query:
    status?: draft | in_progress | review | submitted | won | lost
    client_name?: string
    due_before?: datetime
    due_after?: datetime
    created_by?: string
    sort?: string
    cursor?: string
    limit?: number (default: 20, max: 100)
  Response: Proposal[]

# Get proposal
GET /v1/proposals/{id}
  Query:
    include?: questions,sections,created_by
  Response: Proposal

# Create proposal
POST /v1/proposals
  Request:
    title: string (required)
    clientName: string (required)
    dueDate: datetime (required)
    value?: number
    sourceDocumentId?: string
    winThemes?: string[]
  Response: 201 Created, Proposal

# Update proposal
PATCH /v1/proposals/{id}
  Request:
    title?: string
    clientName?: string
    dueDate?: datetime
    status?: string
    winThemes?: string[]
  Response: Proposal

# Delete proposal
DELETE /v1/proposals/{id}
  Response: 204 No Content

# Clone proposal
POST /v1/proposals/{id}/actions/clone
  Request:
    title: string
    dueDate: datetime
  Response: 201 Created, Proposal

# Submit proposal
POST /v1/proposals/{id}/actions/submit
  Response: Proposal

# Export proposal
POST /v1/proposals/{id}/actions/export
  Request:
    format: docx | pdf | excel
    sections?: string[]
    includeComments?: boolean
  Response:
    exportId: string
    status: pending | processing | completed | failed

GET /v1/proposals/{id}/exports/{exportId}
  Response:
    status: string
    downloadUrl?: string
    expiresAt?: datetime
```

### Questions

```yaml
# List questions for proposal
GET /v1/proposals/{proposalId}/questions
  Query:
    section_id?: string
    status?: unanswered | draft | review | approved
    assigned_to?: string
    has_response?: boolean
  Response: Question[]

# Get question
GET /v1/proposals/{proposalId}/questions/{id}
  Query:
    include?: responses,citations,comments
  Response: Question

# Create question (manual)
POST /v1/proposals/{proposalId}/questions
  Request:
    sectionId: string (required)
    text: string (required)
    questionType?: single_response | multi_part | table
    requirements?: string[]
    wordLimit?: number
  Response: 201 Created, Question

# Update question
PATCH /v1/proposals/{proposalId}/questions/{id}
  Request:
    text?: string
    status?: string
    assignedTo?: string
  Response: Question

# Bulk update questions
PATCH /v1/proposals/{proposalId}/questions
  Request:
    ids: string[]
    updates:
      status?: string
      assignedTo?: string
  Response: Question[]

# Generate AI response
POST /v1/proposals/{proposalId}/questions/{id}/actions/generate
  Request:
    responseLength?: short | medium | long
    tone?: formal | conversational | technical
    winThemes?: string[]
    additionalContext?: string
  Response:
    jobId: string
    status: queued

# Get generation status
GET /v1/proposals/{proposalId}/questions/{id}/generations/{jobId}
  Response:
    status: queued | processing | completed | failed
    response?: Response
    error?: string
```

### Responses

```yaml
# Get current response
GET /v1/proposals/{proposalId}/questions/{questionId}/response
  Response: Response

# Get response history
GET /v1/proposals/{proposalId}/questions/{questionId}/responses
  Response: Response[]

# Create/Update response
PUT /v1/proposals/{proposalId}/questions/{questionId}/response
  Request:
    content: string (required)
    format?: plain | markdown | html
    citations?: Citation[]
  Response: Response

# Approve response
POST /v1/proposals/{proposalId}/questions/{questionId}/response/actions/approve
  Response: Response

# Request review
POST /v1/proposals/{proposalId}/questions/{questionId}/response/actions/request-review
  Request:
    reviewerId: string
    message?: string
  Response: Response
```

### Knowledge Library

```yaml
# List library entries
GET /v1/library
  Query:
    category?: string
    tags?: string[]
    search?: string
    source_type?: manual | document | proposal
  Response: LibraryEntry[]

# Get library entry
GET /v1/library/{id}
  Query:
    include?: chunks,documents
  Response: LibraryEntry

# Create library entry
POST /v1/library
  Request:
    title: string (required)
    content: string (required)
    category: string (required)
    tags?: string[]
    expiresAt?: datetime
    metadata?: object
  Response: 201 Created, LibraryEntry

# Update library entry
PATCH /v1/library/{id}
  Request:
    title?: string
    content?: string
    category?: string
    tags?: string[]
    expiresAt?: datetime
  Response: LibraryEntry

# Delete library entry
DELETE /v1/library/{id}
  Response: 204 No Content

# Search library
POST /v1/library/search
  Request:
    query: string (required)
    filters?:
      categories?: string[]
      tags?: string[]
      dateRange?: { from: datetime, to: datetime }
    topK?: number (default: 10, max: 50)
    includeChunks?: boolean
  Response:
    results: SearchResult[]
    meta:
      queryTime: number
      totalMatches: number

# Bulk import
POST /v1/library/import
  Request:
    documentId: string
    options?:
      splitStrategy: section | page | paragraph
      chunkSize?: number
      overlap?: number
  Response:
    jobId: string
    status: queued
```

### Documents

```yaml
# List documents
GET /v1/documents
  Query:
    status?: uploaded | processing | completed | failed
    type?: rfp | proposal | reference | contract
  Response: Document[]

# Get document
GET /v1/documents/{id}
  Response: Document

# Upload document
POST /v1/documents/upload
  Content-Type: multipart/form-data
  Request:
    file: File (required)
    type: rfp | proposal | reference | contract (required)
    metadata?: object
  Response: 201 Created
    uploadId: string
    status: processing

# Get processing status
GET /v1/documents/{id}/status
  Response:
    status: uploaded | parsing | chunking | embedding | indexing | completed | failed
    progress: number (0-100)
    error?: string

# Download document
GET /v1/documents/{id}/download
  Response: 302 Redirect to signed URL

# Delete document
DELETE /v1/documents/{id}
  Response: 204 No Content
```

### Analytics

```yaml
# Get dashboard stats
GET /v1/analytics/dashboard
  Query:
    period?: 7d | 30d | 90d | 1y
  Response:
    activeProposals: number
    winRate: number
    avgResponseTime: number
    questionsAnswered: number
    aiUtilization: number

# Get proposal analytics
GET /v1/analytics/proposals
  Query:
    period?: string
    groupBy?: status | client | user
  Response:
    data: AggregatedData[]

# Get AI usage
GET /v1/analytics/ai-usage
  Query:
    period?: string
  Response:
    totalTokens: number
    totalCost: number
    byFeature: FeatureUsage[]
    byModel: ModelUsage[]

# Get team performance
GET /v1/analytics/team
  Query:
    period?: string
  Response:
    users: UserPerformance[]
```

### Integrations

```yaml
# List available integrations
GET /v1/integrations/available
  Response: IntegrationType[]

# List configured integrations
GET /v1/integrations
  Response: Integration[]

# Get integration
GET /v1/integrations/{id}
  Response: Integration

# Configure integration
POST /v1/integrations
  Request:
    type: slack | teams | salesforce | hubspot | sharepoint
    config: IntegrationConfig
  Response: 201 Created, Integration

# Update integration
PATCH /v1/integrations/{id}
  Request:
    config?: IntegrationConfig
    enabled?: boolean
  Response: Integration

# Delete integration
DELETE /v1/integrations/{id}
  Response: 204 No Content

# Test integration
POST /v1/integrations/{id}/actions/test
  Response:
    success: boolean
    message?: string

# OAuth callback
GET /v1/integrations/oauth/callback
  Query:
    code: string
    state: string
  Response: 302 Redirect
```

## Webhooks

### Webhook Configuration

```yaml
# List webhooks
GET /v1/webhooks
  Response: Webhook[]

# Create webhook
POST /v1/webhooks
  Request:
    url: string (required, https only)
    events: string[] (required)
    secret?: string (auto-generated if not provided)
  Response: 201 Created, Webhook

# Update webhook
PATCH /v1/webhooks/{id}
  Request:
    url?: string
    events?: string[]
    enabled?: boolean
  Response: Webhook

# Delete webhook
DELETE /v1/webhooks/{id}
  Response: 204 No Content

# Get webhook logs
GET /v1/webhooks/{id}/logs
  Query:
    status?: success | failed
    limit?: number
  Response: WebhookLog[]

# Retry webhook delivery
POST /v1/webhooks/{id}/logs/{logId}/retry
  Response: 202 Accepted
```

### Webhook Events

| Event                     | Description                   |
| ------------------------- | ----------------------------- |
| `proposal.created`        | New proposal created          |
| `proposal.updated`        | Proposal details changed      |
| `proposal.status_changed` | Proposal status transitioned  |
| `proposal.submitted`      | Proposal marked as submitted  |
| `question.assigned`       | Question assigned to user     |
| `response.generated`      | AI response generated         |
| `response.approved`       | Response approved             |
| `document.processed`      | Document processing completed |
| `export.completed`        | Export ready for download     |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "proposal.created",
  "timestamp": "2026-01-09T14:45:00Z",
  "data": {
    "id": "prop_abc123",
    "organizationId": "org_def456",
    "title": "Government Contract Proposal",
    "status": "draft"
  },
  "metadata": {
    "requestId": "req_xyz789",
    "userId": "usr_123456"
  }
}
```

### Webhook Security

```typescript
// Signature verification
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Header: X-Webhook-Signature: sha256={signature}
```

## Rate Limiting

### Limits

| Tier         | Requests/min | Requests/hour | AI Generations/hour |
| ------------ | ------------ | ------------- | ------------------- |
| Free         | 60           | 1,000         | 10                  |
| Professional | 300          | 10,000        | 100                 |
| Enterprise   | 1,000        | 50,000        | 500                 |

### Headers

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1704810300
X-RateLimit-RetryAfter: 30
```

### Rate Limit Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 30 seconds.",
    "retryAfter": 30,
    "requestId": "req_123456"
  }
}
```

## Versioning

### URL Versioning

```
/v1/proposals    # Version 1 (current)
/v2/proposals    # Version 2 (future)
```

### Deprecation Policy

1. Minimum 12 months notice before deprecation
2. `Deprecation` header in responses
3. Migration guide provided
4. Sunset date announced

### Deprecation Headers

```http
Deprecation: true
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Link: <https://docs.sentinel-rfp.com/migration/v2>; rel="successor-version"
```

## GraphQL API (Optional)

### Schema Example

```graphql
type Query {
  # Proposals
  proposal(id: ID!): Proposal
  proposals(
    filter: ProposalFilter
    sort: ProposalSort
    pagination: PaginationInput
  ): ProposalConnection!

  # Dashboard (complex aggregation)
  dashboard(period: Period!): Dashboard!

  # Search
  search(query: String!, filters: SearchFilters): SearchResults!
}

type Mutation {
  createProposal(input: CreateProposalInput!): Proposal!
  updateProposal(id: ID!, input: UpdateProposalInput!): Proposal!
  deleteProposal(id: ID!): Boolean!

  generateResponse(questionId: ID!, options: GenerationOptions): GenerationJob!
}

type Subscription {
  proposalUpdated(id: ID!): Proposal!
  generationProgress(jobId: ID!): GenerationProgress!
}

type Proposal {
  id: ID!
  title: String!
  clientName: String!
  status: ProposalStatus!
  dueDate: DateTime!
  value: Float
  progress: Float!
  sections: [Section!]!
  questions(filter: QuestionFilter): [Question!]!
  createdBy: User!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Dashboard {
  activeProposals: Int!
  winRate: Float!
  avgResponseTime: Float!
  recentActivity: [Activity!]!
  upcomingDeadlines: [Proposal!]!
  teamPerformance: [UserPerformance!]!
}
```

### When to Use GraphQL

- Dashboard aggregations (multiple resources)
- Flexible frontend requirements
- Real-time subscriptions
- Reducing over-fetching

### GraphQL Endpoint

```
POST /v1/graphql
Content-Type: application/json
Authorization: Bearer {token}

{
  "query": "...",
  "variables": {...}
}
```

## SDK Examples

### TypeScript/JavaScript

```typescript
import { SentinelRFPClient } from '@sentinel-rfp/sdk';

const client = new SentinelRFPClient({
  apiKey: process.env.SENTINEL_API_KEY,
  baseUrl: 'https://api.sentinel-rfp.com/v1',
});

// List proposals
const proposals = await client.proposals.list({
  status: ['draft', 'in_progress'],
  limit: 20,
});

// Create proposal
const proposal = await client.proposals.create({
  title: 'Government Contract RFP',
  clientName: 'Department of Defense',
  dueDate: new Date('2026-03-15'),
});

// Generate AI response
const job = await client.questions.generateResponse('q_123', {
  responseLength: 'medium',
  tone: 'formal',
});

// Wait for completion
const response = await client.jobs.waitForCompletion(job.id);
```

### Python

```python
from sentinel_rfp import Client

client = Client(
    api_key=os.environ['SENTINEL_API_KEY'],
    base_url='https://api.sentinel-rfp.com/v1'
)

# List proposals
proposals = client.proposals.list(
    status=['draft', 'in_progress'],
    limit=20
)

# Create proposal
proposal = client.proposals.create(
    title='Government Contract RFP',
    client_name='Department of Defense',
    due_date='2026-03-15'
)

# Generate AI response
job = client.questions.generate_response(
    question_id='q_123',
    response_length='medium',
    tone='formal'
)
```

## Error Codes Reference

| Code                         | HTTP Status | Description                      |
| ---------------------------- | ----------- | -------------------------------- |
| `AUTHENTICATION_REQUIRED`    | 401         | No valid authentication provided |
| `INVALID_TOKEN`              | 401         | Token is expired or invalid      |
| `PERMISSION_DENIED`          | 403         | User lacks required permission   |
| `RESOURCE_NOT_FOUND`         | 404         | Requested resource doesn't exist |
| `VALIDATION_ERROR`           | 400         | Request validation failed        |
| `DUPLICATE_RESOURCE`         | 409         | Resource already exists          |
| `RATE_LIMIT_EXCEEDED`        | 429         | Too many requests                |
| `QUOTA_EXCEEDED`             | 402         | Plan limits exceeded             |
| `INTERNAL_ERROR`             | 500         | Unexpected server error          |
| `SERVICE_UNAVAILABLE`        | 503         | Service temporarily unavailable  |
| `AI_GENERATION_FAILED`       | 500         | AI response generation failed    |
| `DOCUMENT_PROCESSING_FAILED` | 500         | Document processing failed       |

## References

- [JSON:API Specification](https://jsonapi.org/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [REST API Design Best Practices](https://restfulapi.net/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
