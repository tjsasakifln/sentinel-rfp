# Roadmap - Sentinel RFP

## Overview

This document outlines the phased development roadmap for Sentinel RFP. Each phase builds upon the previous, with clear milestones and success criteria.

## Phase Summary

| Phase   | Focus                 | Duration     | Key Deliverables                                    |
| ------- | --------------------- | ------------ | --------------------------------------------------- |
| Phase 1 | Foundation MVP        | Months 1-4   | Core platform, basic AI, document processing        |
| Phase 2 | Scale & Integrations  | Months 5-8   | Enterprise integrations, advanced AI, collaboration |
| Phase 3 | GovCon & Compliance   | Months 9-12  | FedRAMP readiness, compliance features              |
| Phase 4 | Intelligence Platform | Months 13-18 | Pwin prediction, autonomous agents                  |

---

## Decomposição de Issues

Issues grandes (size:L) e Epics amplos foram decompostos em sub-issues atômicas (máx 1 dia/8h cada) para melhor tracking e paralelização.

### Issues Decompostas

| Parent Issue | Título | Sub-Issues | Status |
|--------------|--------|------------|--------|
| #15 | Next.js Frontend Scaffolding | #90-#95 (6 sub-issues) | ✅ Completo |
| #19 | Prisma Schema Design | #102-#108 (7 sub-issues) | [→ Ver detalhes](https://github.com/tjsasakifln/sentinel-rfp/issues/19) |
| #21 | User Authentication (JWT) | #109-#115 (7 sub-issues) | [→ Ver detalhes](https://github.com/tjsasakifln/sentinel-rfp/issues/21) |
| #52 | Basic Dashboard | #128-#130 (3 sub-issues) | [→ Ver detalhes](https://github.com/tjsasakifln/sentinel-rfp/issues/52) |
| #61 | Error Handling & Logging | #116-#120 (5 sub-issues) | [→ Ver detalhes](https://github.com/tjsasakifln/sentinel-rfp/issues/61) |
| #87 | Developer Experience | #122-#125 (4 sub-issues) | [→ Ver detalhes](https://github.com/tjsasakifln/sentinel-rfp/issues/87) |

**Convenção de Nomenclatura:** Sub-issues seguem padrão `[PREFIX-NUMletter]`
- Exemplo: #87 (Developer Experience) → #87a, #87b, #87c...
- Parent issues marcados com label `parent-issue`

**Próximas Decomposições Planejadas:**
- #57 (Word Export) → 6 sub-issues
- #41 (Hybrid Search) → 6 sub-issues
- #63 (Documentation) → 5 sub-issues
- #85 (Testing Infrastructure) → 5 sub-issues
- #86 (Observability) → 5 sub-issues
- #67 (Multi-Agent Architecture) → 7 sub-issues
- #72 (Content Auto-Healing) → 6 sub-issues

**Script de Automação:** `scripts/create-sub-issues.sh` disponível para criar sub-issues em batch.

---

## Phase 1: Foundation MVP (Months 1-4)

### Objective

Deliver a working product that demonstrates core value proposition: AI-assisted RFP response generation with trust scoring.

### Month 1: Infrastructure & Auth

#### Milestone 1.1: Project Bootstrap ([EPIC #2](https://github.com/tjsasakifln/sentinel-rfp/issues/2))

- [x] Monorepo setup (Turborepo) - [#13](https://github.com/tjsasakifln/sentinel-rfp/issues/13)
- [x] NestJS backend scaffolding - [#14](https://github.com/tjsasakifln/sentinel-rfp/issues/14) - [PR #89](https://github.com/tjsasakifln/sentinel-rfp/pull/89)
- [x] Next.js frontend scaffolding - [#15](https://github.com/tjsasakifln/sentinel-rfp/issues/15)
  - [x] [#90](https://github.com/tjsasakifln/sentinel-rfp/issues/90) - Setup Next.js 14 App Router Base
  - [x] [#91](https://github.com/tjsasakifln/sentinel-rfp/issues/91) - Setup Tailwind CSS & Theming
  - [x] [#92](https://github.com/tjsasakifln/sentinel-rfp/issues/92) - Initialize shadcn/ui Components
  - [x] [#93](https://github.com/tjsasakifln/sentinel-rfp/issues/93) - Setup React Query Provider
  - [x] [#94](https://github.com/tjsasakifln/sentinel-rfp/issues/94) - Setup Zustand Client State
  - [x] [#95](https://github.com/tjsasakifln/sentinel-rfp/issues/95) - Create Layout Base (Header, Sidebar, Main)
- [ ] Docker development environment - [#16](https://github.com/tjsasakifln/sentinel-rfp/issues/16)
- [ ] CI/CD pipeline (GitHub Actions) - [#17](https://github.com/tjsasakifln/sentinel-rfp/issues/17)
- [ ] Railway deployment configuration - [#18](https://github.com/tjsasakifln/sentinel-rfp/issues/18)

#### Milestone 1.2: Database & Auth ([EPIC #1](https://github.com/tjsasakifln/sentinel-rfp/issues/1))

- [x] Prisma schema design - [#19](https://github.com/tjsasakifln/sentinel-rfp/issues/19)
  - [x] [#102](https://github.com/tjsasakifln/sentinel-rfp/issues/102) - Criar packages/database structure
  - [x] [#103](https://github.com/tjsasakifln/sentinel-rfp/issues/103) - Definir modelos de Identity (Organization, User)
  - [x] [#104](https://github.com/tjsasakifln/sentinel-rfp/issues/104) - Definir modelos de Proposal (Proposal, Section, Question, Response)
  - [x] [#105](https://github.com/tjsasakifln/sentinel-rfp/issues/105) - Definir modelos de Knowledge (Document, Chunk, LibraryEntry)
  - [x] [#106](https://github.com/tjsasakifln/sentinel-rfp/issues/106) - Configurar pgvector extension e indexes
  - [x] [#107](https://github.com/tjsasakifln/sentinel-rfp/issues/107) - Criar seed script com dados de teste
  - [x] [#108](https://github.com/tjsasakifln/sentinel-rfp/issues/108) - Criar migration inicial e validar schema completo
- [ ] PostgreSQL + pgvector setup - [#20](https://github.com/tjsasakifln/sentinel-rfp/issues/20)
- [ ] User authentication (JWT) - [#21](https://github.com/tjsasakifln/sentinel-rfp/issues/21)
  - [x] [#109](https://github.com/tjsasakifln/sentinel-rfp/issues/109) - Setup JWT module e Argon2id password hashing
  - [x] [#110](https://github.com/tjsasakifln/sentinel-rfp/issues/110) - Implementar endpoint de registro (POST /v1/auth/register)
  - [x] [#111](https://github.com/tjsasakifln/sentinel-rfp/issues/111) - Implementar endpoint de login (POST /v1/auth/login)
  - [x] [#112](https://github.com/tjsasakifln/sentinel-rfp/issues/112) - Implementar refresh token flow com rotation
  - [x] [#113](https://github.com/tjsasakifln/sentinel-rfp/issues/113) - Implementar logout com token blacklisting
  - [x] [#114](https://github.com/tjsasakifln/sentinel-rfp/issues/114) - Adicionar rate limiting nos endpoints de autenticação
  - [x] [#115](https://github.com/tjsasakifln/sentinel-rfp/issues/115) - Criar testes de integração E2E para autenticação
- [ ] Organization multi-tenancy - [#22](https://github.com/tjsasakifln/sentinel-rfp/issues/22)
- [ ] Role-based access control (RBAC) - [#23](https://github.com/tjsasakifln/sentinel-rfp/issues/23)
- [ ] Password reset flow - [#24](https://github.com/tjsasakifln/sentinel-rfp/issues/24)

**Exit Criteria:**

- Users can register, login, and manage their organization
- Multi-tenant data isolation verified
- Deployable to Railway staging

### Month 2: Document Processing

#### Milestone 2.1: Document Upload ([EPIC #3](https://github.com/tjsasakifln/sentinel-rfp/issues/3))

- [ ] File upload API (multipart) - [#25](https://github.com/tjsasakifln/sentinel-rfp/issues/25)
- [ ] Cloudflare R2 integration - [#26](https://github.com/tjsasakifln/sentinel-rfp/issues/26)
- [ ] Document type detection - [#27](https://github.com/tjsasakifln/sentinel-rfp/issues/27)
- [ ] File validation & security - [#28](https://github.com/tjsasakifln/sentinel-rfp/issues/28)

#### Milestone 2.2: Document Processing Pipeline ([EPIC #4](https://github.com/tjsasakifln/sentinel-rfp/issues/4))

- [ ] VLM-based document parsing - [#29](https://github.com/tjsasakifln/sentinel-rfp/issues/29)
- [ ] Table extraction - [#30](https://github.com/tjsasakifln/sentinel-rfp/issues/30)
- [ ] Hierarchical structure detection - [#31](https://github.com/tjsasakifln/sentinel-rfp/issues/31)
- [ ] Text chunking strategy - [#32](https://github.com/tjsasakifln/sentinel-rfp/issues/32)
- [ ] Embedding generation (OpenAI) - [#33](https://github.com/tjsasakifln/sentinel-rfp/issues/33)
- [ ] Vector storage (pgvector) - [#34](https://github.com/tjsasakifln/sentinel-rfp/issues/34)

#### Milestone 2.3: Question Extraction ([EPIC #5](https://github.com/tjsasakifln/sentinel-rfp/issues/5))

- [ ] RFP question detection - [#35](https://github.com/tjsasakifln/sentinel-rfp/issues/35)
- [ ] Section/hierarchy mapping - [#36](https://github.com/tjsasakifln/sentinel-rfp/issues/36)
- [ ] Requirement identification - [#37](https://github.com/tjsasakifln/sentinel-rfp/issues/37)
- [ ] Compliance tag extraction - [#38](https://github.com/tjsasakifln/sentinel-rfp/issues/38)

**Exit Criteria:**

- Upload PDF/DOCX RFP and automatically extract questions
- Questions organized by section with metadata
- Processing time <60s for 200-page document

### Month 3: AI Response Generation

#### Milestone 3.1: Knowledge Library ([EPIC #6](https://github.com/tjsasakifln/sentinel-rfp/issues/6))

- [ ] Library entry CRUD - [#39](https://github.com/tjsasakifln/sentinel-rfp/issues/39)
- [ ] Category/tag management - [#40](https://github.com/tjsasakifln/sentinel-rfp/issues/40)
- [ ] Content versioning - [#41](https://github.com/tjsasakifln/sentinel-rfp/issues/41)
- [ ] Expiration handling - [#42](https://github.com/tjsasakifln/sentinel-rfp/issues/42)
- [ ] Semantic search implementation - [#43](https://github.com/tjsasakifln/sentinel-rfp/issues/43)

#### Milestone 3.2: RAG Pipeline ([EPIC #7](https://github.com/tjsasakifln/sentinel-rfp/issues/7))

- [ ] Query understanding - [#44](https://github.com/tjsasakifln/sentinel-rfp/issues/44)
- [ ] Hybrid search (vector + keyword) - [#45](https://github.com/tjsasakifln/sentinel-rfp/issues/45)
- [ ] Context ranking and selection - [#46](https://github.com/tjsasakifln/sentinel-rfp/issues/46)
- [ ] Citation extraction - [#47](https://github.com/tjsasakifln/sentinel-rfp/issues/47)

#### Milestone 3.3: Response Generation ([EPIC #8](https://github.com/tjsasakifln/sentinel-rfp/issues/8))

- [~] LLM abstraction layer - [#48](https://github.com/tjsasakifln/sentinel-rfp/issues/48) - **Setup Completo (70%)**
  - [x] Setup inicial packages/ai
  - [x] Instalação Anthropic SDK
  - [x] Estrutura base types e providers
  - [x] Configuração environment variables
  - [x] Integração com backend NestJS
  - [x] Documentação recursos Anthropic
  - [ ] Implementação completa AnthropicProvider
  - [ ] LLMRouter com fallback
  - [ ] Cost tracking funcional
- [ ] Prompt engineering - [#49](https://github.com/tjsasakifln/sentinel-rfp/issues/49)
- [ ] Response streaming - [#50](https://github.com/tjsasakifln/sentinel-rfp/issues/50)
- [ ] Trust score calculation - [#51](https://github.com/tjsasakifln/sentinel-rfp/issues/51)
- [ ] Citation mapping - [#52](https://github.com/tjsasakifln/sentinel-rfp/issues/52)

**Exit Criteria:**

- Generate responses with >70% average trust score
- Citations trace back to source documents
- Response generation <30s per question

### Month 4: MVP Polish & Launch

#### Milestone 4.1: Proposal Management ([EPIC #9](https://github.com/tjsasakifln/sentinel-rfp/issues/9))

- [ ] Proposal CRUD - [#49](https://github.com/tjsasakifln/sentinel-rfp/issues/49)
  - [x] [#145](https://github.com/tjsasakifln/sentinel-rfp/issues/145) - Implementar POST /v1/proposals (Create)
  - [x] [#146](https://github.com/tjsasakifln/sentinel-rfp/issues/146) - Implementar GET /v1/proposals (List) e GET /v1/proposals/:id (FindOne)
  - [x] [#147](https://github.com/tjsasakifln/sentinel-rfp/issues/147) - Implementar PUT /v1/proposals/:id (Update)
  - [x] [#148](https://github.com/tjsasakifln/sentinel-rfp/issues/148) - Implementar DELETE /v1/proposals/:id (Remove)
- [ ] Question status workflow - [#54](https://github.com/tjsasakifln/sentinel-rfp/issues/54)
- [ ] Progress tracking - [#55](https://github.com/tjsasakifln/sentinel-rfp/issues/55)
- [ ] Basic dashboard - [#52](https://github.com/tjsasakifln/sentinel-rfp/issues/52)
  - [ ] [#128](https://github.com/tjsasakifln/sentinel-rfp/issues/128) - Dashboard Layout & Metrics Cards
  - [ ] [#129](https://github.com/tjsasakifln/sentinel-rfp/issues/129) - Proposals List Component com Filters
  - [ ] [#130](https://github.com/tjsasakifln/sentinel-rfp/issues/130) - Quick Actions Menu & Create Proposal Button

#### Milestone 4.2: Response Editing ([EPIC #10](https://github.com/tjsasakifln/sentinel-rfp/issues/10))

- [ ] Rich text editor - [#57](https://github.com/tjsasakifln/sentinel-rfp/issues/57)
- [ ] Version history - [#58](https://github.com/tjsasakifln/sentinel-rfp/issues/58)
- [ ] Inline regeneration - [#59](https://github.com/tjsasakifln/sentinel-rfp/issues/59)
- [ ] Trust score explanation - [#60](https://github.com/tjsasakifln/sentinel-rfp/issues/60)

#### Milestone 4.3: Export ([EPIC #11](https://github.com/tjsasakifln/sentinel-rfp/issues/11))

- [ ] Word document export - [#57](https://github.com/tjsasakifln/sentinel-rfp/issues/57)
- [ ] Basic formatting - [#62](https://github.com/tjsasakifln/sentinel-rfp/issues/62)
- [ ] Citation appendix - [#63](https://github.com/tjsasakifln/sentinel-rfp/issues/63)

#### Milestone 4.4: Beta Launch ([EPIC #12](https://github.com/tjsasakifln/sentinel-rfp/issues/12))

- [ ] Performance optimization - [#64 (Phase 2)](https://github.com/tjsasakifln/sentinel-rfp/issues/64)
- [ ] Error handling & logging - [#61](https://github.com/tjsasakifln/sentinel-rfp/issues/61)
  - [x] [#116](https://github.com/tjsasakifln/sentinel-rfp/issues/116) - Global Exception Filters & RFC 7807 Error Response Format
  - [ ] [#117](https://github.com/tjsasakifln/sentinel-rfp/issues/117) - Structured Logging com Pino
  - [ ] [#118](https://github.com/tjsasakifln/sentinel-rfp/issues/118) - Request ID Tracking & Correlation
  - [ ] [#119](https://github.com/tjsasakifln/sentinel-rfp/issues/119) - Sentry Integration para Error Tracking
  - [ ] [#120](https://github.com/tjsasakifln/sentinel-rfp/issues/120) - Error Alerting & Monitoring Rules
- [ ] Observability - [#86](https://github.com/tjsasakifln/sentinel-rfp/issues/86)
- [ ] User onboarding flow
- [ ] Developer Experience - [#87](https://github.com/tjsasakifln/sentinel-rfp/issues/87)
  - [ ] [#122](https://github.com/tjsasakifln/sentinel-rfp/issues/122) - Configure Storybook para Web App
  - [ ] [#123](https://github.com/tjsasakifln/sentinel-rfp/issues/123) - Create Development Scripts & CLI Tools
  - [ ] [#124](https://github.com/tjsasakifln/sentinel-rfp/issues/124) - Setup Git Hooks com Husky + lint-staged
  - [ ] [#125](https://github.com/tjsasakifln/sentinel-rfp/issues/125) - VS Code Workspace Configuration
- [ ] Beta user recruitment

**Exit Criteria:**

- 5 beta customers actively using the platform
- End-to-end workflow functional
- <5% error rate in production

---

## Phase 2: Scale & Integrations (Months 5-8)

### Objective

Add enterprise integrations, improve AI quality, and enable team collaboration.

### Month 5: Enterprise Integrations

#### Milestone 2.1: Slack Integration ([EPIC #64](https://github.com/tjsasakifln/sentinel-rfp/issues/64))

- [ ] OAuth 2.0 connection
- [ ] Bot installation flow
- [ ] SME notification messages
- [ ] Inline response/feedback
- [ ] Deep linking to app

#### Milestone 2.1b: Microsoft Teams Integration ([EPIC #65](https://github.com/tjsasakifln/sentinel-rfp/issues/65))

- [ ] Paridade com Slack

#### Milestone 2.2: Salesforce Integration ([EPIC #66](https://github.com/tjsasakifln/sentinel-rfp/issues/66))

- [ ] Connected app setup
- [ ] Opportunity sync (bi-directional)
- [ ] Account data enrichment
- [ ] Win/loss capture

**Exit Criteria:**

- SMEs can respond to requests without leaving Slack
- Salesforce opportunities automatically create proposals

### Month 6: Advanced AI Features

#### Milestone 2.3: Multi-Agent Architecture ([EPIC #67](https://github.com/tjsasakifln/sentinel-rfp/issues/67))

- [ ] Agent orchestrator
- [ ] Knowledge agent
- [ ] Planner agent (query decomposition)
- [ ] Reasoning agent
- [ ] Reviewer agent
- [ ] Trust score refinement

#### Milestone 2.4: Win Theme System ([EPIC #68](https://github.com/tjsasakifln/sentinel-rfp/issues/68))

- [ ] Win theme configuration
- [ ] Theme injection in prompts
- [ ] Differentiator highlighting
- [ ] Competitive positioning

**Exit Criteria:**

- Complex queries decomposed and handled
- Win themes visible in generated responses
- Trust scores >80% average

### Month 7: Collaboration Features

#### Milestone 2.5: Team Collaboration ([EPIC #69](https://github.com/tjsasakifln/sentinel-rfp/issues/69))

- [ ] Real-time presence
- [ ] Comment threads
- [ ] @mentions
- [ ] Assignment workflow
- [ ] Activity feed

#### Milestone 2.6: Approval Workflow ([EPIC #70](https://github.com/tjsasakifln/sentinel-rfp/issues/70))

- [ ] Configurable approval stages
- [ ] Reviewer assignment
- [ ] Approval/rejection with comments
- [ ] Deadline tracking
- [ ] Escalation rules

**Exit Criteria:**

- Teams can collaborate on proposals in real-time
- Approval workflow supports multi-stage review

### Month 8: Analytics & Optimization

#### Milestone 2.7: Analytics Dashboard ([EPIC #71](https://github.com/tjsasakifln/sentinel-rfp/issues/71))

- [ ] Proposal metrics
- [ ] Team performance
- [ ] AI utilization stats
- [ ] Win rate tracking
- [ ] Response time analytics

#### Milestone 2.8: Content Optimization ([EPIC #72](https://github.com/tjsasakifln/sentinel-rfp/issues/72))

- [ ] Knowledge gap identification
- [ ] Stale content alerts
- [ ] Auto-learning from approved responses
- [ ] Quality recommendations

**Exit Criteria:**

- Actionable insights visible in dashboard
- Knowledge library continuously improves
- 20+ paying customers

---

## Phase 3: GovCon & Compliance (Months 9-12)

### Objective

Enable government contracting customers with compliance-ready features and certifications.

### Month 9: Compliance Framework

#### Milestone 3.1: FAR/DFARS Compliance ([EPIC #73](https://github.com/tjsasakifln/sentinel-rfp/issues/73))

- [ ] Compliance clause library
- [ ] Requirement mapping
- [ ] Compliance checklist generation
- [ ] Gap analysis

#### Milestone 3.2: Audit Trail ([EPIC #74](https://github.com/tjsasakifln/sentinel-rfp/issues/74))

- [ ] Comprehensive audit logging
- [ ] Change tracking
- [ ] Access logging
- [ ] Report generation

**Exit Criteria:**

- Compliance checklists for common contract types
- Full audit trail for all proposal activities

### Month 10: Security Hardening

#### Milestone 3.3: SOC 2 Preparation ([EPIC #75](https://github.com/tjsasakifln/sentinel-rfp/issues/75))

- [ ] Security controls documentation
- [ ] Access control audit
- [ ] Encryption verification
- [ ] Penetration testing
- [ ] Vulnerability remediation

#### Milestone 3.4: Advanced Security ([EPIC #76](https://github.com/tjsasakifln/sentinel-rfp/issues/76))

- [ ] SSO/SAML integration
- [ ] IP allowlisting
- [ ] Session management
- [ ] Data retention policies

**Exit Criteria:**

- SOC 2 Type I audit scheduled
- Enterprise security requirements met

### Month 11: GovCon Features

#### Milestone 3.5: Pwin Prediction ([EPIC #77](https://github.com/tjsasakifln/sentinel-rfp/issues/77))

- [ ] Historical data collection
- [ ] ML model development
- [ ] Feature engineering
- [ ] Prediction UI
- [ ] Recommendation engine

#### Milestone 3.6: Compliance Matrix ([EPIC #78](https://github.com/tjsasakifln/sentinel-rfp/issues/78))

- [ ] Automated matrix generation
- [ ] Section L/M mapping
- [ ] Color-coded compliance view
- [ ] Gap highlighting

**Exit Criteria:**

- Pwin predictions within 15% accuracy
- Compliance matrices auto-generated

### Month 12: Enterprise Launch

#### Milestone 3.7: Enterprise Features ([EPIC #79](https://github.com/tjsasakifln/sentinel-rfp/issues/79))

- [ ] Dedicated tenant option
- [ ] Custom SLA
- [ ] Premium support
- [ ] Custom integrations
- [ ] Volume pricing

#### Milestone 3.8: Market Launch

- [ ] Enterprise pricing
- [ ] Sales enablement
- [ ] Customer success playbook
- [ ] Partner program

**Exit Criteria:**

- 3+ Enterprise customers signed
- SOC 2 Type I certified
- $500K+ ARR

---

## Phase 4: Intelligence Platform (Months 13-18)

### Objective

Transform from tool to intelligent platform with predictive capabilities and autonomous agents.

### Autonomous Agents ([EPIC #80](https://github.com/tjsasakifln/sentinel-rfp/issues/80))

- [ ] Proposal autopilot mode
- [ ] Proactive gap filling
- [ ] Deadline management agent
- [ ] Quality assurance agent

### Predictive Intelligence ([EPIC #81](https://github.com/tjsasakifln/sentinel-rfp/issues/81))

- [ ] Market intelligence integration
- [ ] Competitor tracking
- [ ] Win probability optimization
- [ ] Pricing recommendations

### Browser Extension ([EPIC #82](https://github.com/tjsasakifln/sentinel-rfp/issues/82))

- [ ] Portal filler extension
- [ ] Auto-fill from proposals

### Platform Expansion ([EPIC #83](https://github.com/tjsasakifln/sentinel-rfp/issues/83))

- [ ] API marketplace
- [ ] Template marketplace
- [ ] Partner integrations
- [ ] White-label options

### FedRAMP Authorization ([EPIC #84](https://github.com/tjsasakifln/sentinel-rfp/issues/84))

- [ ] AWS GovCloud migration
- [ ] FedRAMP documentation
- [ ] 3PAO engagement
- [ ] Authorization process

**Exit Criteria:**

- Autonomous features reducing manual work by 50%
- FedRAMP authorization in progress
- $2M+ ARR

---

## Technical Milestones

### Performance Targets

| Metric              | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| ------------------- | ------- | ------- | ------- | ------- |
| Response generation | <30s    | <15s    | <10s    | <5s     |
| Document processing | <60s    | <45s    | <30s    | <20s    |
| Search latency P95  | <500ms  | <200ms  | <100ms  | <50ms   |
| API latency P95     | <300ms  | <200ms  | <150ms  | <100ms  |
| Uptime SLA          | 99%     | 99.5%   | 99.9%   | 99.95%  |

### Scale Targets

| Metric           | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| ---------------- | ------- | ------- | ------- | ------- |
| Tenants          | 10      | 50      | 200     | 500     |
| Concurrent users | 100     | 500     | 2,000   | 10,000  |
| Documents/tenant | 500     | 2,000   | 10,000  | 50,000  |
| Vectors total    | 1M      | 10M     | 50M     | 200M    |

---

## Success Metrics

### Phase 1 KPIs

- [ ] 5 beta customers onboarded
- [ ] 100+ proposals created
- [ ] 75% average trust score
- [ ] <5% error rate

### Phase 2 KPIs

- [ ] 50 paying customers
- [ ] $100K ARR
- [ ] 40% reduction in response time (customer reported)
- [ ] NPS >40

### Phase 3 KPIs

- [ ] 100 customers
- [ ] $500K ARR
- [ ] 3+ Enterprise contracts
- [ ] SOC 2 Type I certified

### Phase 4 KPIs

- [ ] 200+ customers
- [ ] $2M ARR
- [ ] 10+ Enterprise/GovCon customers
- [ ] FedRAMP authorization initiated

---

## Risk Mitigation

### Technical Risks

| Risk                      | Mitigation                                  |
| ------------------------- | ------------------------------------------- |
| LLM quality degradation   | Multi-provider fallback, quality monitoring |
| Vector search performance | Pinecone migration path ready               |
| Integration failures      | Circuit breakers, retry logic, fallbacks    |
| Data breach               | Defense in depth, encryption, audit logging |

### Business Risks

| Risk             | Mitigation                                    |
| ---------------- | --------------------------------------------- |
| Slow adoption    | Freemium tier, strong content marketing       |
| Competition      | Focus on GovCon niche, superior trust scoring |
| Pricing pressure | Value-based pricing, ROI calculator           |
| Churn            | Customer success program, usage monitoring    |

---

## Changelog

| Version | Date       | Changes                                                                           |
| ------- | ---------- | --------------------------------------------------------------------------------- |
| 1.8     | 2026-01-14 | Marked #148 complete after PR #156 merge (DELETE /v1/proposals/:id soft delete endpoint) - All Proposal CRUD operations complete! |
| 1.7     | 2026-01-14 | Marked #147 complete after PR #155 merge (PUT /v1/proposals/:id update endpoint); Added CRUD sub-issues tracking (#145, #146, #147, #148) |
| 1.6     | 2026-01-14 | Marked #48 70% complete - Setup inicial LLM abstraction layer (SDK, types, providers, docs) |
| 1.5     | 2026-01-14 | Marked #146 complete after PR #153 merge (GET endpoints for proposals); Fixed wrong issue number in Milestone 4.1 (#53 → #49) |
| 1.4     | 2026-01-14 | Marked #114 complete after PR #152 merge (rate limiting for auth endpoints) |
| 1.3     | 2026-01-12 | Comprehensive audit sync: Added 30 sub-issues, fixed issue number mappings, updated progress (123 total issues, 9 closed) |
| 1.2     | 2026-01-12 | Decomposed 3 issues into 16 atomic sub-issues (#61→#116-120, #87→#121-126, #52→#127-131) |
| 1.1     | 2026-01-09 | Added GitHub issue links for all milestones                                       |
| 1.0     | 2026-01-09 | Initial roadmap creation                                                          |

---

## Cross-Cutting Concerns (Ongoing)

These epics run in parallel throughout the development cycle:

| Epic                   | Description                        | Link                                                         | Sub-Issues |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------ | ---------- |
| Developer Experience   | Docs, Storybook, Scripts           | [#87](https://github.com/tjsasakifln/sentinel-rfp/issues/87) | #121-#126 (6) |
| Testing Infrastructure | Unit, Integration, E2E, Load Tests | [#85](https://github.com/tjsasakifln/sentinel-rfp/issues/85) | Planejado (5) |
| Observability          | Sentry, APM, Distributed Tracing   | [#86](https://github.com/tjsasakifln/sentinel-rfp/issues/86) | Planejado (5) |

---

## GitHub Project Status

**Total Issues Created:** 123

- **Open:** 113 (92%)
- **Closed:** 10 (8%)
- **Epics:** 36
- **Features:** 87
- **Milestones:** 13
- **Labels:** 38
- **Overall Progress:** 10/123 issues closed (8%)

**Browse all issues:** [GitHub Issues](https://github.com/tjsasakifln/sentinel-rfp/issues)

---

_This roadmap is a living document and will be updated as we learn from customers and market conditions._
