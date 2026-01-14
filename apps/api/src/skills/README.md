# Custom Claude Code Skills para Sentinel RFP

Skills customizadas para automatizar tarefas específicas do projeto usando Claude Code.

## O que são Skills?

Skills são comandos customizados que podem ser invocados via Claude Code CLI para automatizar tarefas complexas e específicas do projeto. Ver: https://github.com/anthropics/skills

## Skills Planejadas

### 1. `rfp-response-generator`
Gera respostas para perguntas de RFP com base no knowledge library.

**Uso:**
```bash
claude /rfp-response-generator --question-id=123 --context-ids=456,789
```

**Funcionalidade:**
- Busca contexto relevante do knowledge library
- Gera resposta usando Claude com prompt otimizado
- Calcula trust score automático
- Adiciona citations às fontes
- Salva no banco de dados

### 2. `trust-score-calculator`
Calcula trust score de uma resposta com base em citations e quality metrics.

**Uso:**
```bash
claude /trust-score-calculator --response-id=123
```

**Funcionalidade:**
- Analisa qualidade da resposta
- Verifica citations contra sources
- Detecta possíveis alucinações
- Gera score de 0-100
- Sugere melhorias

### 3. `question-extractor`
Extrai perguntas de documentos RFP (PDF, DOCX).

**Uso:**
```bash
claude /question-extractor --document-path="./rfps/example.pdf"
```

**Funcionalidade:**
- Processa documento usando Vision API
- Identifica seções e hierarquia
- Extrai perguntas e requirements
- Gera estrutura JSON
- Importa para banco de dados

### 4. `compliance-checker`
Verifica compliance de respostas com requisitos FAR/DFARS.

**Uso:**
```bash
claude /compliance-checker --proposal-id=123 --standards=FAR,DFARS
```

**Funcionalidade:**
- Analisa respostas contra compliance requirements
- Identifica gaps e riscos
- Gera compliance matrix
- Sugere correções
- Exporta relatório

## Como Criar uma Skill

### Estrutura de uma Skill

```typescript
// skills/rfp-response-generator/index.ts
export default {
  name: 'rfp-response-generator',
  description: 'Generate RFP responses with AI',

  async execute(args: { questionId: string; contextIds: string[] }) {
    // Implementation
  }
};
```

### Passos para Criar

1. Criar diretório para a skill em `apps/api/src/skills/[skill-name]/`
2. Implementar `index.ts` com interface da skill
3. Adicionar testes em `__tests__/`
4. Documentar uso em README.md da skill
5. Registrar skill no Claude Code config

## Configuração no Claude Code

```json
// .claude/skills.json
{
  "skills": [
    {
      "name": "rfp-response-generator",
      "path": "./apps/api/src/skills/rfp-response-generator"
    },
    {
      "name": "trust-score-calculator",
      "path": "./apps/api/src/skills/trust-score-calculator"
    }
  ]
}
```

## Recursos

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Claude Code Documentation](https://docs.anthropic.com/claude/docs/claude-code)
- [Skill Development Guide](https://docs.anthropic.com/claude/docs/skills-guide)

## Status Atual

Status: **Estrutura Preparada** - Aguardando implementação das skills

### Próximos Passos

1. Implementar `rfp-response-generator` (Priority 1)
2. Implementar `trust-score-calculator` (Priority 1)
3. Implementar `question-extractor` (Priority 2)
4. Implementar `compliance-checker` (Priority 3)
5. Criar testes automatizados para cada skill
6. Documentar exemplos de uso

## Contribuindo

Ao criar uma nova skill:
1. Siga a estrutura de diretórios padrão
2. Adicione testes
3. Documente com exemplos
4. Registre na configuração
5. Atualize este README
