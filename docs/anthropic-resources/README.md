# Recursos Anthropic para Sentinel RFP

Este diretório contém documentação e referências para integração dos repositórios e recursos da Anthropic no projeto Sentinel RFP.

## Visão Geral

A Anthropic fornece diversos recursos públicos para facilitar a integração e uso efetivo do Claude:

1. **SDK TypeScript** - Biblioteca oficial para integração com API
2. **Claude Cookbooks** - Notebooks com padrões práticos de uso
3. **Claude Quickstarts** - Templates de aplicações prontos para adaptar
4. **Skills** - Capacidades customizadas para Claude Code
5. **MCP Servers** - Model Context Protocol para integrações

## Estrutura da Documentação

### [cookbooks.md](./cookbooks.md)

Guia dos notebooks mais relevantes do repositório Claude Cookbooks, com foco em:

- Multimodal prompting (processamento de documentos)
- RAG patterns (knowledge retrieval)
- Tool use (agents especializados)
- Prompt engineering (otimização de qualidade)

### [quickstarts.md](./quickstarts.md)

Templates de aplicações que podem ser adaptados para o Sentinel RFP:

- Customer support agent → SME collaboration
- Legal summarization → RFP question extraction
- Document Q&A → RAG implementation

### [prompt-patterns.md](./prompt-patterns.md)

Padrões de prompts otimizados para casos de uso específicos:

- Response generation (respostas RFP)
- Trust scoring (reviewer agent)
- Question extraction (document processing)
- Citation mapping (source attribution)

## Repositórios Principais

### anthropic-sdk-typescript

**URL:** https://github.com/anthropics/anthropic-sdk-typescript
**Status:** ✅ Instalado em `packages/ai/`
**Versão:** 0.32.1

SDK oficial para TypeScript com suporte completo para:

- Messages API (text generation)
- Streaming responses
- Tool use (function calling)
- Vision capabilities

### claude-cookbooks

**URL:** https://github.com/anthropics/claude-cookbooks
**Status:** 📚 Referência documentada
**Notebooks:** 31k stars

Coleção de notebooks Jupyter demonstrando:

- Multimodal prompting
- RAG patterns
- Prompt engineering
- Tool use
- Citations

### claude-quickstarts

**URL:** https://github.com/anthropics/claude-quickstarts
**Status:** 📚 Templates documentados
**Templates:** 13k stars

Templates prontos de aplicações:

- Customer support agent
- Legal summarization
- Document Q&A
- Data extraction
- Content moderation

### skills

**URL:** https://github.com/anthropics/skills
**Status:** 🚧 Estrutura preparada
**Skills Planejadas:** 4 customizadas

Repositório de capacidades para Claude Code:

- Skills customizadas para RFP
- Automação de tarefas
- Ver: `apps/api/src/skills/README.md`

### claude-agent-sdk-typescript

**URL:** https://github.com/anthropics/claude-agent-sdk-typescript
**Status:** ⏳ Planejado (Fase 2)

Framework para construir agentes Claude:

- Multi-agent orchestration
- Tool coordination
- State management

### github-mcp-server

**URL:** https://github.com/anthropics/github-mcp-server
**Status:** ⏳ Planejado (futuro)

Model Context Protocol para GitHub:

- Issue tracking integration
- PR context
- Repository structure

## Como Usar Esta Documentação

### Para Desenvolvedores

1. **Começando**: Leia [cookbooks.md](./cookbooks.md) para entender padrões básicos
2. **Implementando Features**: Consulte [prompt-patterns.md](./prompt-patterns.md) para prompts otimizados
3. **Acelerando Desenvolvimento**: Use [quickstarts.md](./quickstarts.md) como templates

### Para Product/Design

1. Veja cookbooks para entender capacidades do Claude
2. Use quickstarts como inspiração para UX
3. Consulte prompt patterns para entender como features funcionarão

## Recursos Adicionais

- [Documentação Oficial Anthropic](https://docs.anthropic.com/)
- [API Reference](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)

## Status de Integração

| Recurso         | Status         | Localização            | Prioridade |
| --------------- | -------------- | ---------------------- | ---------- |
| SDK TypeScript  | ✅ Completo    | `packages/ai/`         | P0         |
| Cookbooks       | 📚 Documentado | Este diretório         | P0         |
| Quickstarts     | 📚 Documentado | Este diretório         | P1         |
| Prompt Patterns | 📚 Documentado | Este diretório         | P0         |
| Skills          | 🚧 Estrutura   | `apps/api/src/skills/` | P1         |
| Agent SDK       | ⏳ Planejado   | -                      | P2         |
| MCP Server      | ⏳ Planejado   | -                      | P3         |

## Próximos Passos

1. ✅ Setup SDK TypeScript
2. ✅ Documentar recursos principais
3. ⏳ Implementar provider completo (Issue #48)
4. ⏳ Criar skills customizadas
5. ⏳ Integrar agent SDK (Issue #67)
6. ⏳ Configurar MCP

## Contribuindo

Ao adicionar novos recursos Anthropic:

1. Documente o repositório neste README
2. Crie guia específico se necessário (ex: `new-resource.md`)
3. Atualize status de integração
4. Adicione exemplos de uso
5. Link para documentação oficial

## Perguntas Frequentes

**Q: Por que não usar LangChain?**
A: Conforme ADR-006, optamos por abstração customizada para melhor controle, type safety e simplicidade.

**Q: Quando usar Cookbooks vs Quickstarts?**
A: Cookbooks para aprender padrões e técnicas. Quickstarts para acelerar implementação de features completas.

**Q: Como contribuir com novos prompt patterns?**
A: Adicione em `prompt-patterns.md` com exemplo, caso de uso, e métricas de qualidade.

**Q: Posso usar outros providers além de Anthropic?**
A: Sim! A abstração LLM suporta múltiplos providers (ver ADR-006). OpenAI está planejado para embeddings e fallback.
