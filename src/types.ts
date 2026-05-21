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
  fork_lineage?: {
    originalResearchId: string;
    originalShareId?: string;
    forkedAt: string;
    forkedFromTitle: string;
  };
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
}

export type ResearchVisibility = "private" | "unlisted" | "public";
export type BoardMode = "private" | "shared" | "public";

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

export interface BoardResearchItem {
  researchId: string;
  title: string;
  summary: string;
  report: COGNAPSE_Output;
  addedById?: string;
  addedByName?: string;
  addedAt: string;
}

export interface BoardNodeNote {
  content: string;
  authorId: string;
  authorName: string;
  updatedAt: string;
}

export interface BoardActivity {
  id: string;
  type:
    | "created"
    | "updated"
    | "mode_changed"
    | "research_added"
    | "research_removed"
    | "invite_sent"
    | "invite_accepted"
    | "invite_declined"
    | "invite_cancelled"
    | "collaborator_removed"
    | "note_updated"
    | "duplicated";
  actorId: string;
  actorName: string;
  detail: string;
  timestamp: string;
}

export interface IntelligenceBoard {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  mode: BoardMode;
  collaborators: string[];
  researches: BoardResearchItem[];
  nodeNotes: Record<string, string | BoardNodeNote>;
  activity?: BoardActivity[];
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardInvite {
  id: string;
  boardId: string;
  boardTitle: string;
  boardDescription: string;
  invitedById: string;
  invitedByName: string;
  invitee: string;
  inviteeKeys: string[];
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
}
