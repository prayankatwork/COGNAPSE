export interface DeepResearchThesis {
  title: string;
  abstract: string;
  introduction: string;
  problemStatement: string;
  literatureReview: string;
  methodology: string;
  findings: string;
  comparativeInsights: string;
  limitations: string;
  futureScope: string;
  conclusion: string;
}

export interface ResearchScore {
  accuracy: number;
  bias: number;
  sourceDiversity: number;
  confidenceInterval: number;
}

export interface COGNAPSE_Output {
  query_understood: string;
  mode: "standard" | "eli5" | "deep" | "quick";
  geo_triggered: boolean;
  timeline_triggered: boolean;
  summary: {
    bottom_line: string;
    full_synthesis?: string;
    eli5_version?: string;
    confidence_narrative?: string;
  };
  scores?: {
    overall_credibility: number;
    overall_relevance: number;
    evidence_consensus: "strong" | "mixed" | "contested" | "insufficient";
    confidence_label: "🟢 High" | "🟡 Medium" | "🔴 Low";
  };
  sources?: {
    id: number;
    title: string;
    url: string;
    domain: string;
    type: string;
    credibility_score: number;
    relevance_score: number;
    key_finding: string;
    published_date: string;
    bias_flag: string | null;
  }[];
  conflicts?: {
    claim_a: string;
    source_a: string;
    claim_b: string;
    source_b: string;
    explanation: string;
  }[];
  bias_alert?: {
    direction: string;
    recommendation: string;
  } | null;
  intelligence_map?: {
    central_node: { id: string; label: string; type: string };
    nodes: { id: string; label: string; type: string; relationship: string; sub_query: string; importance: number }[];
    edges: { from: string; to: string; label: string }[];
  } | null;
  geo_points?: { label: string; country: string; lat: number; lng: number; relevance_note: string; zoom_level: number }[] | null;
  swot?: { perspective: string; strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } | null;
  timeline_events?: { date: string; title: string; description: string; significance: number }[] | null;
  actionable_takeaways?: { key_insight: string; watch_out_for: string; next_step: string; professional_referral: string | null };
  follow_up_suggestions?: string[];
  gamification?: {
    search_count: number;
    xp_earned_this_search: number;
    total_xp: number;
    rank: string;
    badge_unlocked: { name: string; icon: string; message: string } | null;
    next_unlock?: { feature: string; searches_away: number };
  };
  archive_entry?: {
    query: string;
    timestamp: string;
    topic_cluster: string;
    tags: string[];
    summary_snippet: string;
  };
  feedback_prompt?: string;
  deep_research?: any;
  deep_scores?: any;
  id?: string;
  provider?: string;
  premium_export_data?: {
    executive_summary: {
      key_findings: string[];
      critical_insights: string[];
      consensus_overview: string;
      risk_factors: string[];
      strategic_takeaways: string[];
    };
    advanced_analysis: {
      deeper_synthesis: string;
      expanded_reasoning: string;
      contradiction_analysis: string;
      strategic_interpretation: string;
      hidden_reasoning_layers: string[];
    };
    multi_ai_consensus: {
      consensus_score: number;
      agreement_points: string[];
      conflicting_viewpoints: string[];
      models_compared: { provider: string; stance: string; confidence: number }[];
    };
    next_research_directions: string[];
    metadata: {
      synthesis_depth: number;
      research_complexity: number;
      model_routing: string;
    };
  };

  // Citation Verification: attached by geminiService after verifying each [N] claim against its source
  citation_verifications?: CitationVerification[];

  // Multi-Model Consensus: attached by geminiService when running two-model validation
  multi_model_consensus?: MultiModelConsensus;

  // Source Grounding: retrieval trace attached by geminiService
  _retrieval_trace?: RetrievalTrace;
}

/* ─── Source Grounding Types ─── */

export interface SearchResult {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  published_date: string;
  source_type: 'academic' | 'government' | 'industry' | 'journalism' | 'other';
}

export interface GroundedSource {
  id: number;
  title: string;
  url: string;
  domain: string;
  type: string;
  snippet: string;
  credibility_score: number;
  relevance_score: number;
  key_finding: string;
  published_date: string;
  bias_flag: string | null;
  retrieval_timestamp: string;
}

export interface EvidenceChain {
  claim: string;
  supporting_sources: number[];  // source ids
  contradictory_sources: number[]; // source ids
  confidence: number; // 0-1
  reasoning: string;
}

export interface RetrievalTrace {
  query: string;
  sources_retrieved: number;
  sources_used: number;
  dedup_removed: number;
  low_quality_filtered: number;
  latency_ms: number;
  search_provider: string;
}

/* ─── Premium Document Intelligence Types ─── */

export type DocumentStatus = 'processing' | 'ready' | 'error' | 'indexed';
export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'image' | 'txt';

export interface DocumentRecord {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  documentType: DocumentType;
  size: number;
  status: DocumentStatus;
  storagePath: string;
  extractedText?: string;
  pageCount?: number;
  thumbnailUrl?: string;
  summary?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadIntent {
  uploadUrl: string;
  documentId: string;
  fields: Record<string, string>;
  expiresAt: string;
}

/* ─── Semantic Document Search & RAG Types ─── */

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  embedding?: number[];
  createdAt: string;
}

export interface ChunkSearchResult {
  chunk: DocumentChunk;
  score: number;
  documentName: string;
}

export interface RagAnswer {
  answer: string;
  citations: { documentId: string; excerpt: string; score: number }[];
  chunksUsed: number;
  latencyMs: number;
}

export interface ProcessDocumentRequest {
  userId: string;
  documentId: string;
  chunks: { content: string; index: number }[];
}

export interface QueryDocumentRequest {
  userId: string;
  query: string;
  documentIds: string[];
  topK?: number;
}

export interface RagAnswerRequest {
  userId: string;
  query: string;
  documentIds: string[];
}

export type ResearchVisibility = "private" | "unlisted" | "public";

/* ─── Citation Verification Types ─── */

export interface CitationVerification {
  source_id: number;
  claim: string;
  verdict: 'supported' | 'partial' | 'contradicted' | 'unrelated';
  confidence: number;
  explanation: string;
}

/* ─── Multi-Model Consensus Types ─── */

export interface MultiModelConsensus {
  overall_agreement: number; // 0–100 — how much the two models agreed
  model_a: {
    provider: string;
    model: string;
  };
  model_b: {
    provider: string;
    model: string;
  };
  agreement_points: string[];
  divergent_points: {
    from: 'model_a' | 'model_b' | 'unique_to_a' | 'unique_to_b';
    claim: string;
  }[];
  score_comparison: {
    metric: string;
    model_a: number | string;
    model_b: number | string;
  }[];
}

export interface SharedResearchRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  researchId: string;
  title: string;
  summary: string;
  visibility: ResearchVisibility;
  report: COGNAPSE_Output;
  sourceCount: number;
  graphNodeCount: number;
  active?: boolean;
  disabledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
