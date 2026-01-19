# Development Setup

This guide covers the development environment setup for Sentinel RFP.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker Desktop
- VS Code (recommended)

## Quick Start

```bash
# Clone repository
git clone https://github.com/tjsasakifln/sentinel-rfp.git
cd sentinel-rfp

# Install dependencies
pnpm install

# Start Docker services (PostgreSQL, Redis)
pnpm docker:up

# Run database migrations
cd packages/database
pnpm prisma:migrate:dev
cd ../..

# Start development servers
pnpm dev
```

## VS Code Setup

### Recommended Extensions

The project includes a `.vscode/extensions.json` file with recommended extensions. When you open the project in VS Code, you'll be prompted to install them:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Prisma** - Prisma schema support
- **Tailwind CSS IntelliSense** - Tailwind class completion
- **TypeScript** - Enhanced TypeScript support
- **GitHub Copilot** - AI code completion
- **Jest** - Test runner integration
- **Path Intellisense** - Auto-complete file paths
- **Import Cost** - Display import sizes

### Workspace Settings

The `.vscode/settings.json` configures:

- **Format on Save**: Automatically formats code when saving
- **ESLint Auto-Fix**: Fixes linting issues on save
- **Prettier as Default Formatter**: Uses Prettier for all file types
- **Line Rulers**: Visual guides at 80 and 120 characters
- **Consistent Indentation**: 2 spaces, no tabs
- **Unix Line Endings**: LF (`\n`) for cross-platform compatibility

### Debug Configurations

Press `F5` to start debugging. Available configurations:

1. **Debug Backend (NestJS)**: Starts the API server with debugger attached
2. **Debug Frontend (Next.js)**: Starts the web app with debugger
3. **Debug Backend Tests**: Run backend tests with debugger
4. **Debug Frontend Tests**: Run frontend tests with debugger
5. **Attach to Backend**: Attach to running backend process
6. **Debug Full Stack**: Start both backend and frontend with debuggers

#### Setting Breakpoints

1. Open a `.ts` file (e.g., `apps/api/src/identity/auth/auth.service.ts`)
2. Click left of line number to add breakpoint (red dot)
3. Press `F5` and select "Debug Backend (NestJS)"
4. Trigger the code path (e.g., make API request)
5. Debugger will pause at breakpoint

### VS Code Tasks

Run tasks via:

- Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → "Tasks: Run Task"
- Menu: Terminal → Run Task

Available tasks:

#### Development

- **Dev: Start All Services** - Start backend + frontend (default build task: `Ctrl+Shift+B`)
- **Dev: Start Backend Only** - Start API server only
- **Dev: Start Frontend Only** - Start web app only

#### Docker

- **Docker: Start Services** - Start PostgreSQL + Redis
- **Docker: Stop Services** - Stop all Docker services
- **Docker: View Logs** - Tail Docker container logs

#### Build

- **Build: All Packages** - Build all apps and packages
- **Build: Backend** - Build API server
- **Build: Frontend** - Build web app

#### Testing

- **Test: All Tests** - Run all tests
- **Test: Backend** - Run backend tests
- **Test: Frontend** - Run frontend tests
- **Test: Coverage** - Generate coverage report

#### Code Quality

- **Lint: All** - Run ESLint on all files
- **Lint: Fix All** - Auto-fix linting issues
- **Format: All Files** - Format all files with Prettier
- **Format: Check** - Check if files are formatted
- **TypeCheck: All** - Run TypeScript type checking

#### Maintenance

- **Clean: All** - Remove build artifacts and node_modules

## Project Structure

```
sentinel-rfp/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema & migrations
│   └── ai/           # LLM abstraction layer
├── docs/             # Documentation
├── scripts/          # Development scripts
└── .vscode/          # VS Code configuration
```

## Environment Variables

Create `.env` files in each app:

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sentinel_rfp"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Common Development Tasks

### Running Tests

```bash
# All tests
pnpm test

# Backend tests with coverage
cd apps/api
pnpm test:cov

# Frontend tests with watch mode
cd apps/web
pnpm test:watch

# E2E tests
cd apps/api
pnpm test:e2e
```

### Database Management

```bash
cd packages/database

# Create migration
pnpm prisma:migrate:dev --name migration_name

# Reset database
pnpm prisma:migrate:reset

# Generate Prisma Client
pnpm prisma:generate

# Open Prisma Studio
pnpm prisma:studio
```

### Code Quality

```bash
# Lint and fix
pnpm lint

# Format all files
pnpm format

# Type checking
pnpm typecheck
```

### Docker Operations

```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs

# Restart services
pnpm docker:restart

# Clean volumes
pnpm docker:clean
```

## Troubleshooting

### Port Already in Use

If you see "Port 4000/3000 already in use":

```bash
# Find process using port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Issues

```bash
# Check Docker services are running
docker ps

# Restart PostgreSQL
pnpm docker:restart postgres

# View database logs
docker logs sentinel-rfp-postgres-1
```

### ESLint/Prettier Not Working

1. Ensure extensions are installed (check `.vscode/extensions.json`)
2. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
3. Check output panel: View → Output → Select "ESLint" from dropdown

### TypeScript Errors in VS Code

1. Ensure using workspace TypeScript: `Ctrl+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
2. Restart TS server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/123-feature-name

# Commit with conventional commits
git commit -m "feat(scope): description"

# Push and create PR
git push origin feat/123-feature-name
gh pr create
```

Pre-commit hooks (via Husky) will automatically:

- Lint and fix staged files
- Format code with Prettier
- Validate commit message format

## Further Reading

- [Architecture Overview](../ARCHITECTURE.md)
- [API Design](../API_DESIGN.md)
- [Security Guidelines](../SECURITY.md)
- [Docker Setup](../DOCKER.md)
- [Git Hooks](./git-hooks.md)
