# Prompt Patterns para Sentinel RFP

Padrões de prompts otimizados para casos de uso específicos do projeto, com foco em qualidade, consistência e trust scoring.

## Princípios de Prompt Engineering

### 1. Clareza e Especificidade

- Seja explícito sobre o formato de saída
- Defina o tom e estilo desejado
- Especifique restrições e regras

### 2. Contexto Adequado

- Forneça contexto relevante sem overflow
- Use hierarchical context (mais relevante primeiro)
- Limite context window para evitar custos

### 3. Few-Shot Learning

- Mostre 2-3 exemplos de respostas ideais
- Inclua exemplos de edge cases
- Demonstre como lidar com informação insuficiente

### 4. Chain of Thought

- Peça raciocínio explícito quando necessário
- Use step-by-step instructions
- Valide lógica antes de responder

---

## 1. Response Generation Prompt

**Caso de uso:** Gerar resposta para pergunta de RFP baseada em knowledge library

**Modelo recomendado:** `claude-3-5-sonnet-20241022`
**Temperatura:** `0.3` (determinístico mas natural)
**Max tokens:** `2048` (respostas típicas 500-1500 tokens)

```typescript
const responseGenerationPrompt = (
  question: string,
  context: string[],
  company_info: object,
  win_themes: string[],
) => `You are an expert RFP response writer for ${company_info.name}, a company
specializing in ${company_info.specialization}.

<company_profile>
${JSON.stringify(company_info, null, 2)}
</company_profile>

<win_themes>
${win_themes.map((theme, i) => `${i + 1}. ${theme}`).join('\n')}
</win_themes>

<knowledge_library>
${context.map((doc, i) => `[${i + 1}] ${doc.title}\n${doc.content}`).join('\n\n')}
</knowledge_library>

<question>
${question}
</question>

<instructions>
Write a compelling RFP response following these rules:

CONTENT REQUIREMENTS:
1. Answer the question directly and completely
2. Use ONLY information from the knowledge library
3. Cite every factual claim using [1], [2], etc.
4. Incorporate relevant win themes naturally
5. If information is insufficient, state what's missing explicitly

STYLE REQUIREMENTS:
1. Professional, confident tone (not arrogant)
2. Active voice preferred over passive
3. Clear, concise sentences (avoid jargon unless necessary)
4. Structured with paragraphs, not bullet lists (unless question asks)

TRUST REQUIREMENTS:
1. Every claim must be verifiable from sources
2. Do not make assumptions or invent details
3. If uncertain, say "We would need to clarify..." rather than guess
4. Be honest about limitations

DIFFERENTIATORS:
1. Highlight our unique strengths when relevant
2. Show, don't just tell (use specific examples)
3. Connect our capabilities to customer's needs
</instructions>

Response:`;
```

**Variações por tipo de pergunta:**

```typescript
// Para perguntas técnicas (mais detalhes, especificações)
const technicalVariation = {
  temperature: 0.2, // Mais determinístico
  instructions: `
    - Include specific technical details and metrics
    - Reference standards and frameworks by name
    - Provide architectural diagrams descriptions if relevant
  `,
};

// Para perguntas de experiência passada (storytelling)
const experienceVariation = {
  temperature: 0.4, // Mais criativo
  instructions: `
    - Use STAR format (Situation, Task, Action, Result)
    - Include specific, quantifiable outcomes
    - Explain lessons learned and improvements made
  `,
};

// Para perguntas de compliance (preciso, factual)
const complianceVariation = {
  temperature: 0.1, // Muito determinístico
  instructions: `
    - State compliance status clearly (Yes/No/Partial)
    - Reference specific clauses and requirements
    - Provide evidence/certification references
    - If non-compliant, explain mitigation plans
  `,
};
```

---

## 2. Trust Scoring Prompt

**Caso de uso:** Reviewer Agent calcula confiabilidade de uma resposta

**Modelo:** `claude-3-5-sonnet-20241022`
**Temperatura:** `0.1` (crítico ser consistente)
**Max tokens:** `1024`

```typescript
const trustScoringPrompt = (
  response: string,
  sources: string[],
  question: string,
) => `You are a critical reviewer evaluating the trustworthiness of an RFP
response. Your job is to identify any claims that lack proper support.

<question>
${question}
</question>

<sources>
${sources.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}
</sources>

<response_to_evaluate>
${response}
</response_to_evaluate>

<evaluation_criteria>
Analyze the response for:

1. CITATION COVERAGE
   - Does every factual claim have a citation?
   - Are citations to correct sources?
   - Are there unsupported assertions?

2. FAITHFULNESS TO SOURCES
   - Does response accurately represent source information?
   - Any distortions or exaggerations?
   - Any invented details not in sources?

3. COMPLETENESS
   - Does response fully answer the question?
   - Are there logical gaps?
   - Missing critical information?

4. CLARITY & PRECISION
   - Is language clear and unambiguous?
   - Are claims specific (not vague)?
   - Appropriate level of confidence?
</evaluation_criteria>

Provide your evaluation in JSON format:
{
  "trust_score": 0-100,
  "citation_coverage_score": 0-100,
  "faithfulness_score": 0-100,
  "completeness_score": 0-100,
  "clarity_score": 0-100,
  "issues": [
    {
      "type": "missing_citation|false_claim|vague_language|incomplete",
      "severity": "critical|major|minor",
      "location": "quote from response",
      "explanation": "why this is an issue",
      "suggestion": "how to fix"
    }
  ],
  "strengths": [
    "what response does well"
  ],
  "overall_assessment": "brief summary"
}`;
```

---

## 3. Question Extraction Prompt

**Caso de uso:** Extrair perguntas de documento RFP (PDF/DOCX)

**Modelo:** `claude-3-5-sonnet-20241022` (com Vision)
**Temperatura:** `0.2`
**Max tokens:** `4096`

```typescript
const questionExtractionPrompt = () => `You are an expert at analyzing RFP
documents and extracting questions/requirements.

Analyze this RFP document and extract ALL questions that require a response.

<extraction_rules>
1. IDENTIFICATION
   - Look for explicit questions (sentences ending with ?)
   - Identify implicit requirements ("Describe...", "Provide...", "Explain...")
   - Capture compliance checkboxes and attestations
   - Note evaluation criteria that imply questions

2. STRUCTURE PRESERVATION
   - Maintain section numbering (e.g., "3.2.1")
   - Keep hierarchical relationships
   - Preserve subsection groupings
   - Note if question is part of a series

3. METADATA EXTRACTION
   - Page limits (if specified)
   - Format requirements (narrative, table, attachment, etc.)
   - Evaluation weight/points (if mentioned)
   - Mandatory vs. optional
   - Compliance tags (FAR, DFARS, etc.)

4. CONTEXT CAPTURE
   - Section title and introduction
   - Any specific instructions
   - Related questions in same section
   - Figures/tables referenced
</extraction_rules>

Output as JSON array:
[
  {
    "section_number": "3.2.1",
    "section_title": "Technical Approach",
    "question_text": "Describe your proposed technical solution...",
    "question_type": "narrative|yes_no|table|attachment",
    "page_limit": 5,
    "word_limit": null,
    "mandatory": true,
    "evaluation_points": 20,
    "requirements": [
      "Must address scalability",
      "Must include architecture diagram"
    ],
    "compliance_tags": ["FAR 52.212-1"],
    "related_questions": ["3.2.2", "3.2.3"]
  }
]`;
```

---

## 4. Compliance Checking Prompt

**Caso de uso:** Verificar se resposta atende requisitos de compliance

**Modelo:** `claude-3-5-sonnet-20241022`
**Temperatura:** `0.1`
**Max tokens:** `2048`

```typescript
const complianceCheckPrompt = (
  response: string,
  requirements: string[],
  standards: string[],
) => `You are a compliance expert reviewing an RFP response against specified
requirements and standards.

<response>
${response}
</response>

<requirements>
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}
</requirements>

<standards>
${standards.join(', ')}
</standards>

<compliance_analysis>
For each requirement:
1. Determine if response addresses it (Yes/No/Partial)
2. Identify specific evidence from response
3. Note any gaps or concerns
4. Assess compliance level (Compliant/Non-Compliant/Needs Clarification)

For each standard:
1. Check if response mentions it explicitly
2. Verify if claimed compliance is supported
3. Identify any conflicts or inconsistencies
</compliance_analysis>

Output as JSON:
{
  "overall_compliance": "compliant|non_compliant|partial",
  "risk_level": "low|medium|high",
  "requirements_analysis": [
    {
      "requirement": "original requirement text",
      "status": "addressed|not_addressed|partial",
      "evidence": "quote from response",
      "gaps": ["what's missing"],
      "compliance_level": "compliant|non_compliant|needs_clarification"
    }
  ],
  "standards_analysis": [
    {
      "standard": "FAR 52.212-1",
      "mentioned": true,
      "properly_addressed": false,
      "issues": ["claims compliance but doesn't provide evidence"]
    }
  ],
  "critical_issues": [
    "list of must-fix items"
  ],
  "recommendations": [
    "suggestions to improve compliance"
  ]
}`;
```

---

## 5. Win Theme Integration Prompt

**Caso de uso:** Reescrever resposta para incorporar win themes

**Modelo:** `claude-3-5-sonnet-20241022`
**Temperatura:** `0.3`
**Max tokens:** `2048`

```typescript
const winThemeIntegrationPrompt = (
  original_response: string,
  win_themes: string[],
  customer_hot_buttons: string[],
) => `You are an expert at weaving win themes into RFP responses naturally.

<original_response>
${original_response}
</original_response>

<win_themes>
${win_themes.map((theme, i) => `${i + 1}. ${theme}`).join('\n')}
</win_themes>

<customer_hot_buttons>
${customer_hot_buttons.map((hot, i) => `${i + 1}. ${hot}`).join('\n')}
</customer_hot_buttons>

<instructions>
Rewrite the response to:
1. Maintain all factual content and citations
2. Naturally incorporate 2-3 relevant win themes
3. Address customer hot buttons where applicable
4. Keep professional tone and length similar
5. DO NOT make new claims without citations
6. DO NOT change technical accuracy

Focus on:
- Framing (how we position capabilities)
- Emphasis (what we highlight)
- Language (connecting to their priorities)
- Transitions (smooth integration)
</instructions>

Rewritten response:`;
```

---

## 6. Citation Extraction Prompt

**Caso de uso:** Extrair e mapear citations de uma resposta

**Modelo:** `claude-3-5-sonnet-20241022`
**Temperatura:** `0.1`
**Max tokens:** `1024`

```typescript
const citationExtractionPrompt = (response: string, sources: string[]) => `
Extract all citations from this response and map them to source documents.

<response>
${response}
</response>

<available_sources>
${sources.map((s, i) => `[${i + 1}] ${s.title}`).join('\n')}
</available_sources>

Output as JSON:
{
  "citations": [
    {
      "citation_marker": "[1]",
      "source_id": 1,
      "source_title": "title",
      "claim_supported": "exact text from response being supported",
      "page_or_section": "if available"
    }
  ],
  "uncited_claims": [
    "claims that lack citations"
  ],
  "citation_stats": {
    "total_citations": 5,
    "unique_sources": 3,
    "claims_cited": 5,
    "claims_uncited": 2
  }
}`;
```

---

## Prompt Engineering Best Practices

### 1. System Messages vs User Messages

```typescript
// Good: Use system for role/context, user for specific task
{
  "system": "You are an RFP expert writer...",
  "messages": [
    { "role": "user", "content": "Write response for: ..." }
  ]
}

// Less effective: Everything in user message
{
  "messages": [
    { "role": "user", "content": "You are an expert... Now write..." }
  ]
}
```

### 2. XML Tags for Structure

```typescript
// Good: Use XML tags for clear sections
`<question>${q}</question>
<context>${c}</context>
<instructions>...</instructions>`
// Less clear: Plain text
`Question: ${q}\nContext: ${c}\nInstructions:...`;
```

### 3. Output Format Specification

```typescript
// Good: Specify exact format
`Output as JSON with this schema: {...}`
// Risky: Vague format
`Provide a structured response`;
```

### 4. Examples (Few-Shot)

```typescript
// Good: 2-3 concrete examples
`Example 1: Q: ... A: ...
Example 2: Q: ... A: ...
Now answer: ...`
// Overkill: Too many examples (wastes tokens)
`Example 1-10: ...`; // 10 examples is too many
```

---

## Testing & Iteration

### Prompt Evaluation Metrics

1. **Consistency:** Same input → similar output?
2. **Accuracy:** Output matches expected format/content?
3. **Cost:** Token usage acceptable?
4. **Latency:** Response time acceptable?
5. **Quality:** Human evaluation score?

### A/B Testing Prompts

```typescript
// Version A (baseline)
const promptV1 = `Write a response for: ${q}`;

// Version B (improved)
const promptV2 = `You are an expert... <context>...</context> Write...`;

// Compare metrics
const results = await comparePrompts(promptV1, promptV2, testCases);
```

### Prompt Versioning

Manter histórico de prompts:

```
prompts/
├── response-generation/
│   ├── v1-baseline.ts
│   ├── v2-added-citations.ts
│   ├── v3-win-themes.ts
│   └── current.ts (symlink)
└── trust-scoring/
    └── ...
```

---

## Recursos Adicionais

- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Prompt Library](https://docs.anthropic.com/claude/prompt-library)
- [Metaprompting](https://docs.anthropic.com/claude/docs/helper-metaprompt-experimental)
- [Cookbooks - Prompt Engineering](../cookbooks.md#4-prompt-engineering---few-shot-learning)

---

## Próximos Passos

- [ ] Implementar prompts no AI service
- [ ] Criar testes A/B para otimização
- [ ] Versionar prompts com métricas
- [ ] Coletar feedback para iterar
- [ ] Documentar variações bem-sucedidas
