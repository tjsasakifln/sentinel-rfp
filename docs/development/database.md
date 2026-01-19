# Database Guide

**Last Updated:** January 2026
**Version:** 1.0.0
**Target Audience:** Backend Developers

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
3. [Running Migrations](#running-migrations)
4. [Seeding the Database](#seeding-the-database)
5. [Common Queries](#common-queries)
6. [Vector Search](#vector-search)
7. [Performance Optimization](#performance-optimization)
8. [Database Tools](#database-tools)

---

## Schema Overview

The Sentinel RFP database schema is designed around **Domain-Driven Design (DDD)** with three main bounded contexts:

### 1. Identity Domain

Handles authentication, users, and organizations with multi-tenancy support.

**Models:**

- **Organization** - Tenant root entity
- **User** - Organization members with authentication
- **UserOrganization** - Many-to-many relationship for multi-org access

```typescript
// Organization structure
{
  id: UUID                          // Primary key
  name: string                      // Org name
  slug: string                      // URL-safe identifier (unique)
  plan: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' | 'GOVCON'
  status: 'ACTIVE' | 'SUSPENDED' | 'CHURNED'
  maxUsersPerMonth: number
  maxProposalsPerYear: number
  maxStorageGb: number
  settings: JSON                    // Custom settings object
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt: DateTime?               // Soft delete flag
}

// User structure
{
  id: UUID
  organizationId: UUID              // Tenant reference
  email: string
  passwordHash: string?             // Nullable for SSO users
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  mfaEnabled: boolean
  mfaSecret?: string
  ssoProvider?: string              // 'google' | 'github' | etc
  ssoId?: string
  lastLoginAt?: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 2. Proposal Domain

Manages RFP/RFQ responses with hierarchical structure.

**Models:**

- **Proposal** - RFP response document
- **ProposalSection** - Logical sections (Technical Approach, Past Performance, etc.)
- **Question** - Individual RFP requirements
- **Response** - Answers to questions with AI trust scoring

```typescript
// Proposal hierarchy
Proposal (title, status, rfpNumber)
  └─ ProposalSection[] (title, order)
      └─ Question[] (text, order)
          └─ Response[] (content, trustScore, status)

// Example structure
{
  proposalId: "abc-123"
  title: "RFP-2026-DEFENSE-001 Response"
  sections: [
    {
      id: "sec-1"
      title: "Technical Approach"
      order: 1
      questions: [
        {
          id: "q-1"
          text: "How will you implement cloud infrastructure?"
          order: 1
          responses: [
            {
              id: "r-1"
              content: "We will use AWS..."
              trustScore: 0.87
              status: "approved"
            }
          ]
        }
      ]
    }
  ]
}
```

### 3. Knowledge Domain

Manages documents and reusable content with vector embeddings.

**Models:**

- **Document** - Uploaded files (PDFs, DOCX)
- **DocumentChunk** - Text segments with vector embeddings
- **LibraryEntry** - Reusable content snippets with expiration support

```typescript
// Document structure
{
  id: UUID
  filename: string
  mimeType: string
  sizeBytes: number
  storageKey: string                // R2/S3 object key
  organizationId: UUID              // Tenant reference
  chunks: DocumentChunk[]
  createdAt: DateTime
  updatedAt: DateTime
}

// DocumentChunk with vector embedding
{
  id: UUID
  content: string                   // Text segment (1024-2048 chars)
  embedding: vector(1536)           // OpenAI ada-002 embeddings
  metadata: JSON                    // { pageNumber, section, etc. }
  documentId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}

// LibraryEntry for reusable content
{
  id: UUID
  title: string
  content: string
  category: string                  // 'solution', 'case-study', etc.
  tags: string[]                    // ['cloud', 'security', 'defense']
  embedding: vector(1536)           // For semantic search
  organizationId: UUID              // Tenant-scoped
  expiresAt?: DateTime              // Optional expiration
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Multi-Tenancy Architecture

Sentinel RFP uses **row-level isolation** for multi-tenancy via the `organizationId` foreign key.

### Key Principles

1. **Every data entity has `organizationId`** - All queries are scoped to org
2. **Foreign key cascades** - Deleting org cascades to all related data
3. **Soft deletes** - Organizations use soft delete (`deletedAt`) for compliance
4. **Isolation at application level** - Always filter by `organizationId` in queries

### Implementing Tenant Isolation

**In NestJS services:**

```typescript
@Injectable()
export class ProposalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<Proposal[]> {
    // Always filter by organizationId
    return this.prisma.proposal.findMany({
      where: {
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                responses: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(proposalId: string, organizationId: string): Promise<Proposal | null> {
    return this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        organizationId, // Critical - prevent cross-org access
      },
    });
  }

  async create(dto: CreateProposalDto, organizationId: string): Promise<Proposal> {
    return this.prisma.proposal.create({
      data: {
        ...dto,
        organizationId, // Auto-assign tenant
      },
    });
  }
}
```

**In controllers:**

```typescript
@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Get()
  async findAll(@CurrentUser() user: User): Promise<ProposalResponseDto[]> {
    // User.organizationId defines the tenant context
    const proposals = await this.proposalService.findAll(user.organizationId);
    return proposals.map((p) => new ProposalResponseDto(p));
  }
}
```

---

## Running Migrations

Migrations manage database schema evolution using Prisma.

### Prerequisites

```bash
# Ensure Docker services are running
pnpm docker:up

# Verify PostgreSQL is healthy
docker-compose ps postgres
```

### Generate Prisma Client

After modifying `schema.prisma`, generate the client:

```bash
cd packages/database

# Generate Prisma Client (runs on `pnpm install`)
pnpm prisma:generate
```

### Apply Migrations (Development)

For local development, use dev mode to auto-apply migrations:

```bash
cd packages/database

# Reset database (removes all data)
pnpm prisma:migrate:dev --name initial_schema

# Subsequent changes
pnpm prisma:migrate:dev --name add_user_mfa_fields
```

This will:

1. Create new migration file in `prisma/migrations/`
2. Apply the migration to local database
3. Regenerate Prisma Client

### Deploy Migrations (Production)

For production/CI environments:

```bash
cd packages/database

# Apply pending migrations without prompting
pnpm prisma:migrate:deploy
```

### Rollback Migrations

To revert the last migration:

```bash
# Manual rollback (requires custom SQL)
# 1. Edit the latest migration file in prisma/migrations/
# 2. Add rollback SQL
# 3. Rebuild the migration

# Or reset entire database (dev only!)
pnpm prisma:migrate:reset
```

### Common Migration Scenarios

**Adding a new field:**

```bash
cd packages/database

# Modify schema.prisma to add field
# model User {
#   ...
#   lastActiveAt: DateTime?  // New field
# }

# Create migration
pnpm prisma:migrate:dev --name add_user_last_active_at
```

**Renaming a field:**

```bash
# 1. Modify schema.prisma with @rename directive
model User {
  id String @id
  fullName String @rename("name")  // Rename 'name' to 'fullName'
}

# 2. Create migration
pnpm prisma:migrate:dev --name rename_user_name_to_full_name
```

**Adding a relation:**

```bash
# 1. Add relation to schema
model Proposal {
  id String @id
  sections ProposalSection[]  // New relation
}

model ProposalSection {
  id String @id
  proposalId String
  proposal Proposal @relation(fields: [proposalId], references: [id])
}

# 2. Create migration
pnpm prisma:migrate:dev --name add_proposal_sections_relation
```

---

## Seeding the Database

Database seeds create initial/test data for development.

### Seed Script Location

`packages/database/prisma/seed.ts` - Runs after migrations

### Running Seeds

```bash
cd packages/database

# Apply seed data
pnpm prisma:seed

# Expected output:
# > @sentinel-rfp/database prisma db seed
# Running seed...
# ✓ Created 3 organizations
# ✓ Created 15 users
# ✓ Created 12 proposals
# Seed completed successfully
```

### Seed Data Contents

The seed script typically creates:

1. **Test Organizations**
   - DefenseGuard Inc (Enterprise plan)
   - TechVenture LLC (Professional plan)
   - StartupXYZ (Free plan)

2. **Test Users**
   - Organization owners/admins
   - Regular members
   - Viewers with limited permissions

3. **Sample Proposals**
   - In different statuses (draft, in-progress, submitted)
   - With sections, questions, and responses
   - With various trust scores

4. **Sample Documents**
   - Case study PDFs
   - Technical specifications
   - Past performance documents

### Modifying Seeds

Edit `packages/database/prisma/seed.ts`:

```typescript
async function main() {
  console.log('Running seed...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      plan: 'PROFESSIONAL',
    },
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@test.org',
      name: 'Admin User',
      role: 'OWNER',
      passwordHash: await hashPassword('password123'),
    },
  });

  // Create proposal
  const proposal = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: 'Test Proposal',
      status: 'draft',
      sections: {
        create: [
          {
            title: 'Technical Approach',
            order: 1,
            questions: {
              create: [
                {
                  text: 'How will you implement solution?',
                  order: 1,
                  responses: {
                    create: [
                      {
                        content: 'We will use cloud infrastructure...',
                        status: 'draft',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✓ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Common Queries

### User Queries

**Find user with organization:**

```typescript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { organization: true },
});
```

**List all users in organization:**

```typescript
const users = await prisma.user.findMany({
  where: { organizationId: 'org-123' },
  orderBy: { createdAt: 'desc' },
});
```

**Count active users per organization:**

```typescript
const counts = await prisma.organization.findMany({
  select: {
    id: true,
    name: true,
    _count: {
      select: { users: { where: { status: 'ACTIVE' } } },
    },
  },
});
```

### Proposal Queries

**Find proposal with full hierarchy:**

```typescript
const proposal = await prisma.proposal.findUnique({
  where: { id: 'proposal-123' },
  include: {
    sections: {
      orderBy: { order: 'asc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            responses: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    },
  },
});
```

**Get proposals by status:**

```typescript
const draftProposals = await prisma.proposal.findMany({
  where: {
    organizationId: 'org-123',
    status: 'draft',
    deletedAt: null,
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0, // For pagination
});
```

**Count proposals per status:**

```typescript
const statusCounts = await prisma.proposal.groupBy({
  by: ['status'],
  where: {
    organizationId: 'org-123',
    deletedAt: null,
  },
  _count: {
    id: true,
  },
});
```

**Find high-trust responses:**

```typescript
const highTrustResponses = await prisma.response.findMany({
  where: {
    trustScore: {
      gte: 0.85, // 85% or higher
    },
  },
  include: {
    question: {
      include: {
        section: {
          include: {
            proposal: true,
          },
        },
      },
    },
  },
});
```

### Document Queries

**Find documents by organization:**

```typescript
const documents = await prisma.document.findMany({
  where: { organizationId: 'org-123' },
  include: {
    chunks: {
      select: { id: true, content: true },
    },
  },
});
```

**Get document with chunk count:**

```typescript
const docWithStats = await prisma.document.findUnique({
  where: { id: 'doc-123' },
  include: {
    _count: {
      select: { chunks: true },
    },
  },
});
```

### Library Queries

**Find library entries by category:**

```typescript
const entries = await prisma.libraryEntry.findMany({
  where: {
    organizationId: 'org-123',
    category: 'case-study',
    expiresAt: {
      or: [
        { isSet: false }, // Never expires
        { gt: new Date() }, // Expiration in future
      ],
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

**Search library by tags:**

```typescript
const entries = await prisma.libraryEntry.findMany({
  where: {
    organizationId: 'org-123',
    tags: {
      hasSome: ['cloud', 'security'],
    },
  },
});
```

---

## Vector Search

Vector embeddings enable semantic search across documents and library entries.

### Vector Search Setup

**Prerequisites:**

1. PostgreSQL with pgvector extension (included in Docker setup)
2. Vector embeddings from OpenAI ada-002 (1536 dimensions)

### Storing Embeddings

**When creating document chunks:**

```typescript
const embedding = await openaiService.createEmbedding(chunkText);

const chunk = await prisma.documentChunk.create({
  data: {
    documentId: 'doc-123',
    content: chunkText,
    embedding: embedding, // 1536-dimensional vector
    metadata: {
      pageNumber: 1,
      section: 'Technical Approach',
    },
  },
});
```

**When creating library entries:**

```typescript
const embedding = await openaiService.createEmbedding(libraryContent);

const entry = await prisma.libraryEntry.create({
  data: {
    organizationId: 'org-123',
    title: 'Cloud Architecture Best Practices',
    content: libraryContent,
    category: 'technical',
    tags: ['cloud', 'architecture', 'aws'],
    embedding: embedding,
  },
});
```

### Semantic Search Queries

**Find similar document chunks:**

```typescript
// Convert search query to embedding
const queryEmbedding = await openaiService.createEmbedding(searchQuery);

// Find similar chunks using cosine distance
const similarChunks = await prisma.$queryRaw`
  SELECT
    id,
    content,
    metadata,
    (embedding <-> $1::vector) AS distance
  FROM document_chunks
  WHERE document_id = $2
  ORDER BY distance
  LIMIT 10
`;

// Parameters:
// $1 = queryEmbedding (vector)
// $2 = documentId
```

**Search across all organization documents:**

```typescript
const results = await prisma.$queryRaw`
  SELECT
    dc.id,
    dc.content,
    d.filename,
    (dc.embedding <-> $1::vector) AS distance
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.organization_id = $2
  ORDER BY distance
  LIMIT 20
`;
```

**Hybrid search (vector + keyword):**

```typescript
const results = await prisma.$queryRaw`
  SELECT
    dc.id,
    dc.content,
    d.filename,
    (dc.embedding <-> $1::vector) AS vector_distance,
    CASE
      WHEN dc.content @@ plainto_tsquery('english', $3) THEN 1
      ELSE 0
    END AS keyword_match
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.organization_id = $2
  ORDER BY keyword_match DESC, vector_distance ASC
  LIMIT 20
`;
```

**Find similar library entries:**

```typescript
const similarEntries = await prisma.$queryRaw`
  SELECT
    id,
    title,
    content,
    category,
    (embedding <-> $1::vector) AS distance
  FROM library_entries
  WHERE organization_id = $2
    AND category = $3
  ORDER BY distance
  LIMIT 5
`;
```

---

## Performance Optimization

### Indexes

Key indexes are defined in `schema.prisma`:

**Current indexes:**

```typescript
model Organization {
  @@index([deletedAt])  // Quick active org filtering
}

model User {
  @@unique([organizationId, email])
  @@index([organizationId])
}

model Proposal {
  @@index([organizationId])
  @@index([status])
  @@index([deletedAt])
}

model ProposalSection {
  @@index([proposalId])
  @@index([deletedAt])
}

model Question {
  @@index([sectionId])
}

model Response {
  @@index([questionId])
  @@index([status])
}

model Document {
  @@index([organizationId])
}

model DocumentChunk {
  @@index([documentId])
}

model LibraryEntry {
  @@index([organizationId])
  @@index([category])
}
```

### Query Optimization Tips

**1. Use selective includes**

```typescript
// ❌ Bad - Loads all relations
const proposal = await prisma.proposal.findUnique({
  where: { id: 'p-123' },
  include: { sections: { include: { questions: { include: { responses: true } } } } },
});

// ✅ Good - Load only needed data
const proposal = await prisma.proposal.findUnique({
  where: { id: 'p-123' },
  select: {
    id: true,
    title: true,
    sections: {
      select: {
        id: true,
        title: true,
        _count: { select: { questions: true } },
      },
    },
  },
});
```

**2. Paginate large result sets**

```typescript
const page = 1;
const pageSize = 20;

const proposals = await prisma.proposal.findMany({
  where: { organizationId: 'org-123' },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

const totalCount = await prisma.proposal.count({
  where: { organizationId: 'org-123' },
});

return { data: proposals, total: totalCount, page, pageSize };
```

**3. Use raw queries for aggregations**

```typescript
// Complex aggregations
const stats = await prisma.$queryRaw`
  SELECT
    p.status,
    COUNT(*) as count,
    AVG(r.trust_score) as avg_trust_score
  FROM proposals p
  LEFT JOIN proposal_sections ps ON p.id = ps.proposal_id
  LEFT JOIN questions q ON ps.id = q.section_id
  LEFT JOIN responses r ON q.id = r.question_id
  WHERE p.organization_id = $1
  GROUP BY p.status
`;
```

**4. Batch operations**

```typescript
// ❌ Bad - N+1 queries
for (const proposalId of proposalIds) {
  await prisma.proposal.findUnique({ where: { id: proposalId } });
}

// ✅ Good - Single query
const proposals = await prisma.proposal.findMany({
  where: { id: { in: proposalIds } },
});
```

---

## Database Tools

### Prisma Studio

Visual database browser and editor:

```bash
cd packages/database

# Open Prisma Studio (browser at http://localhost:5555)
pnpm prisma:studio

# Features:
# - Browse all data
# - Create/edit/delete records
# - View relations
# - Export data
```

### PostgreSQL Command Line

```bash
# Connect to PostgreSQL
psql postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp

# Common commands:
\dt                      # List all tables
\d <table_name>          # Describe table schema
\x on                    # Toggle expanded output
SELECT * FROM users;     # Query data
\copy (SELECT ...) TO STDOUT CSV  # Export to CSV
```

### Backup and Restore

**Backup database:**

```bash
# Dump entire database
pg_dump postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp \
  > sentinel_rfp_backup.sql

# Or use Docker
docker exec sentinel-postgres pg_dump \
  -U sentinel_user sentinel_rfp > backup.sql
```

**Restore from backup:**

```bash
# Restore from dump file
psql postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp \
  < sentinel_rfp_backup.sql

# Or via Docker
docker exec -i sentinel-postgres psql \
  -U sentinel_user sentinel_rfp < backup.sql
```

### Reset Database (Development Only)

```bash
# Completely reset database
cd packages/database
pnpm prisma:migrate:reset

# This will:
# 1. Drop all tables
# 2. Run all migrations from scratch
# 3. Apply seed data
```

---

## Best Practices

1. **Always scope queries by organizationId** - Prevent data leaks
2. **Use soft deletes for compliance** - Never hard-delete sensitive data
3. **Index frequently queried fields** - Add indexes to `schema.prisma`
4. **Paginate large result sets** - Avoid loading thousands of records
5. **Test migrations locally** - Always verify migrations work before deploying
6. **Keep seeds realistic** - Use seed data similar to production
7. **Monitor query performance** - Use `EXPLAIN ANALYZE` for complex queries
8. **Document schema changes** - Update this guide when modifying schema

---

**Next:** See [testing.md](./testing.md) for database testing patterns →
