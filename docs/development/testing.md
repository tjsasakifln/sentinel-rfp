# Testing Guide

**Last Updated:** January 2026
**Version:** 1.0.0
**Target Audience:** All Developers

---

## Table of Contents

1. [Testing Stack Overview](#testing-stack-overview)
2. [Running Tests](#running-tests)
3. [Writing Unit Tests](#writing-unit-tests)
4. [Writing Integration Tests](#writing-integration-tests)
5. [Writing E2E Tests](#writing-e2e-tests)
6. [Testing Patterns](#testing-patterns)
7. [Test Coverage](#test-coverage)
8. [Mocking Strategies](#mocking-strategies)
9. [Troubleshooting Tests](#troubleshooting-tests)

---

## Testing Stack Overview

### Test Frameworks

| Framework           | Usage                             | File Pattern |
| ------------------- | --------------------------------- | ------------ |
| **Jest**            | Backend unit/integration tests    | `*.spec.ts`  |
| **Vitest**          | Frontend unit tests (alternative) | `*.test.ts`  |
| **Playwright**      | E2E tests                         | `*.e2e.ts`   |
| **Testing Library** | React component testing           | `*.test.tsx` |
| **Supertest**       | HTTP endpoint testing             | `*.spec.ts`  |

### Configuration Files

```
apps/api/
├── jest.config.js           # Jest configuration for backend
├── src/
│   └── **/*.spec.ts        # Backend tests

apps/web/
├── jest.config.js           # Jest configuration for frontend
├── vitest.config.ts         # Vitest configuration (optional)
├── src/
│   └── **/*.test.tsx       # Component tests
│   └── **/*.test.ts        # Hook/utility tests

e2e/
└── **/*.e2e.ts            # E2E tests
```

### Testing Pyramid

```
       E2E Tests (Integration tests with real browser)
         ↑ (Fewer, slower, but high value)
        / \
       /   \
      / API \
     / Tests \
    /         \
   / Unit     \
  / Tests    \
 /__________\
(Many, fast, isolated)
```

---

## Running Tests

### Run All Tests

```bash
# From project root
pnpm test

# Expected output:
# Test Suites: 45 passed, 45 total
# Tests: 523 passed, 523 total
# Snapshots: 12 passed, 12 total
# Coverage: 78.2%
```

### Run Tests by Package

**Backend (NestJS) tests:**

```bash
cd apps/api
pnpm test

# Run specific test file
pnpm test -- user.service.spec.ts

# Run in watch mode (re-runs on file changes)
pnpm test -- --watch

# Run with coverage
pnpm test -- --coverage
```

**Frontend (Next.js) tests:**

```bash
cd apps/web
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

### Run E2E Tests

```bash
# From project root
pnpm test:e2e

# Run specific E2E suite
pnpm test:e2e -- auth

# Run in headed mode (see browser)
pnpm test:e2e -- --headed

# Run specific test
pnpm test:e2e -- login.e2e.ts
```

### Run Tests with Coverage

```bash
# All tests with coverage
pnpm test -- --coverage

# Coverage report
pnpm test -- --coverage -- reports

# View coverage in browser
open coverage/index.html
```

### Test Filters

```bash
cd apps/api

# Run tests matching pattern
pnpm test -- --testNamePattern="user service"

# Run only a specific describe block
pnpm test -- --testNamePattern="ProposalService > create"

# Skip slow tests
pnpm test -- --testPathIgnorePatterns="e2e"

# Run only changed files
pnpm test -- --onlyChanged
```

---

## Writing Unit Tests

### Backend Unit Tests (NestJS)

**File:** `apps/api/src/user/user.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'john@example.com',
        name: 'John Doe',
        organizationId: 'org-123',
      };

      const expectedUser = {
        id: 'user-123',
        ...dto,
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'create').mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          organizationId: dto.organizationId,
        }),
      });
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'existing@example.com',
        name: 'User',
        organizationId: 'org-123',
      };

      jest.spyOn(prisma.user, 'create').mockRejectedValue(new Error('Unique constraint violation'));

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should find user by ID', async () => {
      // Arrange
      const userId = 'user-123';
      const user = {
        id: userId,
        email: 'john@example.com',
        name: 'John Doe',
        organizationId: 'org-123',
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user);

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should return null if user not found', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await service.findOne('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Frontend Unit Tests (React)

**File:** `apps/web/src/components/ProposalCard.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from './ProposalCard';

describe('ProposalCard', () => {
  const mockProposal = {
    id: 'p-123',
    title: 'Test Proposal',
    status: 'draft',
    createdAt: new Date('2026-01-01'),
  };

  it('should render proposal card with title', () => {
    // Arrange & Act
    render(<ProposalCard proposal={mockProposal} />);

    // Assert
    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
  });

  it('should display status badge', () => {
    // Arrange & Act
    render(<ProposalCard proposal={mockProposal} />);

    // Assert
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('should call onSelect when card is clicked', () => {
    // Arrange
    const onSelect = jest.fn();
    render(<ProposalCard proposal={mockProposal} onSelect={onSelect} />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith(mockProposal.id);
  });

  it('should render delete button with correct permissions', () => {
    // Arrange & Act
    render(
      <ProposalCard proposal={mockProposal} canDelete={true} />
    );

    // Assert
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should not render delete button without permissions', () => {
    // Arrange & Act
    render(
      <ProposalCard proposal={mockProposal} canDelete={false} />
    );

    // Assert
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
```

### Hook Testing

**File:** `apps/web/src/hooks/useProposals.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useProposals } from './useProposals';

describe('useProposals', () => {
  it('should fetch proposals on mount', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useProposals());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should handle fetch error', async () => {
    // Mock API error
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API error'));

    // Act
    const { result } = renderHook(() => useProposals());

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

---

## Writing Integration Tests

### Service Integration Tests

Integration tests use a real database instance or test database.

**File:** `apps/api/src/proposal/proposal.service.int.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProposalService (Integration)', () => {
  let service: ProposalService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProposalService, PrismaService],
    }).compile();

    service = module.get<ProposalService>(ProposalService);
    prisma = module.get<PrismaService>(PrismaService);

    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up
    await prisma.proposal.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.$disconnect();
  });

  describe('create proposal with sections and questions', () => {
    it('should create complete proposal hierarchy', async () => {
      // Arrange
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          slug: 'test-org',
        },
      });

      const proposalData = {
        organizationId: org.id,
        title: 'Test Proposal',
        sections: [
          {
            title: 'Technical Approach',
            questions: [{ text: 'How will you implement?' }],
          },
        ],
      };

      // Act
      const proposal = await service.createWithHierarchy(proposalData);

      // Assert
      expect(proposal.id).toBeDefined();
      expect(proposal.sections).toHaveLength(1);
      expect(proposal.sections[0].questions).toHaveLength(1);

      // Verify in database
      const savedProposal = await prisma.proposal.findUnique({
        where: { id: proposal.id },
        include: {
          sections: {
            include: { questions: true },
          },
        },
      });

      expect(savedProposal).toBeDefined();
      expect(savedProposal.sections[0].questions[0].text).toBe('How will you implement?');
    });
  });

  describe('multi-tenancy isolation', () => {
    it('should not return proposals from other organizations', async () => {
      // Arrange
      const org1 = await prisma.organization.create({
        data: { name: 'Org 1', slug: 'org-1' },
      });

      const org2 = await prisma.organization.create({
        data: { name: 'Org 2', slug: 'org-2' },
      });

      await prisma.proposal.create({
        data: {
          organizationId: org1.id,
          title: 'Org1 Proposal',
        },
      });

      await prisma.proposal.create({
        data: {
          organizationId: org2.id,
          title: 'Org2 Proposal',
        },
      });

      // Act
      const org1Proposals = await service.findAll(org1.id);

      // Assert
      expect(org1Proposals).toHaveLength(1);
      expect(org1Proposals[0].title).toBe('Org1 Proposal');
    });
  });
});
```

---

## Writing E2E Tests

### Playwright E2E Tests

**File:** `e2e/auth.e2e.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before each test
    await page.goto('http://localhost:3000');
  });

  test('should register new user', async ({ page }) => {
    // Arrange & Act
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="organizationName"]', 'Test Company');
    await page.click('button[type="submit"]');

    // Assert
    await page.waitForNavigation();
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Arrange & Act
    await page.click('text=Log In');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Assert
    await page.waitForNavigation();
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Arrange & Act
    await page.click('text=Log In');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Arrange - Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Act
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Assert
    await page.waitForNavigation();
    expect(page.url()).toContain('/login');

    // Verify session is cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'auth');
    expect(authCookie).toBeUndefined();
  });
});

test.describe('Proposal Management', () => {
  test('should create new proposal', async ({ page }) => {
    // Arrange - Navigate to proposals page
    await page.goto('http://localhost:3000/proposals');

    // Act
    await page.click('button:has-text("New Proposal")');
    await page.fill('input[name="title"]', 'RFP-2026-001 Response');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('text=RFP-2026-001 Response')).toBeVisible();
    expect(page.url()).toContain('/proposals/');
  });

  test('should edit proposal and save changes', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:3000/proposals/p-123');

    // Act
    await page.click('button:has-text("Edit")');
    await page.fill('input[name="title"]', 'Updated Title');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('text=Updated Title')).toBeVisible();
    await expect(page.locator('text=Changes saved')).toBeVisible();
  });
});
```

---

## Testing Patterns

### Arrange-Act-Assert Pattern

All tests should follow AAA pattern for clarity:

```typescript
describe('ProposalService', () => {
  it('should create proposal with title', async () => {
    // ARRANGE - Set up test data and mocks
    const organizationId = 'org-123';
    const proposalData = { title: 'Test Proposal' };

    jest.spyOn(prisma.proposal, 'create').mockResolvedValue({
      id: 'p-123',
      ...proposalData,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ACT - Execute the function being tested
    const result = await service.create(proposalData, organizationId);

    // ASSERT - Verify the results
    expect(result.title).toBe('Test Proposal');
    expect(prisma.proposal.create).toHaveBeenCalled();
  });
});
```

### Testing Error Cases

```typescript
describe('error handling', () => {
  it('should throw NotFoundException when proposal not found', async () => {
    // Arrange
    jest.spyOn(prisma.proposal, 'findUnique').mockResolvedValue(null);

    // Act & Assert
    await expect(service.findOne('non-existent-id', 'org-123')).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException for cross-org access', async () => {
    // Arrange
    const proposal = {
      id: 'p-123',
      organizationId: 'org-123',
    };

    jest.spyOn(prisma.proposal, 'findUnique').mockResolvedValue(proposal);

    // Act & Assert
    await expect(service.findOne('p-123', 'org-999')).rejects.toThrow(ForbiddenException);
  });
});
```

### Testing Async Operations

```typescript
describe('async operations', () => {
  it('should wait for async operation to complete', async () => {
    // Arrange
    const promise = service.processProposal('p-123');

    // Act
    const result = await promise;

    // Assert
    expect(result.status).toBe('processed');
  });

  it('should handle concurrent operations', async () => {
    // Arrange & Act
    const results = await Promise.all([
      service.create(dto1, 'org-123'),
      service.create(dto2, 'org-123'),
      service.create(dto3, 'org-123'),
    ]);

    // Assert
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.id)).toBe(true);
  });
});
```

---

## Test Coverage

### View Coverage Report

```bash
# Generate coverage
pnpm test -- --coverage

# Open coverage report (HTML)
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

### Coverage Thresholds

Current targets (defined in `jest.config.js`):

```javascript
coverageThreshold: {
  global: {
    branches: 70,     // 70% of branches covered
    functions: 75,    // 75% of functions covered
    lines: 80,        // 80% of lines covered
    statements: 80,   // 80% of statements covered
  },
  './apps/api/src/**/*.ts': {
    functions: 85,    // Higher threshold for core logic
  },
}
```

### Coverage Commands

```bash
# Generate and check coverage
pnpm test -- --coverage

# Coverage with specific file
pnpm test -- --coverage -- apps/api/src/user/

# Check coverage for changed files only
pnpm test -- --coverage --onlyChanged
```

---

## Mocking Strategies

### Mock Prisma Service

```typescript
// Mock entire PrismaService
{
  provide: PrismaService,
  useValue: {
    proposal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  },
}

// Usage in test
const mockProposal = { id: 'p-123', title: 'Test' };
jest.spyOn(prisma.proposal, 'findUnique')
  .mockResolvedValue(mockProposal);
```

### Mock External APIs

```typescript
// Mock Anthropic API
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Generated response' }],
      }),
    },
  })),
}));
```

### Mock HTTP Requests (Frontend)

```typescript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: [] }),
    status: 200,
  }),
);

// Or use MSW (Mock Service Worker)
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/proposals', () => {
    return HttpResponse.json([{ id: 'p-123', title: 'Test Proposal' }]);
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mock React Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create test QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Wrap component with provider
render(
  <QueryClientProvider client={queryClient}>
    <ProposalsList />
  </QueryClientProvider>,
);
```

---

## Troubleshooting Tests

### Tests Timing Out

```typescript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds

// Or per test
it('should complete slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Database Connection Issues

```bash
# Ensure test database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Reset test database
pnpm prisma:migrate:reset --force
```

### Flaky Tests (Intermittent Failures)

```typescript
// Add retry logic
it('should handle flaky operation', async () => {
  for (let i = 0; i < 3; i++) {
    try {
      const result = await service.operation();
      expect(result).toBeDefined();
      return;
    } catch (e) {
      if (i === 2) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

// Or use jest-retry
it('should retry on failure', async () => {
  // test code
});
```

### Mock Not Working

```typescript
// Ensure mock is set up before import
jest.mock('./service');

// Import after mock setup
import { Service } from './service';

// Or use jest.doMock for dynamic imports
jest.doMock('./service', () => ({
  Service: jest.fn(),
}));
```

### Tests Still Using Old Code

```bash
# Clear Jest cache
pnpm jest -- --clearCache

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild TypeScript
pnpm build
```

---

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Keep tests DRY** - Use `beforeEach` for common setup
3. **Use descriptive test names** - Explain what is being tested
4. **One assertion per test** - Or logically related assertions
5. **Mock external dependencies** - Don't call real APIs in tests
6. **Test error cases** - Not just the happy path
7. **Use test data factories** - Create realistic test data
8. **Clean up after tests** - Reset mocks and state
9. **Avoid time-dependent tests** - Don't use `Date.now()` directly
10. **Test at appropriate level** - Unit, integration, or E2E as needed

---

**Next:** See [troubleshooting.md](./troubleshooting.md) for common development issues →
