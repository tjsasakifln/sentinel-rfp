# Claude Quickstarts - Templates Adaptáveis

Guia dos templates mais relevantes do repositório [claude-quickstarts](https://github.com/anthropics/claude-quickstarts) para acelerar desenvolvimento no Sentinel RFP.

## Visão Geral

Quickstarts são aplicações completas que demonstram:

- Arquitetura end-to-end
- Integração com frameworks modernos
- Best practices de UX
- Padrões de deployment

## Templates Prioritários

### 1. Customer Support Agent → SME Collaboration

**Template Original:** `customer-support-agent/`
**Adaptação:** SME Collaboration Module

**Por quê adaptar:**
O template de customer support tem padrões úteis para colaboração assíncrona com SMEs:

- Thread-based conversations
- @ mentions e notificações
- Status tracking (pending, in progress, answered)
- Integration com Slack/Teams

**Componentes reutilizáveis:**

```
customer-support-agent/
├── components/
│   ├── ThreadView.tsx          → QuestionThreadView.tsx
│   ├── MessageComposer.tsx     → ResponseComposer.tsx
│   ├── StatusBadge.tsx         → QuestionStatusBadge.tsx
│   └── MentionInput.tsx        → SMEMentionInput.tsx
├── hooks/
│   ├── useThread.ts            → useQuestionThread.ts
│   ├── useNotifications.ts     (reutilizar)
│   └── usePresence.ts          (reutilizar)
└── api/
    ├── threads.ts              → questions.ts
    └── notifications.ts        (reutilizar)
```

**Features para adaptar:**

- ✅ Thread-based conversation UI
- ✅ Real-time notifications
- ✅ @ mention system para SMEs
- ✅ Status workflow
- ✅ Assignment logic
- ✅ Activity timeline

**Implementação:**

- [ ] Adaptar components para RFP context (Issue #69)
- [ ] Integrar com Slack/Teams (Issue #64, #65)
- [ ] Implementar assignment workflow (Issue #70)

---

### 2. Legal Summarization → Question Extraction

**Template Original:** `legal-summarization/`
**Adaptação:** RFP Document Processing Pipeline

**Por quê adaptar:**
Documentos legais e RFPs compartilham características:

- Alta densidade de informação
- Estrutura hierárquica complexa
- Necessidade de preservar contexto
- Extração de itens acionáveis

**Componentes reutilizáveis:**

```
legal-summarization/
├── processing/
│   ├── DocumentParser.ts       → RFPParser.ts
│   ├── SectionExtractor.ts     (reutilizar)
│   ├── HierarchyDetector.ts    (reutilizar)
│   └── EntityExtractor.ts      → QuestionExtractor.ts
├── prompts/
│   ├── summarization.ts        → extraction.ts
│   └── key-points.ts           → requirements.ts
└── utils/
    ├── textChunking.ts         (reutilizar)
    └── citationMapping.ts      (reutilizar)
```

**Prompt adaptado:**

```typescript
// legal-summarization prompt
const legalSummaryPrompt = `Summarize this legal document,
highlighting key obligations and deadlines...`;

// Adapted for RFP
const rfpExtractionPrompt = `Extract all questions from this RFP
document. For each question:
1. Section number and title
2. Full question text
3. Response requirements (page limit, format, etc.)
4. Compliance tags (FAR, DFARS, etc.)
5. Evaluation criteria mentioned

Preserve the hierarchical structure and relationships.`;
```

**Implementação:**

- [ ] Adaptar document parser (Issue #29)
- [ ] Implementar question extraction (Issue #35)
- [ ] Criar hierarchy mapper (Issue #36)

---

### 3. Document Q&A → RAG Implementation

**Template Original:** `document-qa/`
**Adaptação:** Knowledge Library RAG System

**Por quê adaptar:**
Este template demonstra RAG completo com:

- Vector database integration
- Hybrid search (semantic + keyword)
- Citation tracking
- Source attribution

**Arquitetura do template:**

```
document-qa/
├── embedding/
│   ├── generateEmbeddings.ts
│   ├── vectorStore.ts
│   └── chunkStrategy.ts
├── retrieval/
│   ├── hybridSearch.ts         (reutilizar)
│   ├── reranking.ts            (reutilizar)
│   └── contextWindow.ts        (reutilizar)
├── generation/
│   ├── ragPrompt.ts            → rfpResponsePrompt.ts
│   ├── streaming.ts            (reutilizar)
│   └── citations.ts            (reutilizar)
└── evaluation/
    ├── faithfulness.ts         → trustScore.ts
    └── relevance.ts            (reutilizar)
```

**RAG Pattern:**

```typescript
// From document-qa template
async function answerQuestion(question: string) {
  // 1. Retrieve relevant chunks
  const chunks = await hybridSearch(question, { top_k: 10 });

  // 2. Rerank by relevance
  const reranked = await rerank(chunks, question);

  // 3. Build context window
  const context = buildContextWindow(reranked.slice(0, 5));

  // 4. Generate answer with citations
  const answer = await generateWithCitations(question, context);

  // 5. Calculate faithfulness score
  const score = await evaluateFaithfulness(answer, context);

  return { answer, score, sources: context };
}
```

**Adaptação para RFP:**

```typescript
async function generateRFPResponse(questionId: string) {
  // 1. Get question details
  const question = await db.question.findUnique({ id: questionId });

  // 2. Search knowledge library (same as doc-qa)
  const knowledge = await hybridSearch(question.text, {
    filters: { category: question.category },
  });

  // 3. Generate response (adapted prompt)
  const response = await generateRFPResponse(question, knowledge);

  // 4. Calculate trust score (adapted from faithfulness)
  const trustScore = await calculateTrustScore(response, knowledge);

  // 5. Save to database
  return await saveResponse(questionId, response, trustScore);
}
```

**Implementação:**

- [ ] Adaptar hybrid search (Issue #45)
- [ ] Implementar RAG pipeline (Issue #44-47)
- [ ] Criar trust scoring (Issue #51)

---

### 4. Data Extraction → Structured Output

**Template Original:** `data-extraction/`
**Adaptação:** Compliance Matrix Generation

**Por quê adaptar:**
Extração estruturada de dados é necessária para:

- Compliance matrices (Section L/M mapping)
- Requirement traceability
- Win theme tracking

**Template pattern:**

```typescript
// Define structured output schema
const extractionSchema = {
  type: 'object',
  properties: {
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          category: { type: 'string', enum: ['technical', 'compliance', 'cost'] },
          priority: { type: 'string', enum: ['must', 'should', 'may'] },
        },
      },
    },
  },
};
```

**Implementação:**

- [ ] Adaptar para compliance checking (Issue #38)
- [ ] Criar compliance matrix generator (Issue #78)

---

## Como Usar os Quickstarts

1. **Clone repositório:**

   ```bash
   git clone https://github.com/anthropics/claude-quickstarts.git
   cd claude-quickstarts
   ```

2. **Navegue para template:**

   ```bash
   cd customer-support-agent
   ```

3. **Instale e rode:**

   ```bash
   npm install
   npm run dev
   ```

4. **Analise arquitetura:**
   - Components reutilizáveis
   - Padrões de state management
   - API structure
   - Prompt engineering

## Adaptação para Sentinel RFP

### Checklist de Adaptação

Para cada template:

- [ ] **Leia o README completo** - Entenda propósito e decisões
- [ ] **Rode localmente** - Veja funcionando
- [ ] **Identifique componentes core** - O que é reutilizável?
- [ ] **Mapeie para nosso domínio** - Customer → SME, Ticket → Question
- [ ] **Adapte prompts** - Contexto de RFP vs. contexto original
- [ ] **Integre com nossa stack** - NestJS, Next.js, Prisma
- [ ] **Adicione testes** - Valide adaptações
- [ ] **Documente mudanças** - O que mudou e por quê

### Anti-Patterns a Evitar

❌ **Copy-paste sem entender** - Entenda antes de adaptar
❌ **Ignorar decisões de arquitetura** - Templates têm razões para suas escolhas
❌ **Sobrescrever boas práticas** - Se o template faz algo bem, mantenha
❌ **Não testar adaptações** - Valide que funciona no nosso contexto

### Best Practices

✅ **Manter créditos** - Comentar origem do código adaptado
✅ **Documentar adaptações** - Por que mudamos X para Y?
✅ **Contribuir melhorias** - PRs upstream se achar bugs
✅ **Compartilhar aprendizados** - Documentar padrões úteis

## Próximos Passos

- [ ] Analisar customer-support-agent para SME collaboration
- [ ] Adaptar legal-summarization para question extraction
- [ ] Implementar document-qa pattern para RAG
- [ ] Explorar outros templates relevantes

## Recursos Adicionais

- [Quickstarts Repository](https://github.com/anthropics/claude-quickstarts)
- [Template Selection Guide](https://github.com/anthropics/claude-quickstarts#choosing-a-template)
- [Deployment Guides](https://github.com/anthropics/claude-quickstarts/tree/main/deployment)
