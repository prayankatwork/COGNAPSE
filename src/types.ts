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
}
