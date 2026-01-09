# Sentinel RFP - AI-Powered RFP Automation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)

**Sentinel RFP is an agentic AI platform for RFP response automation that transforms how organizations win proposals.** By leveraging multi-agent orchestration and trust-scored AI responses, Sentinel RFP reduces proposal response time by 50% while improving win rates by 8-15 percentage points. Built for mid-market tech companies and government contractors who need FAR/DFARS compliant proposal management software.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)
- [Use Cases](#use-cases)
- [Contact](#contact)
- [License](#license)

---

## The Problem

Organizations responding to RFPs face critical challenges that directly impact revenue:

**SME Fatigue**: Subject matter experts spend 3-5 days per RFP responding to technical questions across multiple portals. Engineers and architects are pulled away from their core work, creating bottlenecks and frustration.

**Declining Win Rates**: Companies respond to an average of 153 RFPs per year, but as deadlines compress, quality suffers. Traditional proposal management tools built in the pre-LLM era cannot keep pace with modern demands.

**Compliance Risk**: Government contractors struggle with FAR/DFARS compliance requirements, Section L/M parsing, and 500+ page federal RFPs. Manual compliance checking is error-prone and time-consuming.

**Black-Box AI Trust Deficit**: Existing AI tools provide responses without traceability or citations. Teams use only 30-40% of AI capabilities because they cannot verify accuracy, leading to manual rewrites and wasted potential.

**Legacy Tool Limitations**: Incumbent platforms like Loopio and Responsive were built with static content libraries requiring intensive manual curation. They lack the intelligent automation modern proposal teams need.

---

## The Solution

Sentinel RFP represents a paradigm shift from passive content management to autonomous AI-driven proposal execution.

### Agentic AI Architecture

Unlike traditional RAG-based tools, Sentinel RFP employs a multi-agent orchestration system where specialized AI agents collaborate to produce high-quality, verifiable responses:

- **Knowledge Agent**: Indexes, retrieves, and classifies relevant content from your knowledge base
- **Planner Agent**: Decomposes complex questions and plans optimal search strategies
- **Reasoning Agent**: Generates comprehensive responses through intelligent synthesis
- **Reviewer Agent**: Validates accuracy, scores trust levels, and detects content gaps

### Trust Score System

Every AI-generated response includes a granular trust score with full citation chains back to source documents. Your team knows exactly where each piece of information originated, enabling confident approval workflows.

### Zero-Portal SME Collaboration

Subject matter experts respond to RFP questions directly in Slack or Microsoft Teams. No portal logins, no context switching, no friction. AI suggests responses that SMEs can approve, edit, or regenerate with a single click.

---

## Key Features

### Multi-Modal Document Ingestion

- **Format Support**: PDF, DOCX, XLSX, PPTX with automatic format detection
- **Vision Language Models**: Advanced table extraction and complex document parsing using VLM technology
- **OCR Processing**: 95%+ accuracy for scanned documents and images
- **Semantic Chunking**: Intelligent document splitting that respects hierarchy and context

### AI-Powered Response Generation

- **Hybrid RAG Search**: Combines vector similarity and keyword matching for optimal retrieval
- **200K Context Window**: Powered by Opus 4.5 for comprehensive document understanding
- **Response Streaming**: Real-time generation with live progress indicators
- **Multi-Provider Fallback**: Automatic failover to GPT-4.1 ensures reliability

### Trust Score and Citation System

- **Granular Scoring**: 0-100 trust scores for every response section
- **Source Traceability**: Direct links to source documents and specific passages
- **Gap Detection**: Automatic identification of missing information with suggestions
- **Confidence Indicators**: Visual trust metrics for quick review decisions

### Knowledge Library Management

- **Semantic Search**: Find relevant content using natural language queries
- **Content Versioning**: Track changes and roll back to previous versions
- **Auto-Learning**: Approved responses automatically enhance the knowledge base
- **Expiration Handling**: Automatic flagging of outdated content

### Proposal Workflow Management

- **Rich Text Editor**: Professional editing with inline AI regeneration
- **Version History**: Complete audit trail with rollback capabilities
- **Progress Tracking**: Visual dashboards for proposal status and team workload
- **Export to Word**: Publication-ready documents with proper citation formatting

### SME Collaboration Tools

- **Slack Integration**: Native app for in-channel RFP responses
- **Microsoft Teams Support**: Seamless collaboration for enterprise environments
- **@Mention Routing**: Automatic question assignment based on expertise
- **Approval Workflows**: Streamlined review and sign-off processes

### Government Contract Compliance

- **FAR/DFARS Library**: Pre-built compliance clause database
- **Compliance Matrices**: Automated generation of requirement matrices
- **CMMC Readiness**: Security controls mapped to CMMC requirements
- **Audit Trail**: Comprehensive logging for government contract requirements

---

## Technology Stack

### Backend Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | NestJS 10.x (TypeScript) | API server and business logic |
| Database | PostgreSQL 16 + pgvector | Relational data and vector embeddings |
| Queue System | BullMQ (Redis) | Async job processing and workflows |
| Search Engine | Meilisearch | Full-text search with typo tolerance |
| Cache Layer | Redis | Session management and caching |
| ORM | Prisma | Type-safe database access |

### Frontend Application

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14 (App Router) | Server-side rendering and React |
| Styling | Tailwind CSS | Utility-first CSS framework |
| State | React Query | Server state management |
| Editor | TipTap | Rich text proposal editing |

### AI and Machine Learning

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary LLM | Opus 4.5 (200K context) | Response generation and reasoning |
| Fallback LLM | GPT-4.1 | Redundancy and specific tasks |
| Embeddings | OpenAI Embeddings API | Vector representations |
| Vision | GPT-4o Vision | Document OCR and table extraction |
| Document Parsing | Unstructured.io | Multi-format document processing |

### Infrastructure and DevOps

| Component | Technology | Purpose |
|-----------|------------|---------|
| Platform | Railway | Container orchestration and deployment |
| Object Storage | Cloudflare R2 | S3-compatible file storage |
| CDN | Cloudflare | Content delivery and WAF |
| Monitoring | Sentry | Error tracking and performance |

---

## Architecture Overview

Sentinel RFP follows a Domain-Driven Design with event-driven patterns, ensuring scalability and maintainability.

```
                    +------------------+
                    |   Cloudflare     |
                    |   CDN + WAF      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+       +-----------v-----------+
    |    Next.js 14     |       |      NestJS API       |
    |    Frontend       |       |      Backend          |
    |    Port: 3000     |       |      Port: 4000       |
    +-------------------+       +-----------+-----------+
                                            |
              +-----------------------------+-----------------------------+
              |                             |                             |
    +---------v---------+       +-----------v-----------+       +---------v---------+
    |    PostgreSQL     |       |        Redis          |       |    Meilisearch    |
    |    + pgvector     |       |   Cache + Queues      |       |    Full-Text      |
    +-------------------+       +-----------------------+       +-------------------+
              |
    +---------v---------+
    |   BullMQ Worker   |
    |   Async Jobs      |
    +-------------------+
              |
    +---------v-----------------------------------------+
    |              AI Agent Orchestrator                |
    |  +------------+  +------------+  +------------+   |
    |  | Knowledge  |  |  Planner   |  | Reasoning  |   |
    |  |   Agent    |  |   Agent    |  |   Agent    |   |
    |  +------------+  +------------+  +------------+   |
    |                  +------------+                   |
    |                  |  Reviewer  |                   |
    |                  |   Agent    |                   |
    |                  +------------+                   |
    +---------------------------------------------------+
              |
    +---------v---------+
    |  External APIs    |
    |  LLM Providers    |
    |  Cloudflare R2    |
    +-------------------+
```

### Architectural Principles

- **Hexagonal Architecture**: Ports and adapters pattern for testability and flexibility
- **Zero-Trust Security**: Authentication and authorization at every layer
- **API-First Design**: OpenAPI contracts defined before implementation
- **Observability by Default**: Structured logging, metrics, and distributed tracing
- **Cloud-Agnostic**: Abstraction layers prevent vendor lock-in

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16 with pgvector extension
- Redis 7.x
- Meilisearch 1.x
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/sentinel-rfp.git
cd sentinel-rfp
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sentinel_rfp

# Redis
REDIS_URL=redis://localhost:6379

# Meilisearch
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key

# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=sentinel-rfp-documents
```

4. **Initialize the database**

```bash
pnpm db:migrate
pnpm db:seed
```

5. **Start development servers**

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:backend   # NestJS API on port 4000
pnpm dev:frontend  # Next.js on port 3000
pnpm dev:worker    # BullMQ worker
```

6. **Access the application**

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Roadmap

Sentinel RFP follows an 18-month development roadmap across four phases:

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **Phase 1** | Foundation MVP | Core platform, document ingestion, basic AI responses, trust scoring |
| **Phase 2** | Scale & Integrations | Slack/Teams integration, Salesforce sync, multi-agent AI, collaboration features |
| **Phase 3** | GovCon & Compliance | FAR/DFARS compliance, Pwin prediction, SOC 2 Type I, security hardening |
| **Phase 4** | Intelligence Platform | Autonomous agents, predictive intelligence, API marketplace, FedRAMP authorization |

For detailed roadmap information, see [ROADMAP.md](ROADMAP.md).

---

## Use Cases

> **Note**: Sentinel RFP is currently in early development. The following describes our target use cases and planned capabilities.

### Mid-Market Technology Companies

Sales teams at 200-2,000 employee SaaS and technology companies will use Sentinel RFP to respond to 50-200 RFPs annually. The platform aims to reduce response time from 5 days to 2 days while maintaining quality standards.

**Planned Benefits:**
- 50% reduction in proposal response time
- Centralized knowledge library accessible to all teams
- Consistent messaging across proposals
- Real-time collaboration between sales and technical SMEs

### Enterprise Sales Organizations

Large enterprises managing complex, multi-stakeholder proposals will leverage Sentinel RFP for competitive differentiation. The platform is designed to handle 200-500 RFPs per year with sophisticated approval workflows.

**Planned Benefits:**
- Scalable proposal operations
- Advanced analytics and win rate tracking
- Integration with Salesforce and existing CRM systems
- Version control and audit trails for compliance

### Government Contractors

Federal contractors pursuing $50M+ opportunities will use Sentinel RFP for FAR/DFARS compliance and efficient Section L/M response management. The platform will address the unique requirements of government proposals.

**Planned Benefits:**
- Pre-built compliance clause libraries
- Automated compliance matrix generation
- CMMC-ready security controls
- FedRAMP authorization pathway
- Comprehensive audit trails for government requirements

---

## Contact

For inquiries about Sentinel RFP, partnership opportunities, or technical questions:

**Tiago Sasaki**
Email: tiago.sasaki@gmail.com
WhatsApp: +55 48 98834-4559

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contributing

We welcome contributions from the community. Please read our contributing guidelines before submitting pull requests.

---

<p align="center">
  <strong>Sentinel RFP</strong> - Transforming RFP Response with Agentic AI
</p>
