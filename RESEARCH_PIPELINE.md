# Research Pipeline & Scoring Architecture

> **Note:** This document is a 100% accurate architectural diagram of the COGNAPSE research pipeline and scoring system. Model names have been omitted per policy. Generic descriptors are used instead.

---

## 1. Standard Research Pipeline

```mermaid
flowchart TB
    subgraph User["User Input"]
        A1["User submits query"]
    end

    subgraph Phase1["Phase 1 — Web Source Retrieval"]
        B1["searchWeb(query, 10)"]
        B2["Web Search API<br/>(Google Programmable Search)"]
        B3["Return GroundedSource[ ]<br/>+ RetrievalTrace"]
        B1 --> B2 --> B3
    end

    subgraph Phase2["Phase 2 — Primary AI Synthesis"]
        C1["Build prompt:<br/>• System prompt<br/>• Compressed sources<br/>• User query + stats"]
        C2["callCloudAI()"]
        C3{"Local Ollama available?"}
        C4["Local AI<br/>(Ollama)"]
        C5["Cloud Backend<br/>(Vercel Serverless)"]
        C6["runSwarm()<br/>→ Multi-model fallback chain"]
        C7["Parse JSON report"]
        C8["Attach real sources<br/>(replace hallucinated)"]
        C9["Attach retrieval trace"]

        C1 --> C2
        C2 --> C3
        C3 -- Yes, localhost --> C4
        C3 -- No / unstable --> C5
        C5 --> C6
        C4 --> C7
        C6 --> C7
        C7 --> C8 --> C9
    end

    subgraph Phase3["Phase 3 — Multi-Model Consensus"]
        D1["Parallel callCloudAI()<br/>with secondary API key"]
        D2["Secondary model generates<br/>independent report<br/>(different architecture)"]
        D3["diffReports(primary, secondary)"]
        D4["Transformers.js Embeddings<br/>(Semantic Cosine Similarity)"]
        D5["Generate consensus:<br/>• Agreement %<br/>• Agreement points<br/>• Divergent points<br/>• Score comparison"]
        D6{"Secondary model<br/>succeeded?"}
        D7["Attach MultiModelConsensus<br/>to report"]
        D8["Proceed with<br/>single-model report"]

        C9 --> D1
        D1 --> D2 --> D3 --> D4 --> D5
        D5 --> D6
        D6 -- Yes --> D7
        D6 -- No (graceful fallback) --> D8
    end

    subgraph Phase4["Phase 4 — Citation Verification"]
        E1["extractCitations()<br/>Parse [N] markers with<br/>preceding claim text"]
        E2["verifyCitations()<br/>Batch check claims vs<br/>source snippets"]
        E3["Secondary model verifies<br/>each claim-source pair"]
        E4{"Sources available<br/>AND citations found?"}
        E5["Verdict per claim:<br/>✅ Supported<br/>🔶 Partial<br/>❌ Contradicted<br/>⬜ Unrelated"]
        E6["Attach CitationVerification[]<br/>to report"]
        E7["Skip verification"]

        D7 --> E4
        E4 -- Yes --> E1 --> E2 --> E3 --> E5 --> E6
        E4 -- No --> E7
    end

    subgraph Output["Final Report"]
        F1["Complete COGNAPSE_Output:<br/>• Summary (bottom_line, synthesis)<br/>• Scores (credibility, relevance)<br/>• Real sources (10 max)<br/>• Conflict detection<br/>• Bias alerts<br/>• Intelligence map (knowledge graph)<br/>• SWOT analysis<br/>• Timeline events<br/>• Geo points<br/>• Multi-model consensus<br/>• Citation verifications<br/>• Follow-up suggestions"]
    end

    E6 --> F1
    E7 --> F1
    D8 --> F1
```

---

## 2. Deep Research Pipeline

```mermaid
flowchart TB
    subgraph Input["User Input"]
        A1["User submits<br/>deep research query"]
    end

    subgraph Stage1["Stage 1 — Expansion"]
        B1["Expand research objective"]
        B2["Clear previous cognition"]
    end

    subgraph Stage2["Stage 2 — Source Retrieval"]
        C1["searchWeb(query, 12)"]
        C2["Return 12 GroundedSources<br/>+ RetrievalTrace"]
        C1 --> C2
    end

    subgraph Stage3["Stage 3 — Thesis Generation"]
        D1["Compress sources<br/>for AI context window"]
        D2["Build THESIS_PROMPT:<br/>• Sources context<br/>• 11-section academic structure<br/>• Inline [citation] required"]
        D3["callCloudAI() →<br/>Same routing as standard<br/>(local → cloud fallback)"]
        D4["Backend: runSwarm()<br/>with high-capacity model<br/>(fallback chain)"]
        D5["Parse JSON →<br/>DeepResearchThesis"]
        D6["Thesis structure:<br/>1. Title<br/>2. Abstract<br/>3. Introduction<br/>4. Problem Statement<br/>5. Literature Review<br/>6. Methodology<br/>7. Key Findings<br/>8. Comparative Insights<br/>9. Limitations<br/>10. Future Scope<br/>11. Conclusion"]

        D1 --> D2 --> D3
        D3 --> D4 --> D5 --> D6
    end

    subgraph Stage4["Stage 4 — Scoring & Finalize"]
        E1["computeScoresFromReport()"]
        E2["• accuracy: overall_credibility/10<br/>• bias: from bias_alert or domain homogeneity<br/>• sourceDiversity: unique domain types<br/>• confidenceInterval: evidence_consensus + source bonus"]
        E3["Save score history<br/>to localStorage"]
        E4["Finalize report"]

        E1 --> E2 --> E3 --> E4
    end

    A1 --> Stage1 --> Stage2 --> Stage3 --> Stage4
```

---

## 3. Backend Swarm Architecture

```mermaid
flowchart TB
    subgraph Client["Client Side (callCloudAI)"]
        A1["callCloudAI(prompt, isJson,<br/>requestedModel, groqKey)"]
    end

    subgraph Routing["Routing Logic"]
        B1{"Local Ollama<br/>available & stable?"}
        B2["Health check:<br/>• Not mobile<br/>• localhost<br/>• Node is 'stable'"]
        B3["Send to local AI<br/>90s timeout"]
        B4{"Success?"}
        B5["Mark node unstable<br/>2 min cooldown"]
        B6["Cloud Backend: POST /api/research<br/>(Vercel Serverless)"]
        B7{"Cloud node stable?"}
        B8["Retry up to 2x<br/>(1.2s delay between)"]
        B9["Return result<br/>+ token usage"]
        B10{"Auth check<br/>(production only)"}
        B11["Throw: sign-in required"]

        A1 --> B1
        B1 -- Yes --> B2 --> B3 --> B4
        B4 -- No --> B5 --> B6
        B1 -- No --> B6
        B4 -- Yes --> B9
        B6 --> B10
        B10 -- No user --> B11
        B10 -- Has user --> B7
        B7 -- Yes --> B8 --> B9
        B7 -- No --> B8
    end

    subgraph Server["Server Side (runSwarm)"]
        C1{"groqKey =<br/>'secondary'?"}
        C2["Use primary API key"]
        C3["Use secondary API key<br/>(multi-model consensus)"]
        C4{"modelOverride<br/>provided?"}
        C5["Use specified model directly<br/>(bypass fallback chain)"]
        C6{"Research type?"}
        C7["Deep research →<br/>[High-capacity, then Efficient]"]
        C8["Token-heavy (>15K) →<br/>[Efficient only]"]
        C9["Standard →<br/>[Efficient, then High-capacity]"]
        C10{"Prompt too long<br/>for Efficient model?"}
        C11["Prune to fit context window"]
        C12["Try each node in order<br/>until one succeeds:<br/>• Set temperature by capacity<br/>• Make API call"]
        C13{"Response has<br/>content?"}
        C14["Return result<br/>+ token usage metadata"]
        C15["Throw: all nodes saturated"]

        C1 -- No --> C2
        C1 -- Yes --> C3
        C2 --> C4
        C3 --> C4
        C4 -- Yes --> C5
        C4 -- No --> C6
        C6 --> C7
        C6 --> C8
        C6 --> C9
        C7 --> C10
        C8 --> C10
        C9 --> C10
        C10 -- Yes --> C11 --> C12
        C10 -- No --> C12
        C12 --> C13
        C13 -- Yes --> C14
        C13 -- No --> C12
        C12 --> C15
    end

    B6 --> C1
    B8 --> C1
```

---

## 4. Scoring Engine

```mermaid
flowchart LR
    subgraph Inputs["Inputs"]
        I1["Sources (domain,<br/>credibility_score,<br/>key_finding, title)"]
        I2["User query"]
        I3["Existing scores<br/>(accuracy, bias,<br/>sourceDiversity,<br/>confidenceInterval)"]
        I4["Conflict array"]
        I5["Evidence consensus<br/>(strong/mixed/<br/>contested/insufficient)"]
    end

    subgraph Functions["Scoring Functions"]
        F1["computeEnhancedSourceCredibility()"]
        F2["computeEntityDiversity()"]
        F3["computeBiasFromSentiment()"]
        F4["computeSemanticRelevance()"]
        F5["computeConsensusScore()"]
    end

    subgraph Tools["Tools Used"]
        T1["Domain Credibility DB<br/>150+ mapped domains<br/>bias + factual ratings"]
        T2["compromise.js<br/>NLP entity extraction<br/>(orgs, places, people, nouns)"]
        T3["sentiment.js<br/>Sentiment analysis<br/>AFINN dictionary"]
        T4["Transformers.js<br/>Embedding model<br/>(client-side)"]
        T5["Cosine similarity<br/>between embeddings"]
    end

    subgraph Outputs["Computed Metrics"]
        O1["accuracy (0-10)<br/>Normalized credibility"]
        O2["bias (0-1)<br/>Domain + sentiment"]
        O3["sourceDiversity (0-1)<br/>Entity + domain uniqueness"]
        O4["confidenceInterval (0-1)<br/>Consensus + agreement"]
        O5["consensusScore (0-1)<br/>Pairwise source similarity"]
        O6["relevanceScore (0-1)<br/>Query-source embedding match"]
        O7["entityDiversity (0-1)<br/>Entity richness ratio"]
        O8["sentimentBias (0-1)<br/>Emotional tone analysis"]
        O9["enhancedCredibility (0-10)<br/>Domain-adjusted credibility"]
        O10["credibilityStdDev<br/>Spread across sources"]
        O11["overallQuality (0-100)<br/>Weighted composite"]
    end

    I1 --> F1
    I1 --> F2
    I1 --> F3
    I2 --> F4
    I1 --> F4
    I1 --> F5

    F1 --> T1
    F2 --> T2
    F3 --> T3
    F3 --> T1
    F4 --> T4
    F4 --> T5
    F5 --> T4
    F5 --> T5

    F1 --> O1
    F1 --> O9
    F1 --> O10
    F2 --> O3
    F2 --> O7
    F3 --> O2
    F3 --> O8
    F4 --> O6
    F5 --> O5

    O1 --> O11
    O2 --> O11
    O3 --> O11
    O4 --> O11
    O6 --> O11
    O7 --> O11
    I3 --> O11
    I4 --> O11
    I5 --> O11
```

---

## 5. Detailed Scoring Formulas

### overallQuality (0-100)
```
overallQuality = (
    (credibility / 10) × 0.35 +      ← Source trustworthiness
    consensusBase × 0.20 +            ← Evidence agreement level
    relevanceScore × 0.15 +           ← Query relevance
    entityDiversity × 0.10 +          ← Source variety
    (1 - bias) × 0.10 +               ← Objectivity
    confidenceInterval × 0.10         ← Overall confidence
) × 100
```

### accuracy (0-10)
```
accuracy = min(avgCredibility, 10)
```
Where `avgCredibility` is the average of per-source credibility scores, each computed as:
- **With domain info + cred score:** `factualToScore × 0.5 + cred × 0.3 + 2`
- **With domain info, no cred:** `factualToScore × 0.7 + 5 × 0.3`
- **.edu domain:** `8.5`
- **.gov / .mil domain:** `8.0`
- **Fallback:** `cred ?? 5`

### bias (0-1)
```
if (domain override exists):
  bias = domainBias × 0.7 + sentimentBias × 0.3
else:
  bias = sentimentBias
```
Where `domainBias` maps: pro-science=0.05, center=0.1, left/right-center=0.2, left/right=0.4, conspiracy=0.7, satire=0.6

### sourceDiversity (0-1)
```
sourceDiversity = entityRatio × 0.5 + domainRatio × 0.3 + topicRatio × 0.2
```
Then blended with existing score: `diversity × 0.4 + existing × 0.6`

### confidenceInterval (0-1)
```
confidenceInterval = min(
    consensusScore × 0.3 +
    consensusBase × 0.4 +
    (1 - conflictPenalty) × 0.3,
    0.99
)
```
Where `consensusBase`: strong=1, mixed=0.7, contested=0.4, insufficient=0.2
And `conflictPenalty = min(conflicts.length × 0.15, 0.45)`

### Deep Research scores (computeScoresFromReport)
```
accuracy = min(max(overall_credibility, 0), 100) / 10    (0-10)
bias = 0.2 + min(bias_alert_text_length / 200, 0.6)       (0.05-0.95)
sourceDiversity = min(unique_domain_types / 5, 1)         (0-1)
confidenceInterval = min(consensusBase + sources × 0.03, 0.99)
```

---

## 6. Data Flow Summary

```mermaid
flowchart LR
    subgraph Frontend["Frontend (Browser)"]
        A["User Interface<br/>(React app)"]
        B["Client-side scoring<br/>scoringEngine.ts"]
        C["Client-side AI<br/>callCloudAI()"]
        D["Local LLM<br/>(Ollama - optional)"]
    end

    subgraph Backend["Backend (Vercel Serverless)"]
        E["API Route: POST /api/research"]
        F["runSwarm()<br/>Inference routing"]
        G["Cloud LLM Provider<br/>(Primary API Key)"]
        H["Cloud LLM Provider<br/>(Secondary API Key)"]
    end

    subgraph External["External Services"]
        I["Web Search API<br/>(Google)"]
    end

    A --> I
    I --> A
    A --> B
    A --> C
    C --> D
    C --> E
    E --> F
    F --> G
    F --> H
    G --> C
    H --> C
    D --> A
```

---

## Score Display Map

| UI Element | Source | Scale |
|---|---|---|
| **Source Credibility** `/10` | `scores.accuracy` | 0–10 |
| **Objectivity (Low Bias)** `%` | `scores.bias` | 0–1 → display as (1-bias)% |
| **Source Diversity** `%` | `scores.sourceDiversity` | 0–1 → display as % |
| **Confidence Interval** `%` | `scores.confidenceInterval` | 0–1 → display as % |
| **Overall Quality** `%` | weighted composite | 0–100 |
| **Source Reliability Index** `/10` | `computeEnhancedSourceCredibility().average` | 0–10 |
| **Consensus Score** | multi-model agreement % | 0–100 |
| **Confidence Spread** `±%` | credibility std dev / mean | derived % |

---

*Generated from source code. Last updated: May 27, 2026.*
