# Sentinel RFP API

Backend API built with NestJS for the Sentinel RFP platform.

## Features

- **NestJS 10.x** with TypeScript
- **Hexagonal Architecture** (ports & adapters pattern)
- **Swagger/OpenAPI** documentation at `/api/docs`
- **Pino Logger** with structured logging
- **Security**: Helmet, CORS, Rate Limiting (100 req/min)
- **Global Exception Handling** with HttpExceptionFilter
- **Response Transformation** with TransformInterceptor
- **Request Logging** with LoggingInterceptor
- **Environment Validation** with Joi schema
- **Health Check** endpoint at `/api/health`

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
CORS_ORIGIN=*
```

### Development

```bash
# Start in development mode with hot-reload
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run E2E tests
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Start production server
pnpm start:prod
```

## Project Structure

```
apps/api/
├── src/
│   ├── common/              # Common utilities
│   │   ├── filters/         # Exception filters
│   │   └── interceptors/    # Request/response interceptors
│   ├── config/              # Configuration schemas
│   ├── health/              # Health check module
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── test/                    # E2E tests
├── nest-cli.json            # NestJS CLI config
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/health

## Testing

### Unit Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

### Coverage

```bash
pnpm test:cov
```

## Architecture

This API follows **Hexagonal Architecture** (ports & adapters):

- **Domain Layer**: Core business logic (to be implemented in future modules)
- **Application Layer**: Use cases and services
- **Infrastructure Layer**: Database, external APIs, frameworks
- **Presentation Layer**: Controllers and DTOs

## Security

- **Helmet**: Secure HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per minute (global)
- **Validation**: Input validation with class-validator
- **Environment Validation**: Joi schema validation on startup

## Logging

Uses Pino for high-performance structured logging:

- Development: Pretty-printed logs with colors
- Production: JSON logs for log aggregation
- Automatic request/response logging
- Error tracking with stack traces

## Modules

### Health Module

Health check endpoint for monitoring:

```bash
GET /api/health
```

Response:
```json
{
  "data": {
    "status": "ok",
    "timestamp": "2024-01-09T15:00:00.000Z",
    "uptime": 123.456,
    "environment": "development"
  }
}
```

### Common Module

Provides global application concerns:

- **HttpExceptionFilter**: Formats error responses
- **LoggingInterceptor**: Logs request/response
- **TransformInterceptor**: Wraps responses in `{data: ...}` format
- **ThrottlerGuard**: Rate limiting protection

## Next Steps

Upcoming modules (see ROADMAP.md):

- Identity Module (JWT authentication, RBAC)
- Proposal Module (RFP management)
- Knowledge Module (library, search)
- Agents Module (AI response generation)
- Export Module (document export)
