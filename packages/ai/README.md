# @sentinel-rfp/ai

LLM abstraction layer para Sentinel RFP, conforme ADR-006.

## Status Atual

⚠️ **Setup Inicial Completo** - Estrutura base implementada, aguardando implementação completa do provider.

### Implementado

- [x] Estrutura de types e interfaces
- [x] AnthropicProvider skeleton
- [x] Router skeleton
- [x] CostTracker skeleton
- [x] TypeScript configuration
- [x] Anthropic SDK integration (v0.32.1)

### Pendente

- [ ] Implementação completa do `AnthropicProvider.complete()`
- [ ] Implementação de streaming support
- [ ] LLMRouter com fallback chain
- [ ] CostTracker funcional
- [ ] Testes unitários
- [ ] OpenAI provider (para embeddings e fallback)

## Estrutura

```
packages/ai/
├── src/
│   ├── types.ts                        # Interfaces e tipos
│   ├── providers/
│   │   ├── base.provider.ts            # Interface LLMProvider
│   │   └── anthropic.provider.ts       # Implementação Anthropic
│   ├── router.ts                       # Router com fallback logic
│   ├── cost-tracker.ts                 # Cost tracking por tenant
│   └── index.ts                        # Exports públicos
├── package.json
├── tsconfig.json
└── README.md (este arquivo)
```

## Instalação

Este package é privado e parte do monorepo. Para usar em outro workspace package:

```json
{
  "dependencies": {
    "@sentinel-rfp/ai": "workspace:*"
  }
}
```

## Uso Básico

### Inicializar Provider

```typescript
import { AnthropicProvider } from '@sentinel-rfp/ai';

const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);

console.log(provider.name); // 'anthropic'
console.log(provider.supportedModels); // ['claude-3-5-sonnet-20241022', ...]
```

### Gerar Completion (TODO - Não Implementado)

```typescript
const response = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: 'Explain RFP response best practices' }
  ],
  temperature: 0.3,
  maxTokens: 2048,
  metadata: {
    tenantId: 'org_123',
    requestId: 'req_456',
    feature: 'response.generation'
  }
});

console.log(response.content);
console.log(response.usage); // { inputTokens, outputTokens, totalTokens }
```

### Streaming (TODO - Não Implementado)

```typescript
for await (const chunk of provider.stream(request)) {
  if (chunk.type === 'delta') {
    process.stdout.write(chunk.content);
  } else if (chunk.type === 'done') {
    console.log('\nUsage:', chunk.usage);
  }
}
```

## Modelos Suportados

### Anthropic Claude

| Model ID | Use Case | Input | Output | Best For |
|----------|----------|-------|--------|----------|
| `claude-3-5-sonnet-20241022` | Primary | $3/1M | $15/1M | Fast, good reasoning |
| `claude-3-opus-20240229` | Fallback | $15/1M | $75/1M | Best quality, complex tasks |
| `claude-3-haiku-20240307` | Cost-optimized | $0.25/1M | $1.25/1M | Simple, high-volume tasks |

### OpenAI (Planejado)

| Model ID | Use Case | Input | Output | Best For |
|----------|----------|-------|--------|----------|
| `gpt-4o` | Fallback LLM | $5/1M | $15/1M | Vision, multimodal |
| `gpt-4o-mini` | Classification | $0.15/1M | $0.6/1M | Simple, fast tasks |
| `text-embedding-3-large` | Embeddings | $0.13/1M | - | Semantic search |

## Arquitetura

Baseado em ADR-006:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LLM ABSTRACTION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                         ┌─────────────────┐                         │
│                         │   LLM Service   │                         │
│                         │   (Interface)   │                         │
│                         └────────┬────────┘                         │
│                                  │                                   │
│                    ┌─────────────┼─────────────┐                    │
│                    │             │             │                    │
│                    ▼             ▼             ▼                    │
│           ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│           │   Anthropic   │ │    OpenAI     │ │  Self-Hosted  │    │
│           │   Provider    │ │   Provider    │ │   Provider    │    │
│           │               │ │               │ │   (Future)    │    │
│           │ • Claude 3.5  │ │ • GPT-4o      │ │               │    │
│           │ • Claude 3    │ │ • GPT-4       │ │ • Llama       │    │
│           │   Opus        │ │ • GPT-3.5     │ │ • Mistral     │    │
│           └───────────────┘ └───────────────┘ └───────────────┘    │
│                    │             │             │                    │
│                    └─────────────┼─────────────┘                    │
│                                  │                                   │
│                    ┌─────────────┴─────────────┐                    │
│                    │                           │                    │
│                    ▼                           ▼                    │
│           ┌───────────────┐           ┌───────────────┐            │
│           │    Router     │           │    Cache      │            │
│           │               │           │               │            │
│           │ • Fallback    │           │ • Semantic    │            │
│           │ • Load balance│           │ • Response    │            │
│           │ • A/B test    │           │ • Embedding   │            │
│           └───────────────┘           └───────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Próximos Passos

### Implementação Completa do Provider (Issue #48)

1. **Implementar AnthropicProvider.complete()**
   ```typescript
   // Mapear messages para formato Anthropic
   // Chamar client.messages.create()
   // Mapear response de volta
   // Rastrear latency e usage
   ```

2. **Implementar AnthropicProvider.stream()**
   ```typescript
   // Usar client.messages.stream()
   // Yield delta chunks
   // Yield final usage stats
   ```

3. **Error handling e retry logic**
   ```typescript
   // Rate limits → retry com backoff
   // Timeout → retry
   // Auth errors → fail fast
   ```

### Router e Fallback (Issue #48)

1. **Implementar LLMRouter**
   ```typescript
   // Provider selection
   // Fallback chain
   // Circuit breaker pattern
   // Retry with exponential backoff
   ```

2. **Adicionar OpenAI Provider**
   ```typescript
   // Para embeddings
   // Para fallback em completions
   ```

### Cost Tracking (Issue #48)

1. **Database integration**
   ```typescript
   // Store usage events
   // Aggregate per tenant
   // Budget alerts
   ```

2. **Métricas e reporting**
   ```typescript
   // Cost per tenant
   // Usage by model
   // Trend analysis
   ```

## Desenvolvimento

### Build

```bash
cd packages/ai
pnpm build
```

### Watch mode

```bash
pnpm dev
```

### Type checking

```bash
pnpm typecheck
```

## Testing

TODO: Adicionar testes

```bash
pnpm test
```

## Recursos

### Documentação Interna

- [`docs/adr/006-llm-abstraction.md`](../../docs/adr/006-llm-abstraction.md) - Architecture Decision Record
- [`docs/adr/002-multi-agent-rag.md`](../../docs/adr/002-multi-agent-rag.md) - Multi-agent architecture
- [`docs/anthropic-resources/`](../../docs/anthropic-resources/) - Guias de integração Anthropic

### Documentação Externa

- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Claude Cookbooks](https://github.com/anthropics/claude-cookbooks)

## Contribuindo

Ao contribuir para este package:

1. Siga ADR-006 para decisões arquiteturais
2. Mantenha type safety 100%
3. Adicione testes para novas features
4. Documente mudanças no CHANGELOG
5. Atualize este README se necessário

## Licença

Privado - Parte do monorepo Sentinel RFP
