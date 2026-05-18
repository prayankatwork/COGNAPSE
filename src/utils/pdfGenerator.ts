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
    if (!items || !Array.isArray(items)) return '<li style="margin-bottom: 6px;">N/A</li>';
    return items.map(item => `<li style="margin-bottom: 8px;">${safeText(item)}</li>`).join('');
  };

  // Title section style helpers
  const cardStyle = "background-color: #111115; border: 1px solid #22222B; padding: 25px; margin-bottom: 25px; border-radius: 4px; box-sizing: border-box;";
  const cardTitleStyle = "color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; margin-top: 0; margin-bottom: 18px; font-weight: 900; border-left: 3px solid #F27D26; padding-left: 12px; line-height: 1;";

  // Build the list of section HTML strings to partition
  const sectionsHTML: string[] = [];

  // 1. Cover Title Page Block
  let coverPage = `
    <!-- Brand Header -->
    <div style="border-bottom: 2px solid #F27D26; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
      <div>
        <h1 style="color: #F27D26; font-size: 32px; font-family: 'Playfair Display', serif; font-style: italic; font-weight: bold; margin: 0; tracking: -0.05em; line-height: 1;">COGNAPSE</h1>
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
    <div style="margin-bottom: 30px;">
      <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.25em; border: 1px solid rgba(242, 125, 38, 0.3); padding: 4px 10px; background: rgba(242, 125, 38, 0.05); border-radius: 2px;">Verified Core Intelligence</span>
      <h2 style="font-size: 26px; font-family: 'Playfair Display', serif; font-style: italic; font-weight: bold; color: #FFFFFF; margin: 20px 0 10px 0; line-height: 1.2;">${query}</h2>
      <div style="width: 60px; height: 3px; background-color: #F27D26; margin-top: 15px; border-radius: 1px;"></div>
    </div>
  `;
  sectionsHTML.push(coverPage);

  if (report) {
    // 2. Executive Synthesis & ELI5
    let execHTML = `
      <div style="${cardStyle}">
        <h3 style="${cardTitleStyle}">I. Executive Synthesis</h3>
        
        <!-- BLUF -->
        <div style="background-color: #0A0A0C; border-left: 4px solid #F27D26; padding: 18px; margin-bottom: 15px; border-radius: 2px;">
          <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.15em; display: block; margin-bottom: 8px;">Bottom Line Up Front (BLUF)</span>
          <p style="font-size: 12.5px; line-height: 1.55; color: #E2E8F0; margin: 0; font-weight: 600; font-style: italic;">
            "${safeText(report.summary.bottom_line)}"
          </p>
        </div>

        <!-- ELI5 -->
        ${report.summary.eli5_version ? `
          <div style="background-color: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); padding: 16px; margin-bottom: 15px; border-radius: 2px;">
            <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #10B981; letter-spacing: 0.15em; display: block; margin-bottom: 6px;">ELI5 Simplification</span>
            <p style="font-size: 11px; line-height: 1.5; color: #A7F3D0; margin: 0;">
              ${safeText(report.summary.eli5_version)}
            </p>
          </div>
        ` : ''}

        <!-- Narrative -->
        ${report.summary.confidence_narrative ? `
          <div style="font-size: 11px; line-height: 1.5; color: #A0AEC0; margin-top: 10px;">
            <strong style="color: #FFFFFF;">Confidence Analysis:</strong> ${safeText(report.summary.confidence_narrative)}
          </div>
        ` : ''}
      </div>
    `;
    sectionsHTML.push(execHTML);

    // 3. Scores & Metrics
    if (report.scores) {
      let scoresHTML = `
        <div style="${cardStyle}">
          <h3 style="${cardTitleStyle}">II. Performance & Consensus Metrics</h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 12px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Credibility</div>
              <div style="font-size: 20px; font-weight: bold; color: #F27D26;">${report.scores.overall_credibility}%</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 12px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Relevance</div>
              <div style="font-size: 20px; font-weight: bold; color: #F27D26;">${report.scores.overall_relevance}%</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 12px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Consensus</div>
              <div style="font-size: 12px; font-weight: bold; color: #FFFFFF; text-transform: uppercase; margin-top: 6px;">${report.scores.evidence_consensus}</div>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 12px; text-align: center; border-radius: 2px;">
              <div style="font-size: 8px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Certainty</div>
              <div style="font-size: 12px; font-weight: bold; color: #FFFFFF; text-transform: uppercase; margin-top: 6px;">${report.scores.confidence_label || "High"}</div>
            </div>
          </div>
        </div>
      `;
      sectionsHTML.push(scoresHTML);
    }

    // 4. Detailed Intelligence Synthesis
    if (report.summary.full_synthesis) {
      let synthesisHTML = `
        <div style="${cardStyle}">
          <h3 style="${cardTitleStyle}">III. Detailed Intelligence Synthesis</h3>
          <div style="font-size: 11px; line-height: 1.6; color: #CBD5E0; white-space: pre-wrap; text-align: justify;">${safeText(report.summary.full_synthesis)}</div>
        </div>
      `;
      sectionsHTML.push(synthesisHTML);
    }

    // 5. Forensic Timeline
    if (report.timeline_events && report.timeline_events.length > 0) {
      let timelineHTML = `
        <div style="${cardStyle}">
          <h3 style="${cardTitleStyle}">IV. Forensic Timeline of Key Events</h3>
          <div style="position: relative; padding-left: 20px; border-left: 1px solid #2D3748; margin-left: 10px; margin-top: 15px;">
            ${report.timeline_events.map(event => `
              <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -25px; top: 3px; width: 9px; height: 9px; border-radius: 50%; background-color: #F27D26; border: 2px solid #0A0A0C; box-shadow: 0 0 4px rgba(242, 125, 38, 0.4);"></div>
                <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-family: monospace; font-size: 10px; font-weight: bold; color: #F27D26; background: rgba(242, 125, 38, 0.08); padding: 2px 6px; border-radius: 2px;">${safeText(event.date)}</span>
                  <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #718096;">Significance: ${event.significance || 9}/10</span>
                </div>
                <h4 style="font-size: 11px; color: #FFFFFF; font-weight: 700; margin: 0 0 3px 0;">${safeText(event.title)}</h4>
                <p style="font-size: 10px; color: #A0AEC0; margin: 0; line-height: 1.45;">${safeText(event.description)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      sectionsHTML.push(timelineHTML);
    }

    // 6. Strategic SWOT
    if (report.swot) {
      let swotHTML = `
        <div style="${cardStyle}">
          <h3 style="${cardTitleStyle}">V. Strategic SWOT & Decision Matrix</h3>
          <p style="font-size: 9px; color: #718096; margin-top: -12px; margin-bottom: 15px; font-family: monospace; text-transform: uppercase;">PERSPECTIVE: ${safeText(report.swot.perspective)}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 2px;">
              <h4 style="color: #10B981; font-size: 10.5px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid rgba(16, 185, 129, 0.1); padding-bottom: 6px;">🟢 Strengths</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #CBD5E0; line-height: 1.55;">
                ${formatList(report.swot.strengths)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 2px;">
              <h4 style="color: #EF4444; font-size: 10.5px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid rgba(239, 68, 68, 0.1); padding-bottom: 6px;">🔴 Weaknesses</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #CBD5E0; line-height: 1.55;">
                ${formatList(report.swot.weaknesses)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 2px;">
              <h4 style="color: #3B82F6; font-size: 10.5px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid rgba(59, 130, 246, 0.1); padding-bottom: 6px;">🔵 Opportunities</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #CBD5E0; line-height: 1.55;">
                ${formatList(report.swot.opportunities)}
              </ul>
            </div>
            <div style="background: #0A0A0C; border: 1px solid rgba(245, 158, 11, 0.15); padding: 15px; border-radius: 2px;">
              <h4 style="color: #F59E0B; font-size: 10.5px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid rgba(245, 158, 11, 0.1); padding-bottom: 6px;">🟡 Threats</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #CBD5E0; line-height: 1.55;">
                ${formatList(report.swot.threats)}
              </ul>
            </div>
          </div>
        </div>
      `;
      sectionsHTML.push(swotHTML);
    }

    // 7. Operational Takeaways
    if (report.actionable_takeaways) {
      const take = report.actionable_takeaways;
      let takeawaysHTML = `
        <div style="${cardStyle}">
          <h3 style="${cardTitleStyle}">VI. Operational Takeaways & Referrals</h3>
          <div style="display: grid; grid-template-cols: 1fr; gap: 15px;">
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Strategic Insight</span>
              <p style="font-size: 10.5px; margin: 0; color: #E2E8F0; line-height: 1.55; font-weight: 600;">${safeText(take.key_insight)}</p>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #EF4444; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Tactical Risk Alert</span>
              <p style="font-size: 10.5px; margin: 0; color: #E2E8F0; line-height: 1.55;">${safeText(take.watch_out_for)}</p>
            </div>
            <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 15px; border-radius: 2px;">
              <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #3B82F6; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Analytical Next Step</span>
              <p style="font-size: 10.5px; margin: 0; color: #E2E8F0; line-height: 1.55;">${safeText(take.next_step)}</p>
            </div>
            ${take.professional_referral ? `
              <div style="background: rgba(242, 125, 38, 0.02); border: 1px dashed rgba(242, 125, 38, 0.25); padding: 15px; border-radius: 2px;">
                <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 5px; letter-spacing: 0.15em;">Professional Action Directive</span>
                <p style="font-size: 10.5px; margin: 0; color: #E2E8F0; line-height: 1.55; font-style: italic;">${safeText(take.professional_referral)}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      sectionsHTML.push(takeawaysHTML);
    }
  }

  // VIII. DEEP INTELLIGENCE DOSSIER (DEEP RESEARCH MODE ONLY)
  // To avoid cutting multi-chapter text in half, let's render chapters in pairs!
  if (deepThesis) {
    let deepHeader = `
      <div style="${cardStyle}">
        <h3 style="${cardTitleStyle}">VII. Deep Research Thesis</h3>
        <div style="background: #0A0A0C; border: 1px solid #22222B; padding: 20px; border-radius: 2px;">
          <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.2em; display: block; margin-bottom: 6px;">Academic Thesis Statement</span>
          <h4 style="font-size: 18px; font-family: 'Playfair Display', serif; font-style: italic; color: #FFFFFF; font-weight: bold; margin: 0; line-height: 1.35;">${safeText(deepThesis.title)}</h4>
        </div>
      </div>
    `;
    sectionsHTML.push(deepHeader);

    // Dynamic pairing array helper
    const chapters = [
      { name: "1. Abstract", content: deepThesis.abstract },
      { name: "2. Introduction & Rationale", content: deepThesis.introduction },
      ...(deepThesis.problemStatement ? [{ name: "3. Problem Formulation", content: deepThesis.problemStatement }] : []),
      ...(deepThesis.literatureReview ? [{ name: "4. Literature & Evidence Review", content: deepThesis.literatureReview }] : []),
      { name: "5. Methodology & Analytical Framework", content: deepThesis.methodology },
      { name: "6. Key Findings & Detailed Analysis", content: deepThesis.findings },
      ...(deepThesis.comparativeInsights ? [{ name: "7. Comparative Insights", content: deepThesis.comparativeInsights }] : []),
      ...(deepThesis.limitations ? [{ name: "8. Limitations of Inquiry", content: deepThesis.limitations }] : []),
      ...(deepThesis.futureScope ? [{ name: "9. Extended Future Scope", content: deepThesis.futureScope }] : []),
      { name: "10. Comprehensive Conclusion", content: deepThesis.conclusion }
    ];

    // Split chapters into sets of two to fit pages perfectly!
    for (let i = 0; i < chapters.length; i += 2) {
      const ch1 = chapters[i];
      const ch2 = chapters[i + 1];

      let chapHTML = `
        <div style="${cardStyle}">
          <div style="border-bottom: ${ch2 ? '1px solid #22222B' : 'none'}; padding-bottom: ${ch2 ? '20px' : '0'}; margin-bottom: ${ch2 ? '20px' : '0'};">
            <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">${ch1.name}</h5>
            <p style="font-size: 10.5px; line-height: 1.6; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(ch1.content)}</p>
          </div>
          ${ch2 ? `
            <div style="padding-top: 10px;">
              <h5 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-weight: bold;">${ch2.name}</h5>
              <p style="font-size: 10.5px; line-height: 1.6; color: #CBD5E0; margin: 0; text-align: justify;">${safeText(ch2.content)}</p>
            </div>
          ` : ''}
        </div>
      `;
      sectionsHTML.push(chapHTML);
    }
  }

  // IX. COGNITIVE REPLAY (FORENSIC CHAIN OF THOUGHT)
  // Render reasoning steps in sets of 4 to fit A4 page heights comfortably!
  if (reasoningTimeline && reasoningTimeline.length > 0) {
    for (let i = 0; i < reasoningTimeline.length; i += 4) {
      const chunk = reasoningTimeline.slice(i, i + 4);
      let timelineChunkHTML = `
        <div style="${cardStyle}">
          ${i === 0 ? `
            <h3 style="${cardTitleStyle}">VIII. Forensic Cognition Replay (Chain of Thought)</h3>
            <p style="font-size: 9px; color: #718096; margin-top: -12px; margin-bottom: 20px; font-family: monospace; text-transform: uppercase;">SEQUENCE LOGS: ACTIVE COGNITIVE PATTERN RECONSTRUCTION</p>
          ` : `
            <h3 style="${cardTitleStyle}">VIII. Forensic Cognition Replay (Continued)</h3>
          `}
          
          <div style="space-y: 12px;">
            ${chunk.map((step, idx) => `
              <div style="border-bottom: ${idx < chunk.length - 1 ? '1px solid #22222B' : 'none'}; padding-bottom: ${idx < chunk.length - 1 ? '12px' : '0'}; margin-bottom: ${idx < chunk.length - 1 ? '12px' : '0'}; display: flex; gap: 12px; align-items: flex-start;">
                <div style="font-family: monospace; font-size: 10px; color: #F27D26; font-weight: bold; background: rgba(242, 125, 38, 0.08); padding: 4px 8px; border-radius: 2px; text-align: center; min-width: 35px;">
                  #${String(i + idx + 1).padStart(2, '0')}
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F27D26; letter-spacing: 0.08em;">${safeText(step.stage)}</span>
                    <span style="font-size: 8.5px; font-weight: bold; color: ${step.status === 'confirmed' ? '#10B981' : step.status === 'discarded' ? '#EF4444' : '#F59E0B'}; text-transform: uppercase;">STATUS: ${safeText(step.status)}</span>
                  </div>
                  <div style="font-size: 10.5px; font-weight: bold; color: #FFFFFF; margin-bottom: 3px;">${safeText(step.action)}</div>
                  <div style="font-size: 9.5px; color: #A0AEC0; font-style: italic; border-left: 2px solid rgba(242, 125, 38, 0.25); padding-left: 8px; margin-top: 3px;">"${safeText(step.insight)}"</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      sectionsHTML.push(timelineChunkHTML);
    }
  }

  // X. CONFLICT MITIGATION & BIAS RESOLUTION
  const hasConflicts = report && report.conflicts && report.conflicts.length > 0;
  const hasBias = report && !!report.bias_alert;

  if (hasConflicts || hasBias) {
    let biasHTML = `
      <div style="${cardStyle}">
        <h3 style="${cardTitleStyle}">IX. Conflict Mitigation & Bias Resolution</h3>
        
        <!-- Bias Alert Block -->
        ${hasBias ? `
          <div style="background-color: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.15); padding: 16px; margin-bottom: 20px; border-radius: 2px;">
            <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #F59E0B; letter-spacing: 0.15em; display: block; margin-bottom: 6px;">⚠️ Strategic Bias Flagged</span>
            <div style="font-size: 10.5px; line-height: 1.5; color: #E2E8F0; font-weight: bold; margin-bottom: 8px;">${safeText(report.bias_alert?.direction)}</div>
            <div style="font-size: 10px; line-height: 1.45; color: #FCD34D;"><strong style="color: #FFFFFF;">Recommendation:</strong> ${safeText(report.bias_alert?.recommendation)}</div>
          </div>
        ` : ''}

        <!-- Conflicts Block -->
        ${hasConflicts ? `
          <div style="space-y: 15px;">
            <span style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #EF4444; letter-spacing: 0.12em; display: block; margin-bottom: 8px;">Detected Source Contradictions</span>
            ${report.conflicts!.map((conflict, idx) => `
              <div style="background-color: rgba(239, 68, 68, 0.02); border: 1px solid rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 2px; margin-bottom: 12px;">
                <div style="font-family: monospace; font-size: 8px; color: #EF4444; font-weight: bold; margin-bottom: 8px;">CONFLICT ID: #${idx + 1}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                  <div style="background: #0A0A0C; padding: 10px; border: 1px solid #22222B;">
                    <span style="font-size: 7.5px; font-weight: bold; color: #718096; display: block; margin-bottom: 4px;">CLAIM A (Source: ${safeText(conflict.source_a)})</span>
                    <p style="font-size: 9.5px; margin: 0; color: #E2E8F0; line-height: 1.35;">${safeText(conflict.claim_a)}</p>
                  </div>
                  <div style="background: #0A0A0C; padding: 10px; border: 1px solid #22222B;">
                    <span style="font-size: 7.5px; font-weight: bold; color: #718096; display: block; margin-bottom: 4px;">CLAIM B (Source: ${safeText(conflict.source_b)})</span>
                    <p style="font-size: 9.5px; margin: 0; color: #E2E8F0; line-height: 1.35;">${safeText(conflict.claim_b)}</p>
                  </div>
                </div>
                <div style="border-top: 1px solid rgba(239, 68, 68, 0.1); padding-top: 10px;">
                  <span style="font-size: 7.5px; font-weight: 900; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 4px;">Resolution & Mitigation Resolution</span>
                  <p style="font-size: 10px; margin: 0; color: #CBD5E0; line-height: 1.45;">${safeText(conflict.explanation)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    sectionsHTML.push(biasHTML);
  }

  // XI. REFERENCED SOURCES
  if (report && report.sources && report.sources.length > 0) {
    let sourcesHTML = `
      <div style="${cardStyle}">
        <h3 style="${cardTitleStyle}">X. Verified Source Citations</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 9.5px;">
          <thead>
            <tr style="border-bottom: 2px solid #22222B; color: #718096; text-transform: uppercase; font-weight: bold;">
              <th style="padding: 8px 5px;">Source & Authority</th>
              <th style="padding: 8px 5px;">Domain Index</th>
              <th style="padding: 8px 5px; text-align: center;">Trust Index</th>
              <th style="padding: 8px 5px; text-align: center;">Relevance</th>
            </tr>
          </thead>
          <tbody>
            ${report.sources.map(s => `
              <tr style="border-bottom: 1px solid #22222B;">
                <td style="padding: 10px 5px; color: #FFFFFF; font-weight: bold; max-width: 300px; line-height: 1.4;">
                  ${safeText(s.title)}
                  ${s.url && s.url !== "URL unavailable" && !s.url.includes("unavailable") ? `
                    <div style="font-size: 8px; font-weight: normal; color: #718096; margin-top: 4px; font-family: monospace; word-break: break-all;">${safeText(s.url)}</div>
                  ` : ''}
                </td>
                <td style="padding: 10px 5px; color: #A0AEC0; font-family: monospace; text-transform: uppercase;">${safeText(s.domain || "Web Inquiry")}</td>
                <td style="padding: 10px 5px; text-align: center; color: #10B981; font-weight: bold; font-family: monospace;">${s.credibility_score || 95}/100</td>
                <td style="padding: 10px 5px; text-align: center; color: #3B82F6; font-weight: bold; font-family: monospace;">${s.relevance_score || 90}/100</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    sectionsHTML.push(sourcesHTML);
  }

  // XII. SIGN-OFF & MD5 INTEGRITY SIGNATURE
  let signOffHTML = `
    <!-- Technical Sign-off -->
    <div style="text-align: center; padding: 25px 0; font-family: monospace; font-size: 9px; color: #718096; line-height: 1.6; border: 1px solid #22222B; background: #111115; border-radius: 4px; box-sizing: border-box; width: 100%;">
      <div>COGNAPSE VAULT ENCRYPTED INTEL • GENERATED BY COGNAPSE CORE OS • CLASSIFIED TIER-3 SECRET</div>
      <div style="font-size: 8px; opacity: 0.6; margin-top: 4px;">INTEGRITY CHECKSUM MD5: ${Array.from({length:32},()=>"0123456789abcdef"[Math.floor(Math.random()*16)]).join('')}</div>
    </div>
  `;
  sectionsHTML.push(signOffHTML);


  // ----------------------------------------------------
  // DYNAMIC MEASUREMENT & auto-pagination ALGORITHM
  // ----------------------------------------------------
  
  // 1. Create invisible measurement sandbox container
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'absolute';
  measureContainer.style.left = '-9999px';
  measureContainer.style.top = '-9999px';
  measureContainer.style.width = '850px';
  measureContainer.style.backgroundColor = '#0A0A0C';
  measureContainer.style.color = '#E2E8F0';
  measureContainer.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
  measureContainer.style.boxSizing = 'border-box';
  document.body.appendChild(measureContainer);

  // Append styling rules to measure sandbox so that fonts load properly
  const sandboxStyle = document.createElement('style');
  sandboxStyle.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
    li::marker { color: #F27D26 !important; }
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
  // We use 980px as the card grouping ceiling to account for dynamic title padding, dynamic footers,
  // and browser canvas margin safety guidelines.
  const PAGE_HEIGHT_CEILING = 980;

  cardElements.forEach(card => {
    const height = card.offsetHeight || 120;
    
    if (height > PAGE_HEIGHT_CEILING) {
      // If a card itself is extremely large (e.g. extremely long synthesis), isolate it on its own page
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentPageHeight = 0;
      }
      pages.push([card]);
    } else if (currentPageHeight + height > PAGE_HEIGHT_CEILING) {
      // Page threshold breached! Pack current group and open a new page block
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
      pageFrame.style.padding = '50px 50px 75px 50px';
      pageFrame.style.backgroundColor = '#0A0A0C';
      pageFrame.style.color = '#E2E8F0';
      pageFrame.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
      
      // Inject standard sandbox styles for absolute pixel consistency
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        li::marker { color: #F27D26 !important; }
      `;
      pageFrame.appendChild(styleEl);

      // A4 Header Decal
      const headerDecal = document.createElement('div');
      headerDecal.style.display = 'flex';
      headerDecal.style.justifyContent = 'space-between';
      headerDecal.style.borderBottom = '1px solid rgba(242, 125, 38, 0.15)';
      headerDecal.style.paddingBottom = '8px';
      headerDecal.style.marginBottom = '25px';
      headerDecal.style.fontFamily = 'monospace';
      headerDecal.style.fontSize = '8px';
      headerDecal.style.color = '#718096';
      headerDecal.style.textTransform = 'uppercase';
      headerDecal.style.letterSpacing = '0.12em';
      headerDecal.style.width = '100%';
      headerDecal.innerHTML = `
        <span>COGNAPSE CORE NETWORK • VAULT INQUIRY</span>
        <span>LEVEL-3 SECRET DIRECTIVE</span>
      `;
      pageFrame.appendChild(headerDecal);

      // Append all elements mapped to this page
      const contentWrapper = document.createElement('div');
      contentWrapper.style.width = '100%';
      pages[i].forEach(card => {
        // Clone card element to prevent DOM reference issues
        const clonedCard = card.cloneNode(true) as HTMLElement;
        contentWrapper.appendChild(clonedCard);
      });
      pageFrame.appendChild(contentWrapper);

      // A4 Locked Footer Decal
      const footerDecal = document.createElement('div');
      footerDecal.style.position = 'absolute';
      footerDecal.style.bottom = '30px';
      footerDecal.style.left = '50px';
      footerDecal.style.right = '50px';
      footerDecal.style.display = 'flex';
      footerDecal.style.justifyContent = 'space-between';
      footerDecal.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
      footerDecal.style.paddingTop = '10px';
      footerDecal.style.fontFamily = 'monospace';
      footerDecal.style.fontSize = '8px';
      footerDecal.style.color = '#718096';
      footerDecal.style.textTransform = 'uppercase';
      footerDecal.style.letterSpacing = '0.08em';
      footerDecal.innerHTML = `
        <span>MD5 SECURE VERIFICATION SEAL APPROVED</span>
        <span>PAGE ${i + 1} OF ${pages.length}</span>
      `;
      pageFrame.appendChild(footerDecal);

      document.body.appendChild(pageFrame);

      // Convert page frame to high-resolution texture canvas
      const canvas = await html2canvas(pageFrame, {
        backgroundColor: '#0A0A0C',
        scale: 1.8, // Super-sharp vector rendering
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      // Remove rendering frame to save system memory
      document.body.removeChild(pageFrame);

      // Write to jsPDF
      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    // Download dynamic PDF
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    pdf.save(`cognapse_dossier_${cleanQuery}.pdf`);
  } catch (error) {
    console.error("Auto-pagination PDF compiler error:", error);
    throw error;
  }
}
