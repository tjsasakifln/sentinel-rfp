# Request ID Tracking & Correlation

This document explains how request IDs are tracked and propagated throughout the Sentinel RFP application.

## Overview

Every HTTP request receives a unique UUID v4 identifier that is propagated through:

- HTTP response headers (`X-Request-ID`)
- Request object (`req.id`)
- All logs (via Pino logger)
- Background jobs (BullMQ - when implemented)

## Architecture

```
Client Request
     ↓
RequestIdInterceptor (generates/extracts UUID)
     ↓
Request Object (req.id)
     ├─→ HTTP Response Header (X-Request-ID)
     ├─→ Pino Logger (requestId field)
     └─→ BullMQ Jobs (job.data.requestId)
```

## Components

### 1. RequestIdInterceptor

Located at: `src/common/interceptors/request-id.interceptor.ts`

**Responsibilities:**

- Generate UUID v4 for each request
- Support client-provided request IDs (idempotency)
- Set `X-Request-ID` response header
- Attach request ID to `req.id`

**Usage:**

```typescript
// Already registered globally in main.ts
app.useGlobalInterceptors(new RequestIdInterceptor());

// Access in controllers/services
@Get()
findAll(@Req() req: Request) {
  const requestId = req.id; // UUID v4 string
}
```

### 2. Pino Logger Integration

Located at: `src/common/logger/logger.module.ts`

**Automatic Features:**

- Request ID included in all HTTP logs
- Custom property `requestId` in log context
- Request/response serialization includes request ID

**Log Output Example:**

```json
{
  "level": 30,
  "time": 1673520000000,
  "pid": 12345,
  "hostname": "api-server",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "context": "HTTP",
  "req": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "method": "GET",
    "url": "/api/proposals"
  },
  "msg": "[GET] /api/proposals"
}
```

### 3. BullMQ Jobs Integration (Future)

When implementing background jobs with BullMQ, propagate request ID like this:

**Adding Job to Queue:**

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';

@Injectable()
export class ProposalService {
  constructor(
    @InjectQueue('proposal-processing')
    private readonly proposalQueue: Queue,
  ) {}

  async processProposal(proposalId: string, @Req() req: Request) {
    // Add job with request ID in data
    await this.proposalQueue.add('process-rfp', {
      proposalId,
      requestId: req.id, // Propagate request ID
    });
  }
}
```

**Processing Job:**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';

@Processor('proposal-processing')
export class ProposalProcessor extends WorkerHost {
  constructor(private readonly logger: Logger) {
    super();
  }

  async process(job: Job) {
    const { proposalId, requestId } = job.data;

    // Create child logger with request ID context
    const jobLogger = this.logger.logger.child({ requestId });

    jobLogger.info(`Processing proposal ${proposalId}`);

    try {
      // ... process proposal
      jobLogger.info(`Proposal ${proposalId} processed successfully`);
    } catch (error) {
      jobLogger.error({ error }, `Failed to process proposal ${proposalId}`);
      throw error;
    }
  }
}
```

## Client Usage

### Idempotent Requests

Clients can provide their own request ID for idempotency:

```bash
curl -H "X-Request-ID: my-unique-id-123" \
  http://localhost:3001/api/proposals
```

The server will:

1. Use the provided request ID instead of generating one
2. Return the same ID in the response header
3. Log all operations with that ID

### Debugging with Request ID

```bash
# Make request and capture request ID
RESPONSE=$(curl -i http://localhost:3001/api/proposals)
REQUEST_ID=$(echo "$RESPONSE" | grep -i "x-request-id" | awk '{print $2}')

# Search logs for that request ID
cat logs/api.log | grep "$REQUEST_ID"
```

## Error Tracking Integration

When Sentry is integrated (issue #119), request IDs will be:

- Added as tags to Sentry events
- Used to correlate frontend and backend errors
- Included in error reports for debugging

**Example Sentry Integration:**

```typescript
// In Sentry filter
Sentry.beforeSend((event, hint) => {
  if (event.request?.headers?.['x-request-id']) {
    event.tags = {
      ...event.tags,
      requestId: event.request.headers['x-request-id'],
    };
  }
  return event;
});
```

## Testing

Unit tests: `src/common/interceptors/request-id.interceptor.spec.ts`

**Test Coverage:**

- UUID v4 generation
- Client-provided request ID handling
- Response header setting
- Idempotency
- Multiple requests generate different IDs

**Run tests:**

```bash
cd apps/api
npm test request-id.interceptor
```

## Benefits

1. **Distributed Tracing:** Track requests across services
2. **Debugging:** Correlate logs from single request
3. **Idempotency:** Client can retry with same request ID
4. **Error Tracking:** Link frontend/backend errors
5. **Observability:** Full request lifecycle visibility
6. **Support:** Quickly diagnose user issues

## Related Issues

- #116 - Global Exception Filters ✅
- #117 - Structured Logging (Pino) ✅
- #118 - Request ID Tracking (this feature) 🚧
- #119 - Sentry Integration (depends on #118)
- #120 - Error Alerting & Monitoring (depends on #118)

## References

- [RFC 4122 - UUID Specification](https://www.rfc-editor.org/rfc/rfc4122)
- [HTTP Header Field X-Request-ID](https://http.dev/x-request-id)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [Pino Logger](https://getpino.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)
