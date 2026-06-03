import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { COGNAPSE_Output, DeepResearchThesis } from '../types';
import { escapeHtml } from './escapeHtml';
import { formatAllCitations, formatCitation } from './citations';
import type { CitationFormat } from './citations';
import { computeEnhancedSourceCredibility, computeEntityDiversity } from './scoringEngine';
import { getOverallCredibilityLabel, getRelevanceLabel, getConsensusLabel, getCredibilityLabel } from './scoreLabels';

interface PDFGeneratorInput {
  query: string;
  report: COGNAPSE_Output | null;
  deepThesis: DeepResearchThesis | null;
  aiProvider: string;
}

/**
 * Extract topic sentences from full_synthesis to use as proper key findings.
 * Takes the first sentence of each paragraph that is substantive (length > 20 chars).
 */
function extractKeyFindings(synthesis: string | undefined): string[] {
  if (!synthesis) return [];
  const paragraphs = synthesis.split('\n').filter(p => p.trim().length > 30);
  const findings: string[] = [];
  for (const para of paragraphs) {
    // Split into sentences
    const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
    const firstSentence = sentences[0]?.trim();
    if (firstSentence && firstSentence.length > 25 && firstSentence.length < 250) {
      // Skip boilerplate / transition phrases
      const skipPrefixes = ['in conclusion', 'finally', 'additionally', 'moreover', 'however', 'for example', 'in summary', 'this report', 'the following'];
      const lower = firstSentence.toLowerCase();
      if (!skipPrefixes.some(p => lower.startsWith(p))) {
        findings.push(firstSentence);
      }
    }
    if (findings.length >= 6) break;
  }
  return findings;
}

export async function generatePremiumPDF({ query, report, deepThesis, aiProvider }: PDFGeneratorInput): Promise<void> {
  // Format timestamp
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });

  const reportId = `RPT-${Math.floor(100000 + Math.random() * 900000)}`;
  const exportVersion = "1.0.0";

  const safeText = (val: unknown) => escapeHtml(
    typeof val === 'string'
      ? val
      : val === null || val === undefined
        ? ''
        : JSON.stringify(val)
  );

  const formatList = (items: unknown) => {
    if (!items || !Array.isArray(items)) return '<li style="margin-bottom: 8px;">N/A</li>';
    return items.map(item => `<li style="margin-bottom: 10px; line-height: 1.6;">${safeText(item)}</li>`).join('');
  };

  // Professional style helpers
  const systemFont = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const serifFont = "'Georgia', 'Times New Roman', serif";
  const cardStyle = "background-color: #FFFFFF; border: 1px solid #E2E8F0; padding: 35px; margin-bottom: 30px; border-radius: 6px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); page-break-inside: avoid; overflow: hidden;";
  const sectionTitleStyle = "color: #0F172A; font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 20px; font-weight: 800; border-bottom: 2px solid #2563EB; padding-bottom: 10px; line-height: 1.2;";
  const highlightBoxStyle = "background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 24px; border-radius: 0 6px 6px 0;";
  const tableHeaderStyle = "padding: 10px 14px; background-color: #F1F5F9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #CBD5E1;";
  const tableCellStyle = "padding: 12px 14px; color: #475569; font-size: 11px; border-bottom: 1px solid #E2E8F0; line-height: 1.5;";

  const sectionAccents: Record<string, string> = {
    exec: '#2563EB',
    consensus: '#10B981',
    analysis: '#8B5CF6',
    timeline: '#F59E0B',
    highlights: '#EC4899',
    references: '#6366F1',
    future: '#14B8A6',
    appendix: '#64748B',
  };

  const scoreBar = (pct: number, color: string) => `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="flex: 1; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
        <div style="width: ${Math.min(100, Math.max(0, pct))}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
      </div>
      <span style="font-size: 12px; font-weight: 700; color: #0F172A; min-width: 36px; text-align: right;">${Math.round(pct)}%</span>
    </div>
  `;

  const sectionsHTML: string[] = [];

  // ════════════════════════════════════════════
  // 1. COVER PAGE
  // ════════════════════════════════════════════
  const coverPage = `
    <div style="height: 1000px; display: flex; flex-direction: column; padding: 0; box-sizing: border-box; background: white;">
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 45px 50px; margin: 0;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
          <div>
            <h1 style="color: #FFFFFF; font-size: 36px; font-family: ${systemFont}; font-weight: 900; margin: 0; letter-spacing: -0.02em; line-height: 1.1;">COGNAPSE</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #94A3B8; margin: 8px 0 0 0; font-weight: 600;">Research &amp; Intelligence Platform</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 10px; color: #64748B; letter-spacing: 0.1em; font-weight: 600;">PREMIUM DOSSIER</span>
            <div style="width: 40px; height: 3px; background: #3B82F6; margin-top: 8px; margin-left: auto; border-radius: 2px;"></div>
          </div>
        </div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 50px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2563EB; letter-spacing: 0.2em; margin-bottom: 16px;">Comprehensive Analysis Report</span>
        <h2 style="font-size: 42px; font-family: ${serifFont}; font-weight: 700; color: #0F172A; margin: 0 0 30px 0; line-height: 1.2; letter-spacing: -0.01em;">${query}</h2>
        <div style="display: flex; gap: 16px;">
          <div style="width: 60px; height: 4px; background: #2563EB; border-radius: 2px;"></div>
          <div style="width: 30px; height: 4px; background: #94A3B8; border-radius: 2px;"></div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 0 50px 45px 50px; padding: 25px 30px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
        <div>
          <div style="margin-bottom: 14px;">
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px;">Report ID</span>
            <span style="font-size: 13px; color: #0F172A; font-family: 'SF Mono', 'Cascadia Code', monospace; font-weight: 600;">${reportId}</span>
          </div>
          <div>
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px;">Generation Date</span>
            <span style="font-size: 13px; color: #0F172A; font-weight: 500;">${dateStr}</span>
          </div>
        </div>
        <div>
          <div style="margin-bottom: 14px;">
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px;">AI Providers</span>
            <span style="font-size: 13px; color: #0F172A; font-weight: 500;">${aiProvider.toUpperCase()} Multi-Model Ensemble</span>
          </div>
          <div>
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px;">Export Version</span>
            <span style="font-size: 13px; color: #0F172A; font-weight: 500;">v${exportVersion}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  sectionsHTML.push(coverPage);

  if (report) {
    // ──────────────────────────────────────────────
    // Build premium export data from REAL report fields
    // ──────────────────────────────────────────────
    const keyFindings: string[] = extractKeyFindings(report.summary?.full_synthesis);
    const criticalInsights: string[] = [];
    if (report.bias_alert) {
      criticalInsights.push(`Bias detected: ${report.bias_alert.direction}. ${report.bias_alert.recommendation}`);
    }
    if (report.conflicts && report.conflicts.length > 0) {
      report.conflicts.slice(0, 3).forEach(c => {
        criticalInsights.push(`Contradiction: ${c.claim_a} vs ${c.claim_b} — ${c.explanation}`);
      });
    }

    const consensusFromReal = report.multi_model_consensus;
    const hasRealConsensus = !!consensusFromReal;

    // Enhanced source credibility for metadata enrichment
    const sources = report.sources || [];
    const enhancedCred = computeEnhancedSourceCredibility(sources);
    const diversity = computeEntityDiversity(sources);
    const avgCred = enhancedCred.average;
    const credStdDev = sources.length > 1
      ? Math.sqrt(enhancedCred.perSource.reduce((sum, s) => sum + (s - avgCred) ** 2, 0) / enhancedCred.perSource.length)
      : 0;
    const enhancedCredPct = Math.round((avgCred / 10) * 100);
    const reliabilityIndex = Math.round(avgCred * 10) / 10;
    const confidenceSpread = avgCred > 0 ? Math.round(credStdDev / avgCred * 100) : 0;

    // Build verdict map from citation_verifications for reference badges
    const verdictMap = new Map<number, string>();
    if (report.citation_verifications) {
      for (const v of report.citation_verifications) {
        const existing = verdictMap.get(v.source_id);
        const rank = { supported: 0, partial: 1, contradicted: 2, unrelated: 2 };
        const newRank = rank[v.verdict] ?? 0;
        const oldRank = existing !== undefined ? (rank[existing as keyof typeof rank] ?? -1) : -1;
        if (existing === undefined || newRank > oldRank) {
          verdictMap.set(v.source_id, v.verdict);
        }
      }
    }

    const verifyBadge = (sourceId: number) => {
      const v = verdictMap.get(sourceId);
      if (!v) return '';
      const colors: Record<string, string> = { supported: '#10B981', partial: '#F59E0B', contradicted: '#EF4444', unrelated: '#94A3B8' };
      const labels: Record<string, string> = { supported: '✓ Verified', partial: '~ Partial', contradicted: '✗ Contradicted', unrelated: '— Unrelated' };
      const color = colors[v] || '#94A3B8';
      return `<span style="display: inline-block; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${color}; border: 1px solid ${color}; padding: 1px 5px; border-radius: 2px; margin-left: 6px;">${labels[v] || v}</span>`;
    };

    // ════════════════════════════════════════════
    // 2. TABLE OF CONTENTS
    // ════════════════════════════════════════════
    let sectionNum = 1;
    const tocEntries: string[] = [];
    if (deepThesis) {
      tocEntries.push(`${sectionNum++}. Deep Research Thesis`);
    }
    tocEntries.push(`${sectionNum++}. Executive Summary`);
    tocEntries.push(`${sectionNum++}. Quality Metrics`);
    tocEntries.push(`${sectionNum++}. Key Findings &amp; Critical Insights`);
    tocEntries.push(`${sectionNum++}. Multi-Model Consensus`);
    if (report.swot || report.bias_alert || (report.conflicts && report.conflicts.length > 0)) {
      tocEntries.push(`${sectionNum++}. Deep Analysis (SWOT / Bias / Conflicts)`);
    }
    if (report.timeline_events && report.timeline_events.length > 0) {
      tocEntries.push(`${sectionNum++}. Timeline Mapping`);
    }
    tocEntries.push(`${sectionNum++}. References &amp; Bibliography`);
    tocEntries.push(`${sectionNum++}. Citation Verification Details`);
    tocEntries.push(`${sectionNum++}. Formatted Citations (APA)`);
    if (report.follow_up_suggestions && report.follow_up_suggestions.length > 0) {
      tocEntries.push(`${sectionNum++}. Future Research Directions`);
    }
    tocEntries.push(`${sectionNum++}. Appendix &amp; Report Metadata`);

    const tocHTML = `
      <div style="${cardStyle}">
        <h3 style="${sectionTitleStyle}">Table of Contents</h3>
        <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: #334155; line-height: 2.2;">
          ${tocEntries.map(entry => `
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;"><span style="font-weight: 600;">${entry}</span></div>
          `).join('')}
        </div>
      </div>
    `;
    sectionsHTML.push(tocHTML);

    // ════════════════════════════════════════════
    // DEEP RESEARCH THESIS (if available) — split into paginated sub-cards
    // ════════════════════════════════════════════
    if (deepThesis) {
      // Sub-card 1: Title + Abstract + Introduction + Problem Statement
      sectionsHTML.push(`
        <div style="${cardStyle}; border-top: 4px solid #8B5CF6;">
          <h3 style="${sectionTitleStyle}">1. Deep Research Thesis</h3>
          <div style="margin-bottom: 20px;">
            <h4 style="color: #0F172A; font-size: 13px; font-weight: 700; margin: 0 0 8px 0;">${safeText(deepThesis.title)}</h4>
            <div style="background: #F5F3FF; border: 1px solid #DDD6FE; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #6D28D9; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Abstract</span>
              <p style="font-size: 12px; line-height: 1.6; color: #4C1D95; margin: 0;">${safeText(deepThesis.abstract)}</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #2563EB; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Introduction</span>
              <p style="font-size: 11px; line-height: 1.6; color: #475569; margin: 0;">${safeText(deepThesis.introduction)}</p>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #DC2626; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Problem Statement</span>
              <p style="font-size: 11px; line-height: 1.6; color: #475569; margin: 0;">${safeText(deepThesis.problemStatement)}</p>
            </div>
          </div>
        </div>
      `);

      // Sub-card 2: Methodology + Findings + Comparative Insights
      const subCard2 = `
        <div style="${cardStyle};">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px; grid-column: span 2;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #10B981; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Methodology</span>
              <p style="font-size: 11px; line-height: 1.6; color: #475569; margin: 0;">${safeText(deepThesis.methodology)}</p>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px; grid-column: span 2;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #8B5CF6; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Findings</span>
              <p style="font-size: 11px; line-height: 1.6; color: #475569; margin: 0;">${safeText(deepThesis.findings)}</p>
            </div>` +
        (deepThesis.comparativeInsights ? `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px; grid-column: span 2;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #F59E0B; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Comparative Insights</span>
              <p style="font-size: 11px; line-height: 1.6; color: #475569; margin: 0;">${safeText(deepThesis.comparativeInsights)}</p>
            </div>` : '') +
        `</div></div>`;
      sectionsHTML.push(subCard2);

      // Sub-card 3: Limitations + Future Scope + Conclusion
      sectionsHTML.push(`
        <div style="${cardStyle};">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${deepThesis.limitations ? `
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 14px; border-radius: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #DC2626; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Limitations</span>
              <p style="font-size: 11px; line-height: 1.6; color: #7F1D1D; margin: 0;">${safeText(deepThesis.limitations)}</p>
            </div>` : ''}
            ${deepThesis.futureScope ? `
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 14px; border-radius: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1E40AF; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Future Scope</span>
              <p style="font-size: 11px; line-height: 1.6; color: #1E3A8A; margin: 0;">${safeText(deepThesis.futureScope)}</p>
            </div>` : ''}
          </div>
          ${deepThesis.conclusion ? `
          <div style="background: linear-gradient(135deg, #F5F3FF 0%, #F8FAFC 100%); border-left: 4px solid #8B5CF6; padding: 18px; margin-top: 20px; border-radius: 0 6px 6px 0;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #6D28D9; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Conclusion</span>
            <p style="font-size: 12px; line-height: 1.6; color: #4C1D95; margin: 0; font-weight: 500;">${safeText(deepThesis.conclusion)}</p>
          </div>` : ''}
        </div>
      `);
    }

    // Dynamic section counter (shared across all content sections)
    let secNum = deepThesis ? 3 : 2;

    // ════════════════════════════════════════════
    // EXECUTIVE SUMMARY — real data
    // ════════════════════════════════════════════
    const execHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.exec};">
        <h3 style="${sectionTitleStyle}">${deepThesis ? '2' : '1'}. Executive Summary</h3>

        <!-- BLUF / Bottom Line -->
        <div style="background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%); border-left: 4px solid #2563EB; padding: 22px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1D4ED8; letter-spacing: 0.12em; display: block; margin-bottom: 10px;">Overall Conclusion</span>
          <p style="font-size: 14px; line-height: 1.6; color: #0F172A; margin: 0; font-weight: 500; font-style: italic;">
            &ldquo;${safeText(report.summary?.bottom_line)}&rdquo;
          </p>
        </div>

        <!-- Full Synthesis -->
        <div style="margin-bottom: 24px;">
          <h4 style="color: #0F172A; font-size: 13px; font-weight: 700; margin: 0 0 10px 0;">Major Insights &amp; Important Observations</h4>
          <p style="font-size: 12px; line-height: 1.7; color: #475569; margin: 0; text-align: justify;">${safeText(report.summary?.full_synthesis)}</p>
        </div>

        ${report.summary?.eli5_version ? `
        <!-- ELI5 Version -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #166534; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Simplified Overview (ELI5)</span>
          <p style="font-size: 12px; line-height: 1.6; color: #14532D; margin: 0;">${safeText(report.summary.eli5_version)}</p>
        </div>
        ` : ''}

        ${report.summary?.confidence_narrative ? `
        <!-- AI Self-Assessment -->
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1E40AF; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">AI Self-Assessment</span>
          <p style="font-size: 12px; line-height: 1.6; color: #1E3A8A; margin: 0; font-style: italic;">${safeText(report.summary.confidence_narrative)}</p>
        </div>
        ` : ''}
      </div>
    `;
    sectionsHTML.push(execHTML);

    // ════════════════════════════════════════════
    // METRICS — Credibility / Relevance / Consensus (matching web view)
    // ════════════════════════════════════════════
    if (report.scores) {
      const metricsHTML = `
        <div style="${cardStyle}; border-top: 4px solid #2563EB;">
          <h3 style="${sectionTitleStyle}">${secNum++}. Quality Metrics</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 4px;">
              <span style="display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em; margin-bottom: 6px;">Credibility</span>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <span style="font-size: 22px; font-weight: 900; color: #0F172A;">${getOverallCredibilityLabel(report.scores.overall_credibility)}</span>
                <span style="font-size: 11px; font-weight: 600; color: #94A3B8;">${Math.round(report.scores.overall_credibility)}%</span>
              </div>
              ${scoreBar(report.scores.overall_credibility, '#3B82F6')}
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 4px;">
              <span style="display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em; margin-bottom: 6px;">Relevance</span>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <span style="font-size: 22px; font-weight: 900; color: #0F172A;">${getRelevanceLabel(report.scores.overall_relevance)}</span>
                <span style="font-size: 11px; font-weight: 600; color: #94A3B8;">${Math.round(report.scores.overall_relevance)}%</span>
              </div>
              ${scoreBar(report.scores.overall_relevance, '#8B5CF6')}
            </div>
          </div>
          <div style="margin-top: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em;">Evidence Consensus</span>
            <span style="font-size: 16px; font-weight: 900; color: #0F172A;">${getConsensusLabel(report.scores.evidence_consensus)}</span>
          </div>
        </div>
      `;
      sectionsHTML.push(metricsHTML);
    }

    // ════════════════════════════════════════════
    // KEY FINDINGS & CRITICAL INSIGHTS — separate section for proper pagination
    // ════════════════════════════════════════════
    const findingsHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.exec};">
        <h3 style="${sectionTitleStyle}">${secNum++}. Key Findings &amp; Critical Insights</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 16px; border-radius: 4px;">
            <h4 style="color: #166534; font-size: 10px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.08em;">Key Findings</h4>
            ${keyFindings.length > 0
              ? `<ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #14532D;">${formatList(keyFindings)}</ul>`
              : '<p style="font-size: 11px; color: #14532D; margin: 0;">No specific key findings extracted.</p>'}
          </div>
          <div style="background: #FFF7ED; border: 1px solid #FED7AA; padding: 16px; border-radius: 4px;">
            <h4 style="color: #9A3412; font-size: 10px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.08em;">Critical Insights</h4>
            ${criticalInsights.length > 0
              ? `<ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #7C2D12;">${formatList(criticalInsights)}</ul>`
              : '<p style="font-size: 11px; color: #7C2D12; margin: 0;">No contradictions or bias alerts flagged.</p>'}
          </div>
        </div>
      </div>
    `;
    sectionsHTML.push(findingsHTML);

    // ════════════════════════════════════════════
    // 4. MULTI-MODEL CONSENSUS — real data
    // ════════════════════════════════════════════
    const consensusScore = hasRealConsensus
      ? consensusFromReal!.overall_agreement
      : (() => {
          const conflictPenalty = Math.min((report.conflicts?.length || 0) * 15, 45);
          const base = ({ strong: 88, mixed: 65, contested: 40, insufficient: 20 } as Record<string, number>)[report.scores?.evidence_consensus || ''] ?? 50;
          return Math.max(0, base - conflictPenalty);
        })();
    const consensusColor = consensusScore >= 85 ? '#10B981' : consensusScore >= 70 ? '#F59E0B' : '#EF4444';

    const consensusHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.consensus};">
        <h3 style="${sectionTitleStyle}">${secNum++}. Multi-Model Consensus</h3>

        <div style="display: flex; gap: 24px; align-items: stretch; margin-bottom: 24px;">
          <div style="flex-shrink: 0; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 24px; border-radius: 6px; width: 140px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="font-size: 44px; font-weight: 900; color: ${consensusColor}; line-height: 1; font-family: ${systemFont};">${consensusScore}%</div>
            <div style="width: 80%; height: 4px; background: #E2E8F0; border-radius: 2px; margin-top: 12px; overflow: hidden;">
              <div style="width: ${consensusScore}%; height: 100%; background: ${consensusColor}; border-radius: 2px;"></div>
            </div>
            <div style="font-size: 9px; text-transform: uppercase; color: #64748B; letter-spacing: 0.12em; font-weight: 700; margin-top: 10px; text-align: center;">Consensus Score</div>
          </div>

          <!-- Model Agreement Signal -->
          ${report.consensus_variance ? `
            <div style="flex-shrink: 0; background: ${report.consensus_variance.level === 'low' ? '#F0FDF4' : report.consensus_variance.level === 'moderate' ? '#FFFBEB' : '#FEF2F2'}; border: 1px solid ${report.consensus_variance.level === 'low' ? '#BBF7D0' : report.consensus_variance.level === 'moderate' ? '#FDE68A' : '#FECACA'}; padding: 16px; border-radius: 4px; width: 180px; display: flex; flex-direction: column; justify-content: center;">
              <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: ${report.consensus_variance.level === 'low' ? '#166534' : report.consensus_variance.level === 'moderate' ? '#92400E' : '#991B1B'}; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Model Agreement</span>
              <span style="font-size: 20px; font-weight: 900; color: ${report.consensus_variance.level === 'low' ? '#16A34A' : report.consensus_variance.level === 'moderate' ? '#D97706' : '#DC2626'};">${report.consensus_variance.level === 'low' ? 'Strong' : report.consensus_variance.level === 'moderate' ? 'Moderate' : 'Low'}</span>
              <span style="font-size: 8px; color: #64748B; margin-top: 4px; line-height: 1.4;">${report.consensus_variance.narrative || (report.consensus_variance.level === 'low' ? 'Models closely agreed on scoring' : report.consensus_variance.level === 'moderate' ? 'Models showed moderate disagreement' : 'Models significantly disagreed')}</span>
            </div>
          ` : ''}

          <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
            ${hasRealConsensus ? `
            <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 14px; border-radius: 0 4px 4px 0;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #047857; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Agreement Between Systems</span>
              <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #064E3B; line-height: 1.5;">
                ${formatList(consensusFromReal!.agreement_points)}
              </ul>
            </div>
            ${consensusFromReal!.divergent_points && consensusFromReal!.divergent_points.length > 0 ? `
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 14px; border-radius: 0 4px 4px 0;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #B91C1C; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Differing Viewpoints</span>
              <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #7F1D1D; line-height: 1.5;">
                ${formatList(consensusFromReal!.divergent_points.map(d => d.claim))}
              </ul>
            </div>` : ''}
            <div style="margin-top: 12px;">
              <h4 style="color: #0F172A; font-size: 12px; font-weight: 700; margin: 0 0 12px 0;">Models Compared</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr>
                    <th style="${tableHeaderStyle}; text-align: left;">AI System</th>
                    <th style="${tableHeaderStyle}; text-align: left;">Model</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="${tableCellStyle}; font-weight: 600; color: #0F172A;">${safeText(consensusFromReal!.model_a.provider)}</td>
                    <td style="${tableCellStyle}">${safeText(consensusFromReal!.model_a.model)}</td>
                  </tr>
                  <tr>
                    <td style="${tableCellStyle}; font-weight: 600; color: #0F172A;">${safeText(consensusFromReal!.model_b.provider)}</td>
                    <td style="${tableCellStyle}">${safeText(consensusFromReal!.model_b.model)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            ${consensusFromReal!.score_comparison && consensusFromReal!.score_comparison.length > 0 ? `
            <div style="margin-top: 16px;">
              <h4 style="color: #0F172A; font-size: 11px; font-weight: 700; margin: 0 0 8px 0;">Score Comparison</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr>
                    <th style="${tableHeaderStyle}; text-align: left;">Metric</th>
                    <th style="${tableHeaderStyle}; text-align: center;">Model A</th>
                    <th style="${tableHeaderStyle}; text-align: center;">Model B</th>
                  </tr>
                </thead>
                <tbody>
                  ${consensusFromReal!.score_comparison.map(m => `
                    <tr>
                      <td style="${tableCellStyle}; font-weight: 600; color: #0F172A;">${safeText(m.metric)}</td>
                      <td style="${tableCellStyle}; text-align: center;">${safeText(m.model_a)}</td>
                      <td style="${tableCellStyle}; text-align: center;">${safeText(m.model_b)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>` : ''}
            ` : `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 4px;">
              <p style="font-size: 12px; color: #475569; margin: 0;">Multi-model consensus was not computed for this report. The consensus score above is derived from source agreement and conflict analysis.</p>
            </div>
            `}
          </div>
        </div>
      </div>
    `;
    sectionsHTML.push(consensusHTML);

    // ════════════════════════════════════════════
    // DEEP ANALYSIS — SWOT / Bias / Conflicts (real data)
    // ════════════════════════════════════════════
    if (report.swot || report.bias_alert || (report.conflicts && report.conflicts.length > 0)) {
      const analysisHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.analysis};">
          <h3 style="${sectionTitleStyle}">${secNum++}. Deep Analysis</h3>

          ${report.swot ? `
          <div style="margin-bottom: 24px;">
            <h4 style="color: #0F172A; font-size: 13px; font-weight: 700; margin: 0 0 12px 0;">SWOT Analysis</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 14px; border-radius: 4px;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Strengths</span>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #14532D; line-height: 1.5;">${formatList(report.swot.strengths)}</ul>
              </div>
              <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 14px; border-radius: 4px;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #991B1B; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Weaknesses</span>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #7F1D1D; line-height: 1.5;">${formatList(report.swot.weaknesses)}</ul>
              </div>
              <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 14px; border-radius: 4px;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1E40AF; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Opportunities</span>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #1E3A8A; line-height: 1.5;">${formatList(report.swot.opportunities)}</ul>
              </div>
              <div style="background: #FFF7ED; border: 1px solid #FED7AA; padding: 14px; border-radius: 4px;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #9A3412; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Threats</span>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #7C2D12; line-height: 1.5;">${formatList(report.swot.threats)}</ul>
              </div>
            </div>
          </div>` : ''}

          ${report.bias_alert ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 18px; border-radius: 4px; margin-bottom: 20px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #991B1B; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">Bias Alert</span>
            <p style="font-size: 12px; color: #7F1D1D; margin: 0; line-height: 1.6;">
              <strong>Direction:</strong> ${safeText(report.bias_alert.direction)}<br>
              <strong>Recommendation:</strong> ${safeText(report.bias_alert.recommendation)}
            </p>
          </div>` : ''}

          ${report.conflicts && report.conflicts.length > 0 ? `
          <div>
            <h4 style="color: #0F172A; font-size: 12px; font-weight: 700; margin: 0 0 12px 0;">Contradictions (${report.conflicts.length})</h4>
            ${report.conflicts.map(c => `
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 4px; margin-bottom: 10px;">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <div style="flex: 1; padding: 8px; background: #FEF2F2; border-radius: 3px;">
                    <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #DC2626; display: block; margin-bottom: 4px;">Source A</span>
                    <p style="font-size: 11px; color: #7F1D1D; margin: 0;">${safeText(c.claim_a)}</p>
                  </div>
                  <div style="flex: 1; padding: 8px; background: #EFF6FF; border-radius: 3px;">
                    <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #2563EB; display: block; margin-bottom: 4px;">Source B</span>
                    <p style="font-size: 11px; color: #1E3A8A; margin: 0;">${safeText(c.claim_b)}</p>
                  </div>
                </div>
                <p style="font-size: 10px; color: #64748B; margin: 8px 0 0 0; font-style: italic;">${safeText(c.explanation)}</p>
              </div>
            `).join('')}
          </div>` : ''}
        </div>
      `;
      sectionsHTML.push(analysisHTML);
    }

    // ════════════════════════════════════════════
    // TIMELINE
    // ════════════════════════════════════════════
    if (report.timeline_events && report.timeline_events.length > 0) {
      const timelineHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.timeline};">
          <h3 style="${sectionTitleStyle}">${secNum++}. Timeline Mapping</h3>
          <div style="position: relative; padding-left: 28px; border-left: 2px solid #E2E8F0; margin-left: 10px; margin-top: 20px;">
            ${report.timeline_events.map((event) => {
              const sigColor = (event.significance || 5) >= 8 ? '#EF4444' : (event.significance || 5) >= 5 ? '#F59E0B' : '#3B82F6';
              return `
              <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -35px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background-color: ${sigColor}; border: 3px solid #FFFFFF; box-shadow: 0 0 0 1px #E2E8F0;"></div>
                <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 700; color: #FFFFFF; background: #2563EB; padding: 3px 8px; border-radius: 3px;">${safeText(event.date)}</span>
                  <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; color: #64748B;">Significance: ${event.significance || 5}/10</span>
                </div>
                <h4 style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 0 0 4px 0;">${safeText(event.title)}</h4>
                <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.6;">${safeText(event.description)}</p>
              </div>
            `}).join('')}
          </div>
        </div>
      `;
      sectionsHTML.push(timelineHTML);
    }

    // ════════════════════════════════════════════
    // ACTIONABLE TAKEAWAYS
    // ════════════════════════════════════════════
    if (report.actionable_takeaways) {
      const take = report.actionable_takeaways;
      const highlightsHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.highlights};">
          <h3 style="${sectionTitleStyle}">Key Observations &amp; Risk Indicators</h3>
          <div style="margin-bottom: 20px;">
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 18px; border-radius: 4px; border-left: 4px solid #22C55E;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #166534; display: block; margin-bottom: 6px; letter-spacing: 0.1em;">Important Insight</span>
              <p style="font-size: 12px; margin: 0; color: #14532D; line-height: 1.6; font-weight: 500;">${safeText(take.key_insight)}</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 16px; border-radius: 4px; border-left: 4px solid #EF4444;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #991B1B; display: block; margin-bottom: 6px; letter-spacing: 0.1em;">Risk Indicator</span>
              <p style="font-size: 12px; margin: 0; color: #7F1D1D; line-height: 1.6;">${safeText(take.watch_out_for)}</p>
            </div>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 16px; border-radius: 4px; border-left: 4px solid #3B82F6;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1E40AF; display: block; margin-bottom: 6px; letter-spacing: 0.1em;">Recommendation</span>
              <p style="font-size: 12px; margin: 0; color: #1E3A8A; line-height: 1.6;">${safeText(take.next_step)}</p>
            </div>
          </div>
        </div>
      `;
      sectionsHTML.push(highlightsHTML);
    }

    // ════════════════════════════════════════════
    // REFERENCES with citation verification badges
    // ════════════════════════════════════════════
    if (report.sources && report.sources.length > 0) {
      const sourcesHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.references};">
          <h3 style="${sectionTitleStyle}">${secNum++}. References &amp; Bibliography</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
            <thead>
              <tr>
                <th style="${tableHeaderStyle}; text-align: left;">Source Name &amp; Link</th>
                <th style="${tableHeaderStyle}; text-align: left;">Publisher / Domain</th>
                <th style="${tableHeaderStyle}; text-align: center;">Relevance</th>
                <th style="${tableHeaderStyle}; text-align: center;">Verification</th>
              </tr>
            </thead>
            <tbody>
              ${report.sources.map(s => {
                const relScore = s.relevance_score || 90;
                const relColor = relScore >= 85 ? '#10B981' : relScore >= 70 ? '#F59E0B' : '#EF4444';
                return `
                <tr>
                  <td style="${tableCellStyle}; max-width: 250px;">
                    <div style="font-weight: 600; color: #0F172A; margin-bottom: 3px;">${safeText(s.title)}</div>
                    ${s.url && s.url !== "URL unavailable" && !s.url.includes("unavailable") ? `
                      <div style="font-size: 9px; color: #2563EB; word-break: break-all;">${safeText(s.url)}</div>
                    ` : ''}
                  </td>
                  <td style="${tableCellStyle}; font-weight: 500;">${safeText(s.domain || "Web Resource")}</td>
                  <td style="${tableCellStyle}; text-align: center; font-weight: 700; color: ${relColor};">${relScore}%</td>
                  <td style="${tableCellStyle}; text-align: center;">${verifyBadge(s.id)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      `;
      sectionsHTML.push(sourcesHTML);
    }

    // ════════════════════════════════════════════
    // CITATION VERIFICATION DETAILS
    // ════════════════════════════════════════════
    const flaggedVerifications = report.citation_verifications?.filter(v => v.verdict !== 'supported') || [];
    if (flaggedVerifications.length > 0) {
      const citationVerificationHTML = `
        <div style="${cardStyle}; border-top: 4px solid #F59E0B;">
          <h3 style="${sectionTitleStyle}">${secNum++}. Citation Verification Details</h3>
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 10px; color: #475569;">
              ${report.citation_verifications!.filter(v => v.verdict === 'supported').length} supported
              &nbsp;·&nbsp;
              ${report.citation_verifications!.filter(v => v.verdict === 'partial').length} partial
              &nbsp;·&nbsp;
              ${flaggedVerifications.length} flagged
            </span>
          </div>
          ${flaggedVerifications.map((v, i) => {
            const source = report.sources?.find(s => s.id === v.source_id);
            const vColor = v.verdict === 'partial'
              ? { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Partial' }
              : { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: v.verdict === 'contradicted' ? 'Contradicted' : 'Unrelated' };
            return `
            <div style="background: ${vColor.bg}; border: 1px solid ${vColor.border}; padding: 12px; border-radius: 4px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${vColor.text};">${vColor.label}</span>
                <span style="font-size: 9px; color: #64748B;">Source #${v.source_id}</span>
                ${source ? `<span style="font-size: 9px; color: #64748B;">${source.title}</span>` : ''}
              </div>
              <p style="font-size: 10px; color: #475569; font-style: italic; margin: 0 0 4px 0; line-height: 1.5;">&ldquo;${v.claim}&rdquo;</p>
              <p style="font-size: 9px; color: #64748B; margin: 0; line-height: 1.5;">${v.explanation}</p>
            </div>
          `;}).join('')}
        </div>
      `;
      sectionsHTML.push(citationVerificationHTML);
    }

    // ════════════════════════════════════════════
    // FORMATTED CITATIONS (APA)
    // ════════════════════════════════════════════
    if (report.sources && report.sources.length > 0) {
      const citationsHTML = `
        <div style="${cardStyle}; border-top: 4px solid #0F172A;">
          <h3 style="${sectionTitleStyle}">${secNum++}. References (APA)</h3>
          <div style="font-size: 11px; color: #334155; line-height: 1.8;">
            ${report.sources.map((s, i) => `
              <div style="margin-bottom: 12px; padding-left: 24px; text-indent: -24px;">
                <strong>[${i + 1}]</strong> ${safeText(formatCitation(s, 'apa'))}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      sectionsHTML.push(citationsHTML);
    }

    // ════════════════════════════════════════════
    // FUTURE RESEARCH DIRECTIONS — real follow_up_suggestions
    // ════════════════════════════════════════════
    if (report.follow_up_suggestions && report.follow_up_suggestions.length > 0) {
      const futureHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.future};">
          <h3 style="${sectionTitleStyle}">${secNum++}. Future Research Directions</h3>
          <p style="font-size: 12px; color: #475569; margin-bottom: 14px; line-height: 1.6;">Based on the findings and limitations of the current analysis, the following areas are recommended for continuation topics and deeper investigation:</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #0F172A;">
            ${formatList(report.follow_up_suggestions)}
          </ul>
        </div>
      `;
      sectionsHTML.push(futureHTML);
    }

    // ════════════════════════════════════════════
    // APPENDIX — real scores & metadata
    // ════════════════════════════════════════════
    const credibilityPct = report.scores?.overall_credibility !== undefined
      ? Math.round(report.scores.overall_credibility)
      : enhancedCredPct;
    const relevancePct = report.scores?.overall_relevance !== undefined
      ? Math.round(report.scores.overall_relevance)
      : 0;

    // Use the actual model provider from the report
    const actualProvider = report.provider || aiProvider;
    const modelRouting = hasRealConsensus
      ? `${consensusFromReal!.model_a.provider} (${consensusFromReal!.model_a.model}) + ${consensusFromReal!.model_b.provider} (${consensusFromReal!.model_b.model})`
      : `${actualProvider} (Primary)`;

    const appendixHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.appendix};">
        <h3 style="${sectionTitleStyle}">${secNum++}. Appendix &amp; Report Metadata</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 4px;">
            <h4 style="color: #64748B; font-size: 10px; text-transform: uppercase; margin: 0 0 14px 0; font-weight: 700; letter-spacing: 0.12em;">Quality Scores</h4>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;"><span>Credibility</span> <span style="color: #3B82F6; font-weight: 700; font-size: 9px;">${getOverallCredibilityLabel(credibilityPct)}</span></div>
              ${scoreBar(credibilityPct, '#3B82F6')}
            </div>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;"><span>Relevance</span> <span style="color: #8B5CF6; font-weight: 700; font-size: 9px;">${getRelevanceLabel(relevancePct)}</span></div>
              ${scoreBar(relevancePct, '#8B5CF6')}
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;"><span>Source Reliability Index</span> <span style="color: #10B981; font-weight: 700; font-size: 9px;">${getCredibilityLabel(Math.round(reliabilityIndex * 10))}</span></div>
              ${scoreBar(reliabilityIndex * 10, '#10B981')}
            </div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 4px;">
            <h4 style="color: #64748B; font-size: 10px; text-transform: uppercase; margin: 0 0 14px 0; font-weight: 700; letter-spacing: 0.12em;">Document Information</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #0F172A;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Generated By</span>
                <strong>COGNAPSE System</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Timestamp</span>
                <strong>${dateStr}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Provider</span>
                <strong>${safeText(actualProvider.toUpperCase())}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Routing</span>
                <strong style="font-size: 10px;">${safeText(modelRouting)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Source Count</span>
                <strong>${report.sources?.length || 0}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Confidence Spread</span>
                <strong>±${confidenceSpread}%</strong>
              </div>
              ${hasRealConsensus ? `
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Multi-Model</span>
                <strong>Yes (${consensusScore}% agreement)</strong>
              </div>` : ''}
              ${report.citation_verifications && report.citation_verifications.length > 0 ? `
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                <span style="color: #475569;">Claims Verified</span>
                <strong>${report.citation_verifications.length}</strong>
              </div>` : ''}
              ${diversity.entityCount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
                <span style="color: #475569;">Entities</span>
                <strong>${diversity.entityCount} (${diversity.orgCount} orgs, ${diversity.placeCount} places, ${diversity.personCount} people)</strong>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    sectionsHTML.push(appendixHTML);
  }

  // ════════════════════════════════════════════
  // DYNAMIC MEASUREMENT & auto-pagination
  // ════════════════════════════════════════════
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'absolute';
  measureContainer.style.left = '-9999px';
  measureContainer.style.top = '-9999px';
  measureContainer.style.width = '850px';
  measureContainer.style.backgroundColor = '#FFFFFF';
  measureContainer.style.color = '#0F172A';
  measureContainer.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
  measureContainer.style.boxSizing = 'border-box';
  document.body.appendChild(measureContainer);

  const sandboxStyle = document.createElement('style');
  sandboxStyle.innerHTML = `
    li::marker { color: #2563EB !important; font-weight: bold; }
    * { font-family: ${systemFont}; }
  `;
  measureContainer.appendChild(sandboxStyle);

  const cardElements: HTMLElement[] = [];
  sectionsHTML.forEach(htmlContent => {
    const cardEl = document.createElement('div');
    cardEl.style.width = '100%';
    cardEl.style.boxSizing = 'border-box';
    cardEl.innerHTML = htmlContent;
    measureContainer.appendChild(cardEl);
    cardElements.push(cardEl);
  });

  const pages: HTMLElement[][] = [];
  let currentPage: HTMLElement[] = [];
  let currentPageHeight = 0;
  const PAGE_HEIGHT_CEILING = 1000;

  cardElements.forEach(card => {
    const height = card.offsetHeight || 120;
    if (height > PAGE_HEIGHT_CEILING) {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentPageHeight = 0;
      }
      pages.push([card]);
    } else if (currentPageHeight + height > PAGE_HEIGHT_CEILING) {
      pages.push(currentPage);
      currentPage = [card];
      currentPageHeight = height;
    } else {
      currentPage.push(card);
      currentPageHeight += height;
    }
  });
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  document.body.removeChild(measureContainer);

  // ════════════════════════════════════════════
  // RENDER ENGINE
  // ════════════════════════════════════════════
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210;
  const pdfHeight = 297;

  try {
    for (let i = 0; i < pages.length; i++) {
      const pageFrame = document.createElement('div');
      pageFrame.className = 'pdf-render-frame';
      pageFrame.style.position = 'absolute';
      pageFrame.style.left = '-9999px';
      pageFrame.style.top = '-9999px';
      pageFrame.style.width = '850px';
      pageFrame.style.height = '1300px';
      pageFrame.style.boxSizing = 'border-box';
      pageFrame.style.padding = '60px 60px 140px';
      pageFrame.style.overflow = 'hidden';
      pageFrame.style.backgroundColor = '#FFFFFF';
      pageFrame.style.color = '#0F172A';
      pageFrame.style.fontFamily = systemFont;

      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        li::marker { color: #2563EB !important; font-weight: bold; }
        * { font-family: ${systemFont}; }
      `;
      pageFrame.appendChild(styleEl);

      if (i > 0) {
        const headerDecal = document.createElement('div');
        headerDecal.style.display = 'flex';
        headerDecal.style.justifyContent = 'space-between';
        headerDecal.style.borderBottom = '1px solid #E2E8F0';
        headerDecal.style.paddingBottom = '12px';
        headerDecal.style.marginBottom = '30px';
        headerDecal.style.fontFamily = '"Inter", sans-serif';
        headerDecal.style.fontSize = '9px';
        headerDecal.style.color = '#64748B';
        headerDecal.style.textTransform = 'uppercase';
        headerDecal.style.letterSpacing = '0.05em';
        headerDecal.style.fontWeight = '600';
        headerDecal.style.width = '100%';
        headerDecal.innerHTML = `
          <span>COGNAPSE Research Document</span>
          <span>Report ID: ${reportId}</span>
        `;
        pageFrame.appendChild(headerDecal);
      }

      const contentWrapper = document.createElement('div');
      contentWrapper.style.width = '100%';
      pages[i].forEach(card => {
        const clonedCard = card.cloneNode(true) as HTMLElement;
        contentWrapper.appendChild(clonedCard);
      });
      pageFrame.appendChild(contentWrapper);

      const footerDecal = document.createElement('div');
      footerDecal.style.position = 'absolute';
      footerDecal.style.bottom = '40px';
      footerDecal.style.left = '60px';
      footerDecal.style.right = '60px';
      footerDecal.style.display = 'flex';
      footerDecal.style.justifyContent = 'space-between';
      footerDecal.style.borderTop = '1px solid #E2E8F0';
      footerDecal.style.paddingTop = '16px';
      footerDecal.style.fontFamily = '"Inter", sans-serif';
      footerDecal.style.fontSize = '10px';
      footerDecal.style.color = '#94A3B8';
      footerDecal.style.fontWeight = '500';
      footerDecal.innerHTML = `
        <span>Generated using COGNAPSE</span>
        <span style="color: #0F172A; font-weight: 700;">Page ${i + 1} of ${pages.length}</span>
      `;
      pageFrame.appendChild(footerDecal);

      const watermark = document.createElement('div');
      watermark.style.position = 'absolute';
      watermark.style.bottom = '10px';
      watermark.style.left = '0';
      watermark.style.right = '0';
      watermark.style.textAlign = 'center';
      watermark.style.fontFamily = '"Inter", sans-serif';
      watermark.style.fontSize = '7px';
      watermark.style.color = '#CBD5E1';
      watermark.style.letterSpacing = '0.1em';
      watermark.style.fontWeight = '600';
      watermark.style.textTransform = 'uppercase';
      watermark.innerHTML = 'AI-Generated Research — Verify Critical Claims Independently';
      pageFrame.appendChild(watermark);

      document.body.appendChild(pageFrame);

      const canvas = await html2canvas(pageFrame, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      document.body.removeChild(pageFrame);

      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    pdf.save(`cognapse_report_${cleanQuery}.pdf`);
  } catch (error) {
    console.error("Auto-pagination PDF compiler error:", error);
    throw error;
  }
}
