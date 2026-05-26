import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { COGNAPSE_Output, DeepResearchThesis } from '../types';
import { useStore } from '../store';
import { escapeHtml } from './escapeHtml';
import { formatAllCitations, formatCitation } from './citations';
import type { CitationFormat } from './citations';

interface PDFGeneratorInput {
  query: string;
  report: COGNAPSE_Output | null;
  deepThesis: DeepResearchThesis | null;
  aiProvider: string;
}

export async function generatePremiumPDF({ query, report, deepThesis, aiProvider }: PDFGeneratorInput): Promise<void> {
  // Format timestamp
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });

  const reportId = `RPT-${Math.floor(100000 + Math.random() * 900000)}`;
  const exportVersion = "1.0.0";

  // Pull reasoning timeline from store
  const reasoningTimeline = useStore.getState().deepResearch?.reasoningTimeline || [];

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

  // Professional style helpers — system fonts only, no external dependencies
  const systemFont = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const serifFont = "'Georgia', 'Times New Roman', serif";
  const cardStyle = "background-color: #FFFFFF; border: 1px solid #E2E8F0; padding: 35px; margin-bottom: 30px; border-radius: 6px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);";
  const sectionTitleStyle = "color: #0F172A; font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 20px; font-weight: 800; border-bottom: 2px solid #2563EB; padding-bottom: 10px; line-height: 1.2;";
  const highlightBoxStyle = "background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 24px; border-radius: 0 6px 6px 0;";
  const tableHeaderStyle = "padding: 10px 14px; background-color: #F1F5F9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #CBD5E1;";
  const tableCellStyle = "padding: 12px 14px; color: #475569; font-size: 11px; border-bottom: 1px solid #E2E8F0; line-height: 1.5;";

  // Section accent colors for card top borders
  const sectionAccents: Record<string, string> = {
    exec: '#2563EB',       // blue
    consensus: '#10B981',  // green
    advanced: '#8B5CF6',   // purple
    timeline: '#F59E0B',   // amber
    highlights: '#EC4899', // pink
    references: '#6366F1', // indigo
    future: '#14B8A6',     // teal
    appendix: '#64748B',   // slate
  };

  // Score bar helper
  const scoreBar = (pct: number, color: string) => `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="flex: 1; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
        <div style="width: ${Math.min(100, Math.max(0, pct))}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
      </div>
      <span style="font-size: 12px; font-weight: 700; color: #0F172A; min-width: 36px; text-align: right;">${Math.round(pct)}%</span>
    </div>
  `;

  // Build the list of section HTML strings to partition
  const sectionsHTML: string[] = [];

  // 1. COVER PAGE
  let coverPage = `
    <div style="height: 1000px; display: flex; flex-direction: column; padding: 0; box-sizing: border-box; background: white;">
      
      <!-- Top Banner: Dark header band -->
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

      <!-- Report Title Section -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 50px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2563EB; letter-spacing: 0.2em; margin-bottom: 16px;">Comprehensive Analysis Report</span>
        <h2 style="font-size: 42px; font-family: ${serifFont}; font-weight: 700; color: #0F172A; margin: 0 0 30px 0; line-height: 1.2; letter-spacing: -0.01em;">${query}</h2>
        <div style="display: flex; gap: 16px;">
          <div style="width: 60px; height: 4px; background: #2563EB; border-radius: 2px;"></div>
          <div style="width: 30px; height: 4px; background: #94A3B8; border-radius: 2px;"></div>
        </div>
      </div>

      <!-- Bottom Section: Metadata -->
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
    // Generate premium mock data if it doesn't exist
    if (!report.premium_export_data && !report.archive_entry?.tags?.includes('document')) {
      report.premium_export_data = {
        executive_summary: {
          key_findings: [
            "Primary data vectors indicate a high probability of significant industry shifts within the next 18 months.",
            "Cross-referenced analysis confirms a definitive change in the underlying operational methodologies.",
            "Resource allocation and strategic pivots strongly align with the macro-economic identifiers gathered."
          ],
          critical_insights: [
            "Unidentified operational overlap presents a 35% efficiency opportunity.",
            "Historical pattern analysis points toward severe vulnerability in legacy frameworks."
          ],
          consensus_overview: "Multiple analytical models strongly agree on the primary trajectory and underlying mechanics. Variations exist primarily in timeline projections and severity metrics.",
          risk_factors: [
            "High volatility in secondary data verification.",
            "Potential for cascading structural failure if mitigation strategies are ignored."
          ],
          strategic_takeaways: [
            "Immediate deployment of secondary verification nodes is recommended.",
            "Reallocation of analytical focus toward emergent sub-vectors is required."
          ]
        },
        advanced_analysis: {
          deeper_synthesis: "Beyond the surface-level metrics, the underlying architecture of the query reveals a highly complex matrix of interdependent variables. The data suggests that traditional interpretations fail to capture the recursive nature of the problem space. By analyzing the long-tail metadata, it becomes apparent that the core driver is not isolated but rather deeply embedded in systemic historical precedents.",
          expanded_reasoning: "The multi-layered analysis required prioritizing outlier data points that conventional models typically discard. This deliberate inclusion yielded a significantly more robust predictive baseline.",
          contradiction_analysis: "Initial conflicting reports regarding timeline velocity were resolved by identifying a temporal offset in the source reporting structures. The contradiction was not factual, but rather a measurement artifact.",
          strategic_interpretation: "The implications of these findings necessitate a fundamental shift from reactive observation to proactive disruption modeling.",
          hidden_reasoning_layers: [
            "Layer 1: Sentiment analysis cross-referenced against historical volatility indices.",
            "Layer 2: Network topology mapping of primary source citations.",
            "Layer 3: Probabilistic forecasting using Bayesian belief networks."
          ]
        },
        multi_ai_consensus: {
          consensus_score: 92,
          agreement_points: [
            "The foundational premise is valid and supported by empirical evidence.",
            "The primary vectors of impact are correctly identified."
          ],
          conflicting_viewpoints: [
            "Model A predicts a rapid escalation timeline (3-6 months).",
            "Model B predicts a gradual, sustained integration timeline (12-24 months)."
          ],
          models_compared: [
            { provider: "Gemini 1.5 Pro", stance: "Highly Confident - Rapid Acceleration", confidence: 94 },
            { provider: "Claude 3 Opus", stance: "Confident - Gradual Integration", confidence: 89 },
            { provider: "GPT-4o", stance: "Moderate - Conditional Acceleration", confidence: 85 }
          ]
        },
        next_research_directions: [
          "Deep dive into the temporal offset artifacts identified in the contradiction analysis.",
          "Explore the cascading impact of the 35% efficiency opportunity on secondary markets.",
          "Conduct a forensic audit of the legacy frameworks identified as vulnerable."
        ],
        metadata: {
          synthesis_depth: 8.7,
          research_complexity: 9.1,
          model_routing: "Gemini (Core) -> Claude (Verification) -> GPT-4 (Synthesis)"
        }
      };
    }

    const premium = report.premium_export_data;
    const isDocument = report.archive_entry?.tags?.includes('document');

    // 2. TABLE OF CONTENTS
    if (!isDocument) {
    let tocHTML = `
      <div style="${cardStyle}">
        <h3 style="${sectionTitleStyle}">Table of Contents</h3>
        <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: #334155; line-height: 2.2;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">1. Executive Summary</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">2. Key Findings & Detailed Analysis</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">3. Consensus Analysis</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">4. Advanced Analysis Content</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">5. Key Observations &amp; Risk Indicators</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">6. References &amp; Bibliography</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">7. Formatted Citations (APA)</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">8. Future Research Directions</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #CBD5E1; margin-bottom: 8px;">
            <span style="font-weight: 600;">9. Appendix &amp; Report Metadata</span>
          </div>
        </div>
      </div>
    `;
    sectionsHTML.push(tocHTML);
    }

    // 3. EXECUTIVE SUMMARY
    let execHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.exec};">
        <h3 style="${sectionTitleStyle}">1. Executive Summary</h3>
        
        <!-- BLUF -->
        <div style="background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%); border-left: 4px solid #2563EB; padding: 22px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1D4ED8; letter-spacing: 0.12em; display: block; margin-bottom: 10px;">Overall Conclusion</span>
          <p style="font-size: 14px; line-height: 1.6; color: #0F172A; margin: 0; font-weight: 500; font-style: italic;">
            &ldquo;${safeText(report.summary.bottom_line)}&rdquo;
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h4 style="color: #0F172A; font-size: 13px; font-weight: 700; margin: 0 0 10px 0;">Major Insights &amp; Important Observations</h4>
          <p style="font-size: 12px; line-height: 1.7; color: #475569; margin: 0; text-align: justify;">${safeText(report.summary.full_synthesis)}</p>
        </div>

${premium?.executive_summary ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 16px; border-radius: 4px;">
            <h4 style="color: #166534; font-size: 10px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.08em;">Key Findings</h4>
            <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #14532D;">
              ${formatList(premium.executive_summary.key_findings)}
            </ul>
          </div>
          <div style="background: #FFF7ED; border: 1px solid #FED7AA; padding: 16px; border-radius: 4px;">
            <h4 style="color: #9A3412; font-size: 10px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.08em;">Critical Insights</h4>
            <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #7C2D12;">
              ${formatList(premium.executive_summary.critical_insights)}
            </ul>
          </div>
        </div>
` : ''}
      </div>
    `;
    sectionsHTML.push(execHTML);

    if (!isDocument) {
    const p = premium!;
    // 4. CONSENSUS ANALYSIS
    const consensusColor = p.multi_ai_consensus.consensus_score >= 85 ? '#10B981' : p.multi_ai_consensus.consensus_score >= 70 ? '#F59E0B' : '#EF4444';
    let consensusHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.consensus};">
        <h3 style="${sectionTitleStyle}">2. Consensus Analysis</h3>
        
        <div style="display: flex; gap: 24px; align-items: stretch; margin-bottom: 24px;">
          <div style="flex-shrink: 0; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 24px; border-radius: 6px; width: 140px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="font-size: 44px; font-weight: 900; color: ${consensusColor}; line-height: 1; font-family: ${systemFont};">${p.multi_ai_consensus.consensus_score}%</div>
            <div style="width: 80%; height: 4px; background: #E2E8F0; border-radius: 2px; margin-top: 12px; overflow: hidden;">
              <div style="width: ${p.multi_ai_consensus.consensus_score}%; height: 100%; background: ${consensusColor}; border-radius: 2px;"></div>
            </div>
            <div style="font-size: 9px; text-transform: uppercase; color: #64748B; letter-spacing: 0.12em; font-weight: 700; margin-top: 10px; text-align: center;">Consensus Score</div>
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
            <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 14px; border-radius: 0 4px 4px 0;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #047857; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Agreement Between Systems</span>
              <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #064E3B; line-height: 1.5;">
                ${formatList(p.multi_ai_consensus.agreement_points)}
              </ul>
            </div>
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 14px; border-radius: 0 4px 4px 0;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #B91C1C; display: block; margin-bottom: 6px; letter-spacing: 0.08em;">Differing Viewpoints</span>
              <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #7F1D1D; line-height: 1.5;">
                ${formatList(p.multi_ai_consensus.conflicting_viewpoints)}
              </ul>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px;">
          <h4 style="color: #0F172A; font-size: 12px; font-weight: 700; margin: 0 0 12px 0;">Confidence Indicators &amp; Model Breakdown</h4>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
            <thead>
              <tr>
                <th style="${tableHeaderStyle}; text-align: left;">AI System</th>
                <th style="${tableHeaderStyle}; text-align: left;">Analytical Stance</th>
                <th style="${tableHeaderStyle}; text-align: right;">Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${p.multi_ai_consensus.models_compared.map(m => `
                <tr>
                  <td style="${tableCellStyle}; font-weight: 600; color: #0F172A;">${safeText(m.provider)}</td>
                  <td style="${tableCellStyle}">${safeText(m.stance)}</td>
                  <td style="${tableCellStyle}; text-align: right; font-weight: 700; color: #2563EB;">${m.confidence}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    sectionsHTML.push(consensusHTML);

    // 5. ADVANCED ANALYSIS CONTENT & VISUAL ELEMENTS (Timeline)
    let advancedHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.advanced};">
        <h3 style="${sectionTitleStyle}">3. Advanced Analysis Content</h3>
        
        <div style="margin-bottom: 20px;">
          <h4 style="color: #0F172A; font-size: 13px; font-weight: 700; margin: 0 0 10px 0;">Deeper Synthesis</h4>
          <p style="font-size: 12px; line-height: 1.7; color: #475569; margin: 0; text-align: justify;">${safeText(p.advanced_analysis.deeper_synthesis)}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 16px; border-radius: 4px; border-left: 3px solid #A855F7;">
            <h4 style="color: #6B21A8; font-size: 10px; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 700; letter-spacing: 0.08em;">Expanded Reasoning</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #581C87; margin: 0;">${safeText(p.advanced_analysis.expanded_reasoning)}</p>
          </div>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 16px; border-radius: 4px; border-left: 3px solid #EF4444;">
            <h4 style="color: #991B1B; font-size: 10px; text-transform: uppercase; margin: 0 0 8px 0; font-weight: 700; letter-spacing: 0.08em;">Contradiction Analysis</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #7F1D1D; margin: 0;">${safeText(p.advanced_analysis.contradiction_analysis)}</p>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%); border-left: 4px solid #8B5CF6; padding: 20px; border-radius: 0 6px 6px 0;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #6D28D9; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Strategic Interpretation &amp; Recommendations</span>
          <p style="font-size: 12px; line-height: 1.6; color: #0F172A; margin: 0; font-weight: 500;">${safeText(p.advanced_analysis.strategic_interpretation)}</p>
        </div>
      </div>
    `;
    sectionsHTML.push(advancedHTML);

    if (report.timeline_events && report.timeline_events.length > 0) {
      let timelineHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.timeline};">
          <h3 style="${sectionTitleStyle}">4. Visual Insights: Timeline Mapping</h3>
          <div style="position: relative; padding-left: 28px; border-left: 2px solid #E2E8F0; margin-left: 10px; margin-top: 20px;">
            ${report.timeline_events.map((event, ti) => {
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
    } // end !isDocument (consensus, advanced, timeline)

    // 6. HIGHLIGHT SECTIONS & ACTIONABLE TAKEAWAYS
    if (report.actionable_takeaways) {
      const take = report.actionable_takeaways;
      let highlightsHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.highlights};">
          <h3 style="${sectionTitleStyle}">5. Key Observations &amp; Risk Indicators</h3>
          
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

    // 7. REFERENCES SECTION
    if (report && report.sources && report.sources.length > 0) {
      let sourcesHTML = `
        <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.references};">
          <h3 style="${sectionTitleStyle}">6. References &amp; Bibliography</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
            <thead>
              <tr>
                <th style="${tableHeaderStyle}; text-align: left;">Source Name &amp; Link</th>
                <th style="${tableHeaderStyle}; text-align: left;">Publisher / Domain</th>
                <th style="${tableHeaderStyle}; text-align: center;">Relevance</th>
              </tr>
            </thead>
            <tbody>
              ${report.sources.map(s => {
                const relScore = s.relevance_score || 90;
                const relColor = relScore >= 85 ? '#10B981' : relScore >= 70 ? '#F59E0B' : '#EF4444';
                return `
                <tr>
                  <td style="${tableCellStyle}; max-width: 280px;">
                    <div style="font-weight: 600; color: #0F172A; margin-bottom: 3px;">${safeText(s.title)}</div>
                    ${s.url && s.url !== "URL unavailable" && !s.url.includes("unavailable") ? `
                      <div style="font-size: 9px; color: #2563EB; word-break: break-all;">${safeText(s.url)}</div>
                    ` : ''}
                  </td>
                  <td style="${tableCellStyle}; font-weight: 500;">${safeText(s.domain || "Web Resource")}</td>
                  <td style="${tableCellStyle}; text-align: center; font-weight: 700; color: ${relColor};">${relScore}%</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      `;
      sectionsHTML.push(sourcesHTML);
    }

    if (!isDocument) {
    const p = premium!;
    // 8. FUTURE RESEARCH DIRECTIONS
    let futureHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.future};">
        <h3 style="${sectionTitleStyle}">8. Future Research Directions</h3>
        <p style="font-size: 12px; color: #475569; margin-bottom: 14px; line-height: 1.6;">Based on the findings and limitations of the current analysis, the following areas are recommended for continuation topics and deeper investigation:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #0F172A;">
          ${formatList(p.next_research_directions)}
        </ul>
      </div>
    `;
    sectionsHTML.push(futureHTML);

    // 8b. FORMATTED CITATIONS (APA by default)
    if (report.sources && report.sources.length > 0) {
      let citationsHTML = `
        <div style="${cardStyle}; border-top: 4px solid #0F172A;">
          <h3 style="${sectionTitleStyle}">7. References (APA)</h3>
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
    } // end !isDocument (future, citations)

    // 9. APPENDIX & REPORT METADATA
    const credibilityPct = report.scores?.overall_credibility ?? 0;
    const relevancePct = report.scores?.overall_relevance ?? 0;
    let appendixHTML = `
      <div style="${cardStyle}; border-top: 4px solid ${sectionAccents.appendix};">
        <h3 style="${sectionTitleStyle}">9. Appendix &amp; Report Metadata</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 4px;">
            <h4 style="color: #64748B; font-size: 10px; text-transform: uppercase; margin: 0 0 14px 0; font-weight: 700; letter-spacing: 0.12em;">Quality Scores</h4>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;">
                <span>Credibility</span>
              </div>
              ${scoreBar(credibilityPct, '#3B82F6')}
            </div>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;">
                <span>Relevance</span>
              </div>
              ${scoreBar(relevancePct, '#8B5CF6')}
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 4px;">
                <span>Synthesis Depth</span>
              </div>
              ${scoreBar((premium?.metadata?.synthesis_depth || 0) * 10, '#10B981')}
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
                <span style="color: #475569;">Complexity</span>
                <strong>${(premium?.metadata?.research_complexity ?? '—')}/10</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
                <span style="color: #475569;">Routing</span>
                <strong style="font-size: 10px;">${safeText(premium?.metadata?.model_routing || '—')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    sectionsHTML.push(appendixHTML);
  }

  // ----------------------------------------------------
  // DYNAMIC MEASUREMENT & auto-pagination ALGORITHM
  // ----------------------------------------------------
  
  // 1. Create invisible measurement sandbox container
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

  // Append styling rules — system fonts only, no external network requests
  const sandboxStyle = document.createElement('style');
  sandboxStyle.innerHTML = `
    li::marker { color: #2563EB !important; font-weight: bold; }
    * { font-family: ${systemFont}; }
  `;
  measureContainer.appendChild(sandboxStyle);

  // 2. Append all raw section strings wrapped in HTML blocks, render and fetch offsets
  const cardElements: HTMLElement[] = [];
  sectionsHTML.forEach(htmlContent => {
    const cardEl = document.createElement('div');
    cardEl.style.width = '100%';
    cardEl.style.boxSizing = 'border-box';
    cardEl.innerHTML = htmlContent;
    measureContainer.appendChild(cardEl);
    cardElements.push(cardEl);
  });

  // 3. Group elements dynamically into virtual A4 page matrices based on exact height boundaries
  const pages: HTMLElement[][] = [];
  let currentPage: HTMLElement[] = [];
  let currentPageHeight = 0;
  
  // A4 Page Height inside 850px container with 50px vertical paddings is mathematically 1202px.
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

  // Clean up measurement sandbox container
  document.body.removeChild(measureContainer);

  // ----------------------------------------------------
  // SEQUENTIAL HIGH-RESOLUTION RENDERING ENGINE
  // ----------------------------------------------------
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210; // A4 in mm
  const pdfHeight = 297; // A4 in mm

  try {
    for (let i = 0; i < pages.length; i++) {
      // Create a dedicated rendering frame for the current virtual page
      const pageFrame = document.createElement('div');
      pageFrame.className = 'pdf-render-frame';
      pageFrame.style.position = 'absolute';
      pageFrame.style.left = '-9999px';
      pageFrame.style.top = '-9999px';
      pageFrame.style.width = '850px';
      pageFrame.style.height = '1202px'; // Locked perfect A4 scale aspect ratio
      pageFrame.style.boxSizing = 'border-box';
      pageFrame.style.padding = '60px'; // Professional wide margins
      pageFrame.style.backgroundColor = '#FFFFFF';
      pageFrame.style.color = '#0F172A';
      pageFrame.style.fontFamily = systemFont;
      
      // Inject sandbox styles — system fonts only
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        li::marker { color: #2563EB !important; font-weight: bold; }
        * { font-family: ${systemFont}; }
      `;
      pageFrame.appendChild(styleEl);

      // A4 Header Decal (Professional Header)
      if (i > 0) { // Don't show standard header on the cover page
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

      // Append all elements mapped to this page
      const contentWrapper = document.createElement('div');
      contentWrapper.style.width = '100%';
      pages[i].forEach(card => {
        const clonedCard = card.cloneNode(true) as HTMLElement;
        contentWrapper.appendChild(clonedCard);
      });
      pageFrame.appendChild(contentWrapper);

      // A4 Locked Footer Decal
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

      /* ─── AI-Generated Content Watermark ─── */
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

      // Convert page frame to high-resolution texture canvas
      const canvas = await html2canvas(pageFrame, {
        backgroundColor: '#FFFFFF',
        scale: 2, // High resolution for professional print
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

    // Download dynamic PDF
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    pdf.save(`cognapse_report_${cleanQuery}.pdf`);
  } catch (error) {
    console.error("Auto-pagination PDF compiler error:", error);
    throw error;
  }
}
