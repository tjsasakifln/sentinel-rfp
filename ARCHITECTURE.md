# Architecture Document

# Sentinel RFP (Sentinel RFP)

**Version:** 1.0.0
**Last Updated:** January 2026
**Status:** Approved
**Classification:** Internal

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Principles](#2-architectural-principles)
3. [System Context (C4 Level 1)](#3-system-context-c4-level-1)
4. [Container Architecture (C4 Level 2)](#4-container-architecture-c4-level-2)
5. [Component Architecture (C4 Level 3)](#5-component-architecture-c4-level-3)
6. [Data Architecture](#6-data-architecture)
7. [Integration Architecture](#7-integration-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Infrastructure Architecture](#9-infrastructure-architecture)
10. [Quality Attributes](#10-quality-attributes)
11. [Architecture Decision Records](#11-architecture-decision-records)
12. [Technology Stack](#12-technology-stack)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Future Considerations](#14-future-considerations)

---

## 1. Executive Summary

### 1.1 Vision

Sentinel RFP is an **agentic AI platform** for RFP response automation. Unlike legacy tools (Loopio, Responsive) that function as passive content repositories, Sentinel RFP employs autonomous AI agents that orchestrate the entire proposal lifecycle - from document ingestion to response generation with full traceability.

### 1.2 Key Architectural Decisions

| Decision                | Choice                       | Rationale                                         |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| **Backend Framework**   | NestJS + TypeScript          | Enterprise patterns, type safety, DI built-in     |
| **Frontend Framework**  | Next.js 14                   | SSR, App Router, Railway compatible               |
| **Database**            | PostgreSQL + pgvector        | Single DB for relational + vector, Railway native |
| **Queue System**        | BullMQ (Redis)               | TypeScript native, simple, reliable               |
| **AI Orchestration**    | Multi-Agent RAG              | Specialized agents > monolithic prompts           |
| **Deployment Platform** | Railway                      | PaaS simplicity, cost-effective for Phases 1-2    |
| **Architecture Style**  | Domain-Driven + Event-Driven | Clear boundaries, auditability                    |

### 1.3 Strategic Trade-offs

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRATEGIC TRADE-OFFS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CHOSEN                              DEFERRED                        │
│  ───────                             ────────                        │
│                                                                      │
│  ✓ Railway (simplicity)              ○ Kubernetes (control)          │
│  ✓ pgvector (unified DB)             ○ Pinecone (scale) - Phase 2+   │
│  ✓ BullMQ (simplicity)               ○ Kafka (throughput) - Phase 3  │
│  ✓ Meilisearch (self-hosted)         ○ Elasticsearch (features)      │
│  ✓ Monorepo (cohesion)               ○ Polyrepo (independence)       │
│  ✓ REST + GraphQL (flexibility)      ○ gRPC (performance)            │
│                                                                      │
│  REASON: Optimize for velocity and simplicity in Phases 1-2.        │
│  Architecture supports migration to enterprise stack in Phase 3.     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Target Metrics

| Metric                     | Target | Strategy                               |
| -------------------------- | ------ | -------------------------------------- |
| Document ingestion (100pg) | <60s   | Async pipeline, VLM parallel           |
| Response generation        | <3s    | Cached embeddings, prompt optimization |
| Search latency             | <500ms | pgvector + Redis cache                 |
| Uptime SLA                 | 99.9%  | Railway redundancy, health checks      |
| Concurrent users           | 1000+  | Horizontal scaling, connection pooling |

---

## 2. Architectural Principles

### 2.1 Core Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURAL PRINCIPLES                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DOMAIN-DRIVEN DESIGN                                            │
│     └─ Clear bounded contexts with explicit contracts               │
│                                                                      │
│  2. EVENT-DRIVEN ARCHITECTURE                                        │
│     └─ Async by default, events for cross-context communication     │
│                                                                      │
│  3. HEXAGONAL ARCHITECTURE                                           │
│     └─ Ports & Adapters for external service abstraction            │
│                                                                      │
│  4. ZERO TRUST SECURITY                                              │
│     └─ Never trust, always verify, least privilege                  │
│                                                                      │
│  5. API-FIRST DESIGN                                                 │
│     └─ Contracts defined before implementation                       │
│                                                                      │
│  6. OBSERVABILITY BY DEFAULT                                         │
│     └─ Structured logs, metrics, traces from day one                │
│                                                                      │
│  7. CLOUD-AGNOSTIC                                                   │
│     └─ Abstract infrastructure for future migration                 │
│                                                                      │
│  8. PROGRESSIVE ENHANCEMENT                                          │
│     └─ Features degrade gracefully under load/failure               │
│                                                                      │
│  9. COST-AWARE DESIGN                                                │
│     └─ FinOps mindset, LLM cost optimization                        │
│                                                                      │
│  10. TRUNK-BASED DEVELOPMENT                                         │
│      └─ Small PRs, feature flags, continuous deployment             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Guidelines

**Do:**

- Use dependency injection for all services
- Write tests before complex implementations
- Use feature flags for new capabilities
- Document ADRs for significant decisions
- Cache aggressively, invalidate precisely

**Don't:**

- Hard-code configuration values
- Create circular dependencies between modules
- Store secrets in code or environment files
- Make synchronous calls to external LLMs in request path
- Couple business logic to infrastructure

---

## 3. System Context (C4 Level 1)

### 3.1 Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌───────────────┐                                 │
│                           │   PROPOSAL    │                                 │
│                           │   MANAGERS    │                                 │
│                           │   (Marina)    │                                 │
│                           └───────┬───────┘                                 │
│                                   │                                          │
│    ┌───────────────┐              │              ┌───────────────┐          │
│    │     SMEs      │              │              │    CAPTURE    │          │
│    │   (Rafael)    │              │              │   DIRECTORS   │          │
│    │               │              │              │   (Carlos)    │          │
│    └───────┬───────┘              │              └───────┬───────┘          │
│            │                      │                      │                   │
│            │         ┌────────────▼────────────┐         │                   │
│            │         │                         │         │                   │
│            └────────▶│   NEXUS RESPONSE CORE   │◀────────┘                   │
│                      │                         │                             │
│                      │   • Ingest Documents    │                             │
│                      │   • Generate Responses  │                             │
│                      │   • Collaborate w/ SMEs │                             │
│                      │   • Calculate Pwin      │                             │
│                      │   • Export Proposals    │                             │
│                      │                         │                             │
│                      └───────────┬─────────────┘                             │
│                                  │                                           │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   SLACK /   │         │   CRM       │         │  DOCUMENT   │           │
│  │   TEAMS     │         │ (Salesforce │         │   STORAGE   │           │
│  │             │         │  HubSpot)   │         │ (Drive, SP) │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                              │
│                                  │                                           │
│                                  ▼                                           │
│                          ┌─────────────┐                                    │
│                          │   LLM       │                                    │
│                          │  PROVIDERS  │                                    │
│                          │ (Anthropic, │                                    │
│                          │   OpenAI)   │                                    │
│                          └─────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 External Systems

| System               | Integration Type | Purpose                        | Priority |
| -------------------- | ---------------- | ------------------------------ | -------- |
| **Anthropic Claude** | API              | Primary LLM for reasoning      | P0       |
| **OpenAI**           | API              | Fallback LLM, embeddings       | P0       |
| **Slack**            | Bot + API        | SME collaboration              | P0       |
| **Microsoft Teams**  | Bot + API        | SME collaboration (enterprise) | P0       |
| **Salesforce**       | REST API         | CRM sync, opportunity data     | P0       |
| **Google Drive**     | API + Webhooks   | Document source                | P0       |
| **SharePoint**       | Graph API        | Document source (enterprise)   | P0       |
| **Cloudflare R2**    | S3 API           | Object storage                 | P0       |
| **HubSpot**          | REST API         | CRM (mid-market)               | P1       |
| **Confluence**       | REST API         | Knowledge base                 | P1       |
| **DocuSign**         | API              | E-signatures                   | P2       |

---

## 4. Container Architecture (C4 Level 2)

### 4.1 Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTAINER ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         RAILWAY PROJECT                                │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐        │  │
│  │  │    WEB APP     │   │   API SERVER   │   │    WORKER      │        │  │
│  │  │   (Next.js)    │   │   (NestJS)     │   │   (BullMQ)     │        │  │
│  │  │                │   │                │   │                │        │  │
│  │  │ • Dashboard    │   │ • REST API     │   │ • Document     │        │  │
│  │  │ • Proposal     │   │ • GraphQL      │   │   Processing   │        │  │
│  │  │   Editor       │   │ • WebSocket    │   │ • Embedding    │        │  │
│  │  │ • Library      │   │ • Auth         │   │   Generation   │        │  │
│  │  │ • Settings     │   │                │   │ • Agent Tasks  │        │  │
│  │  │                │   │                │   │                │        │  │
│  │  │ Port: 3000     │   │ Port: 4000     │   │ No port        │        │  │
│  │  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘        │  │
│  │          │                    │                    │                  │  │
│  │          │    ┌───────────────┴───────────────┐    │                  │  │
│  │          │    │                               │    │                  │  │
│  │          │    ▼                               ▼    │                  │  │
│  │  ┌───────┴────────────┐             ┌─────────────┴───────┐          │  │
│  │  │    PostgreSQL      │             │       Redis         │          │  │
│  │  │    + pgvector      │             │                     │          │  │
│  │  │                    │             │ • Cache             │          │  │
│  │  │ • Users            │             │ • Sessions          │          │  │
│  │  │ • Organizations    │             │ • BullMQ Queues     │          │  │
│  │  │ • Proposals        │             │ • Pub/Sub           │          │  │
│  │  │ • Documents        │             │ • Rate Limiting     │          │  │
│  │  │ • Vectors          │             │                     │          │  │
│  │  │                    │             │                     │          │  │
│  │  └────────────────────┘             └─────────────────────┘          │  │
│  │                                                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │                      MEILISEARCH                                │   │  │
│  │  │                                                                 │   │  │
│  │  │  • Full-text Search     • Typo Tolerance     • Faceted Search  │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        EXTERNAL SERVICES                               │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│  │
│  │  │  Anthropic   │  │  OpenAI      │  │  Cloudflare  │  │  Sentry    ││  │
│  │  │  Claude API  │  │  API         │  │  R2 + CDN    │  │            ││  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘│  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│  │
│  │  │  Slack API   │  │  MS Graph    │  │  Salesforce  │  │  PostHog   ││  │
│  │  │              │  │  (Teams)     │  │  API         │  │  Analytics ││  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘│  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Container Responsibilities

| Container       | Technology               | Responsibilities          | Scaling                    |
| --------------- | ------------------------ | ------------------------- | -------------------------- |
| **Web App**     | Next.js 14               | UI, SSR, Static Assets    | Horizontal (Railway)       |
| **API Server**  | NestJS                   | Business Logic, Auth, API | Horizontal (Railway)       |
| **Worker**      | Node.js + BullMQ         | Background Jobs, AI Tasks | Horizontal (Railway)       |
| **PostgreSQL**  | PostgreSQL 16 + pgvector | Primary Data, Vectors     | Vertical (Railway Managed) |
| **Redis**       | Redis 7                  | Cache, Queue, Sessions    | Vertical (Railway Managed) |
| **Meilisearch** | Meilisearch              | Full-text Search          | Vertical (Railway)         |

### 4.3 Inter-Container Communication

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION PATTERNS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WEB APP ─────────▶ API SERVER                                      │
│  │                  HTTP/REST, GraphQL                               │
│  │                  WebSocket (real-time updates)                    │
│  │                                                                   │
│  API SERVER ──────▶ POSTGRESQL                                       │
│  │                  Prisma ORM, Connection Pool                      │
│  │                                                                   │
│  API SERVER ──────▶ REDIS                                            │
│  │                  ioredis, Cache/Sessions                          │
│  │                                                                   │
│  API SERVER ──────▶ WORKER (via Redis/BullMQ)                        │
│  │                  Job Queue (async tasks)                          │
│  │                                                                   │
│  WORKER ──────────▶ POSTGRESQL                                       │
│  │                  Prisma ORM (same pool)                           │
│  │                                                                   │
│  WORKER ──────────▶ LLM PROVIDERS                                    │
│  │                  HTTP/REST (Claude, OpenAI)                       │
│  │                                                                   │
│  API SERVER ──────▶ EXTERNAL INTEGRATIONS                            │
│                     HTTP/REST, Webhooks                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Architecture (C4 Level 3)

### 5.1 Backend API Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API SERVER COMPONENTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         PRESENTATION LAYER                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │ REST         │  │ GraphQL      │  │ WebSocket    │              │    │
│  │  │ Controllers  │  │ Resolvers    │  │ Gateways     │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         APPLICATION LAYER                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                        USE CASES                              │   │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │    │
│  │  │  │ Create      │ │ Generate    │ │ Search      │            │   │    │
│  │  │  │ Proposal    │ │ Response    │ │ Library     │            │   │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │    │
│  │  │  │ Ingest      │ │ Collaborate │ │ Calculate   │            │   │    │
│  │  │  │ Document    │ │ with SME    │ │ Pwin        │            │   │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          DOMAIN LAYER                                │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ IDENTITY   │ │ PROPOSAL   │ │ KNOWLEDGE  │ │ AI AGENTS  │       │    │
│  │  │            │ │            │ │            │ │            │       │    │
│  │  │ • User     │ │ • Proposal │ │ • Document │ │ • Orchestr │       │    │
│  │  │ • Org      │ │ • Section  │ │ • Chunk    │ │ • Knowledge│       │    │
│  │  │ • Role     │ │ • Question │ │ • Library  │ │ • Planner  │       │    │
│  │  │ • Perm     │ │ • Response │ │ • Citation │ │ • Reason   │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  │  ┌────────────┐ ┌────────────┐                                     │    │
│  │  │INTEGRATION │ │ ANALYTICS  │                                     │    │
│  │  │            │ │            │                                     │    │
│  │  │ • Slack    │ │ • Usage    │                                     │    │
│  │  │ • Teams    │ │ • WinLoss  │                                     │    │
│  │  │ • CRM      │ │ • Pwin     │                                     │    │
│  │  │ • Storage  │ │ • ROI      │                                     │    │
│  │  └────────────┘ └────────────┘                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      INFRASTRUCTURE LAYER                            │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ Prisma     │ │ Redis      │ │ BullMQ     │ │ HTTP       │       │    │
│  │  │ Repository │ │ Cache      │ │ Queue      │ │ Clients    │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ Meilisearch│ │ Storage    │ │ LLM        │ │ Event      │       │    │
│  │  │ Client     │ │ (R2)       │ │ Providers  │ │ Emitter    │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 AI Agent Orchestration System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AI AGENT ORCHESTRATION SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌────────────────────┐                         │
│                              │    ORCHESTRATOR    │                         │
│                              │                    │                         │
│                              │  • Task routing    │                         │
│                              │  • Agent lifecycle │                         │
│                              │  • Error handling  │                         │
│                              │  • Result merging  │                         │
│                              └─────────┬──────────┘                         │
│                                        │                                     │
│            ┌───────────────────────────┼───────────────────────────┐        │
│            │                           │                           │        │
│            ▼                           ▼                           ▼        │
│  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐│
│  │ KNOWLEDGE AGENT │         │  PLANNER AGENT  │         │ REASONING AGENT ││
│  │                 │         │                 │         │                 ││
│  │ Responsibilities│         │ Responsibilities│         │ Responsibilities││
│  │ ───────────────│         │ ───────────────│         │ ───────────────││
│  │ • Index docs   │         │ • Decompose     │         │ • Generate      ││
│  │ • Retrieve     │◀───────▶│   questions     │◀───────▶│   responses     ││
│  │ • Classify     │         │ • Plan search   │         │ • Synthesize    ││
│  │ • Score auth   │         │ • Parallelize   │         │ • Maintain tone ││
│  │                 │         │                 │         │                 ││
│  │ Uses:          │         │ Uses:           │         │ Uses:           ││
│  │ • pgvector     │         │ • Claude        │         │ • Claude 3.5    ││
│  │ • Meilisearch  │         │   (planning)    │         │   Sonnet        ││
│  │ • Embeddings   │         │                 │         │ • 200K context  ││
│  └─────────────────┘         └─────────────────┘         └────────┬────────┘│
│                                                                    │        │
│                                                                    ▼        │
│                                                          ┌─────────────────┐│
│                                                          │ REVIEWER AGENT  ││
│                                                          │                 ││
│                                                          │ Responsibilities││
│                                                          │ ───────────────││
│                                                          │ • Validate      ││
│                                                          │ • Score trust   ││
│                                                          │ • Check facts   ││
│                                                          │ • Detect gaps   ││
│                                                          │                 ││
│                                                          │ Outputs:        ││
│                                                          │ • Trust Score   ││
│                                                          │ • Citations     ││
│                                                          │ • Suggestions   ││
│                                                          └─────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           AGENT OUTPUT                               │    │
│  │                                                                      │    │
│  │  {                                                                   │    │
│  │    "response": "Generated response text...",                         │    │
│  │    "trust_score": 87,                                                │    │
│  │    "citations": [                                                    │    │
│  │      { "source": "Security Policy v2.3", "page": 12, "relevance": 0.95 }│ │
│  │    ],                                                                │    │
│  │    "suggestions": ["Consider mentioning SOC2 certification"],        │    │
│  │    "gaps": ["Missing: disaster recovery details"]                    │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Document Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCUMENT PROCESSING PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  UPLOAD  │───▶│  FORMAT  │───▶│  PARSE   │───▶│  CHUNK   │             │
│  │  HANDLER │    │ DETECTOR │    │  ENGINE  │    │  ENGINE  │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │               │               │               │                    │
│       ▼               ▼               ▼               ▼                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ • S3/R2  │    │ • PDF    │    │ • Text   │    │ • Hier-  │             │
│  │   Upload │    │ • DOCX   │    │   Extract│    │   archical│             │
│  │ • Virus  │    │ • XLSX   │    │ • Table  │    │ • Semantic│             │
│  │   Scan   │    │ • PPTX   │    │   Extract│    │ • Overlap │             │
│  │ • Meta   │    │ • HTML   │    │ • OCR    │    │   Config  │             │
│  │   Extract│    │          │    │ • VLM    │    │           │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                       │                    │
│                                                       ▼                    │
│                                              ┌──────────────────┐          │
│                                              │    EMBEDDING     │          │
│                                              │    PIPELINE      │          │
│                                              │                  │          │
│                                              │ • Batch process  │          │
│                                              │ • OpenAI embed   │          │
│                                              │ • Store pgvector │          │
│                                              │ • Index update   │          │
│                                              └──────────────────┘          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PARSING STRATEGIES                            │   │
│  │                                                                      │   │
│  │  PDF (native):      Unstructured.io + layout analysis               │   │
│  │  PDF (scanned):     GPT-4o Vision for OCR                           │   │
│  │  DOCX/XLSX/PPTX:    Apache POI / mammoth                            │   │
│  │  Tables:            VLM for complex, regex for simple               │   │
│  │  GovCon (L/M):      Custom parser + section detection               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Architecture

### 6.1 Database Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SINGLE DATABASE APPROACH (PostgreSQL + pgvector)                           │
│  ═══════════════════════════════════════════════                            │
│                                                                              │
│  Rationale:                                                                  │
│  • Simplifies operations (single backup, single connection)                 │
│  • Transaction consistency across relational + vector data                  │
│  • Railway manages PostgreSQL natively                                      │
│  • pgvector performance sufficient for Phase 1-2 scale                      │
│                                                                              │
│  Scale Trigger (migrate to Pinecone):                                       │
│  • >1M vectors per tenant                                                   │
│  • Query latency >100ms P95                                                 │
│  • Cost of vertical scaling exceeds Pinecone                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    POSTGRESQL CONFIGURATION                          │   │
│  │                                                                      │   │
│  │  Extensions:                                                         │   │
│  │  • pgvector (vector operations)                                      │   │
│  │  • pg_trgm (fuzzy text search)                                       │   │
│  │  • uuid-ossp (UUID generation)                                       │   │
│  │  • pgcrypto (encryption functions)                                   │   │
│  │                                                                      │   │
│  │  Indexes:                                                            │   │
│  │  • IVFFlat for vector similarity (lists=100)                         │   │
│  │  • GIN for JSONB columns                                             │   │
│  │  • B-tree for foreign keys and filters                               │   │
│  │  • GiST for full-text search                                         │   │
│  │                                                                      │   │
│  │  Connection Pool:                                                    │   │
│  │  • PgBouncer (Railway managed)                                       │   │
│  │  • Pool size: 20 per replica                                         │   │
│  │  • Statement timeout: 30s                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP MODEL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐          ┌──────────────────┐                        │
│  │  Organization    │          │      User        │                        │
│  │──────────────────│          │──────────────────│                        │
│  │ id: UUID PK      │──┐   ┌──▶│ id: UUID PK      │                        │
│  │ name: VARCHAR    │  │   │   │ organization_id  │◀─┐                     │
│  │ slug: VARCHAR UK │  │   │   │ email: VARCHAR UK│   │                     │
│  │ plan_type        │  │   │   │ name: VARCHAR    │   │                     │
│  │ settings: JSONB  │  │   │   │ role: ENUM       │   │                     │
│  │ data_residency   │  │   │   │ auth_provider    │   │                     │
│  │ cui_enabled      │  │   │   │ mfa_enabled      │   │                     │
│  └──────────────────┘  │   │   └──────────────────┘   │                     │
│           │            │   │            │              │                     │
│           │            │   │            │              │                     │
│           ▼            │   │            ▼              │                     │
│  ┌──────────────────┐  │   │   ┌──────────────────┐   │                     │
│  │    Workspace     │  │   │   │   Integration    │   │                     │
│  │──────────────────│  │   │   │──────────────────│   │                     │
│  │ id: UUID PK      │  │   │   │ id: UUID PK      │   │                     │
│  │ organization_id  │◀─┘   │   │ organization_id  │   │                     │
│  │ name: VARCHAR    │      │   │ type: ENUM       │   │                     │
│  │ settings: JSONB  │      │   │ credentials: ENC │   │                     │
│  └──────────────────┘      │   │ status: ENUM     │   │                     │
│           │                │   └──────────────────┘   │                     │
│           │                │                          │                     │
│           ▼                │                          │                     │
│  ┌──────────────────┐      │                          │                     │
│  │    Proposal      │      │                          │                     │
│  │──────────────────│      │                          │                     │
│  │ id: UUID PK      │      │                          │                     │
│  │ organization_id  │──────┘                          │                     │
│  │ title: VARCHAR   │                                 │                     │
│  │ client_name      │                                 │                     │
│  │ status: ENUM     │                                 │                     │
│  │ due_date         │                                 │                     │
│  │ pwin_score       │                                 │                     │
│  │ win_themes: []   │                                 │                     │
│  │ created_by       │─────────────────────────────────┘                     │
│  └──────────────────┘                                                       │
│           │                                                                  │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                            │
│  │    Section       │      │    Question      │                            │
│  │──────────────────│      │──────────────────│                            │
│  │ id: UUID PK      │─────▶│ id: UUID PK      │                            │
│  │ proposal_id FK   │      │ section_id FK    │                            │
│  │ title: VARCHAR   │      │ question_text    │                            │
│  │ order: INT       │      │ requirement_type │                            │
│  └──────────────────┘      │ status: ENUM     │                            │
│                            │ assigned_to FK   │                            │
│                            └──────────────────┘                            │
│                                     │                                       │
│                                     ▼                                       │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │  LibraryEntry    │      │    Response      │      │    Citation      │ │
│  │──────────────────│      │──────────────────│      │──────────────────│ │
│  │ id: UUID PK      │◀─────│ id: UUID PK      │─────▶│ id: UUID PK      │ │
│  │ organization_id  │      │ question_id FK   │      │ response_id FK   │ │
│  │ title: VARCHAR   │      │ content: TEXT    │      │ source_type      │ │
│  │ content: TEXT    │      │ version: INT     │      │ source_id        │ │
│  │ embedding: VEC   │      │ trust_score      │      │ relevance_score  │ │
│  │ authority_score  │      │ generated_by     │      └──────────────────┘ │
│  │ status: ENUM     │      │ model_used       │                           │
│  └──────────────────┘      └──────────────────┘                           │
│           │                                                                 │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                           │
│  │    Document      │      │     Chunk        │                           │
│  │──────────────────│      │──────────────────│                           │
│  │ id: UUID PK      │─────▶│ id: UUID PK      │                           │
│  │ organization_id  │      │ document_id FK   │                           │
│  │ filename         │      │ content: TEXT    │                           │
│  │ file_type        │      │ embedding: VEC   │                           │
│  │ storage_path     │      │ page_number      │                           │
│  │ processing_status│      │ hierarchy_path[] │                           │
│  │ structure: JSONB │      │ token_count      │                           │
│  └──────────────────┘      └──────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Cache Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CACHE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  L1: APPLICATION MEMORY (Node.js)                                           │
│  ───────────────────────────────                                            │
│  • TTL: 60 seconds                                                          │
│  • Size: 100MB max per instance                                             │
│  • Use: Hot path data, computed values                                      │
│  • Implementation: lru-cache                                                │
│                                                                              │
│  L2: REDIS CACHE                                                            │
│  ──────────────                                                             │
│  • TTL: 5 minutes (configurable per key pattern)                            │
│  • Use: Session data, API responses, embeddings                             │
│  • Key patterns:                                                            │
│    - session:{userId}                                                       │
│    - embed:{hash}                                                           │
│    - search:{orgId}:{queryHash}                                             │
│    - response:{questionId}                                                  │
│                                                                              │
│  L3: DATABASE QUERY CACHE (Prisma)                                          │
│  ─────────────────────────────────                                          │
│  • Use: Repeated queries, aggregations                                      │
│  • Strategy: Query-level caching with invalidation                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CACHE INVALIDATION RULES                          │   │
│  │                                                                      │   │
│  │  Event                          Invalidate Keys                      │   │
│  │  ───────────────────────────────────────────────────────────         │   │
│  │  proposal.updated               search:{orgId}:*                     │   │
│  │  library.entry.updated          embed:{entryId}, search:{orgId}:*    │   │
│  │  document.processed             embed:{docId}:*, search:{orgId}:*    │   │
│  │  user.permissions.changed       session:{userId}                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Integration Architecture

### 7.1 Integration Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION PATTERNS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PATTERN 1: WEBHOOK (Inbound)                                               │
│  ════════════════════════════                                               │
│                                                                              │
│  External Service ──────▶ /api/webhooks/{provider}                          │
│                                │                                             │
│                                ▼                                             │
│                         ┌─────────────┐                                     │
│                         │  Webhook    │                                     │
│                         │  Handler    │                                     │
│                         │             │                                     │
│                         │ • Verify    │                                     │
│                         │   signature │                                     │
│                         │ • Parse     │                                     │
│                         │   payload   │                                     │
│                         │ • Enqueue   │                                     │
│                         │   job       │                                     │
│                         └─────────────┘                                     │
│                                │                                             │
│                                ▼                                             │
│                         ┌─────────────┐                                     │
│                         │  BullMQ     │                                     │
│                         │  Queue      │                                     │
│                         └─────────────┘                                     │
│                                                                              │
│  PATTERN 2: POLLING (Outbound)                                              │
│  ═════════════════════════════                                              │
│                                                                              │
│                         ┌─────────────┐                                     │
│                         │  Scheduled  │                                     │
│                         │  Job        │                                     │
│                         │  (cron)     │                                     │
│                         └─────────────┘                                     │
│                                │                                             │
│                                ▼                                             │
│                         ┌─────────────┐                                     │
│                         │  Sync       │──────▶ External API                 │
│                         │  Service    │◀──────                              │
│                         │             │                                     │
│                         │ • Fetch     │                                     │
│                         │   changes   │                                     │
│                         │ • Transform │                                     │
│                         │ • Store     │                                     │
│                         └─────────────┘                                     │
│                                                                              │
│  PATTERN 3: EVENT-DRIVEN (Outbound)                                         │
│  ══════════════════════════════════                                         │
│                                                                              │
│       Internal Event ──────▶ Event Handler ──────▶ External API             │
│                                    │                                         │
│                                    ▼                                         │
│                              Retry Queue (exponential backoff)              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 LLM Provider Abstraction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LLM PROVIDER ABSTRACTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌────────────────────┐                             │
│                          │   LLM Service      │                             │
│                          │   (Interface)      │                             │
│                          │                    │                             │
│                          │ • complete()       │                             │
│                          │ • stream()         │                             │
│                          │ • embed()          │                             │
│                          │ • moderate()       │                             │
│                          └─────────┬──────────┘                             │
│                                    │                                         │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          │                         │                         │              │
│          ▼                         ▼                         ▼              │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐       │
│  │ Anthropic     │        │ OpenAI        │        │ Self-Hosted   │       │
│  │ Provider      │        │ Provider      │        │ Provider      │       │
│  │               │        │               │        │ (Future)      │       │
│  │ • Claude 3.5  │        │ • GPT-4o      │        │               │       │
│  │   Sonnet      │        │ • GPT-4       │        │ • Llama       │       │
│  │ • Claude 3    │        │ • GPT-3.5     │        │ • Mistral     │       │
│  │   Opus        │        │               │        │               │       │
│  └───────────────┘        └───────────────┘        └───────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ROUTING STRATEGY                                │   │
│  │                                                                      │   │
│  │  Task Type              Primary         Fallback       Model         │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Response Generation    Anthropic       OpenAI         Claude 3.5    │   │
│  │  Planning               Anthropic       OpenAI         Claude 3.5    │   │
│  │  Review/Critique        Anthropic       OpenAI         Claude 3.5    │   │
│  │  Embeddings             OpenAI          -              text-embed-3  │   │
│  │  Classification         OpenAI          Anthropic      GPT-3.5       │   │
│  │  Vision/OCR             OpenAI          Anthropic      GPT-4o        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      COST OPTIMIZATION                               │   │
│  │                                                                      │   │
│  │  Strategy                        Implementation                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Response Caching                Hash-based cache for similar queries│   │
│  │  Prompt Compression              Remove redundant context             │   │
│  │  Model Tiering                   Use smaller models for simple tasks │   │
│  │  Batch Processing                Aggregate embeddings requests        │   │
│  │  Budget Alerts                   Per-tenant LLM cost tracking         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 API Gateway Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY DESIGN                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              Client Request                                  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        RAILWAY EDGE                                  │   │
│  │  • TLS Termination   • DDoS Protection   • Geographic Routing       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        NEST.JS MIDDLEWARE                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │   CORS      │─▶│   Auth      │─▶│   Rate      │─▶│   Logging   ││   │
│  │  │   Guard     │  │   Guard     │  │   Limiter   │  │   Interceptor│   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  │                                                                      │   │
│  │  Rate Limiting (Redis-based):                                        │   │
│  │  • Public endpoints: 100 req/min per IP                              │   │
│  │  • Authenticated: 1000 req/min per user                              │   │
│  │  • AI endpoints: 50 req/min per user (configurable by plan)          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API VERSIONING                               │   │
│  │                                                                      │   │
│  │  Strategy: URL-based versioning                                      │   │
│  │  Current: /api/v1/                                                   │   │
│  │  Deprecation: 6 months notice, 12 months support                     │   │
│  │                                                                      │   │
│  │  Endpoints:                                                          │   │
│  │  ├── /api/v1/proposals        (REST)                                │   │
│  │  ├── /api/v1/library          (REST)                                │   │
│  │  ├── /api/v1/documents        (REST)                                │   │
│  │  ├── /api/v1/ai               (REST)                                │   │
│  │  ├── /api/v1/integrations     (REST)                                │   │
│  │  ├── /api/v1/webhooks         (Inbound webhooks)                    │   │
│  │  ├── /graphql                 (GraphQL)                             │   │
│  │  └── /ws                      (WebSocket)                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Security Architecture

### 8.1 Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY MODEL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ZERO TRUST ARCHITECTURE                                                    │
│  ═══════════════════════                                                    │
│                                                                              │
│  Principles:                                                                 │
│  • Never trust, always verify                                               │
│  • Least privilege access                                                   │
│  • Assume breach mentality                                                  │
│  • Continuous verification                                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     AUTHENTICATION FLOW                              │   │
│  │                                                                      │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐            │   │
│  │  │ Client  │──▶│ Auth    │──▶│ Token   │──▶│ Session │            │   │
│  │  │         │   │ Provider│   │ Verify  │   │ Create  │            │   │
│  │  │         │   │ (Clerk/ │   │         │   │         │            │   │
│  │  │         │   │  Auth0) │   │         │   │         │            │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘            │   │
│  │                                                │                    │   │
│  │                                                ▼                    │   │
│  │                                      ┌─────────────────┐           │   │
│  │                                      │ Redis Session   │           │   │
│  │                                      │ Store           │           │   │
│  │                                      │ (TTL: 24h)      │           │   │
│  │                                      └─────────────────┘           │   │
│  │                                                                      │   │
│  │  Supported Providers:                                                │   │
│  │  • Email/Password (with MFA)                                        │   │
│  │  • Google OAuth                                                      │   │
│  │  • Microsoft OAuth (Enterprise)                                      │   │
│  │  • SAML SSO (Enterprise)                                             │   │
│  │  • OIDC (Enterprise)                                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     AUTHORIZATION MODEL (RBAC)                       │   │
│  │                                                                      │   │
│  │  Role                Permissions                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  OWNER               Full access, billing, delete org                │   │
│  │  ADMIN               User management, settings, integrations         │   │
│  │  MANAGER             Create/edit proposals, manage library           │   │
│  │  CONTRIBUTOR         Edit assigned proposals, view library           │   │
│  │  SME                 Respond to requests via Slack/Teams             │   │
│  │  VIEWER              Read-only access                                │   │
│  │                                                                      │   │
│  │  Permission Checks:                                                  │   │
│  │  • Resource-level (proposal, document, library entry)                │   │
│  │  • Action-level (create, read, update, delete, export)               │   │
│  │  • Field-level (sensitive fields like pricing)                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Protection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA PROTECTION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ENCRYPTION                                                                  │
│  ══════════                                                                  │
│                                                                              │
│  In Transit:                                                                 │
│  • TLS 1.3 for all external connections                                     │
│  • mTLS for internal service communication (future)                         │
│                                                                              │
│  At Rest:                                                                    │
│  • AES-256 for database (Railway managed)                                   │
│  • AES-256 for object storage (Cloudflare R2)                               │
│  • Application-level encryption for sensitive fields:                       │
│    - Integration credentials (using @prisma/client encryption)              │
│    - API keys                                                               │
│    - PII fields                                                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     TENANT ISOLATION                                 │   │
│  │                                                                      │   │
│  │  Strategy: Row-Level Security (RLS) + Application-Level Checks       │   │
│  │                                                                      │   │
│  │  Implementation:                                                     │   │
│  │  1. Every table has organization_id column                          │   │
│  │  2. Prisma middleware enforces tenant filter on all queries         │   │
│  │  3. PostgreSQL RLS policies as defense in depth                     │   │
│  │  4. API responses stripped of cross-tenant data                     │   │
│  │                                                                      │   │
│  │  Example Policy:                                                     │   │
│  │  ───────────────                                                    │   │
│  │  CREATE POLICY tenant_isolation ON proposals                        │   │
│  │    USING (organization_id = current_setting('app.tenant_id')::uuid);│   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     LLM DATA PROTECTION                              │   │
│  │                                                                      │   │
│  │  Zero Data Retention (ZDR) Policy:                                   │   │
│  │  • Anthropic: Enterprise agreement with ZDR                          │   │
│  │  • OpenAI: API Terms with ZDR                                        │   │
│  │  • No customer data used for training                                │   │
│  │                                                                      │   │
│  │  Data Minimization:                                                  │   │
│  │  • Only send necessary context to LLMs                               │   │
│  │  • PII detection and redaction before LLM calls                      │   │
│  │  • Audit logs of all LLM interactions                                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Compliance Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLIANCE ROADMAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 (Launch):                                                          │
│  ├── GDPR Compliant                                                         │
│  ├── CCPA Compliant                                                         │
│  ├── SOC 2 Type I Readiness                                                 │
│  └── Security controls documented                                           │
│                                                                              │
│  PHASE 2 (Month 6-12):                                                      │
│  ├── SOC 2 Type II Certification                                            │
│  ├── ISO 27001 Gap Analysis                                                 │
│  └── Penetration Testing (Annual)                                           │
│                                                                              │
│  PHASE 3 (Month 12-18):                                                     │
│  ├── ISO 27001 Certification                                                │
│  ├── FedRAMP Ready Assessment                                               │
│  ├── CMMC Level 2 Preparation                                               │
│  └── CUI Environment (separate infra)                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SECURITY CONTROLS                                │   │
│  │                                                                      │   │
│  │  Access Control:                                                     │   │
│  │  ✓ MFA required for all users                                       │   │
│  │  ✓ SSO integration (SAML, OIDC)                                     │   │
│  │  ✓ RBAC with least privilege                                        │   │
│  │  ✓ Session timeout (24h, configurable)                              │   │
│  │                                                                      │   │
│  │  Audit Logging:                                                      │   │
│  │  ✓ All data access logged                                           │   │
│  │  ✓ All admin actions logged                                         │   │
│  │  ✓ Immutable audit trail                                            │   │
│  │  ✓ 7-year retention (GovCon)                                        │   │
│  │                                                                      │   │
│  │  Incident Response:                                                  │   │
│  │  ✓ Documented IRP                                                   │   │
│  │  ✓ 72-hour breach notification                                      │   │
│  │  ✓ Regular tabletop exercises                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Infrastructure Architecture

### 9.1 Railway Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAILWAY DEPLOYMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROJECT STRUCTURE                                                          │
│  ═════════════════                                                          │
│                                                                              │
│  sentinel-rfp (Railway Project)                                             │
│  ├── web (Service)                                                          │
│  │   ├── Source: apps/web                                                   │
│  │   ├── Builder: Nixpacks (auto-detect)                                   │
│  │   ├── Port: 3000                                                        │
│  │   ├── Replicas: 2+ (auto-scale)                                         │
│  │   └── Domain: app.nexusresponse.com                                     │
│  │                                                                          │
│  ├── api (Service)                                                          │
│  │   ├── Source: apps/api                                                   │
│  │   ├── Builder: Dockerfile                                               │
│  │   ├── Port: 4000                                                        │
│  │   ├── Replicas: 2+ (auto-scale)                                         │
│  │   └── Domain: api.nexusresponse.com                                     │
│  │                                                                          │
│  ├── worker (Service)                                                       │
│  │   ├── Source: apps/worker                                               │
│  │   ├── Builder: Dockerfile                                               │
│  │   ├── Port: none                                                        │
│  │   └── Replicas: 2+ (scale by queue depth)                               │
│  │                                                                          │
│  ├── postgres (Database)                                                    │
│  │   ├── Plugin: PostgreSQL                                                │
│  │   ├── Version: 16                                                       │
│  │   └── Extensions: pgvector, pg_trgm                                     │
│  │                                                                          │
│  ├── redis (Database)                                                       │
│  │   ├── Plugin: Redis                                                     │
│  │   ├── Version: 7                                                        │
│  │   └── Persistence: AOF                                                  │
│  │                                                                          │
│  └── meilisearch (Service)                                                  │
│      ├── Image: getmeili/meilisearch:latest                                │
│      ├── Volume: /meili_data                                               │
│      └── Port: 7700                                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ENVIRONMENT CONFIGURATION                        │   │
│  │                                                                      │   │
│  │  Railway automatically provides:                                     │   │
│  │  • DATABASE_URL (PostgreSQL connection string)                       │   │
│  │  • REDIS_URL (Redis connection string)                               │   │
│  │  • PORT (assigned port)                                              │   │
│  │  • RAILWAY_ENVIRONMENT (production/staging)                          │   │
│  │                                                                      │   │
│  │  Application secrets (configured in Railway):                        │   │
│  │  • ANTHROPIC_API_KEY                                                 │   │
│  │  • OPENAI_API_KEY                                                    │   │
│  │  • CLERK_SECRET_KEY                                                  │   │
│  │  • SLACK_BOT_TOKEN                                                   │   │
│  │  • SALESFORCE_CLIENT_SECRET                                          │   │
│  │  • R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY                           │   │
│  │  • SENTRY_DSN                                                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              Git Push                                        │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GITHUB ACTIONS WORKFLOW                           │   │
│  │                                                                      │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐            │   │
│  │  │ Lint &  │──▶│  Test   │──▶│  Build  │──▶│Security │            │   │
│  │  │ Format  │   │         │   │         │   │  Scan   │            │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘            │   │
│  │                                                 │                    │   │
│  │  Lint:          Test:         Build:           Scan:               │   │
│  │  • ESLint       • Unit        • TypeScript     • Snyk              │   │
│  │  • Prettier     • Integration • Docker         • Trivy             │   │
│  │  • TypeScript   • E2E (cy)    • Turbo cache    • npm audit         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│               ┌──────────────────┼──────────────────┐                       │
│               │                  │                  │                       │
│               ▼                  ▼                  ▼                       │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │   PR Preview    │   │    Staging      │   │   Production    │          │
│  │   (Auto)        │   │   (Auto)        │   │   (Manual)      │          │
│  │                 │   │                 │   │                 │          │
│  │ • Per-PR env    │   │ • main branch   │   │ • Tag release   │          │
│  │ • Auto-cleanup  │   │ • Full stack    │   │ • Approval req  │          │
│  │                 │   │ • Seed data     │   │ • Rollback plan │          │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     DEPLOYMENT STRATEGY                              │   │
│  │                                                                      │   │
│  │  Strategy: Rolling deployment (Railway default)                      │   │
│  │                                                                      │   │
│  │  Process:                                                            │   │
│  │  1. New instance spins up with new code                             │   │
│  │  2. Health check passes (/health endpoint)                          │   │
│  │  3. Traffic gradually shifts to new instance                        │   │
│  │  4. Old instance terminates                                         │   │
│  │                                                                      │   │
│  │  Rollback:                                                           │   │
│  │  • Instant via Railway dashboard                                    │   │
│  │  • Or git revert + push                                             │   │
│  │  • Database migrations: use reversible migrations only               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MONITORING & OBSERVABILITY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         METRICS                                      │   │
│  │                                                                      │   │
│  │  Railway Metrics (built-in):                                         │   │
│  │  • CPU usage per service                                             │   │
│  │  • Memory usage per service                                          │   │
│  │  • Network I/O                                                       │   │
│  │  • Request count / latency                                           │   │
│  │                                                                      │   │
│  │  Application Metrics (Sentry + PostHog):                             │   │
│  │  • API response times (P50, P95, P99)                                │   │
│  │  • Error rates by endpoint                                           │   │
│  │  • LLM latency and costs                                             │   │
│  │  • Queue depth and processing time                                   │   │
│  │  • Active users (DAU/MAU)                                            │   │
│  │  • Feature usage analytics                                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         LOGGING                                      │   │
│  │                                                                      │   │
│  │  Format: Structured JSON (pino)                                      │   │
│  │                                                                      │   │
│  │  {                                                                   │   │
│  │    "level": "info",                                                  │   │
│  │    "time": "2026-01-15T10:30:00Z",                                   │   │
│  │    "msg": "Response generated",                                      │   │
│  │    "traceId": "abc123",                                              │   │
│  │    "userId": "user_xyz",                                             │   │
│  │    "organizationId": "org_abc",                                      │   │
│  │    "proposalId": "prop_123",                                         │   │
│  │    "trustScore": 87,                                                 │   │
│  │    "durationMs": 2340                                                │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  Log Levels:                                                         │   │
│  │  • error: Errors requiring attention                                 │   │
│  │  • warn: Potential issues                                            │   │
│  │  • info: Business events (default in prod)                           │   │
│  │  • debug: Development details                                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ALERTING                                     │   │
│  │                                                                      │   │
│  │  Channel: Slack (#alerts-prod)                                       │   │
│  │                                                                      │   │
│  │  Alert                     Threshold           Action                │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Error rate spike          >1% in 5min         Page on-call          │   │
│  │  API latency               P95 >5s             Notify team           │   │
│  │  Queue depth               >1000 jobs          Scale workers         │   │
│  │  LLM cost spike            >$100/hour          Alert finance         │   │
│  │  Database CPU              >80%                Investigate           │   │
│  │  Memory pressure           >85%                Scale service         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Quality Attributes

### 10.1 Performance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE TARGETS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Metric                    Target          Strategy                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Document ingest (100pg)   <60s            Async, parallel VLM              │
│  Response generation       <3s P95         Prompt cache, streaming          │
│  Search query              <500ms P95      pgvector + Redis cache           │
│  Page load (TTI)           <2s             SSR, code splitting              │
│  API response              <200ms P95      Connection pool, cache           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OPTIMIZATION STRATEGIES                           │   │
│  │                                                                      │   │
│  │  Database:                                                           │   │
│  │  • Connection pooling (PgBouncer)                                   │   │
│  │  • Query optimization (EXPLAIN ANALYZE)                              │   │
│  │  • Proper indexing (B-tree, IVFFlat)                                │   │
│  │  • Read replicas (future)                                           │   │
│  │                                                                      │   │
│  │  Caching:                                                            │   │
│  │  • Redis for hot data                                               │   │
│  │  • Application-level LRU                                            │   │
│  │  • CDN for static assets                                            │   │
│  │  • Embedding cache                                                   │   │
│  │                                                                      │   │
│  │  LLM Optimization:                                                   │   │
│  │  • Response streaming                                               │   │
│  │  • Semantic caching for similar queries                             │   │
│  │  • Prompt compression                                               │   │
│  │  • Batch embedding requests                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Scalability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCALABILITY DESIGN                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HORIZONTAL SCALING                                                         │
│  ═══════════════════                                                        │
│                                                                              │
│  Service          Scaling Trigger           Max Replicas                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Web              CPU >70% or RPS >500      10                              │
│  API              CPU >70% or RPS >1000     20                              │
│  Worker           Queue depth >100          10                              │
│                                                                              │
│  VERTICAL SCALING                                                           │
│  ═════════════════                                                          │
│                                                                              │
│  Service          Current         Scale Trigger                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  PostgreSQL       8GB RAM         Connections >80%                          │
│  Redis            2GB RAM         Memory >80%                               │
│  Meilisearch      4GB RAM         Index size >80%                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SCALE MIGRATION PATH                              │   │
│  │                                                                      │   │
│  │  Current (Phase 1-2):                                               │   │
│  │  ├── Railway managed PostgreSQL (8GB)                               │   │
│  │  ├── Railway managed Redis (2GB)                                    │   │
│  │  └── Single region (us-west)                                        │   │
│  │                                                                      │   │
│  │  Scale Trigger (>$50K MRR or >100 concurrent users):                │   │
│  │  ├── Consider Neon (PostgreSQL) for serverless scaling              │   │
│  │  ├── Consider Upstash (Redis) for global edge                       │   │
│  │  ├── Add CDN edge caching (Cloudflare)                              │   │
│  │  └── Add read replicas                                              │   │
│  │                                                                      │   │
│  │  Enterprise (Phase 3):                                              │   │
│  │  ├── AWS/GCP for GovCloud requirements                              │   │
│  │  ├── Kubernetes for fine-grained control                            │   │
│  │  ├── Multi-region deployment                                        │   │
│  │  └── Dedicated infrastructure per enterprise tenant                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Reliability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RELIABILITY DESIGN                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SLA TARGETS                                                                │
│  ═══════════                                                                │
│                                                                              │
│  Plan              Uptime SLA      RPO           RTO                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Growth            99.5%           24 hours      8 hours                    │
│  Scale             99.9%           1 hour        4 hours                    │
│  Enterprise        99.95%          15 min        1 hour                     │
│  GovCon            99.99%          5 min         30 min                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FAULT TOLERANCE                                   │   │
│  │                                                                      │   │
│  │  Retry Policies:                                                     │   │
│  │  • LLM calls: 3 retries, exponential backoff, fallback provider     │   │
│  │  • External APIs: 3 retries, circuit breaker                        │   │
│  │  • Database: connection retry with backoff                          │   │
│  │  • Queue jobs: 3 retries, dead letter queue                         │   │
│  │                                                                      │   │
│  │  Circuit Breaker Pattern:                                            │   │
│  │  • Threshold: 5 failures in 30 seconds                              │   │
│  │  • Open state: 60 seconds                                           │   │
│  │  • Half-open: test with single request                              │   │
│  │                                                                      │   │
│  │  Graceful Degradation:                                               │   │
│  │  • LLM unavailable: Show cached responses, queue for later          │   │
│  │  • Search unavailable: Fall back to database LIKE queries           │   │
│  │  • Integration down: Queue actions, notify user                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BACKUP & RECOVERY                                 │   │
│  │                                                                      │   │
│  │  PostgreSQL:                                                         │   │
│  │  • Railway automated daily backups                                  │   │
│  │  • Point-in-time recovery (PITR)                                    │   │
│  │  • Manual backup before migrations                                  │   │
│  │                                                                      │   │
│  │  Redis:                                                              │   │
│  │  • AOF persistence                                                  │   │
│  │  • Railway automated snapshots                                      │   │
│  │                                                                      │   │
│  │  Object Storage (R2):                                               │   │
│  │  • 99.999999999% durability                                         │   │
│  │  • Cross-region replication (optional)                              │   │
│  │                                                                      │   │
│  │  Recovery Procedures:                                                │   │
│  │  • Documented runbooks for common scenarios                         │   │
│  │  • Quarterly DR drills                                              │   │
│  │  • Automated health checks                                          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Architecture Decision Records

### Summary Table

| ADR     | Decision                   | Status   | Consequences                      |
| ------- | -------------------------- | -------- | --------------------------------- |
| ADR-001 | Event-Driven Architecture  | Accepted | Async by default, Redis Streams   |
| ADR-002 | Multi-Agent RAG            | Accepted | Specialized agents, orchestration |
| ADR-003 | pgvector + Pinecone Hybrid | Accepted | pgvector first, Pinecone at scale |
| ADR-004 | NestJS over FastAPI        | Accepted | TypeScript ecosystem, DI          |
| ADR-005 | Row-Level Tenant Isolation | Accepted | RLS + middleware                  |
| ADR-006 | LLM Provider Abstraction   | Accepted | Multi-provider support            |
| ADR-007 | CQRS for Proposals         | Accepted | Separate read/write models        |
| ADR-008 | Saga Pattern for Workflows | Accepted | Distributed transactions          |

_Full ADRs available in `/docs/adr/` directory._

---

## 12. Technology Stack

### Complete Stack Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                    │
│  ────────                                                                   │
│  Framework:        Next.js 14 (App Router)                                  │
│  Language:         TypeScript 5.x                                           │
│  State:            Zustand + TanStack Query                                 │
│  UI Components:    Radix UI + Tailwind CSS                                  │
│  Forms:            React Hook Form + Zod                                    │
│  Editor:           TipTap (ProseMirror)                                     │
│  Charts:           Recharts                                                 │
│  Testing:          Vitest + Testing Library + Playwright                    │
│                                                                              │
│  BACKEND                                                                     │
│  ───────                                                                    │
│  Framework:        NestJS 10.x                                              │
│  Language:         TypeScript 5.x                                           │
│  ORM:              Prisma                                                   │
│  Validation:       class-validator + class-transformer                      │
│  API:              REST + GraphQL (Apollo)                                  │
│  WebSocket:        Socket.io                                                │
│  Testing:          Jest + Supertest                                         │
│                                                                              │
│  DATA                                                                        │
│  ────                                                                       │
│  Primary DB:       PostgreSQL 16 + pgvector                                 │
│  Cache:            Redis 7                                                  │
│  Search:           Meilisearch                                              │
│  Queue:            BullMQ (Redis-based)                                     │
│  Object Storage:   Cloudflare R2                                            │
│                                                                              │
│  AI/ML                                                                       │
│  ─────                                                                      │
│  Primary LLM:      Anthropic Claude 3.5 Sonnet                              │
│  Fallback LLM:     OpenAI GPT-4o                                            │
│  Embeddings:       OpenAI text-embedding-3-large                            │
│  VLM/OCR:          GPT-4o Vision                                            │
│  SDK:              Anthropic SDK, OpenAI SDK                                │
│  Orchestration:    Custom (no LangChain dependency)                         │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  ──────────────                                                             │
│  Platform:         Railway                                                  │
│  CDN:              Cloudflare                                               │
│  DNS:              Cloudflare                                               │
│  SSL:              Railway (auto)                                           │
│                                                                              │
│  DEVOPS                                                                      │
│  ──────                                                                     │
│  CI/CD:            GitHub Actions + Railway Deployments                     │
│  Monorepo:         Turborepo                                                │
│  Package Manager:  pnpm                                                     │
│  Linting:          ESLint + Prettier                                        │
│  Git Hooks:        Husky + lint-staged                                      │
│                                                                              │
│  OBSERVABILITY                                                               │
│  ─────────────                                                              │
│  Error Tracking:   Sentry                                                   │
│  Analytics:        PostHog                                                  │
│  Logging:          Pino (structured JSON)                                   │
│  Metrics:          Railway built-in + custom                                │
│                                                                              │
│  SECURITY                                                                    │
│  ────────                                                                   │
│  Auth:             Clerk (or Auth0)                                         │
│  Secrets:          Railway environment variables                            │
│  Scanning:         Snyk, npm audit                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Deployment Architecture

### 13.1 Environment Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENT STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Environment      Purpose              Data                Deployment       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Local            Development          Docker Compose      Manual           │
│  Preview          PR Review            Seeded             Auto (per PR)    │
│  Staging          QA / UAT             Anonymized prod    Auto (main)      │
│  Production       Live                 Real               Manual (tag)     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LOCAL DEVELOPMENT                                 │   │
│  │                                                                      │   │
│  │  docker-compose.yml:                                                 │   │
│  │  ├── postgres (5432) + pgvector                                     │   │
│  │  ├── redis (6379)                                                   │   │
│  │  ├── meilisearch (7700)                                             │   │
│  │  └── mailhog (8025) - email testing                                 │   │
│  │                                                                      │   │
│  │  Local services (turbo dev):                                         │   │
│  │  ├── web (3000)                                                     │   │
│  │  ├── api (4000)                                                     │   │
│  │  └── worker (background)                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PRODUCTION CHECKLIST                              │   │
│  │                                                                      │   │
│  │  Before release:                                                     │   │
│  │  □ All tests passing                                                │   │
│  │  □ Security scan clean                                              │   │
│  │  □ Performance benchmarks met                                       │   │
│  │  □ Database migration tested                                        │   │
│  │  □ Rollback plan documented                                         │   │
│  │  □ Changelog updated                                                │   │
│  │  □ Feature flags configured                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Database Migration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE MIGRATION STRATEGY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tool: Prisma Migrate                                                       │
│                                                                              │
│  Principles:                                                                 │
│  • All migrations are reversible                                            │
│  • No data loss migrations in production                                    │
│  • Large migrations split into multiple steps                               │
│  • Zero-downtime migrations preferred                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MIGRATION WORKFLOW                                │   │
│  │                                                                      │   │
│  │  1. Development:                                                     │   │
│  │     npx prisma migrate dev --name <migration_name>                  │   │
│  │                                                                      │   │
│  │  2. Review:                                                          │   │
│  │     • Check generated SQL                                           │   │
│  │     • Verify reversibility                                          │   │
│  │     • Test in preview environment                                   │   │
│  │                                                                      │   │
│  │  3. Staging:                                                         │   │
│  │     npx prisma migrate deploy                                       │   │
│  │     (runs automatically on Railway staging)                         │   │
│  │                                                                      │   │
│  │  4. Production:                                                      │   │
│  │     npx prisma migrate deploy                                       │   │
│  │     (runs automatically on Railway production)                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ZERO-DOWNTIME PATTERNS                            │   │
│  │                                                                      │   │
│  │  Adding column:                                                      │   │
│  │  1. Add column as nullable                                          │   │
│  │  2. Deploy code that writes to new column                           │   │
│  │  3. Backfill existing data                                          │   │
│  │  4. Add NOT NULL constraint (if needed)                             │   │
│  │                                                                      │   │
│  │  Removing column:                                                    │   │
│  │  1. Deploy code that stops reading column                           │   │
│  │  2. Deploy code that stops writing column                           │   │
│  │  3. Drop column in migration                                        │   │
│  │                                                                      │   │
│  │  Renaming column:                                                    │   │
│  │  1. Add new column                                                  │   │
│  │  2. Write to both columns                                           │   │
│  │  3. Backfill new column                                             │   │
│  │  4. Switch reads to new column                                      │   │
│  │  5. Stop writing to old column                                      │   │
│  │  6. Drop old column                                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Future Considerations

### 14.1 Phase 3 Migration Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 3 MIGRATION PATH                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER: GovCon customer acquisition or FedRAMP requirement                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INFRASTRUCTURE MIGRATION                          │   │
│  │                                                                      │   │
│  │  Railway → AWS GovCloud                                              │   │
│  │                                                                      │   │
│  │  Step 1: Infrastructure as Code                                      │   │
│  │  • Create Terraform modules for AWS                                 │   │
│  │  • Mirror Railway topology in EKS                                   │   │
│  │  • Set up VPC, security groups, IAM                                 │   │
│  │                                                                      │   │
│  │  Step 2: Database Migration                                          │   │
│  │  • Set up RDS PostgreSQL in GovCloud                                │   │
│  │  • Configure pgvector extension                                     │   │
│  │  • Use AWS DMS for migration                                        │   │
│  │                                                                      │   │
│  │  Step 3: Application Deployment                                      │   │
│  │  • Deploy to EKS with existing Dockerfiles                          │   │
│  │  • Configure ALB, service mesh                                      │   │
│  │  • Set up CloudWatch monitoring                                     │   │
│  │                                                                      │   │
│  │  Step 4: DNS Cutover                                                 │   │
│  │  • Blue-green deployment                                            │   │
│  │  • Traffic gradually shifted                                        │   │
│  │  • Rollback plan ready                                              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER SCALING                                │   │
│  │                                                                      │   │
│  │  pgvector → Pinecone                                                │   │
│  │                                                                      │   │
│  │  Trigger: >1M vectors or latency >100ms P95                         │   │
│  │                                                                      │   │
│  │  Migration:                                                          │   │
│  │  • Set up Pinecone namespace per tenant                             │   │
│  │  • Dual-write to pgvector and Pinecone                              │   │
│  │  • Gradual traffic shift                                            │   │
│  │  • Remove pgvector vectors (keep as backup)                         │   │
│  │                                                                      │   │
│  │  Architecture:                                                       │   │
│  │  • Pinecone for similarity search                                   │   │
│  │  • PostgreSQL for metadata and joins                                │   │
│  │  • Redis for hot vector cache                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EVENT STREAMING UPGRADE                           │   │
│  │                                                                      │   │
│  │  Redis Streams → Kafka                                              │   │
│  │                                                                      │   │
│  │  Trigger: >10K events/second or need for replay                     │   │
│  │                                                                      │   │
│  │  Benefits:                                                           │   │
│  │  • Event replay for analytics                                       │   │
│  │  • Better partitioning                                              │   │
│  │  • Stream processing (Kafka Streams)                                │   │
│  │                                                                      │   │
│  │  Implementation:                                                     │   │
│  │  • AWS MSK (Managed Kafka)                                          │   │
│  │  • Dual-publish during migration                                    │   │
│  │  • Consumer groups for scaling                                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Feature Roadmap Impact

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FEATURE ARCHITECTURE IMPACT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 2 Features:                                                          │
│  ├── Browser Extension                                                      │
│  │   └── Architecture: Separate Chrome extension, API integration          │
│  │                                                                          │
│  ├── Advanced Pwin ML                                                       │
│  │   └── Architecture: Python ML service, batch prediction                 │
│  │                                                                          │
│  └── Multi-language Support                                                 │
│      └── Architecture: i18n framework, translated embeddings               │
│                                                                              │
│  Phase 3 Features:                                                          │
│  ├── Section L/M Parser                                                     │
│  │   └── Architecture: Specialized VLM pipeline, template matching         │
│  │                                                                          │
│  ├── CUI Environment                                                        │
│  │   └── Architecture: Separate GovCloud deployment, isolated DB           │
│  │                                                                          │
│  └── Price-to-Win Engine                                                    │
│      └── Architecture: External data ETL, ML pricing models               │
│                                                                              │
│  Phase 4 Features:                                                          │
│  ├── Agent SDK                                                              │
│  │   └── Architecture: Public SDK, agent registry, sandboxed execution     │
│  │                                                                          │
│  └── Agent Marketplace                                                      │
│      └── Architecture: Marketplace platform, payment integration           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Glossary

| Term                | Definition                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| **ADR**             | Architecture Decision Record                                            |
| **Bounded Context** | DDD concept for defining module boundaries                              |
| **C4 Model**        | Architecture diagramming approach (Context, Container, Component, Code) |
| **CQRS**            | Command Query Responsibility Segregation                                |
| **CUI**             | Controlled Unclassified Information                                     |
| **pgvector**        | PostgreSQL extension for vector similarity search                       |
| **Pwin**            | Probability of Win                                                      |
| **RAG**             | Retrieval-Augmented Generation                                          |
| **RLS**             | Row-Level Security                                                      |
| **SME**             | Subject Matter Expert                                                   |
| **VLM**             | Vision Language Model                                                   |
| **ZDR**             | Zero Data Retention                                                     |

---

## Appendix B: Related Documents

- `/docs/adr/` - Architecture Decision Records
- `/docs/SECURITY.md` - Security Architecture Detail
- `/docs/API_DESIGN.md` - API Design Guidelines
- `/docs/DATA_ARCHITECTURE.md` - Data Architecture Detail
- `/docs/INFRASTRUCTURE.md` - Infrastructure Guide
- `/docs/DEVELOPMENT_GUIDE.md` - Development Guide
- `/PRD.md` - Product Requirements Document
- `/ROADMAP.md` - Product Roadmap

---

**Document Control**

| Version | Date     | Author            | Changes         |
| ------- | -------- | ----------------- | --------------- |
| 1.0.0   | Jan 2026 | Architecture Team | Initial release |

---

_This document is the authoritative source for Sentinel RFP architecture. All implementation decisions should align with the principles and patterns documented here._
