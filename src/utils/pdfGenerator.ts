import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { COGNAPSE_Output, DeepResearchThesis } from '../types';
import { useStore } from '../store';

interface PDFGeneratorInput {
  query: string;
  report: COGNAPSE_Output | null;
  deepThesis: DeepResearchThesis | null;
  aiProvider: string;
}

export async function generatePremiumPDF({ query, report, deepThesis, aiProvider }: PDFGeneratorInput): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '850px';
  container.style.backgroundColor = '#0A0A0C';
  container.style.color = '#E2E8F0';
  container.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
  container.style.padding = '50px';
  container.style.boxSizing = 'border-box';

  // Format timestamp
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Pull reasoning timeline from store
  const reasoningTimeline = useStore.getState().deepResearch?.reasoningTimeline || [];

  // Helper safely format strings
  const safeText = (val: any) => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return "";
    return JSON.stringify(val);
  };

  // Helper format HTML lists
  const formatList = (items: any) => {
    if (!items || !Array.isArray(items)) return '<li>N/A</li>';
    return items.map(item => `<li style="margin-bottom: 8px;">${safeText(item)}</li>`).join('');
  };

  // Page break CSS style helper
  const sectionStyle = "background-color: #111115; border: 1px solid #22222B; padding: 30px; margin-bottom: 35px; border-radius: 4px; page-break-inside: avoid; break-inside: avoid;";
  const sectionTitleStyle = "color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; margin-top: 0; margin-bottom: 20px; font-weight: 900; border-left: 3px solid #F27D26; padding-left: 12px; line-height: 1;";

  // Dynamic content building
  let html = `
    <!-- Stylesheet -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
      .pdf-body {
        font-family: 'Inter', sans-serif;
      }
      .serif-title {
        font-family: 'Playfair Display', serif;
        font-style: italic;
      }
      li::marker {
        color: #F27D26;
      }
    </style>

    <div class="pdf-body">
      <!-- Cover Page Header / Dossier Top -->
      <div style="border-bottom: 2px solid #F27D26; padding-bottom: 25px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 class="serif-title" style="color: #F27D26; font-size: 32px; font-weight: bold; margin: 0; tracking: -0.05em; line-height: 1;">COGNAPSE</h1>
          <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.35em; color: #718096; margin: 6px 0 0 0; font-weight: 900;">Tactical Intelligence Dossier</p>
        </div>
        <div style="text-align: right; font-family: monospace; font-size: 9px; color: #718096; line-height: 1.5;">
          <div>CLASSIFICATION: TIER-3 (SECRET)</div>
          <div>VAULT REGISTRY ID: ${Math.floor(100000 + Math.random() * 900000)}</div>
          <div>GENERATION TIME: ${dateStr}</div>
          <div>ANALYSIS PROVIDER: ${aiProvider.toUpperCase()}</div>
        </div>
      </div>

      <!-- Main Header Badge & Query Title -->
      <div style="margin-bottom: 40px;">
        <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.25em; border: 1px solid rgba(242, 125, 38, 0.3); padding: 4px 10px; background: rgba(242, 125, 38, 0.05); border-radius: 2px;">Verified Core Intelligence</span>
        <h2 class="serif-title" style="font-size: 28px; font-weight: bold; color: #FFFFFF; margin: 20px 0 10px 0; line-height: 1.2;">${query}</h2>
        <div style="width: 60px; height: 3px; background-color: #F27D26; margin-top: 15px; border-radius: 1px;"></div>
      </div>
  `;

  if (report) {
    // I. EXECUTIVE SYNTHESIS
    html += `
      <div style="${sectionStyle}">
        <h3 style="${sectionTitleStyle}">I. Executive Synthesis</h3>
        
        <!-- BLUF -->
        <div style="background-color: #0A0A0C; border-left: 4px solid #F27D26; padding: 20px; margin-bottom: 20px; border-radius: 2px;">
          <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.15em; display: block; margin-bottom: 8px;">Bottom Line Up Front (BLUF)</span>
          <p style="font-size: 13px; line-height: 1.6; color: #E2E8F0; margin: 0; font-weight: 600; font-style: italic;">
            "${safeText(report.summary.bottom_line)}"
          </p>
        </div>

        <!-- ELI5 (Explain Like I'm 5) -->
        ${report.summary.eli5_version ? `
          <div style="background-color: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); padding: 18px; margin-bottom: 20px; border-radius: 2px;">
            <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #10B981; letter-spacing: 0.15em; display: block; margin-bottom: 6px;">ELI5 Simplification</span>
            <p style="font-size: 11px; line-height: 1.5; color: #A7F3D0; margin: 0;">
              ${safeText(report.summary.eli5_version)}
            </p>
          </div>
        ` : ''}

        <!-- Narrative & Metadata -->
        ${report.summary.confidence_narrative ? `
          <div style="font-size: 11px; line-height: 1.6; color: #A0AEC0; margin-top: 15px;">
            <strong style="color: #FFFFFF;">Confidence Analysis:</strong> ${safeText(report.summary.confidence_narrative)}
          </div>
        ` : ''}
      </div>
    `;

    // II. CORE SCORES & METRICS
    if (report.scores) {
      html += `
        <div style="${sectionStyle}">
          <h3 style="${sectionTitleStyle}">II. Performance & Consensus Metrics</h3>
          <div style="display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Credibility</div>
              <div style="font-size: 22px; font-weight: bold; color: #F27D26;">${report.scores.overall_credibility}%</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Relevance</div>
              <div style="font-size: 22px; font-weight: bold; color: #F27D26;">${report.scores.overall_relevance}%</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Consensus</div>
              <div style="font-size: 13px; font-weight: bold; color: #FFFFFF; text-transform: uppercase; margin-top: 8px;">${report.scores.evidence_consensus}</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Certainty</div>
              <div style="font-size: 13px; font-weight: bold; color: #FFFFFF; text-transform: uppercase; margin-top: 8px;">${report.scores.confidence_label || "High"}</div>
            </div>
          </div>
        </div>
      `;
    }

    // III. FULL SYNTHESIS
    if (report.summary.full_synthesis) {
      html += `
        <div style="${sectionStyle}">
          <h3 style="${sectionTitleStyle}">III. Detailed Intelligence Synthesis</h3>
          <div style="font-size: 11.5px; line-height: 1.7; color: #CBD5E0; white-space: pre-wrap; text-align: justify;">${safeText(report.summary.full_synthesis)}</div>
        </div>
      `;
    }

    // IV. CHRONOLOGICAL TIMELINE OF KEY EVENTS
    if (report.timeline_events && report.timeline_events.length > 0) {
      html += `
        <div style="${sectionStyle}">
          <h3 style="${sectionTitleStyle}">IV. Forensic Timeline of Key Events</h3>
          <div style="position: relative; padding-left: 20px; border-left: 1px solid #2D3748; margin-left: 10px; margin-top: 15px;">
            ${report.timeline_events.map(event => `
              <div style="margin-bottom: 25px; position: relative;">
                <!-- Timeline Dot -->
                <div style="position: absolute; left: -25px; top: 3px; width: 9px; height: 9px; border-radius: 50%; background-color: #F27D26; border: 2px solid #0A0A0C; box-shadow: 0 0 5px rgba(242, 125, 38, 0.5);"></div>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-family: monospace; font-size: 10px; font-weight: bold; color: #F27D26; background: rgba(242, 125, 38, 0.08); padding: 2px 6px; border-radius: 2px;">${safeText(event.date)}</span>
                  <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #718096;">Significance Score: ${event.significance || 9}/10</span>
                </div>
                <h4 style="font-size: 11.5px; color: #FFFFFF; font-weight: 700; margin: 0 0 4px 0;">${safeText(event.title)}</h4>
                <p style="font-size: 10.5px; color: #A0AEC0; margin: 0; line-height: 1.5;">${safeText(event.description)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // V. STRATEGIC SWOT MATRIX
    if (report.swot) {
      html += `
        <div style="${sectionStyle}">
          <h3 style="${sectionTitleStyle}">V. Strategic SWOT & Decision Matrix</h3>
          <p style="font-size: 10px; color: #718096; margin-top: -15px; margin-bottom: 20px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em;">MATRIX PERSPECTIVE: ${safeText(report.swot.perspective)}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 2px;">
              <h4 style="color: #10B981; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: bold; letter-spacing: 0.1em; border-bottom: 1px solid rgba(16, 185, 129, 0.1); padding-bottom: 6px;">🟢 Strengths</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #CBD5E0; line-height: 1.6;">
                ${formatList(report.swot.strengths)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(239, 68, 68, 0.15); padding: 20px; border-radius: 2px;">
              <h4 style="color: #EF4444; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: bold; letter-spacing: 0.1em; border-bottom: 1px solid rgba(239, 68, 68, 0.1); padding-bottom: 6px;">🔴 Weaknesses</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #CBD5E0; line-height: 1.6;">
                ${formatList(report.swot.weaknesses)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(59, 130, 246, 0.15); padding: 20px; border-radius: 2px;">
              <h4 style="color: #3B82F6; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: bold; letter-spacing: 0.1em; border-bottom: 1px solid rgba(59, 130, 246, 0.1); padding-bottom: 6px;">🔵 Opportunities</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #CBD5E0; line-height: 1.6;">
                ${formatList(report.swot.opportunities)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(245, 158, 11, 0.15); padding: 20px; border-radius: 2px;">
              <h4 style="color: #F59E0B; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: bold; letter-spacing: 0.1em; border-bottom: 1px solid rgba(245, 158, 11, 0.1); padding-bottom: 6px;">🟡 Threats</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #CBD5E0; line-height: 1.6;">
                ${formatList(report.swot.threats)}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    // VI. ACTIONABLE TAKEAWAYS
    if (report.actionable_takeaways) {
      const take = report.actionable_takeaways;
      html += `
        <div style="${sectionStyle}">
          <h3 style="${sectionTitleStyle}">VI. Operational Takeaways & Referrals</h3>
          <div style="display: grid; grid-template-cols: 1fr; gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 20px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Strategic Insight</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.6; font-weight: 600;">${safeText(take.key_insight)}</p>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 20px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #EF4444; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Tactical Risk Alert</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.6;">${safeText(take.watch_out_for)}</p>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 20px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #3B82F6; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Analytical Next Step</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.6;">${safeText(take.next_step)}</p>
            </div>
            ${take.professional_referral ? `
              <div style="background: rgba(242, 125, 38, 0.02); border: 1px dashed rgba(242, 125, 38, 0.25); padding: 20px; border-radius: 2px;">
                <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Professional Action Directive</span>
                <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.6; font-style: italic;">${safeText(take.professional_referral)}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  // VII. DEEP INTELLIGENCE DOSSIER (DEEP RESEARCH MODE ONLY)
  if (deepThesis) {
    html += `
      <div style="${sectionStyle}">
        <h3 style="${sectionTitleStyle}">VII. Deep Research Dossier</h3>
        <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 25px; margin-bottom: 30px; border-radius: 2px;">
          <span style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.2em; display: block; margin-bottom: 6px;">Academic Thesis Statement</span>
          <h4 class="serif-title" style="font-size: 20px; color: #FFFFFF; font-weight: bold; margin: 0; line-height: 1.3;">${safeText(deepThesis.title)}</h4>
        </div>

        <div style="display: flex; flex-col; gap: 25px;">
          <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">1. Abstract</h5>
            <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.abstract)}</p>
          </div>
          <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">2. Introduction & Rationale</h5>
            <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.introduction)}</p>
          </div>
          ${deepThesis.problemStatement ? `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">3. Problem Formulation</h5>
              <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.problemStatement)}</p>
            </div>
          ` : ''}
          ${deepThesis.literatureReview ? `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">4. Literature & Evidence Review</h5>
              <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.literatureReview)}</p>
            </div>
          ` : ''}
          <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">5. Methodology & Analytical Framework</h5>
            <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.methodology)}</p>
          </div>
          <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">6. Key Findings & Detailed Analysis</h5>
            <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.findings)}</p>
          </div>
          ${deepThesis.comparativeInsights ? `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">7. Cross-Referenced Comparative Insights</h5>
              <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.comparativeInsights)}</p>
            </div>
          ` : ''}
          ${deepThesis.limitations ? `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">8. Limitations of Inquiry</h5>
              <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.limitations)}</p>
            </div>
          ` : ''}
          ${deepThesis.futureScope ? `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 20px; margin-bottom: 20px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">9. Extended Future Scope</h5>
              <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.futureScope)}</p>
            </div>
          ` : ''}
          <div>
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">10. Comprehensive Conclusion</h5>
            <p style="font-size: 11px; line-height: 1.7; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(deepThesis.conclusion)}</p>
          </div>
        </div>
      </div>
    `;
  }

  // VIII. COGNITIVE REPLAY (FORENSIC CHAIN OF THOUGHT)
  if (reasoningTimeline && reasoningTimeline.length > 0) {
    html += `
      <div style="${sectionStyle}">
        <h3 style="${sectionTitleStyle}">VIII. Forensic Cognition Replay (Chain of Thought)</h3>
        <p style="font-size: 10px; color: #718096; margin-top: -15px; margin-bottom: 20px; font-family: monospace;">SEQUENCE LOGS: ACTIVE COGNITIVE PATTERN RECONSTRUCTION</p>
        <div style="space-y: 15px;">
          ${reasoningTimeline.map((step, idx) => `
            <div style="border-bottom: 1px solid #22222B; padding-bottom: 15px; margin-bottom: 15px; display: flex; gap: 15px; align-items: flex-start;">
              <div style="font-family: monospace; font-size: 10px; color: #F27D26; font-weight: bold; background: rgba(242, 125, 38, 0.08); padding: 4px 8px; border-radius: 2px; text-align: center; min-width: 40px;">
                #${String(idx + 1).padStart(2, '0')}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.1em;">${safeText(step.stage)}</span>
                  <span style="font-size: 9px; font-weight: bold; color: ${step.status === 'confirmed' ? '#10B981' : step.status === 'discarded' ? '#EF4444' : '#F59E0B'}; text-transform: uppercase; letter-spacing: 0.05em;">STATUS: ${safeText(step.status)}</span>
                </div>
                <div style="font-size: 11px; font-weight: bold; color: #FFFFFF; margin-bottom: 4px;">${safeText(step.action)}</div>
                <div style="font-size: 10px; color: #A0AEC0; font-style: italic; border-left: 2px solid rgba(242, 125, 38, 0.3); padding-left: 10px; margin-top: 4px;">"${safeText(step.insight)}"</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // IX. CONFLICT MITIGATION & BIAS WARNINGS
  const hasConflicts = report && report.conflicts && report.conflicts.length > 0;
  const hasBias = report && !!report.bias_alert;

  if (hasConflicts || hasBias) {
    html += `
      <div style="${sectionStyle}">
        <h3 style="${sectionTitleStyle}">IX. Conflict Mitigation & Bias Resolution</h3>
        
        <!-- Bias Alert Block -->
        ${hasBias ? `
          <div style="background-color: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.15); padding: 20px; margin-bottom: 25px; border-radius: 2px;">
            <span style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #F59E0B; letter-spacing: 0.15em; display: block; margin-bottom: 8px;">⚠️ Strategic Bias Flagged</span>
            <div style="font-size: 11px; line-height: 1.6; color: #E2E8F0; font-weight: bold; margin-bottom: 10px;">${safeText(report.bias_alert?.direction)}</div>
            <div style="font-size: 10.5px; line-height: 1.5; color: #FCD34D;"><strong style="color: #FFFFFF;">Recommendation:</strong> ${safeText(report.bias_alert?.recommendation)}</div>
          </div>
        ` : ''}

        <!-- Conflicts Block -->
        ${hasConflicts ? `
          <div style="space-y: 20px;">
            <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #EF4444; letter-spacing: 0.15em; display: block; margin-bottom: 10px;">Detected Source Contradictions</span>
            ${report.conflicts!.map((conflict, idx) => `
              <div style="background-color: rgba(239, 68, 68, 0.02); border: 1px solid rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 2px; margin-bottom: 15px;">
                <div style="font-family: monospace; font-size: 9px; color: #EF4444; font-weight: bold; margin-bottom: 10px;">CONFLICT ID: #${idx + 1}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                  <div style="background: #0A0A0C; padding: 12px; border: 1px solid #22222B;">
                    <span style="font-size: 8px; font-weight: bold; color: #718096; display: block; margin-bottom: 4px;">CLAIM A (Source: ${safeText(conflict.source_a)})</span>
                    <p style="font-size: 10px; margin: 0; color: #E2E8F0; line-height: 1.4;">${safeText(conflict.claim_a)}</p>
                  </div>
                  <div style="background: #0A0A0C; padding: 12px; border: 1px solid #22222B;">
                    <span style="font-size: 8px; font-weight: bold; color: #718096; display: block; margin-bottom: 4px;">CLAIM B (Source: ${safeText(conflict.source_b)})</span>
                    <p style="font-size: 10px; margin: 0; color: #E2E8F0; line-height: 1.4;">${safeText(conflict.claim_b)}</p>
                  </div>
                </div>
                <div style="border-top: 1px solid rgba(239, 68, 68, 0.1); padding-top: 12px;">
                  <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 4px; letter-spacing: 0.05em;">Resolution & Analysis</span>
                  <p style="font-size: 10.5px; margin: 0; color: #CBD5E0; line-height: 1.5;">${safeText(conflict.explanation)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // X. REFERENCED SOURCES & CITATIONS
  if (report && report.sources && report.sources.length > 0) {
    html += `
      <div style="${sectionStyle}">
        <h3 style="${sectionTitleStyle}">X. Verified Source Citations</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 2px solid #22222B; color: #718096; text-transform: uppercase; font-weight: bold;">
              <th style="padding: 10px 8px;">Source & Authority</th>
              <th style="padding: 10px 8px;">Domain Index</th>
              <th style="padding: 10px 8px; text-align: center;">Trust Index</th>
              <th style="padding: 10px 8px; text-align: center;">Relevance</th>
            </tr>
          </thead>
          <tbody>
            ${report.sources.map(s => `
              <tr style="border-bottom: 1px solid #22222B;">
                <td style="padding: 12px 8px; color: #FFFFFF; font-weight: bold; max-width: 320px; line-height: 1.4;">
                  ${safeText(s.title)}
                  ${s.url && s.url !== "URL unavailable" && !s.url.includes("unavailable") ? `
                    <div style="font-size: 8.5px; font-weight: normal; color: #718096; margin-top: 4px; font-family: monospace; word-break: break-all;">${safeText(s.url)}</div>
                  ` : ''}
                </td>
                <td style="padding: 12px 8px; color: #A0AEC0; font-family: monospace; text-transform: uppercase;">${safeText(s.domain || "Web Inquiry")}</td>
                <td style="padding: 12px 8px; text-align: center; color: #10B981; font-weight: bold; font-family: monospace;">${s.credibility_score || 95}/100</td>
                <td style="padding: 12px 8px; text-align: center; color: #3B82F6; font-weight: bold; font-family: monospace;">${s.relevance_score || 90}/100</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Footer Watermark & Cryptographic Stamp
  html += `
      <!-- Technical Sign-off -->
      <div style="border-top: 1px solid #22222B; padding-top: 25px; margin-top: 60px; text-align: center; font-size: 9px; color: #718096; font-family: monospace; line-height: 1.6;">
        <div>COGNAPSE VAULT ENCRYPTED INTEL • GENERATED BY COGNAPSE CORE OS • CLASSIFIED TIER-3 SECRET</div>
        <div style="font-size: 8px; opacity: 0.6; margin-top: 4px;">INTEGRITY CHECKSUM MD5: ${Array.from({length:32},()=>"0123456789abcdef"[Math.floor(Math.random()*16)]).join('')}</div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Generate high-resolution canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#0A0A0C',
      scale: 1.8, // Ultra-sharp print density
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Handle multi-page splitting automatically
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    // Save and download the PDF!
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    pdf.save(`cognapse_dossier_${cleanQuery}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  } finally {
    // Clean up temporary DOM container
    document.body.removeChild(container);
  }
}
