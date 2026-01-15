# Structured Logging with Pino

This module provides structured JSON logging for production and pretty-printed logs for development using [nestjs-pino](https://github.com/iamolegga/nestjs-pino) and [Pino](https://getpino.io/).

## Features

- ✅ **JSON logs in production** (NODE_ENV=production)
- ✅ **Pretty-printed colored logs in development**
- ✅ **Automatic Request ID tracking** (via `x-request-id` header)
- ✅ **Configurable log levels** via `LOG_LEVEL` environment variable
- ✅ **Custom serializers** for request/response objects
- ✅ **Automatic HTTP request/response logging**
- ✅ **Error tracking with stack traces**

## Log Levels

From highest to lowest priority:

| Level   | Use Case                                 | Example                           |
| ------- | ---------------------------------------- | --------------------------------- |
| `fatal` | Application crashes (process.exit)       | Database connection lost          |
| `error` | Errors that need immediate attention     | API call failed, exception thrown |
| `warn`  | Warnings that might need attention       | Deprecated API usage              |
| `info`  | General informational messages (default) | Request completed, job started    |
| `debug` | Detailed debugging information           | Variable values, flow control     |
| `trace` | Very detailed debugging information      | Function entry/exit               |

**Default:** `info`

## Environment Variables

| Variable    | Description                                | Default | Example         |
| ----------- | ------------------------------------------ | ------- | --------------- |
| `LOG_LEVEL` | Minimum log level to output                | `info`  | `debug`, `warn` |
| `NODE_ENV`  | Controls log format (JSON vs pretty print) | -       | `production`    |

## Usage in Services and Controllers

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class MyService {
  constructor(private readonly logger: Logger) {}

  myMethod() {
    // Info log
    this.logger.log('User created successfully');

    // Error log with stack trace
    try {
      // ... some code
    } catch (error) {
      this.logger.error('Failed to create user', error.stack);
    }

    // Warning log
    this.logger.warn('API rate limit approaching');

    // Debug log (only shown if LOG_LEVEL=debug)
    this.logger.debug('User data:', { userId: 123 });
  }
}
```

### Logging with Context

```typescript
import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class ProposalService {
  constructor(private readonly logger: Logger) {
    // Set context for all logs in this service
    this.logger.setContext(ProposalService.name);
  }

  async createProposal(data: CreateProposalDto) {
    this.logger.log('Creating proposal', { organizationId: data.organizationId });

    try {
      const proposal = await this.repository.create(data);
      this.logger.log('Proposal created', { proposalId: proposal.id });
      return proposal;
    } catch (error) {
      this.logger.error('Failed to create proposal', error.stack);
      throw error;
    }
  }
}
```

### Logging in Controllers

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Controller('proposals')
export class ProposalController {
  constructor(private readonly logger: Logger) {
    this.logger.setContext(ProposalController.name);
  }

  @Post()
  async create(@Body() data: CreateProposalDto) {
    this.logger.log('POST /proposals', { title: data.title });
    // ... controller logic
  }
}
```

### Structured Logging with Objects

```typescript
// Log with structured data (automatically serialized to JSON)
this.logger.log('User action completed', {
  userId: user.id,
  action: 'CREATE_PROPOSAL',
  timestamp: new Date().toISOString(),
  metadata: {
    proposalId: proposal.id,
    organizationId: org.id,
  },
});
```

## Request ID Tracking

All HTTP requests automatically receive a unique `x-request-id` header. This ID is:

- Auto-generated if not provided in the request
- Returned in the response headers
- Included in all logs for that request
- Useful for tracing requests across services

```typescript
// Access request ID in your code
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';

@Injectable()
export class MyService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly logger: Logger,
  ) {}

  myMethod() {
    const requestId = this.request.id;
    this.logger.log('Processing request', { requestId });
  }
}
```

## Log Output Examples

### Development (Pretty Print)

```
[2026-01-14 10:30:15.123] INFO (HTTP): [GET] /api/proposals
    requestId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    method: "GET"
    url: "/api/proposals"
    statusCode: 200
    responseTime: 45ms

[2026-01-14 10:30:16.456] ERROR (ProposalService): Failed to create proposal
    requestId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    error: "Validation failed"
    stack: "Error: Validation failed\n    at ..."
```

### Production (JSON)

```json
{
  "level": 30,
  "time": 1705228815123,
  "pid": 1234,
  "hostname": "api-server",
  "context": "HTTP",
  "requestId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "req": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "method": "GET",
    "url": "/api/proposals",
    "headers": {
      "host": "localhost:3001",
      "user-agent": "Mozilla/5.0..."
    }
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45,
  "msg": "[GET] /api/proposals"
}
```

## Best Practices

### ✅ DO

- Use appropriate log levels (`error` for errors, `warn` for warnings, `info` for general info)
- Include relevant context (user ID, proposal ID, etc.)
- Log structured data (objects) instead of concatenated strings
- Set context in services/controllers for better traceability
- Log errors with stack traces: `this.logger.error('message', error.stack)`

### ❌ DON'T

- Don't log sensitive data (passwords, tokens, credit cards)
- Don't log in loops (aggregate data instead)
- Don't use console.log() (use logger instead)
- Don't log at `debug`/`trace` level in production (performance impact)
- Don't log entire request/response bodies (they're auto-logged)

## Testing

Logs are automatically included in test output. To silence logs during tests:

```typescript
// In your test file
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterAll(() => {
  jest.restoreAllMocks();
});
```

## Performance

Pino is one of the fastest Node.js loggers:

- **Asynchronous logging** (doesn't block the event loop)
- **Minimal overhead** (<10ms per log in most cases)
- **JSON serialization** optimized for performance
- **Zero dependencies** in production

## References

- [nestjs-pino GitHub](https://github.com/iamolegga/nestjs-pino)
- [Pino Documentation](https://getpino.io/)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
