# Development Guide - Sentinel RFP

## Overview

This guide provides everything developers need to set up, develop, test, and contribute to Sentinel RFP.

## Prerequisites

### Required Software

| Software | Version  | Purpose         |
| -------- | -------- | --------------- |
| Node.js  | 20.x LTS | Runtime         |
| npm      | 10.x     | Package manager |
| Docker   | 24.x     | Local services  |
| Git      | 2.40+    | Version control |
| VS Code  | Latest   | Recommended IDE |

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "GitHub.copilot",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag"
  ]
}
```

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/sentinel-rfp.git
cd sentinel-rfp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
code .env
```

### 4. Start Local Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 5. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 6. Start Development Servers

```bash
# Start all services (turbo)
npm run dev

# Or start individually
npm run dev:api      # Backend on :4000
npm run dev:web      # Frontend on :3000
npm run dev:worker   # Worker process
```

## Project Structure

```
sentinel-rfp/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/         # Shared utilities
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   └── modules/        # Feature modules
│   │   │       ├── identity/
│   │   │       ├── proposal/
│   │   │       ├── knowledge/
│   │   │       ├── agents/
│   │   │       └── integrations/
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   │   ├── ui/       # Primitives (shadcn)
│   │   │   │   └── features/ # Feature components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilities
│   │   │   └── styles/        # Global styles
│   │   └── package.json
│   │
│   └── worker/                 # BullMQ Workers
│       ├── src/
│       │   ├── main.ts
│       │   └── processors/
│       └── package.json
│
├── packages/
│   ├── database/               # Prisma schema & client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │
│   ├── ai/                     # LLM abstraction
│   │   └── src/
│   │       ├── providers/
│   │       ├── router.ts
│   │       └── types.ts
│   │
│   ├── queue/                  # BullMQ configuration
│   │   └── src/
│   │
│   └── shared/                 # Shared types & utils
│       └── src/
│           ├── types/
│           ├── validation/
│           └── utils/
│
├── docs/                       # Documentation
├── docker-compose.yml          # Local development
├── turbo.json                  # Turborepo config
├── package.json                # Root package
└── tsconfig.json               # Root TypeScript config
```

## Development Workflow

### Branch Strategy

```
main                    # Production-ready code
├── develop             # Integration branch
│   ├── feature/*       # New features
│   ├── fix/*           # Bug fixes
│   └── refactor/*      # Code improvements
└── release/*           # Release preparation
```

### Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting (no code change)
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance

# Examples
feat(proposal): add bulk question import
fix(auth): resolve token refresh race condition
docs(api): update webhook documentation
refactor(agents): simplify orchestrator logic
```

### Code Review Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run lint and type checks
4. Create Pull Request
5. Address review feedback
6. Squash and merge

## Coding Standards

### TypeScript Guidelines

```typescript
// Use strict typing
interface CreateProposalDto {
  title: string;
  clientName: string;
  dueDate: Date;
  value?: number;
}

// Prefer interfaces over types for objects
interface User {
  id: string;
  email: string;
}

// Use type for unions/primitives
type Status = 'draft' | 'active' | 'completed';

// Explicit return types for public functions
function calculateScore(data: ScoreInput): number {
  return data.value * data.weight;
}

// Use readonly where appropriate
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}
```

### NestJS Patterns

```typescript
// Module organization
@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [ProposalController],
  providers: [ProposalService, ProposalRepository],
  exports: [ProposalService],
})
export class ProposalModule {}

// Service with dependency injection
@Injectable()
export class ProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProposalDto): Promise<Proposal> {
    const proposal = await this.prisma.proposal.create({ data: dto });
    this.eventEmitter.emit('proposal.created', proposal);
    return proposal;
  }
}

// Controller with validation
@Controller('proposals')
@UseGuards(AuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProposalDto, @CurrentUser() user: User): Promise<Proposal> {
    return this.proposalService.create({
      ...dto,
      organizationId: user.organizationId,
      createdById: user.id,
    });
  }
}
```

### React/Next.js Patterns

```typescript
// Component with TypeScript
interface ProposalCardProps {
  proposal: Proposal;
  onEdit?: (id: string) => void;
}

export function ProposalCard({ proposal, onEdit }: ProposalCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{proposal.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{proposal.clientName}</p>
      </CardContent>
      {onEdit && (
        <CardFooter>
          <Button onClick={() => onEdit(proposal.id)}>Edit</Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Custom hook pattern
export function useProposals(filters: ProposalFilters) {
  return useQuery({
    queryKey: ['proposals', filters],
    queryFn: () => api.proposals.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// Server component (Next.js 14)
export default async function ProposalsPage() {
  const proposals = await getProposals();

  return (
    <div>
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
    </div>
  );
}
```

## Testing

### Test Structure

```
test/
├── unit/               # Unit tests
│   ├── services/
│   └── utils/
├── integration/        # Integration tests
│   ├── api/
│   └── database/
└── e2e/                # End-to-end tests
    └── scenarios/
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test file
npm test -- proposal.service.spec.ts

# Run e2e tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Writing Tests

```typescript
// Unit test example
describe('ProposalService', () => {
  let service: ProposalService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProposalService, { provide: PrismaService, useValue: mockDeep<PrismaClient>() }],
    }).compile();

    service = module.get(ProposalService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a proposal', async () => {
      const dto = createProposalDtoFactory();
      const expected = proposalFactory(dto);

      prisma.proposal.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining(dto),
      });
    });
  });
});

// Integration test example
describe('Proposals API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('POST /proposals should create proposal', async () => {
    const dto = createProposalDtoFactory();

    const response = await request(app.getHttpServer())
      .post('/v1/proposals')
      .set('Authorization', `Bearer ${testToken}`)
      .send(dto)
      .expect(201);

    expect(response.body.data.title).toBe(dto.title);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Test Factories

```typescript
// test/factories/proposal.factory.ts
import { faker } from '@faker-js/faker';

export function proposalFactory(overrides?: Partial<Proposal>): Proposal {
  return {
    id: faker.string.uuid(),
    organizationId: faker.string.uuid(),
    title: faker.company.catchPhrase(),
    clientName: faker.company.name(),
    status: 'DRAFT',
    dueDate: faker.date.future(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createProposalDtoFactory(
  overrides?: Partial<CreateProposalDto>,
): CreateProposalDto {
  return {
    title: faker.company.catchPhrase(),
    clientName: faker.company.name(),
    dueDate: faker.date.future(),
    ...overrides,
  };
}
```

## Local Development

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: sentinel
      POSTGRES_PASSWORD: sentinel
      POSTGRES_DB: sentinel_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  meilisearch:
    image: getmeili/meilisearch:v1.6
    environment:
      MEILI_MASTER_KEY: dev_master_key
    ports:
      - '7700:7700'
    volumes:
      - meilisearch_data:/meili_data

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
```

### Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://sentinel:sentinel@localhost:5432/sentinel_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="15m"

# LLM (get from providers)
ANTHROPIC_API_KEY="sk-ant-xxx"
OPENAI_API_KEY="sk-xxx"

# Search
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="dev_master_key"

# Storage (use local for dev)
STORAGE_DRIVER="local"
STORAGE_PATH="./storage"

# App
NODE_ENV="development"
PORT="4000"
FRONTEND_URL="http://localhost:3000"
```

### Useful Commands

```bash
# Database
npx prisma studio          # Visual database browser
npx prisma migrate dev     # Create migration
npx prisma db push         # Push schema changes
npx prisma generate        # Regenerate client

# Development
npm run dev               # Start all services
npm run build             # Build all packages
npm run lint              # Run linter
npm run lint:fix          # Fix lint issues
npm run typecheck         # Type checking

# Testing
npm test                  # Run tests
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Utilities
npm run format            # Format code
npm run clean             # Clean build artifacts
```

## Debugging

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:api:debug"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true
    },
    {
      "name": "Debug Current Test",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--watch", "${relativeFile}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// Use NestJS Logger
import { Logger } from '@nestjs/common';

const logger = new Logger('ProposalService');

logger.log('Processing proposal');
logger.debug('Detailed info', { proposalId, data });
logger.warn('Something unexpected', { context });
logger.error('Error occurred', error.stack);
```

## Troubleshooting

### Common Issues

**Database connection refused**

```bash
# Ensure PostgreSQL is running
docker-compose ps
docker-compose up -d postgres
```

**Prisma client out of sync**

```bash
npx prisma generate
```

**Port already in use**

```bash
# Find process
lsof -i :4000
# Kill it
kill -9 <PID>
```

**Node modules issues**

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

**TypeScript errors after schema change**

```bash
npm run build:packages
npx prisma generate
```

## Contributing

### Getting Started

1. Fork the repository
2. Create feature branch
3. Make changes
4. Write/update tests
5. Submit pull request

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for changes
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Commit messages follow convention

### Code Review Guidelines

**For Authors:**

- Keep PRs focused and small
- Provide context in description
- Respond to feedback promptly
- Update based on feedback

**For Reviewers:**

- Be constructive and specific
- Approve when satisfied
- Request changes for issues
- Focus on correctness and clarity

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
