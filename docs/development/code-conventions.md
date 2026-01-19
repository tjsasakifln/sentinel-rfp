# Code Conventions

**Last Updated:** January 2026
**Version:** 1.0.0
**Target Audience:** All Contributors

---

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Conventions](#typescript-conventions)
3. [NestJS Backend Conventions](#nestjs-backend-conventions)
4. [Next.js Frontend Conventions](#nextjs-frontend-conventions)
5. [File Naming](#file-naming)
6. [Code Formatting](#code-formatting)
7. [Git Conventions](#git-conventions)
8. [Testing Conventions](#testing-conventions)
9. [Documentation Standards](#documentation-standards)

---

## General Principles

### 1. Clarity Over Cleverness

Write code that is easy to understand, not just clever:

```typescript
// ❌ Bad - Too clever
const x = data.filter((e) => e?.st === 'a').map((e) => e.id);

// ✅ Good - Clear and explicit
const activeProposals = proposals.filter((proposal) => proposal.status === ProposalStatus.ACTIVE);
const activeProposalIds = activeProposals.map((proposal) => proposal.id);
```

### 2. Consistency

Follow existing patterns in the codebase. If you find inconsistencies, propose a refactor.

### 3. Type Safety

Leverage TypeScript's type system. Avoid `any` except when absolutely necessary.

```typescript
// ❌ Bad
function process(data: any) {
  return data.items;
}

// ✅ Good
interface ProcessableData {
  items: Item[];
}

function process(data: ProcessableData): Item[] {
  return data.items;
}
```

### 4. Immutability

Prefer immutable operations over mutations:

```typescript
// ❌ Bad - Mutates original array
function addItem(items: Item[], newItem: Item) {
  items.push(newItem);
  return items;
}

// ✅ Good - Returns new array
function addItem(items: Item[], newItem: Item): Item[] {
  return [...items, newItem];
}
```

### 5. Single Responsibility

Each function, class, and module should have one clear purpose.

---

## TypeScript Conventions

### Type Definitions

#### 1. Use Interfaces for Objects

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

// Use type for unions, intersections
type UserStatus = 'active' | 'inactive' | 'suspended';
type UserWithMetadata = User & { lastLoginAt: Date };
```

#### 2. Explicit Return Types

Always declare return types for public functions:

```typescript
// ❌ Bad - Implicit return type
function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ Good - Explicit return type
async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
```

#### 3. Avoid `any`

Use `unknown` if type is truly unknown, or define proper types:

```typescript
// ❌ Bad
function parseData(input: any): any {
  return JSON.parse(input);
}

// ✅ Good
function parseData<T>(input: string): T {
  return JSON.parse(input) as T;
}

// Or with validation
function parseData(input: string): unknown {
  return JSON.parse(input);
}
```

#### 4. Use Enums for Constant Sets

```typescript
// ✅ Good
enum ProposalStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
}

// Usage
const status: ProposalStatus = ProposalStatus.DRAFT;
```

#### 5. Utility Types

Leverage TypeScript utility types:

```typescript
// Partial - Make all fields optional
type PartialUser = Partial<User>;

// Pick - Select specific fields
type UserCredentials = Pick<User, 'email' | 'passwordHash'>;

// Omit - Exclude specific fields
type PublicUser = Omit<User, 'passwordHash' | 'refreshToken'>;

// Required - Make all fields required
type CompleteProfile = Required<Partial<UserProfile>>;
```

### Async/Await

Always use `async/await` over Promise chains:

```typescript
// ❌ Bad - Promise chains
function getUserProposals(userId: string) {
  return getUser(userId)
    .then((user) => getOrganization(user.organizationId))
    .then((org) => getProposals(org.id))
    .catch((error) => handleError(error));
}

// ✅ Good - async/await
async function getUserProposals(userId: string): Promise<Proposal[]> {
  try {
    const user = await getUser(userId);
    const organization = await getOrganization(user.organizationId);
    return await getProposals(organization.id);
  } catch (error) {
    throw new Error(`Failed to get proposals: ${error.message}`);
  }
}
```

---

## NestJS Backend Conventions

### Module Structure

Follow this structure for each feature module:

```
apps/api/src/<feature>/
├── <feature>.module.ts         # Module definition
├── <feature>.controller.ts     # HTTP layer
├── <feature>.service.ts        # Business logic
├── dto/
│   ├── create-<feature>.dto.ts # Input DTOs
│   ├── update-<feature>.dto.ts
│   └── <feature>-response.dto.ts # Output DTOs
└── entities/                   # Optional - domain entities
    └── <feature>.entity.ts
```

### Controllers

#### 1. Keep Controllers Thin

Controllers should only handle HTTP concerns:

```typescript
// ✅ Good
@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Get()
  async findAll(@CurrentUser() user: User): Promise<ProposalResponseDto[]> {
    const proposals = await this.proposalService.findAll(user.organizationId);
    return proposals.map((p) => new ProposalResponseDto(p));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: User,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalService.create(dto, user.organizationId);
    return new ProposalResponseDto(proposal);
  }
}
```

#### 2. Use Decorators Consistently

```typescript
// Path parameters
@Get(':id')
async findOne(@Param('id') id: string) {}

// Query parameters
@Get()
async search(@Query('status') status: string) {}

// Request body
@Post()
async create(@Body() dto: CreateProposalDto) {}

// Current user (custom decorator)
@Get('me')
async getProfile(@CurrentUser() user: User) {}
```

#### 3. HTTP Status Codes

Use appropriate status codes:

```typescript
@Post() // 201 Created by default
@HttpCode(HttpStatus.CREATED)
async create() {}

@Put(':id') // 200 OK
async update() {}

@Delete(':id') // 200 OK (or 204 No Content)
@HttpCode(HttpStatus.NO_CONTENT)
async remove() {}
```

### Services

#### 1. Services Handle Business Logic

```typescript
@Injectable()
export class ProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateProposalDto, organizationId: string): Promise<Proposal> {
    this.logger.log(`Creating proposal: ${dto.title} for org: ${organizationId}`);

    // Business logic here
    const proposal = await this.prisma.proposal.create({
      data: {
        title: dto.title,
        status: ProposalStatus.DRAFT,
        organizationId,
      },
    });

    // Emit events for other modules
    this.eventEmitter.emit('proposal.created', { proposalId: proposal.id });

    return proposal;
  }
}
```

#### 2. Use Dependency Injection

```typescript
// ✅ Good - Inject dependencies
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
}

// ❌ Bad - Direct instantiation
@Injectable()
export class AuthService {
  private jwtService = new JwtService();
}
```

### DTOs (Data Transfer Objects)

#### 1. Input DTOs (Validation)

```typescript
// create-proposal.dto.ts
import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  title: string;

  @IsEnum(ProposalStatus)
  status: ProposalStatus;

  @IsOptional()
  @IsString()
  description?: string;
}
```

#### 2. Output DTOs (Serialization)

```typescript
// proposal-response.dto.ts
import { Exclude, Expose } from 'class-transformer';

export class ProposalResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  status: string;

  @Exclude() // Never expose internal fields
  internalProcessingData: any;

  constructor(partial: Partial<ProposalResponseDto>) {
    Object.assign(this, partial);
  }
}
```

### Error Handling

Use NestJS built-in exceptions:

```typescript
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

// ✅ Good
async findOne(id: string): Promise<Proposal> {
  const proposal = await this.prisma.proposal.findUnique({ where: { id } });

  if (!proposal) {
    throw new NotFoundException(`Proposal with ID ${id} not found`);
  }

  return proposal;
}
```

### Logging

Use structured logging with NestJS Logger:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  async create(dto: CreateProposalDto): Promise<Proposal> {
    this.logger.log(`Creating proposal: ${dto.title}`);

    try {
      const proposal = await this.prisma.proposal.create({ data: dto });
      this.logger.log(`Proposal created successfully: ${proposal.id}`);
      return proposal;
    } catch (error) {
      this.logger.error(`Failed to create proposal: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

---

## Next.js Frontend Conventions

### Component Structure

#### 1. Server Components by Default

```typescript
// app/proposals/page.tsx (Server Component)
export default async function ProposalsPage() {
  const proposals = await fetchProposals(); // Server-side fetch

  return (
    <div>
      <h1>Proposals</h1>
      <ProposalsList proposals={proposals} />
    </div>
  );
}
```

#### 2. Client Components When Needed

```typescript
// components/features/proposals/ProposalCard.tsx
'use client'; // Add directive when client features needed

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={() => setIsExpanded(!isExpanded)}>
      {/* Interactive UI */}
    </div>
  );
}
```

### Component Organization

```typescript
// ✅ Good - Props interface, clear structure
interface ProposalCardProps {
  proposal: Proposal;
  onSelect?: (id: string) => void;
  variant?: 'compact' | 'expanded';
}

export function ProposalCard({
  proposal,
  onSelect,
  variant = 'compact',
}: ProposalCardProps) {
  // Hooks first
  const [isHovered, setIsHovered] = useState(false);
  const { mutate: deleteProposal } = useDeleteProposal();

  // Event handlers
  const handleDelete = () => {
    deleteProposal(proposal.id);
  };

  // Early returns
  if (!proposal) return null;

  // Render
  return <div>{/* Component JSX */}</div>;
}
```

### React Query (Data Fetching)

```typescript
// ✅ Good - Clear query keys, error handling
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: proposalsApi.list,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
```

### Zustand (Client State)

```typescript
// lib/store/ui-store.ts
import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
```

---

## File Naming

### General Rules

| Type           | Convention                  | Example            |
| -------------- | --------------------------- | ------------------ |
| **Components** | PascalCase                  | `ProposalCard.tsx` |
| **Utilities**  | kebab-case                  | `format-date.ts`   |
| **Hooks**      | camelCase with `use` prefix | `useProposals.ts`  |
| **Types**      | PascalCase                  | `Proposal.ts`      |
| **Constants**  | SCREAMING_SNAKE_CASE        | `API_ENDPOINTS.ts` |
| **Config**     | kebab-case                  | `jest.config.js`   |

### Examples

```
components/
├── ui/
│   ├── Button.tsx              # PascalCase
│   ├── Input.tsx
│   └── Card.tsx
├── features/
│   ├── proposals/
│   │   ├── ProposalCard.tsx    # Feature component
│   │   ├── ProposalList.tsx
│   │   └── CreateProposalModal.tsx
hooks/
├── useProposals.ts             # Hook with 'use' prefix
├── useAuth.ts
utils/
├── format-date.ts              # kebab-case utility
├── parse-query.ts
types/
├── Proposal.ts                 # PascalCase type
├── User.ts
```

---

## Code Formatting

### Prettier Configuration

All code is automatically formatted by Prettier with these settings:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Auto-Formatting

```bash
# Format all code
pnpm format

# Check formatting without fixing
pnpm format:check

# Husky pre-commit hook auto-formats staged files
git commit  # Triggers lint-staged → prettier --write
```

### ESLint Rules

Key ESLint rules enforced:

- No unused variables
- No console.log in production code (use Logger)
- Consistent imports ordering
- TypeScript strict mode

---

## Git Conventions

### Commit Messages

Follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

| Type       | Description      | Example                                         |
| ---------- | ---------------- | ----------------------------------------------- |
| `feat`     | New feature      | `feat(backend): add proposal creation endpoint` |
| `fix`      | Bug fix          | `fix(frontend): resolve login redirect loop`    |
| `refactor` | Code refactor    | `refactor(api): extract auth logic to service`  |
| `test`     | Add/update tests | `test(backend): add auth service tests`         |
| `docs`     | Documentation    | `docs: update setup guide`                      |
| `chore`    | Maintenance      | `chore(deps): update dependencies`              |
| `perf`     | Performance      | `perf(backend): optimize proposal query`        |
| `security` | Security fix     | `security(backend): add rate limiting`          |

#### Scopes

Valid scopes (from CLAUDE.md):

- `backend` - Backend services (NestJS)
- `frontend` - Frontend React
- `agents` - Autonomous AI agents
- `rfp` - RFP processing module
- `trust` - Trust Score system
- `ingest` - Document ingestion
- `sme` - SME collaboration
- `export` - Export functionality
- `search` - Semantic search/RAG
- `config` - Configurations
- `deps` - Dependencies
- `ci` - CI/CD workflows
- `api` - API endpoints
- `docs` - Documentation

#### Examples

```bash
# Good commits
feat(backend): implement JWT refresh token rotation (#112)
fix(frontend): correct proposal list pagination logic
refactor(api): extract validation to middleware
test(backend): add integration tests for auth endpoints
docs(setup): add troubleshooting section

# Bad commits (avoid)
fix: stuff
update: changes
WIP: testing things
```

### Branch Naming

```
<type>/<issue-number>-<short-description>

Examples:
feat/123-proposal-crud
fix/456-auth-redirect-bug
refactor/789-service-layer
docs/101-setup-guide
```

### Pull Request Guidelines

1. **Title:** Use commit convention

   ```
   [#123] feat(backend): Add proposal CRUD endpoints
   ```

2. **Description Template:**

   ```markdown
   ## Context

   Why this change is needed

   ## Changes

   - Change 1
   - Change 2

   ## Testing

   - [ ] Unit tests passing
   - [ ] Integration tests passing
   - [ ] Manual testing completed

   ## Risks

   Potential impacts or concerns

   ## Rollback Plan

   How to revert if needed

   ## Closes

   Closes #123
   ```

3. **Size:** Keep PRs small (< 400 lines changed)
4. **Reviews:** Request at least 1 reviewer

---

## Testing Conventions

### Test File Naming

```
<filename>.spec.ts      # Unit tests
<filename>.e2e-spec.ts  # E2E tests
```

### Test Structure

```typescript
describe('ProposalService', () => {
  let service: ProposalService;
  let prisma: PrismaService;

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('create', () => {
    it('should create a proposal with valid data', async () => {
      // Arrange
      const dto = { title: 'Test Proposal', status: ProposalStatus.DRAFT };

      // Act
      const result = await service.create(dto, 'org-123');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Proposal');
    });

    it('should throw error when title is missing', async () => {
      // Arrange
      const dto = { title: '', status: ProposalStatus.DRAFT };

      // Act & Assert
      await expect(service.create(dto, 'org-123')).rejects.toThrow();
    });
  });
});
```

### Test Naming

Use descriptive test names:

```typescript
// ✅ Good
it('should return 401 when JWT token is missing', () => {});
it('should create proposal with status DRAFT by default', () => {});

// ❌ Bad
it('works', () => {});
it('test1', () => {});
```

---

## Documentation Standards

### JSDoc Comments

Document public APIs:

```typescript
/**
 * Creates a new proposal for the given organization.
 *
 * @param dto - The proposal creation data
 * @param organizationId - The organization ID (tenant)
 * @returns The created proposal
 * @throws {BadRequestException} If validation fails
 * @throws {ForbiddenException} If user lacks permission
 *
 * @example
 * const proposal = await proposalService.create(
 *   { title: 'RFP Response', status: ProposalStatus.DRAFT },
 *   'org-123',
 * );
 */
async create(dto: CreateProposalDto, organizationId: string): Promise<Proposal> {
  // Implementation
}
```

### Inline Comments

Use sparingly, only for complex logic:

```typescript
// ✅ Good - Explains WHY
// Use exponential backoff to avoid rate limiting from Anthropic API
const delay = Math.min(1000 * 2 ** retryCount, 10000);

// ❌ Bad - Explains WHAT (code is self-explanatory)
// Set delay to minimum of 1000 * 2 to the power of retryCount, or 10000
const delay = Math.min(1000 * 2 ** retryCount, 10000);
```

### README Files

Every significant directory should have a README:

```markdown
# Proposal Module

## Responsibility

Manages proposal lifecycle: creation, editing, status transitions.

## Structure

- `proposal.controller.ts` - HTTP endpoints
- `proposal.service.ts` - Business logic
- `dto/` - Input/output DTOs

## Usage

See `docs/development/architecture.md` for context.
```

---

## Enforcement

### Automated Checks

All conventions are enforced via:

- **Pre-commit hooks** (Husky + lint-staged)
- **CI/CD pipeline** (GitHub Actions)
- **Pull request reviews**

### Pre-commit Checks

```bash
# Before every commit, these run automatically:
1. ESLint (code quality)
2. Prettier (formatting)
3. TypeScript (type checking)
4. Tests (on CI)
```

### Override (Emergency Only)

```bash
# Skip pre-commit hooks (use only in emergencies)
git commit --no-verify
```

---

## Questions?

For clarification on any convention:

1. Check existing code for patterns
2. Search GitHub issues/discussions
3. Ask in PR reviews
4. Propose convention changes via issue

---

**Next:** See `testing.md` for detailed testing patterns →
