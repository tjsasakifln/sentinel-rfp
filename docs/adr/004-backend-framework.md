# ADR-004: NestJS + TypeScript over Python/FastAPI

## Status
**Accepted** - January 2026

## Context

We need to select the primary backend framework for Sentinel RFP. The main contenders are:

1. **NestJS (TypeScript)**: Enterprise Node.js framework
2. **FastAPI (Python)**: Modern async Python framework
3. **Express.js (TypeScript)**: Minimal Node.js framework
4. **Django (Python)**: Batteries-included Python framework

### Evaluation Criteria
- Type safety and developer experience
- Enterprise patterns (DI, modules, testing)
- AI/ML ecosystem integration
- Team expertise and hiring pool
- Performance characteristics
- Railway deployment compatibility

## Decision

**Select NestJS with TypeScript as the primary backend framework.**

### Rationale

| Factor | NestJS | FastAPI | Winner |
|--------|--------|---------|--------|
| Type Safety | Native TypeScript | Pydantic (good) | NestJS |
| Enterprise Patterns | Built-in (DI, modules) | Manual setup | NestJS |
| AI/ML Libraries | Via child process/API | Native Python | FastAPI |
| Async Performance | Excellent | Excellent | Tie |
| Frontend Sharing | Same language | Different | NestJS |
| Testing | Jest, built-in | pytest | Tie |
| Railway Support | Excellent | Excellent | Tie |
| Hiring Pool (BR) | Large | Medium | NestJS |
| Documentation | Excellent | Excellent | Tie |

### Key Decision Factors

#### 1. Full-Stack TypeScript
```
┌─────────────────────────────────────────────────────────────────────┐
│                    SHARED TYPE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  packages/shared/                                                    │
│  ├── types/                                                         │
│  │   ├── proposal.ts      ◄──── Used by frontend AND backend       │
│  │   ├── user.ts                                                    │
│  │   └── api.ts                                                     │
│  └── validation/                                                    │
│      └── schemas.ts       ◄──── Zod schemas shared                  │
│                                                                      │
│  apps/api/ (NestJS)                                                 │
│  ├── Uses shared types                                              │
│  └── API matches frontend expectations                              │
│                                                                      │
│  apps/web/ (Next.js)                                                │
│  ├── Uses shared types                                              │
│  └── Type-safe API calls                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Built-in Enterprise Patterns

```typescript
// NestJS provides these out of the box:

// Dependency Injection
@Injectable()
export class ProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly llmService: LLMService,
  ) {}
}

// Module System
@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [ProposalController],
  providers: [ProposalService],
  exports: [ProposalService],
})
export class ProposalModule {}

// Guards & Interceptors
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
@Controller('proposals')
export class ProposalController {}

// Validation Pipes
@Post()
async create(@Body(ValidationPipe) dto: CreateProposalDto) {}
```

#### 3. Testing Infrastructure

```typescript
// Unit testing with Jest (built-in)
describe('ProposalService', () => {
  let service: ProposalService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProposalService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(ProposalService);
    prisma = module.get(PrismaService);
  });

  it('should create proposal', async () => {
    prisma.proposal.create.mockResolvedValue(mockProposal);
    const result = await service.create(createDto);
    expect(result).toEqual(mockProposal);
  });
});
```

### Addressing Python/AI Concern

For AI-heavy operations that benefit from Python ecosystem:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HYBRID APPROACH                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NestJS (Primary)                  Python (Optional)                │
│  ────────────────                  ─────────────────                │
│  • API endpoints                   • ML model training              │
│  • Business logic                  • Custom embeddings              │
│  • Orchestration                   • Data science notebooks         │
│  • LLM API calls (TypeScript SDK)  • Batch processing               │
│                                                                      │
│  Integration Options:                                               │
│  1. HTTP microservice (FastAPI)                                     │
│  2. BullMQ job → Python worker                                      │
│  3. AWS Lambda (Python runtime)                                     │
│                                                                      │
│  For Phase 1-2: LLM APIs (Anthropic, OpenAI) have excellent         │
│  TypeScript SDKs. No Python needed.                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   └── modules/
│       ├── identity/
│       │   ├── identity.module.ts
│       │   ├── identity.controller.ts
│       │   ├── identity.service.ts
│       │   ├── dto/
│       │   └── entities/
│       ├── proposal/
│       ├── knowledge/
│       ├── agents/
│       └── integrations/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
│   └── schema.prisma
└── Dockerfile
```

## Consequences

### Positive
- **Type Safety**: End-to-end TypeScript reduces bugs
- **Code Sharing**: Types, validation schemas shared with frontend
- **Enterprise Ready**: Built-in patterns for large teams
- **Hiring**: Large TypeScript talent pool in BR
- **Ecosystem**: Rich npm ecosystem, active community
- **Performance**: V8 performance excellent for I/O bound work

### Negative
- **AI Libraries**: Some Python ML libraries not available
- **Learning Curve**: NestJS decorators unfamiliar to some
- **Bundle Size**: Node.js apps larger than Go/Rust

### Mitigations
- Use TypeScript SDKs for LLM APIs (well-supported)
- Add Python microservice if ML requirements emerge
- Document NestJS patterns for team onboarding
- Use multi-stage Docker builds for smaller images

## Technology Alternatives Rejected

### FastAPI
Good framework, but:
- Different language from frontend
- No shared types
- Smaller hiring pool in BR
- Extra overhead for AI features we're not using (we call APIs)

### Express.js
Too minimal:
- No built-in DI
- No module system
- More boilerplate
- Less opinionated (inconsistent codebases)

### Django
Too heavy:
- Monolithic architecture
- ORM doesn't fit our needs (Prisma better for TypeScript)
- Sync by default

## Related ADRs
- ADR-001: Event-Driven Architecture
- ADR-007: CQRS for Proposals Domain

## References
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)
- [Prisma + NestJS](https://docs.nestjs.com/recipes/prisma)
