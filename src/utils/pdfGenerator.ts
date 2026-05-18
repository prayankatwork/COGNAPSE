import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { COGNAPSE_Output, DeepResearchThesis } from '../types';

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
  container.style.width = '800px';
  container.style.backgroundColor = '#0A0A0C';
  container.style.color = '#E2E8F0';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';

  // Format timestamp
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Dynamic content building
  let html = `
    <!-- Brand Header -->
    <div style="border-bottom: 2px solid #F27D26; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="color: #F27D26; font-size: 28px; font-family: serif; font-style: italic; font-weight: bold; margin: 0; tracking: -0.05em;">COGNAPSE CORE.</h1>
        <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: #718096; margin: 5px 0 0 0; font-weight: 900;">Tactical Intelligence Network</p>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 10px; color: #718096;">
        <div>PROTOCOL: AES-256 VAULT</div>
        <div>DATE: ${dateStr}</div>
        <div>PROVIDER: ${aiProvider.toUpperCase()}</div>
      </div>
    </div>

    <!-- Title Section -->
    <div style="margin-bottom: 40px;">
      <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #F27D26; letter-spacing: 0.2em; border: 1px solid rgba(242, 125, 38, 0.2); padding: 3px 8px; background: rgba(242, 125, 38, 0.05);">Intelligence Synthesis Report</span>
      <h2 style="font-size: 24px; font-serif: true; font-weight: bold; color: #FFFFFF; margin: 15px 0 10px 0; line-height: 1.25;">${query}</h2>
      <div style="width: 50px; h-0.5; background-color: #F27D26; margin-top: 15px;"></div>
    </div>
  `;

  if (report) {
    // Executive Summary
    html += `
      <div style="background-color: #121216; border: 1px solid #2D3748; padding: 25px; margin-bottom: 30px;">
        <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 0; margin-bottom: 15px; font-weight: 900;">I. Executive Summary</h3>
        <p style="font-size: 13px; line-height: 1.6; color: #E2E8F0; margin-bottom: 15px; font-weight: bold; font-style: italic;">
          "${report.summary.bottom_line}"
        </p>
        ${report.summary.confidence_narrative ? `
          <p style="font-size: 11px; line-height: 1.6; color: #A0AEC0; margin: 0;">
            <strong>Confidence Narrative:</strong> ${report.summary.confidence_narrative}
          </p>
        ` : ''}
      </div>
    `;

    // Metrics & Consensus
    if (report.scores) {
      html += `
        <div style="display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: #121216; border: 1px solid #2D3748; padding: 15px; text-align: center;">
            <div style="font-size: 9px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Credibility Score</div>
            <div style="font-size: 20px; font-weight: bold; color: #F27D26;">${report.scores.overall_credibility}%</div>
          </div>
          <div style="background: #121216; border: 1px solid #2D3748; padding: 15px; text-align: center;">
            <div style="font-size: 9px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Relevance Index</div>
            <div style="font-size: 20px; font-weight: bold; color: #F27D26;">${report.scores.overall_relevance}%</div>
          </div>
          <div style="background: #121216; border: 1px solid #2D3748; padding: 15px; text-align: center;">
            <div style="font-size: 9px; text-transform: uppercase; color: #718096; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: bold;">Consensus</div>
            <div style="font-size: 14px; font-weight: bold; color: #FFFFFF; text-transform: uppercase; margin-top: 5px;">${report.scores.evidence_consensus}</div>
          </div>
        </div>
      `;
    }

    // Full Synthesis
    if (report.summary.full_synthesis) {
      html += `
        <div style="margin-bottom: 40px;">
          <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; border-bottom: 1px solid #2D3748; padding-bottom: 8px; margin-bottom: 15px; font-weight: 900;">II. Intelligence Synthesis</h3>
          <div style="font-size: 12px; line-height: 1.6; color: #CBD5E0; white-space: pre-wrap;">${report.summary.full_synthesis}</div>
        </div>
      `;
    }

    // SWOT Analysis
    if (report.swot) {
      html += `
        <div style="margin-bottom: 40px;">
          <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; border-bottom: 1px solid #2D3748; padding-bottom: 8px; margin-bottom: 15px; font-weight: 900;">III. Decision Matrix (SWOT)</h3>
          <p style="font-size: 10px; color: #718096; margin-top: -10px; margin-bottom: 15px; font-family: monospace;">PERSPECTIVE: ${report.swot.perspective}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: #121216; border: 1px solid rgba(16, 185, 129, 0.2); padding: 15px;">
              <h4 style="color: #10B981; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold;">Strengths</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #E2E8F0; line-height: 1.5;">
                ${report.swot.strengths.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            <div style="background: #121216; border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px;">
              <h4 style="color: #EF4444; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold;">Weaknesses</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #E2E8F0; line-height: 1.5;">
                ${report.swot.weaknesses.map(w => `<li>${w}</li>`).join('')}
              </ul>
            </div>
            <div style="background: #121216; border: 1px solid rgba(59, 130, 246, 0.2); padding: 15px;">
              <h4 style="color: #3B82F6; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold;">Opportunities</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #E2E8F0; line-height: 1.5;">
                ${report.swot.opportunities.map(o => `<li>${o}</li>`).join('')}
              </ul>
            </div>
            <div style="background: #121216; border: 1px solid rgba(245, 158, 11, 0.2); padding: 15px;">
              <h4 style="color: #F59E0B; font-size: 11px; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-weight: bold;">Threats</h4>
              <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #E2E8F0; line-height: 1.5;">
                ${report.swot.threats.map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    // Actionable Takeaways
    if (report.actionable_takeaways) {
      const take = report.actionable_takeaways;
      html += `
        <div style="margin-bottom: 40px; page-break-before: auto;">
          <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; border-bottom: 1px solid #2D3748; padding-bottom: 8px; margin-bottom: 15px; font-weight: 900;">IV. Actionable Takeaways</h3>
          <div style="background-color: #121216; border: 1px solid #2D3748; padding: 20px; space-y: 15px;">
            <div style="margin-bottom: 15px;">
              <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #F27D26; display: block; margin-bottom: 3px;">Key Insight</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.5;">${take.key_insight}</p>
            </div>
            <div style="margin-bottom: 15px;">
              <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #EF4444; display: block; margin-bottom: 3px;">Watch Out For</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.5;">${take.watch_out_for}</p>
            </div>
            <div>
              <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #3B82F6; display: block; margin-bottom: 3px;">Next Recommended Steps</span>
              <p style="font-size: 11px; margin: 0; color: #E2E8F0; line-height: 1.5;">${take.next_step}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Deep Research Section
  if (deepThesis) {
    html += `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; border-bottom: 1px solid #2D3748; padding-bottom: 8px; margin-bottom: 15px; font-weight: 900;">V. Deep Intelligence Dossier</h3>
        <p style="font-size: 13px; font-weight: bold; color: #FFFFFF; margin-bottom: 15px;">Thesis Title: ${deepThesis.title}</p>
        
        <div style="space-y: 20px;">
          <div style="margin-bottom: 20px;">
            <h4 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Abstract</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #CBD5E0; margin: 0;">${deepThesis.abstract}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h4 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Introduction</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #CBD5E0; margin: 0;">${deepThesis.introduction}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h4 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Methodology & Analytical Approach</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #CBD5E0; margin: 0;">${deepThesis.methodology}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h4 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Key Findings & Comparative Insights</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #CBD5E0; margin: 0;">${deepThesis.findings}</p>
          </div>
          <div>
            <h4 style="color: #F27D26; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Conclusion</h4>
            <p style="font-size: 11px; line-height: 1.6; color: #CBD5E0; margin: 0;">${deepThesis.conclusion}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Sources & References
  if (report && report.sources && report.sources.length > 0) {
    html += `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #F27D26; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; border-bottom: 1px solid #2D3748; padding-bottom: 8px; margin-bottom: 15px; font-weight: 900;">VI. Referenced Intelligence Sources</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 1px solid #2D3748; color: #718096; text-transform: uppercase;">
              <th style="padding: 8px 5px;">Source Title</th>
              <th style="padding: 8px 5px;">Domain</th>
              <th style="padding: 8px 5px; text-align: center;">Credibility</th>
              <th style="padding: 8px 5px; text-align: center;">Relevance</th>
            </tr>
          </thead>
          <tbody>
            ${report.sources.map(s => `
              <tr style="border-bottom: 1px solid rgba(45, 55, 72, 0.4);">
                <td style="padding: 8px 5px; color: #E2E8F0; font-weight: bold;">${s.title}</td>
                <td style="padding: 8px 5px; color: #A0AEC0;">${s.domain}</td>
                <td style="padding: 8px 5px; text-align: center; color: #10B981; font-weight: bold;">${s.credibility_score}/100</td>
                <td style="padding: 8px 5px; text-align: center; color: #3B82F6;">${s.relevance_score}/100</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Footer Watermark
  html += `
    <div style="border-top: 1px solid #2D3748; padding-top: 20px; margin-top: 60px; text-align: center; font-size: 9px; color: #718096; font-family: monospace;">
      COGNAPSE VAULT ENCRYPTED INTEL • GENERATED BY COGNAPSE OS • DO NOT DISTRIBUTE UNILATERALLY
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Generate high-resolution canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#0A0A0C',
      scale: 2, // High resolution for premium printing
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30);
    pdf.save(`cognapse_report_${cleanQuery}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  } finally {
    // Clean up temporary DOM container
    document.body.removeChild(container);
  }
}
