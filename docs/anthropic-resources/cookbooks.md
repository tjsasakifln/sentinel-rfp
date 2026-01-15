# Claude Cookbooks - Notebooks Relevantes para RFP

Guia dos notebooks mais úteis do repositório [claude-cookbooks](https://github.com/anthropics/claude-cookbooks) para o projeto Sentinel RFP.

## Visão Geral

Os Cookbooks são notebooks Jupyter que demonstram padrões práticos de uso do Claude. Cada notebook inclui:

- Código executável
- Explicações detalhadas
- Casos de uso reais
- Best practices

## Notebooks Prioritários

### 1. Multimodal Prompting (Vision + Text)

**URL:** `multimodal/document-analysis.ipynb`
**Relevância:** ⭐⭐⭐⭐⭐ CRÍTICO

**Por quê é importante:**
RFPs vêm em PDFs com tabelas complexas, diagramas e layouts variados. Vision API do Claude pode processar esses documentos diretamente.

**Casos de uso no Sentinel RFP:**

- Extrair perguntas de documentos RFP em PDF
- Processar tabelas de requisitos técnicos
- Identificar diagramas e figuras relevantes
- Manter estrutura e hierarquia do documento

**Exemplo adaptado:**

```python
import anthropic

client = anthropic.Anthropic()

# Upload RFP document
with open("rfp_document.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data,
                    },
                },
                {
                    "type": "text",
                    "text": """Extract all questions from this RFP document.
                    For each question, provide:
                    - Section number and title
                    - Full question text
                    - Any specific requirements or constraints
                    - Whether it requires technical or narrative response

                    Format as JSON array."""
                }
            ],
        }
    ],
)
```

**Implementação no projeto:**

- [ ] Integrar no `question-extractor` skill
- [ ] Usar no document ingestion pipeline (Issue #29)
- [ ] Implementar table extraction (Issue #30)

---

### 2. RAG Patterns (Retrieval-Augmented Generation)

**URL:** `rag/hybrid-search-rag.ipynb`
**Relevância:** ⭐⭐⭐⭐⭐ CRÍTICO

**Por quê é importante:**
Core do nosso sistema é buscar conhecimento relevante e gerar respostas baseadas nele com alta fidelidade.

**Casos de uso no Sentinel RFP:**

- Knowledge retrieval do library
- Context ranking para respostas
- Citation extraction
- Source attribution

**Padrão principal - Hybrid Search:**

```python
# Combine vector search (semantic) + keyword search (exact match)
def hybrid_search(query: str, top_k: int = 5):
    # 1. Vector search (embeddings)
    query_embedding = openai.embeddings.create(
        model="text-embedding-3-large",
        input=query
    )

    vector_results = db.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    # 2. Keyword search (BM25 or full-text)
    keyword_results = db.keyword_search(
        query=query,
        top_k=top_k
    )

    # 3. Merge and re-rank
    combined = merge_results(vector_results, keyword_results)
    reranked = rerank_by_relevance(combined, query)

    return reranked[:top_k]
```

**Prompt pattern para RAG:**

```python
def generate_rfp_response(question: str, context: list[str]):
    prompt = f"""You are an expert RFP response writer for our company.

Context from knowledge library:
{format_context(context)}

Question from RFP:
{question}

Instructions:
- Write a clear, compelling response
- Use ONLY information from the provided context
- Cite sources using [1], [2], etc.
- Maintain professional, confident tone
- If context insufficient, state what's missing

Response:"""

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content
```

**Implementação no projeto:**

- [ ] Implementar no AI service (Issue #48)
- [ ] Integrar com pgvector search (Issue #45)
- [ ] Adicionar Meilisearch para keyword search (Issue #45)

---

### 3. Tool Use (Function Calling)

**URL:** `tool-use/multi-tool-agent.ipynb`
**Relevância:** ⭐⭐⭐⭐ ALTA

**Por quê é importante:**
Para implementar multi-agent architecture (Orchestrator, Knowledge Agent, Planner, Reviewer).

**Casos de uso no Sentinel RFP:**

- Orchestrator Agent routing requests
- Knowledge Agent searching database
- Reviewer Agent fact-checking
- Planner Agent decomposing complex questions

**Exemplo - Tool Definition:**

```python
tools = [
    {
        "name": "search_knowledge_library",
        "description": "Search company knowledge library for relevant content",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                },
                "filters": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string"},
                        "recency": {"type": "string"}
                    }
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "calculate_trust_score",
        "description": "Calculate trust score for a response",
        "input_schema": {
            "type": "object",
            "properties": {
                "response": {"type": "string"},
                "citations": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["response", "citations"]
        }
    }
]
```

**Implementação no projeto:**

- [ ] Implementar no multi-agent system (Issue #67)
- [ ] Criar tools para Knowledge Agent
- [ ] Criar tools para Reviewer Agent

---

### 4. Prompt Engineering - Few-Shot Learning

**URL:** `prompt-engineering/few-shot-examples.ipynb`
**Relevância:** ⭐⭐⭐⭐ ALTA

**Por quê é importante:**
Para garantir consistência de formato e qualidade nas respostas geradas.

**Casos de uso no Sentinel RFP:**

- Ensinar tom e estilo de respostas
- Mostrar como citar sources
- Demonstrar estrutura de resposta ideal

**Exemplo - Few-Shot Prompt:**

```python
few_shot_examples = """
Example 1:
Question: Describe your company's cybersecurity approach.
Context: [1] We use ISO 27001 framework [2] 24/7 SOC monitoring [3] Annual penetration testing
Response: Our cybersecurity program follows ISO 27001 standards [1], providing comprehensive
risk management across all systems. We maintain 24/7 Security Operations Center (SOC) monitoring
[2] to detect and respond to threats in real-time. Additionally, we conduct annual third-party
penetration testing [3] to proactively identify and remediate vulnerabilities.

Example 2:
Question: What is your team's experience with government contracts?
Context: [1] $50M in federal contracts since 2018 [2] FedRAMP authorized [3] Team includes 12
personnel with Secret clearances
Response: Our team has extensive federal contracting experience, managing over $50M in government
contracts since 2018 [1]. We are FedRAMP authorized [2], demonstrating our commitment to federal
security requirements. Our workforce includes 12 cleared personnel with active Secret clearances
[3], enabling us to support classified projects.

Now answer this question following the same style...
"""
```

**Implementação no projeto:**

- [ ] Criar few-shot examples para cada tipo de resposta
- [ ] Armazenar examples no banco
- [ ] Usar em response generation prompts

---

### 5. Citations and Source Attribution

**URL:** `citations/faithful-generation.ipynb`
**Relevância:** ⭐⭐⭐⭐⭐ CRÍTICO

**Por quê é importante:**
Trust scoring depende de rastreabilidade. Precisamos garantir que cada afirmação pode ser verificada.

**Prompt pattern:**

```python
def generate_with_citations(question: str, sources: list[dict]):
    sources_text = "\n\n".join([
        f"[{i+1}] {s['title']}\n{s['content']}"
        for i, s in enumerate(sources)
    ])

    prompt = f"""Answer the following question using ONLY the provided sources.

Sources:
{sources_text}

Question: {question}

CRITICAL RULES:
1. Every factual claim MUST have a citation [1], [2], etc.
2. If information is NOT in sources, say "Not found in provided materials"
3. Do not invent or assume information
4. Multiple sources can support one claim: [1][2]
5. At the end, list all used sources

Answer:"""

    return client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
```

**Trust Score Logic:**

```python
def calculate_trust_score(response: str, sources: list[str]) -> float:
    """
    Trust score factors:
    - Citation density (claims per citation)
    - Source coverage (% of response with citations)
    - Hallucination check (verify claims against sources)
    """

    # Count citations
    citations = re.findall(r'\[\d+\]', response)
    citation_count = len(citations)

    # Estimate claim count (sentences)
    claims = re.split(r'[.!?]', response)
    claim_count = len([c for c in claims if len(c.strip()) > 10])

    # Citation density score (0-100)
    citation_density = min(100, (citation_count / claim_count) * 100)

    # Source coverage (has citation?)
    coverage_score = calculate_coverage(response, citations)

    # Hallucination check
    hallucination_score = verify_claims(response, sources)

    # Weighted average
    trust_score = (
        citation_density * 0.4 +
        coverage_score * 0.3 +
        hallucination_score * 0.3
    )

    return trust_score
```

**Implementação no projeto:**

- [ ] Implementar citation extraction
- [ ] Implementar trust score calculation (Issue #51)
- [ ] Criar Reviewer Agent para validar citations

---

## Outros Notebooks Úteis

### Streaming Responses

**URL:** `streaming/sse-streaming.ipynb`
**Uso:** Real-time response generation UI

### Tone Adaptation

**URL:** `prompt-engineering/tone-control.ipynb`
**Uso:** Ajustar tom (formal, técnico, persuasivo) por question type

### Long Context Handling

**URL:** `context/long-document-summarization.ipynb`
**Uso:** Processar RFPs de 200+ páginas

### Structured Output

**URL:** `output-formats/json-mode.ipynb`
**Uso:** Garantir respostas em formato estruturado para parsing

---

## Como Usar os Cookbooks

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/anthropics/claude-cookbooks.git
   cd claude-cookbooks
   ```

2. **Instale dependências:**

   ```bash
   pip install jupyter anthropic openai
   ```

3. **Configure API key:**

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Execute notebooks:**
   ```bash
   jupyter notebook
   ```

## Adaptando para Sentinel RFP

Quando adaptar padrões dos cookbooks:

1. **Leia o notebook completo** - Entenda o contexto
2. **Adapte para TypeScript** - Maioria dos exemplos é Python
3. **Integre com nossa arquitetura** - Use nosso LLM abstraction layer
4. **Adicione error handling** - Cookbooks focam em happy path
5. **Implemente cost tracking** - Monitore uso de tokens
6. **Crie testes** - Valide comportamento esperado

## Próximos Passos

- [ ] Implementar multimodal processing no document pipeline
- [ ] Adaptar RAG pattern para AI service
- [ ] Criar tools para multi-agent system
- [ ] Implementar few-shot examples
- [ ] Integrar citation tracking

## Recursos Adicionais

- [Cookbooks Repository](https://github.com/anthropics/claude-cookbooks)
- [Anthropic Docs - Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Anthropic Docs - Vision](https://docs.anthropic.com/claude/docs/vision)
- [Anthropic Docs - Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
