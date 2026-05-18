import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportData {
  title: string;
  bottomLine: string;
  fullSynthesis: string;
  eli5?: string;
  aiProvider: string;
  timestamp: string;
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  metrics?: {
    credibility: string;
    relevance: string;
    consensus: string;
  };
  sources?: {
    title: string;
    url?: string;
    credibilityScore: string;
  }[];
  deepResearchSection?: {
    abstract?: string;
    introduction?: string;
    methodology?: string;
    findings?: string;
    conclusion?: string;
  };
}

export const pdfService = {
  async generateAndDownloadPDF(data: PDFExportData): Promise<void> {
    // Create a temporary styled container in the document
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    element.style.width = '800px';
    element.style.color = '#FFFFFF';
    element.style.backgroundColor = '#0A0E17'; // Cyber dark background
    element.style.fontFamily = "'Courier New', Courier, monospace";
    element.style.padding = '40px';
    element.style.boxSizing = 'border-box';

    // Premium UI Styling Template for Cyber-Dossier
    element.innerHTML = `
      <div style="border: 2px solid #F27D26; padding: 24px; border-radius: 4px; position: relative; background: #0F1626;">
        <!-- Header Branding -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #2A4365; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="color: #F27D26; font-size: 28px; font-weight: bold; margin: 0; font-family: sans-serif; letter-spacing: -1px; font-style: italic;">
              COGNAPSE <span style="color: #FFFFFF; font-size: 14px; font-style: normal; letter-spacing: 2px; font-family: monospace;">// VAULT.REPORT</span>
            </h1>
            <p style="color: #6B7280; font-size: 9px; text-transform: uppercase; margin: 4px 0 0 0; font-weight: bold; letter-spacing: 1px;">
              Tactical Intelligence Intelligence OS
            </p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 8px; color: #F27D26; font-weight: bold; background: rgba(242,125,38,0.1); padding: 4px 8px; border: 1px solid rgba(242,125,38,0.2); display: inline-block;">
              SECURE DECRYPTED DOSSIER
            </div>
            <p style="font-size: 9px; color: #6B7280; margin: 6px 0 0 0;">PROVIDER: <span style="color: #FFFFFF; font-weight: bold;">${data.aiProvider.toUpperCase()}</span></p>
          </div>
        </div>

        <!-- Meta Info Block -->
        <div style="background: rgba(42,67,101,0.1); border: 1px solid rgba(42,67,101,0.3); padding: 12px; margin-bottom: 24px; font-size: 11px; color: #E2E8F0; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between;">
            <div><strong>TIMESTAMPS:</strong> ${data.timestamp}</div>
            <div><strong>SECURITY CLEARANCE:</strong> TIER 4 (MAXIMUM)</div>
          </div>
        </div>

        <!-- Subject/Query -->
        <div style="margin-bottom: 24px;">
          <span style="color: #F27D26; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 4px;">INTELLIGENCE TARGET</span>
          <h2 style="font-size: 22px; color: #FFFFFF; margin: 0; font-family: sans-serif; font-weight: bold; line-height: 1.2;">
            ${data.title}
          </h2>
        </div>

        <!-- Bottom Line / Executive Summary -->
        <div style="background: rgba(242,125,38,0.05); border-left: 4px solid #F27D26; padding: 16px; margin-bottom: 28px;">
          <span style="color: #F27D26; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">EXECUTIVE SUMMARY // BOTTOM LINE</span>
          <p style="font-style: italic; color: #E2E8F0; margin: 0; font-size: 13px; line-height: 1.5; font-family: Georgia, serif;">
            "${data.bottomLine}"
          </p>
        </div>

        ${data.eli5 ? `
        <!-- ELI5 block -->
        <div style="background: rgba(59,130,246,0.05); border-left: 4px solid #3B82F6; padding: 14px; margin-bottom: 28px;">
          <span style="color: #3B82F6; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">SIMPLIFIED EXPLANATION (ELI5)</span>
          <p style="color: #E2E8F0; margin: 0; font-size: 12px; line-height: 1.5;">
            ${data.eli5}
          </p>
        </div>
        ` : ''}

        <!-- Core Synthesis -->
        <div style="margin-bottom: 32px;">
          <div style="border-bottom: 1px solid #2A4365; padding-bottom: 6px; margin-bottom: 12px;">
            <span style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">01/ INTELLIGENCE SYNTHESIS</span>
          </div>
          <div style="color: #D1D5DB; font-size: 12px; line-height: 1.7; white-space: pre-wrap; font-family: monospace;">
            ${data.fullSynthesis}
          </div>
        </div>

        <!-- Deep Research Sections if present -->
        ${data.deepResearchSection ? `
        <div style="margin-bottom: 32px;">
          <div style="border-bottom: 1px solid #2A4365; padding-bottom: 6px; margin-bottom: 12px;">
            <span style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">02/ DETAILED DOSSIER CHAPTERS</span>
          </div>
          
          ${data.deepResearchSection.abstract ? `
            <div style="margin-bottom: 16px;">
              <h4 style="color: #F27D26; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">A. Abstract</h4>
              <p style="color: #D1D5DB; font-size: 11px; line-height: 1.6; margin: 0;">${data.deepResearchSection.abstract}</p>
            </div>
          ` : ''}
          
          ${data.deepResearchSection.introduction ? `
            <div style="margin-bottom: 16px;">
              <h4 style="color: #F27D26; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">B. Introduction & Framework</h4>
              <p style="color: #D1D5DB; font-size: 11px; line-height: 1.6; margin: 0;">${data.deepResearchSection.introduction}</p>
            </div>
          ` : ''}

          ${data.deepResearchSection.methodology ? `
            <div style="margin-bottom: 16px;">
              <h4 style="color: #F27D26; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">C. Methodology & Data Sources</h4>
              <p style="color: #D1D5DB; font-size: 11px; line-height: 1.6; margin: 0;">${data.deepResearchSection.methodology}</p>
            </div>
          ` : ''}

          ${data.deepResearchSection.findings ? `
            <div style="margin-bottom: 16px;">
              <h4 style="color: #F27D26; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">D. Comprehensive Analysis & Findings</h4>
              <p style="color: #D1D5DB; font-size: 11px; line-height: 1.6; margin: 0;">${data.deepResearchSection.findings}</p>
            </div>
          ` : ''}

          ${data.deepResearchSection.conclusion ? `
            <div style="margin-bottom: 16px;">
              <h4 style="color: #F27D26; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">E. Final Synthesis & Conclusion</h4>
              <p style="color: #D1D5DB; font-size: 11px; line-height: 1.6; margin: 0;">${data.deepResearchSection.conclusion}</p>
            </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- SWOT Quadrants if present -->
        ${data.swot ? `
        <div style="margin-bottom: 32px;">
          <div style="border-bottom: 1px solid #2A4365; padding-bottom: 6px; margin-bottom: 12px;">
            <span style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">03/ DECISION MATRIX (SWOT ANALYSIS)</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); padding: 12px; border-radius: 4px;">
              <strong style="color: #10B981; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">Strengths</strong>
              <ul style="margin: 0; padding-left: 14px; font-size: 10px; color: #D1D5DB;">
                ${data.swot.strengths.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            <div style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); padding: 12px; border-radius: 4px;">
              <strong style="color: #EF4444; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">Weaknesses</strong>
              <ul style="margin: 0; padding-left: 14px; font-size: 10px; color: #D1D5DB;">
                ${data.swot.weaknesses.map(w => `<li>${w}</li>`).join('')}
              </ul>
            </div>
            <div style="background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.2); padding: 12px; border-radius: 4px;">
              <strong style="color: #3B82F6; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">Opportunities</strong>
              <ul style="margin: 0; padding-left: 14px; font-size: 10px; color: #D1D5DB;">
                ${data.swot.opportunities.map(o => `<li>${o}</li>`).join('')}
              </ul>
            </div>
            <div style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); padding: 12px; border-radius: 4px;">
              <strong style="color: #F59E0B; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">Threats</strong>
              <ul style="margin: 0; padding-left: 14px; font-size: 10px; color: #D1D5DB;">
                ${data.swot.threats.map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Metrics & Evidence Verification -->
        ${data.metrics ? `
        <div style="margin-bottom: 32px; background: rgba(15,22,38,0.8); border: 1px solid #2A4365; padding: 16px; border-radius: 4px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center;">
            <div>
              <span style="font-size: 9px; text-transform: uppercase; color: #6B7280; display: block; margin-bottom: 4px;">Credibility Score</span>
              <strong style="font-size: 18px; color: #F27D26;">${data.metrics.credibility}</strong>
            </div>
            <div>
              <span style="font-size: 9px; text-transform: uppercase; color: #6B7280; display: block; margin-bottom: 4px;">Relevance Score</span>
              <strong style="font-size: 18px; color: #F27D26;">${data.metrics.relevance}</strong>
            </div>
            <div>
              <span style="font-size: 9px; text-transform: uppercase; color: #6B7280; display: block; margin-bottom: 4px;">Evidence Consensus</span>
              <strong style="font-size: 14px; color: #FFFFFF; text-transform: uppercase;">${data.metrics.consensus}</strong>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Source References -->
        ${data.sources && data.sources.length > 0 ? `
        <div style="margin-bottom: 32px;">
          <div style="border-bottom: 1px solid #2A4365; padding-bottom: 6px; margin-bottom: 12px;">
            <span style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">04/ VERIFIED SOURCE REFERENCES</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.sources.map((s, idx) => `
              <div style="background: rgba(15,22,38,0.5); border: 1px solid rgba(42,67,101,0.3); padding: 10px; border-radius: 2px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: bold; color: #FFFFFF;">${idx + 1}. ${s.title}</span>
                  <span style="background: rgba(242,125,38,0.1); border: 1px solid rgba(242,125,38,0.3); color: #F27D26; font-size: 9px; padding: 2px 6px; border-radius: 2px; font-weight: bold;">
                    CREDIBILITY: ${s.credibilityScore}
                  </span>
                </div>
                ${s.url ? `<a href="${s.url}" style="font-size: 9px; color: #3B82F6; text-decoration: none; word-break: break-all;">${s.url}</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Watermark Footer -->
        <div style="border-top: 1px solid #2A4365; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #6B7280;">
          <div>GEN-ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
          <div style="font-weight: bold; color: #F27D26; letter-spacing: 1px;">GENERATED BY COGNAPSE SECURE PLATFORM</div>
          <div>VAULT PROTOCOL // APPROVED</div>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    try {
      // Capture html container to Canvas using html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#0A0E17',
        scale: 2, // Retain crystal clear typography rendering
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Calculate dynamic PDF margins/size
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 Standard dimensions (mm)
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Slice multi-page PDF safely if canvas height exceeds single page A4 height limit
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const formattedTitle = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
      pdf.save(`cognapse-dossier-${formattedTitle}.pdf`);
    } finally {
      document.body.removeChild(element);
    }
  }
};
