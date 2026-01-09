# Data Architecture - Sentinel RFP

## Overview

This document defines the data architecture, persistence strategies, and data models for Sentinel RFP. The architecture supports multi-tenant SaaS with AI-powered RFP automation.

## Data Architecture Principles

1. **Single Source of Truth**: PostgreSQL as primary data store
2. **Multi-Model Approach**: Relational + Vector + Search optimized for each use case
3. **Tenant Isolation**: Row-level security with application enforcement
4. **Event Sourcing Light**: Audit trail without full event store
5. **Cache-First Reads**: Redis caching for performance
6. **Data Locality**: Keep related data together

## Storage Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    PRIMARY STORES                            │    │
│  │                                                              │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │    │
│  │  │   PostgreSQL    │  │     Redis       │                   │    │
│  │  │   (Railway)     │  │   (Railway)     │                   │    │
│  │  │                 │  │                 │                   │    │
│  │  │ • Transactional │  │ • Session cache │                   │    │
│  │  │ • Vectors       │  │ • Query cache   │                   │    │
│  │  │ • Audit logs    │  │ • Rate limiting │                   │    │
│  │  │ • All domains   │  │ • Job queues    │                   │    │
│  │  └─────────────────┘  └─────────────────┘                   │    │
│  │                                                              │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │    │
│  │  │   Meilisearch   │  │  Cloudflare R2  │                   │    │
│  │  │   (Railway)     │  │                 │                   │    │
│  │  │                 │  │                 │                   │    │
│  │  │ • Full-text     │  │ • Documents     │                   │    │
│  │  │ • Faceted       │  │ • Exports       │                   │    │
│  │  │ • Typo tolerant │  │ • Attachments   │                   │    │
│  │  └─────────────────┘  └─────────────────┘                   │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    FUTURE SCALE (Phase 3+)                   │    │
│  │                                                              │    │
│  │  ┌─────────────────┐                                        │    │
│  │  │    Pinecone     │  When vectors > 10M                    │    │
│  │  │                 │  • Multi-region                        │    │
│  │  │ • Dense vectors │  • Hybrid search                       │    │
│  │  │ • Sparse vectors│  • Better performance                  │    │
│  │  └─────────────────┘                                        │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CORE ENTITY RELATIONSHIPS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  organizations ──────────────────────────────────────────────────┐   │
│       │                                                          │   │
│       ├──▶ users                                                 │   │
│       │      │                                                   │   │
│       │      ├──▶ team_memberships                              │   │
│       │      └──▶ activity_logs                                 │   │
│       │                                                          │   │
│       ├──▶ proposals ─────────────────────────────────────┐     │   │
│       │      │                                             │     │   │
│       │      ├──▶ sections                                │     │   │
│       │      │      └──▶ questions                        │     │   │
│       │      │             └──▶ responses                 │     │   │
│       │      │                   └──▶ citations ──┐       │     │   │
│       │      │                                     │       │     │   │
│       │      ├──▶ collaborators                   │       │     │   │
│       │      └──▶ versions                        │       │     │   │
│       │                                            │       │     │   │
│       ├──▶ documents ─────────────────────────────┼───────┘     │   │
│       │      └──▶ chunks ───────────────────────┐ │             │   │
│       │                                          │ │             │   │
│       ├──▶ library_entries ◀─────────────────────┘ │             │   │
│       │      └──▶ library_chunks                   │             │   │
│       │                                            │             │   │
│       ├──▶ integrations                           │             │   │
│       │                                            │             │   │
│       └──▶ settings                               │             │   │
│                                                    │             │   │
│  audit_logs ◀─────────────────────────────────────┴─────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), uuid_ossp(map: "uuid-ossp")]
}

// ====================
// IDENTITY DOMAIN
// ====================

model Organization {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(200)
  slug      String   @unique @db.VarChar(100)
  plan      Plan     @default(PROFESSIONAL)
  status    OrgStatus @default(ACTIVE)

  // Limits
  maxUsersPerMonth     Int @default(50)
  maxProposalsPerYear  Int @default(100)
  maxStorageGb         Int @default(50)

  // Settings
  settings  Json     @default("{}")

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users         User[]
  proposals     Proposal[]
  documents     Document[]
  libraryEntries LibraryEntry[]
  integrations  Integration[]
  auditLogs     AuditLog[]

  @@map("organizations")
}

model User {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  email          String   @db.VarChar(255)
  passwordHash   String?  @db.VarChar(255)
  name           String   @db.VarChar(200)
  role           UserRole @default(MEMBER)
  status         UserStatus @default(ACTIVE)

  // MFA
  mfaEnabled     Boolean  @default(false)
  mfaSecret      String?  @db.VarChar(255)

  // SSO
  ssoProvider    String?  @db.VarChar(50)
  ssoId          String?  @db.VarChar(255)

  // Profile
  avatarUrl      String?  @db.VarChar(500)
  timezone       String   @default("UTC") @db.VarChar(50)
  preferences    Json     @default("{}")

  // Metadata
  lastLoginAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  proposalsCreated Proposal[] @relation("CreatedBy")
  questionsAssigned Question[] @relation("AssignedTo")
  responses      Response[] @relation("ResponseAuthor")
  activityLogs   AuditLog[]

  @@unique([organizationId, email])
  @@index([organizationId])
  @@map("users")
}

// ====================
// PROPOSAL DOMAIN
// ====================

model Proposal {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  // Core fields
  title          String   @db.VarChar(500)
  clientName     String   @db.VarChar(200)
  status         ProposalStatus @default(DRAFT)
  priority       Priority @default(MEDIUM)

  // Dates
  dueDate        DateTime
  submittedAt    DateTime?

  // Value
  estimatedValue Decimal? @db.Decimal(15, 2)
  currency       String   @default("USD") @db.VarChar(3)

  // AI Configuration
  winThemes      String[] @db.VarChar(500)
  toneProfile    String   @default("professional") @db.VarChar(50)

  // Analytics
  pwinScore      Float?
  completionRate Float    @default(0)

  // Metadata
  metadata       Json     @default("{}")
  createdById    String   @db.Uuid
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User @relation("CreatedBy", fields: [createdById], references: [id])
  sourceDocument Document? @relation("SourceDocument", fields: [sourceDocumentId], references: [id])
  sourceDocumentId String? @db.Uuid

  sections       Section[]
  collaborators  ProposalCollaborator[]
  versions       ProposalVersion[]
  exports        ProposalExport[]

  @@index([organizationId, status])
  @@index([organizationId, dueDate])
  @@index([createdById])
  @@map("proposals")
}

model Section {
  id         String   @id @default(uuid()) @db.Uuid
  proposalId String   @db.Uuid

  title      String   @db.VarChar(500)
  orderIndex Int

  // Compliance
  complianceRequirement String? @db.VarChar(100)
  isMandatory Boolean  @default(false)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  proposal   Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  questions  Question[]

  @@index([proposalId])
  @@map("sections")
}

model Question {
  id         String   @id @default(uuid()) @db.Uuid
  sectionId  String   @db.Uuid

  // Content
  text       String   @db.Text
  questionType QuestionType @default(SINGLE_RESPONSE)

  // Requirements
  requirements String[] @db.VarChar(500)
  wordLimit    Int?
  pageLimit    Float?

  // Status
  status     QuestionStatus @default(UNANSWERED)

  // Assignment
  assignedToId String? @db.Uuid

  // Ordering
  orderIndex Int

  // Source
  sourcePageNumber Int?
  sourceText       String? @db.Text

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  section    Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  assignedTo User?   @relation("AssignedTo", fields: [assignedToId], references: [id])
  responses  Response[]
  comments   Comment[]

  @@index([sectionId])
  @@index([assignedToId])
  @@index([status])
  @@map("questions")
}

model Response {
  id         String   @id @default(uuid()) @db.Uuid
  questionId String   @db.Uuid

  // Content
  content    String   @db.Text
  format     ContentFormat @default(MARKDOWN)

  // Version tracking
  version    Int      @default(1)
  isCurrent  Boolean  @default(true)

  // AI metadata
  isAiGenerated Boolean @default(false)
  aiModel       String? @db.VarChar(100)
  trustScore    Float?

  // Review
  status     ResponseStatus @default(DRAFT)
  reviewedById String? @db.Uuid
  reviewedAt   DateTime?

  // Author
  authorId   String   @db.Uuid

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  author     User     @relation("ResponseAuthor", fields: [authorId], references: [id])
  citations  Citation[]

  @@index([questionId, isCurrent])
  @@index([questionId, version])
  @@map("responses")
}

model Citation {
  id         String   @id @default(uuid()) @db.Uuid
  responseId String   @db.Uuid

  // Source
  sourceType CitationSourceType
  sourceId   String   @db.Uuid

  // Position in response
  startOffset Int
  endOffset   Int

  // Source details
  sourceContent String @db.Text
  pageNumber    Int?
  confidence    Float?

  createdAt  DateTime @default(now())

  // Relations
  response   Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@index([responseId])
  @@index([sourceId])
  @@map("citations")
}

// ====================
// KNOWLEDGE DOMAIN
// ====================

model Document {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  // File info
  filename       String   @db.VarChar(500)
  mimeType       String   @db.VarChar(100)
  fileSize       Int
  storagePath    String   @db.VarChar(1000)

  // Processing
  documentType   DocumentType @default(REFERENCE)
  processingStatus ProcessingStatus @default(UPLOADED)
  processingError  String? @db.Text

  // Extracted content
  extractedText  String? @db.Text
  pageCount      Int?
  structure      Json?

  // Metadata
  metadata       Json     @default("{}")

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  chunks         Chunk[]
  proposalsFromSource Proposal[] @relation("SourceDocument")

  @@index([organizationId])
  @@index([processingStatus])
  @@map("documents")
}

model Chunk {
  id         String   @id @default(uuid()) @db.Uuid
  documentId String   @db.Uuid

  // Content
  content    String   @db.Text

  // Positioning
  pageNumber     Int?
  hierarchyPath  String? @db.VarChar(500)  // e.g., "Section 1 > Requirements > Security"
  sequenceNumber Int

  // Vector embedding (pgvector)
  contentEmbedding Unsupported("vector(1536)")?

  // Metadata
  tokenCount Int?
  metadata   Json     @default("{}")

  createdAt  DateTime @default(now())

  // Relations
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@map("chunks")
}

model LibraryEntry {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  // Content
  title          String   @db.VarChar(500)
  content        String   @db.Text

  // Classification
  category       String   @db.VarChar(100)
  tags           String[] @db.VarChar(100)

  // Quality
  qualityScore   Float?
  usageCount     Int      @default(0)
  lastUsedAt     DateTime?

  // Expiration
  expiresAt      DateTime?
  isExpired      Boolean  @default(false)

  // Source tracking
  sourceType     LibrarySourceType @default(MANUAL)
  sourceId       String?  @db.Uuid

  // Vector embedding
  contentEmbedding Unsupported("vector(1536)")?

  // Metadata
  metadata       Json     @default("{}")

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  chunks         LibraryChunk[]

  @@index([organizationId, category])
  @@index([organizationId, tags])
  @@map("library_entries")
}

model LibraryChunk {
  id            String   @id @default(uuid()) @db.Uuid
  libraryEntryId String  @db.Uuid

  content       String   @db.Text
  sequenceNumber Int

  contentEmbedding Unsupported("vector(1536)")?

  createdAt     DateTime @default(now())

  // Relations
  libraryEntry  LibraryEntry @relation(fields: [libraryEntryId], references: [id], onDelete: Cascade)

  @@index([libraryEntryId])
  @@map("library_chunks")
}

// ====================
// INTEGRATIONS DOMAIN
// ====================

model Integration {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  type           IntegrationType
  name           String   @db.VarChar(100)
  status         IntegrationStatus @default(PENDING)

  // Encrypted credentials
  config         Json     @db.JsonB  // Encrypted at application level

  // Status tracking
  lastSyncAt     DateTime?
  lastError      String?  @db.Text

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  webhooks       Webhook[]

  @@unique([organizationId, type])
  @@map("integrations")
}

model Webhook {
  id            String   @id @default(uuid()) @db.Uuid
  integrationId String?  @db.Uuid
  organizationId String  @db.Uuid

  url           String   @db.VarChar(1000)
  events        String[] @db.VarChar(100)
  secret        String   @db.VarChar(255)

  status        WebhookStatus @default(ACTIVE)

  // Stats
  successCount  Int      @default(0)
  failureCount  Int      @default(0)
  lastTriggeredAt DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  integration   Integration? @relation(fields: [integrationId], references: [id], onDelete: SetNull)
  logs          WebhookLog[]

  @@index([organizationId])
  @@map("webhooks")
}

// ====================
// AUDIT & ANALYTICS
// ====================

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  // Actor
  actorId        String?  @db.Uuid
  actorType      ActorType
  actorIp        String?  @db.VarChar(45)

  // Action
  action         String   @db.VarChar(100)
  resource       String   @db.VarChar(100)
  resourceId     String?  @db.Uuid

  // Context
  requestId      String   @db.VarChar(100)
  sessionId      String?  @db.VarChar(100)

  // Outcome
  status         AuditStatus
  errorCode      String?  @db.VarChar(50)

  // Changes
  previousState  Json?
  newState       Json?

  // Metadata
  metadata       Json     @default("{}")

  createdAt      DateTime @default(now())

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actor          User? @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([organizationId, createdAt])
  @@index([actorId])
  @@index([resourceId])
  @@index([action])
  @@map("audit_logs")
}

model UsageMetric {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  // Metric details
  metricType     MetricType
  value          Float
  unit           String   @db.VarChar(50)

  // Time period
  periodStart    DateTime
  periodEnd      DateTime

  // Dimensions
  dimensions     Json     @default("{}")

  createdAt      DateTime @default(now())

  @@index([organizationId, metricType, periodStart])
  @@map("usage_metrics")
}

// ====================
// SAGAS & JOBS
// ====================

model SagaExecution {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid

  sagaName       String   @db.VarChar(100)
  status         SagaStatus
  currentStep    Int      @default(0)

  context        Json     @db.JsonB
  completedSteps String[] @db.VarChar(100)

  error          String?  @db.Text

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([status])
  @@map("saga_executions")
}

// ====================
// ENUMS
// ====================

enum Plan {
  FREE
  PROFESSIONAL
  ENTERPRISE
  GOVCON
}

enum OrgStatus {
  ACTIVE
  SUSPENDED
  CHURNED
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum UserStatus {
  ACTIVE
  INVITED
  SUSPENDED
}

enum ProposalStatus {
  DRAFT
  IN_PROGRESS
  REVIEW
  SUBMITTED
  WON
  LOST
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum QuestionType {
  SINGLE_RESPONSE
  MULTI_PART
  TABLE
  ATTACHMENT
  REFERENCE
}

enum QuestionStatus {
  UNANSWERED
  DRAFT
  REVIEW
  APPROVED
  FLAGGED
}

enum ResponseStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
}

enum ContentFormat {
  PLAIN
  MARKDOWN
  HTML
}

enum CitationSourceType {
  DOCUMENT
  LIBRARY_ENTRY
  EXTERNAL
}

enum DocumentType {
  RFP
  PROPOSAL
  REFERENCE
  CONTRACT
  TEMPLATE
}

enum ProcessingStatus {
  UPLOADED
  PARSING
  CHUNKING
  EMBEDDING
  INDEXING
  COMPLETED
  FAILED
}

enum LibrarySourceType {
  MANUAL
  DOCUMENT
  PROPOSAL
  IMPORT
}

enum IntegrationType {
  SLACK
  TEAMS
  SALESFORCE
  HUBSPOT
  SHAREPOINT
  GOOGLE_DRIVE
  JIRA
}

enum IntegrationStatus {
  PENDING
  CONNECTED
  ERROR
  DISABLED
}

enum WebhookStatus {
  ACTIVE
  PAUSED
  FAILED
}

enum ActorType {
  USER
  SERVICE
  SYSTEM
}

enum AuditStatus {
  SUCCESS
  FAILURE
}

enum MetricType {
  TOKENS_USED
  STORAGE_USED
  PROPOSALS_CREATED
  QUESTIONS_ANSWERED
  AI_GENERATIONS
  API_CALLS
}

enum SagaStatus {
  RUNNING
  COMPLETED
  FAILED
  COMPENSATING
}
```

## Data Access Patterns

### Read Patterns

| Pattern | Storage | Strategy |
|---------|---------|----------|
| Proposal list | PostgreSQL + Redis | Cache-aside, 5 min TTL |
| Proposal detail | PostgreSQL | Cache-aside, event invalidation |
| Dashboard stats | Redis | Pre-computed, refresh on event |
| Semantic search | pgvector | Direct query with filters |
| Full-text search | Meilisearch | Sync from PostgreSQL |
| Document preview | Cloudflare R2 | Signed URLs, 1 hour |

### Write Patterns

| Pattern | Strategy |
|---------|----------|
| Create proposal | Write-through, emit event |
| Generate response | Async job, saga orchestration |
| Upload document | Write to R2, process async |
| Update library | Write-through, reindex async |
| Bulk import | Batch processing, chunked |

## Cache Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  L1: Application Cache (In-Memory)                                  │
│  ─────────────────────────────────                                  │
│  • Configuration                                                     │
│  • Static lookups                                                    │
│  • JWT public keys                                                   │
│  • TTL: Process lifetime                                            │
│                                                                      │
│  L2: Redis Cache (Distributed)                                       │
│  ──────────────────────────────                                      │
│  • Session data                                                      │
│  • Query results                                                     │
│  • Computed aggregations                                            │
│  • Rate limit counters                                              │
│  • TTL: 5 min - 1 hour                                              │
│                                                                      │
│  L3: CDN Cache (Cloudflare)                                         │
│  ──────────────────────────                                          │
│  • Static assets                                                     │
│  • Document downloads                                               │
│  • TTL: 1 hour - 1 week                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache Keys

```typescript
// Cache key patterns
const CACHE_KEYS = {
  // User session
  session: (sessionId: string) => `session:${sessionId}`,

  // Proposals
  proposal: (id: string) => `proposal:${id}`,
  proposalList: (orgId: string, filters: string) => `proposals:${orgId}:${hash(filters)}`,
  proposalStats: (orgId: string) => `stats:${orgId}`,

  // Questions
  question: (id: string) => `question:${id}`,

  // Library
  libraryEntry: (id: string) => `library:${id}`,
  librarySearch: (orgId: string, query: string) => `library:search:${orgId}:${hash(query)}`,

  // User
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `permissions:${id}`,

  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,
};
```

## Vector Search Configuration

### Embedding Strategy

```typescript
// Embedding configuration
const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 1536,

  // Chunking
  chunkSize: 512,        // tokens
  chunkOverlap: 50,      // tokens

  // Batch processing
  batchSize: 100,
  maxConcurrent: 5,
};
```

### pgvector Index Configuration

```sql
-- IVFFlat index (Phase 1-2)
-- Rule: lists = sqrt(num_vectors)

-- For 100K vectors per tenant
CREATE INDEX idx_chunks_embedding ON chunks
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 316);

CREATE INDEX idx_library_embedding ON library_entries
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 316);

-- Query performance tuning
SET ivfflat.probes = 10;  -- Higher = more accurate, slower
```

### Search Query Example

```typescript
// Semantic search with filters
async function semanticSearch(
  organizationId: string,
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const embedding = await embeddings.embed(query);

  return prisma.$queryRaw`
    SELECT
      le.id,
      le.title,
      le.content,
      le.category,
      1 - (le.content_embedding <=> ${embedding}::vector) as similarity
    FROM library_entries le
    WHERE le.organization_id = ${organizationId}
      AND le.is_expired = false
      ${options.categories ? Prisma.sql`AND le.category = ANY(${options.categories})` : Prisma.empty}
      ${options.minScore ? Prisma.sql`AND 1 - (le.content_embedding <=> ${embedding}::vector) >= ${options.minScore}` : Prisma.empty}
    ORDER BY le.content_embedding <=> ${embedding}::vector
    LIMIT ${options.limit ?? 10}
  `;
}
```

## Data Lifecycle Management

### Retention Policies

| Data Type | Retention | Action |
|-----------|-----------|--------|
| Active proposals | Indefinite | Archive after 2 years |
| Completed proposals | 7 years | Required for compliance |
| Audit logs | 2 years | Archive to cold storage |
| Session data | 30 days | Auto-expire |
| Temp files | 24 hours | Auto-delete |
| Embeddings | Matches source | Delete with source |

### Data Archival

```typescript
// Archive completed proposals older than 2 years
async function archiveOldProposals() {
  const cutoffDate = subYears(new Date(), 2);

  const proposals = await prisma.proposal.findMany({
    where: {
      status: { in: ['WON', 'LOST', 'CANCELLED'] },
      updatedAt: { lt: cutoffDate },
      isArchived: false,
    },
  });

  for (const proposal of proposals) {
    // Export to cold storage (R2)
    await archiveService.export(proposal);

    // Mark as archived
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { isArchived: true },
    });

    // Delete related vectors (keep metadata)
    await prisma.$executeRaw`
      UPDATE questions
      SET content_embedding = NULL
      WHERE section_id IN (
        SELECT id FROM sections WHERE proposal_id = ${proposal.id}
      )
    `;
  }
}
```

## Backup Strategy

### Railway PostgreSQL Backups

```yaml
# Automatic backups (Railway managed)
- Point-in-time recovery: Last 7 days
- Daily snapshots: Last 30 days
- Retention: 30 days automatic

# Manual backups (monthly)
- Export to R2: Full database dump
- Encryption: AES-256-GCM
- Retention: 1 year
```

### Backup Verification

```bash
# Monthly backup verification
1. Restore to staging environment
2. Run integrity checks
3. Verify data accessibility
4. Document results
```

## Migration Strategy

### Prisma Migrations

```bash
# Development
npx prisma migrate dev --name add_feature

# Production (Railway)
npx prisma migrate deploy

# Migration guidelines:
# - Always backwards compatible
# - Add before remove (2-phase for breaking changes)
# - Test with production data volume
# - Have rollback plan
```

### Zero-Downtime Migrations

```typescript
// Phase 1: Add new column (nullable)
ALTER TABLE proposals ADD COLUMN new_field VARCHAR(100);

// Phase 2: Backfill data
UPDATE proposals SET new_field = compute_value(old_field) WHERE new_field IS NULL;

// Phase 3: Make non-nullable (after app update)
ALTER TABLE proposals ALTER COLUMN new_field SET NOT NULL;

// Phase 4: Drop old column (after verification)
ALTER TABLE proposals DROP COLUMN old_field;
```

## Performance Optimization

### Query Optimization

```sql
-- Explain analyze for slow queries
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM proposals
WHERE organization_id = 'xxx'
  AND status IN ('DRAFT', 'IN_PROGRESS')
ORDER BY due_date ASC
LIMIT 20;

-- Common indexes
CREATE INDEX CONCURRENTLY idx_proposals_org_status_due
ON proposals (organization_id, status, due_date);

-- Partial indexes for common filters
CREATE INDEX idx_proposals_active
ON proposals (organization_id, due_date)
WHERE status IN ('DRAFT', 'IN_PROGRESS', 'REVIEW');
```

### Connection Pooling

```typescript
// Prisma connection configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  log: ['query', 'info', 'warn', 'error'],
});

// Railway PostgreSQL limits
// - Starter: 20 connections
// - Pro: 100 connections
// - Enterprise: Custom
```

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
