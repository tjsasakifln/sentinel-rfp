# AI Module

NestJS module that provides LLM integration services for Sentinel RFP.

## Overview

This module wraps the `@sentinel-rfp/ai` package and provides NestJS-specific services for AI operations.

## Architecture

```
ai/
├── ai.module.ts          # NestJS module definition
├── ai.service.ts         # Main AI service (wrapper for providers)
├── dto/                  # Data Transfer Objects (future)
│   ├── completion.dto.ts
│   └── embedding.dto.ts
└── README.md             # This file
```

## Current Status

Status: **Setup Complete** - Service skeleton implemented, awaiting feature implementation

### Implemented
- [x] Module and service structure
- [x] Provider initialization (Anthropic)
- [x] Configuration integration
- [x] Logging setup

### Pending Implementation
- [ ] Response generation
- [ ] Response review and scoring
- [ ] Trust score calculation
- [ ] Question extraction from documents
- [ ] Compliance checking
- [ ] DTOs for API requests/responses

## Usage

### Import the module

```typescript
import { AiModule } from './ai/ai.module';

@Module({
  imports: [AiModule],
  // ...
})
export class AppModule {}
```

### Use the service

```typescript
import { AiService } from './ai/ai.service';

@Injectable()
export class ProposalService {
  constructor(private aiService: AiService) {}

  async generateAnswer(questionId: string) {
    if (!this.aiService.isAvailable()) {
      throw new Error('AI services not configured');
    }

    // TODO: Implement when methods are ready
    // const response = await this.aiService.generateResponse(questionId, context);
  }
}
```

## Configuration

Required environment variables:
- `ANTHROPIC_API_KEY` - Anthropic API key (required in production)
- `OPENAI_API_KEY` - OpenAI API key (optional, for embeddings/fallback)
- `LLM_PRIMARY_PROVIDER` - Primary provider (default: 'anthropic')
- `LLM_FALLBACK_ENABLED` - Enable fallback (default: true)

## Next Steps

1. Implement `generateResponse()` method
2. Implement multi-agent architecture (Orchestrator, Knowledge, Planner, Reasoning, Reviewer)
3. Add DTOs for type-safe API integration
4. Implement streaming support for real-time responses
5. Add cost tracking integration
6. Create unit tests for AI service

## Related Documentation

- `packages/ai/README.md` - LLM abstraction layer
- `docs/adr/006-llm-abstraction.md` - Architecture decision record
- `docs/adr/002-multi-agent-rag.md` - Multi-agent architecture
- `docs/anthropic-resources/` - Anthropic integration guides
