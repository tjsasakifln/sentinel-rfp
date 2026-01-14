# Guia de Integração - Repositórios Anthropic

Este documento lista os repositórios Anthropic integrados no projeto Sentinel RFP e como utilizá-los.

## Visão Geral

A Anthropic fornece diversos repositórios open-source para facilitar integração e uso do Claude. Este guia documenta quais repos estamos usando e como.

## Status de Integração

| Recurso | Status | Localização | Documentação | Prioridade |
|---------|--------|-------------|--------------|------------|
| SDK TypeScript | ✅ Instalado | `packages/ai/` | [packages/ai/README.md](packages/ai/README.md) | P0 |
| Cookbooks | 📚 Documentado | `docs/anthropic-resources/` | [cookbooks.md](docs/anthropic-resources/cookbooks.md) | P0 |
| Quickstarts | 📚 Documentado | `docs/anthropic-resources/` | [quickstarts.md](docs/anthropic-resources/quickstarts.md) | P1 |
| Prompt Patterns | 📚 Documentado | `docs/anthropic-resources/` | [prompt-patterns.md](docs/anthropic-resources/prompt-patterns.md) | P0 |
| Skills | 🚧 Estrutura | `apps/api/src/skills/` | [skills/README.md](apps/api/src/skills/README.md) | P1 |
| Agent SDK | ⏳ Planejado | - | ADR-002 | P2 |
| MCP Server | ⏳ Planejado | - | - | P3 |

**Legenda:**
- ✅ Instalado e configurado
- 📚 Documentado como referência
- 🚧 Estrutura preparada, implementação pendente
- ⏳ Planejado para futuro

---

## 1. SDK Anthropic TypeScript

**Repositório:** https://github.com/anthropics/anthropic-sdk-typescript
**Status:** ✅ Instalado
**Versão:** 0.32.1
**Localização:** `packages/ai/`

### O que foi feito

- [x] Instalado via pnpm em `packages/ai/`
- [x] Criada abstração LLM conforme ADR-006
- [x] Implementado skeleton do AnthropicProvider
- [x] Configuradas environment variables
- [x] Integrado com backend NestJS

### Como usar

```typescript
// Em qualquer service do NestJS
import { AiService } from './ai/ai.service';

@Injectable()
export class ProposalService {
  constructor(private aiService: AiService) {}

  async generateResponse(questionId: string) {
    // TODO: Quando provider estiver implementado
    const response = await this.aiService.generateResponse(
      questionId,
      contextFromKnowledgeLibrary
    );
  }
}
```

### Próximos passos

- [ ] Implementar `AnthropicProvider.complete()` (Issue #48)
- [ ] Implementar streaming support
- [ ] Adicionar testes unitários

### Recursos

- [packages/ai/README.md](packages/ai/README.md)
- [docs/adr/006-llm-abstraction.md](docs/adr/006-llm-abstraction.md)
- [Documentação oficial do SDK](https://github.com/anthropics/anthropic-sdk-typescript)

---

## 2. Claude Cookbooks

**Repositório:** https://github.com/anthropics/claude-cookbooks
**Status:** 📚 Documentado
**Notebooks:** 31k stars
**Localização:** `docs/anthropic-resources/cookbooks.md`

### Notebooks relevantes documentados

1. **Multimodal Prompting** - Para processar PDFs de RFP com tabelas/imagens
2. **RAG Patterns** - Para knowledge retrieval e response generation
3. **Tool Use** - Para multi-agent architecture
4. **Prompt Engineering** - Para otimizar qualidade de respostas
5. **Citations** - Para trust scoring e rastreabilidade

### Como usar

1. Leia [docs/anthropic-resources/cookbooks.md](docs/anthropic-resources/cookbooks.md)
2. Clone repositório de cookbooks localmente:
   ```bash
   git clone https://github.com/anthropics/claude-cookbooks.git
   ```
3. Execute notebooks relevantes para entender padrões
4. Adapte código Python para TypeScript usando nosso abstraction layer

### Casos de uso no projeto

- Document processing (Issue #29-31)
- RAG implementation (Issue #44-47)
- Multi-agent system (Issue #67)
- Trust scoring (Issue #51)

---

## 3. Claude Quickstarts

**Repositório:** https://github.com/anthropics/claude-quickstarts
**Status:** 📚 Documentado
**Templates:** 13k stars
**Localização:** `docs/anthropic-resources/quickstarts.md`

### Templates adaptáveis documentados

1. **Customer Support Agent** → SME Collaboration (Issue #69)
2. **Legal Summarization** → Question Extraction (Issue #35)
3. **Document Q&A** → RAG Implementation (Issue #44-47)
4. **Data Extraction** → Compliance Matrix (Issue #78)

### Como usar

1. Leia [docs/anthropic-resources/quickstarts.md](docs/anthropic-resources/quickstarts.md)
2. Clone repositório localmente:
   ```bash
   git clone https://github.com/anthropics/claude-quickstarts.git
   ```
3. Navegue para template relevante e rode:
   ```bash
   cd claude-quickstarts/customer-support-agent
   npm install && npm run dev
   ```
4. Analise arquitetura e adapte para Sentinel RFP

### Componentes reutilizáveis

- Thread-based UI components
- Real-time notification system
- @ mention functionality
- Status workflow patterns
- RAG pipeline implementation

---

## 4. Prompt Patterns

**Status:** 📚 Documentado
**Localização:** `docs/anthropic-resources/prompt-patterns.md`

### Padrões documentados

1. **Response Generation** - Gerar respostas RFP com citations
2. **Trust Scoring** - Reviewer Agent para validação
3. **Question Extraction** - Extrair perguntas de PDFs
4. **Compliance Checking** - Verificar requisitos FAR/DFARS
5. **Win Theme Integration** - Incorporar temas vencedores
6. **Citation Extraction** - Mapear sources

### Como usar

1. Leia [docs/anthropic-resources/prompt-patterns.md](docs/anthropic-resources/prompt-patterns.md)
2. Copie prompt pattern relevante
3. Adapte para seu caso de uso específico
4. Teste e itere com dados reais
5. Version prompts que funcionam bem

### Exemplo de uso

```typescript
import { responseGenerationPrompt } from './prompts/response-generation';

const prompt = responseGenerationPrompt(
  question,
  contextFromKnowledgeLibrary,
  companyInfo,
  winThemes
);

const response = await aiService.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.3,
  maxTokens: 2048
});
```

---

## 5. Claude Code Skills

**Repositório:** https://github.com/anthropics/skills
**Status:** 🚧 Estrutura preparada
**Stars:** 40k
**Localização:** `apps/api/src/skills/`

### Skills planejadas

1. **rfp-response-generator** (P1)
   - Gera respostas RFP com IA
   - Busca contexto do knowledge library
   - Calcula trust score automático

2. **trust-score-calculator** (P1)
   - Analisa qualidade de resposta
   - Verifica citations contra sources
   - Sugere melhorias

3. **question-extractor** (P2)
   - Processa PDF/DOCX de RFP
   - Extrai perguntas com Vision API
   - Importa para banco de dados

4. **compliance-checker** (P3)
   - Verifica compliance FAR/DFARS
   - Gera compliance matrix
   - Identifica gaps

### Como usar (quando implementado)

```bash
# Via Claude Code CLI
claude /rfp-response-generator --question-id=123 --context-ids=456,789
```

### Próximos passos

- [ ] Implementar `rfp-response-generator` skill
- [ ] Implementar `trust-score-calculator` skill
- [ ] Criar testes automatizados
- [ ] Documentar exemplos de uso

### Recursos

- [apps/api/src/skills/README.md](apps/api/src/skills/README.md)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

---

## 6. Claude Agent SDK (Planejado)

**Repositório:** https://github.com/anthropics/claude-agent-sdk-typescript
**Status:** ⏳ Planejado para Fase 2
**Stars:** 624
**Prioridade:** P2

### O que será feito

Framework para construir multi-agent architecture conforme ADR-002:
- Orchestrator Agent (routing)
- Knowledge Agent (search)
- Planner Agent (query decomposition)
- Reasoning Agent (response generation)
- Reviewer Agent (fact-checking)

### Próximos passos

- [ ] Instalar Agent SDK (Issue #67)
- [ ] Implementar Orchestrator Agent
- [ ] Implementar agentes especializados
- [ ] Configurar agent coordination
- [ ] Testes end-to-end

### Recursos

- [docs/adr/002-multi-agent-rag.md](docs/adr/002-multi-agent-rag.md)
- [Agent SDK Repository](https://github.com/anthropics/claude-agent-sdk-typescript)

---

## 7. GitHub MCP Server (Planejado)

**Repositório:** https://github.com/anthropics/github-mcp-server
**Status:** ⏳ Planejado para futuro
**Stars:** 63
**Prioridade:** P3

### O que será feito

Model Context Protocol para melhor integração com GitHub:
- Contexto automático de issues
- PR context para code review
- Repository structure awareness

### Próximos passos

- [ ] Avaliar necessidade real
- [ ] Instalar e configurar MCP server
- [ ] Integrar com GitHub API
- [ ] Testar com Claude Code

---

## Configuração de Environment Variables

### Obrigatórias (Produção)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Opcionais (Recomendadas)

```bash
OPENAI_API_KEY=sk-...              # Para embeddings e fallback
LLM_PRIMARY_PROVIDER=anthropic     # Default provider
LLM_FALLBACK_ENABLED=true          # Enable fallback
```

### Como configurar

1. Copie `.env.example` para `.env`
2. Obtenha API key em https://console.anthropic.com/
3. Configure no `.env`
4. Reinicie serviços

Veja [.env.example](.env.example) para detalhes.

---

## Roadmap de Implementação

### ✅ Fase 1: Setup Inicial (Completo)
- [x] Instalar SDK Anthropic
- [x] Criar abstração LLM
- [x] Configurar environment variables
- [x] Documentar recursos Anthropic
- [x] Preparar estrutura para skills

### ⏳ Fase 2: Implementação Core (Issue #48)
- [ ] Implementar AnthropicProvider completo
- [ ] Implementar LLMRouter com fallback
- [ ] Adicionar cost tracking
- [ ] Criar testes unitários
- [ ] Adicionar OpenAI provider

### ⏳ Fase 3: Multi-Agent (Issue #67)
- [ ] Instalar Agent SDK
- [ ] Implementar Orchestrator
- [ ] Implementar agentes especializados
- [ ] Configurar coordination
- [ ] Testes end-to-end

### ⏳ Fase 4: Skills & Automação
- [ ] Implementar skills customizadas
- [ ] Integrar com Claude Code CLI
- [ ] Documentar workflows
- [ ] Criar exemplos de uso

---

## Recursos Adicionais

### Documentação Interna
- [docs/anthropic-resources/](docs/anthropic-resources/) - Guias completos
- [packages/ai/README.md](packages/ai/README.md) - LLM abstraction layer
- [apps/api/src/ai/README.md](apps/api/src/ai/README.md) - AI module NestJS
- [docs/adr/006-llm-abstraction.md](docs/adr/006-llm-abstraction.md) - ADR
- [docs/adr/002-multi-agent-rag.md](docs/adr/002-multi-agent-rag.md) - Multi-agent

### Documentação Externa
- [Anthropic Documentation](https://docs.anthropic.com/)
- [API Reference](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

## Perguntas Frequentes

**Q: Por que criar abstração customizada em vez de usar LangChain?**
A: Conforme ADR-006, abstração customizada dá melhor controle, type safety, e simplicidade. LangChain adiciona overhead desnecessário para nosso caso de uso.

**Q: Quando devo usar Cookbooks vs Quickstarts?**
A: Cookbooks para aprender padrões e técnicas específicas. Quickstarts para acelerar implementação de features completas.

**Q: Como contribuir com novos recursos Anthropic?**
A: 1) Adicione seção neste guia, 2) Crie documentação específica se necessário, 3) Atualize status de integração, 4) Link para recursos oficiais.

**Q: Posso usar outros LLM providers?**
A: Sim! A abstração suporta múltiplos providers. OpenAI está planejado para embeddings e fallback.

---

## Contribuindo

Ao adicionar novos recursos Anthropic:

1. Atualize este guia com novo recurso
2. Crie documentação específica se complexo
3. Marque status de integração
4. Adicione exemplos práticos
5. Link para documentação oficial
6. Atualize ROADMAP.md se necessário

---

Última atualização: 2026-01-14
Versão: 1.0.0
