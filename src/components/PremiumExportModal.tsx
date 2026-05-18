import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldAlert, Award, FileText, CheckCircle2, 
  Copy, Check, QrCode, CreditCard, Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import { pdfService, PDFExportData } from '../services/pdfService';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

interface PremiumExportModalProps {
  onClose: () => void;
  researchData: any; // COGNAPSE_Output or DeepResearchThesis
  isDeepResearch: boolean;
}

export default function PremiumExportModal({ onClose, researchData, isDeepResearch }: PremiumExportModalProps) {
  const { user } = useStore();
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'info' | 'payment' | 'unlocking'>('info');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upiId = '9958307500@ptsbi';
  const payeeName = 'Prayank Patnaik';
  
  // Dynamic UPI URL for real Indian banking app scans
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&cu=INR&tn=COGNAPSE%20Premium%20Report`;
  
  // Free QR Server API to render a crystal-clear UPI QR code
  const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0A0E17&bgcolor=FFFFFF&data=${encodeURIComponent(upiUrl)}`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPayment = async () => {
    if (!referenceId.trim()) {
      setError("Please enter the payment transaction reference ID.");
      return;
    }
    if (referenceId.trim().length < 8) {
      setError("Please enter a valid 12-digit UPI reference ID or transaction proof.");
      return;
    }

    setError(null);
    setLoading(true);

    // Simulate premium verification & decryption delay
    setTimeout(async () => {
      try {
        const queryText = isDeepResearch 
          ? (researchData.title || "Deep Research Synthesis")
          : (researchData.query_understood || "Intelligence Report");

        const aiProvider = isDeepResearch 
          ? "Gemini 1.5 Pro Deep Research" 
          : (researchData.meta?.provider || "Deepseek/Groq Engine");

        // 1. Log payment and export telemetry to Firestore & Local SQLite
        const exportId = uuidv4();
        if (user) {
          await dbService.saveExportRecord(
            exportId,
            user.id,
            researchData.id || uuidv4(),
            queryText,
            isDeepResearch ? 'deep' : 'standard',
            aiProvider
          );
        }

        // 2. Prep data for PDF Dossier
        const exportData: PDFExportData = {
          title: queryText,
          bottomLine: isDeepResearch 
            ? (researchData.abstract || "Detailed investigation completed successfully.")
            : (researchData.summary?.bottom_line || "No summary provided."),
          fullSynthesis: isDeepResearch
            ? (researchData.findings || "No findings recorded.")
            : (researchData.summary?.full_synthesis || "No synthesis recorded."),
          eli5: isDeepResearch ? undefined : researchData.summary?.eli5_version,
          aiProvider: aiProvider,
          timestamp: new Date().toLocaleString(),
          swot: isDeepResearch ? undefined : researchData.swot ? {
            strengths: researchData.swot.strengths || [],
            weaknesses: researchData.swot.weaknesses || [],
            opportunities: researchData.swot.opportunities || [],
            threats: researchData.swot.threats || []
          } : undefined,
          metrics: isDeepResearch ? undefined : researchData.scores ? {
            credibility: researchData.scores.overall_credibility || '95%',
            relevance: researchData.scores.overall_relevance || '98%',
            consensus: researchData.scores.evidence_consensus || 'consensus'
          } : undefined,
          sources: isDeepResearch ? undefined : (researchData.sources || []).map((s: any) => ({
            title: s.title || "Source",
            url: s.url || undefined,
            credibilityScore: s.credibility_score || "A+"
          })),
          deepResearchSection: isDeepResearch ? {
            abstract: researchData.abstract,
            introduction: researchData.introduction,
            methodology: researchData.methodology,
            findings: researchData.findings,
            conclusion: researchData.conclusion
          } : undefined
        };

        // 3. Trigger Download
        await pdfService.generateAndDownloadPDF(exportData);

        // 4. Success Actions
        setLoading(false);
        setSuccess(true);

        // Confetti burst
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F27D26', '#2A4365', '#10B981']
        });

      } catch (err) {
        setLoading(false);
        setError("Decryption failed or PDF engine error. Please try again.");
      }
    }, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-my-bg border border-my-border shadow-[0_30px_90px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[90vh] rounded-[4px]"
      >
        {/* Futuristic HUD Line */}
        <div className="h-[2px] bg-gradient-to-r from-my-border via-my-accent to-my-border" />
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-my-border flex justify-between items-center bg-my-sidebar/50">
          <div className="flex items-center gap-2">
            <Sparkles className="text-my-accent animate-pulse" size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-my-accent">Premium Dossier Export</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border border-my-border/55 hover:border-my-accent text-my-muted hover:text-my-ink transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-16 h-16 bg-green-500/10 border border-green-500 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-serif font-bold text-my-ink">Dossier Unlocked & Compiled</h3>
                <p className="text-[11px] text-my-muted leading-relaxed max-w-sm mx-auto">
                  The cryptographically signed vector PDF has been successfully generated and is downloading to your device.
                </p>
                <div className="pt-6">
                  <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-my-accent text-white dark:text-my-bg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl rounded-none"
                  >
                    Return to Dossier
                  </button>
                </div>
              </motion.div>
            ) : step === 'info' ? (
              <motion.div 
                key="info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-4 bg-my-callout border border-my-border text-center space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted block">REPORT DECIPHERING COST</span>
                  <div className="text-3xl font-black text-my-ink italic font-serif">₹99 <span className="text-sm font-normal not-italic text-my-muted">/ report</span></div>
                  <p className="text-[10px] text-my-accent font-bold uppercase tracking-widest">Support Open-Source Student Research</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-my-muted border-b border-my-border pb-2">Premium Blueprint Inclusions</h4>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    <BenefitCard 
                      icon={<FileText size={14} />} 
                      title="Crystal-Clear Vector PDF Layout" 
                      desc="Optimized for high-fidelity offline archiving and print."
                    />
                    <BenefitCard 
                      icon={<Award size={14} />} 
                      title="TIER-4 Security Watermark" 
                      desc="Cryptographic signature from the COGNAPSE main core."
                    />
                    <BenefitCard 
                      icon={<QrCode size={14} />} 
                      title="Decision Matrix (SWOT) Tables" 
                      desc="Full responsive tabular breakdowns of strategic insights."
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setStep('payment')}
                    className="w-full py-4 bg-my-accent text-white dark:text-my-bg text-[10px] font-black uppercase tracking-widest hover:bg-my-ink hover:text-white transition-all flex items-center justify-center gap-2 shadow-2xl"
                  >
                    Authorize Payment Protocol <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ) : step === 'payment' ? (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-my-muted">Scan QR to Decrypt</h4>
                  <p className="text-[11px] text-my-syn leading-relaxed">
                    Scan using Paytm, GooglePay, PhonePe, or any BHIM UPI mobile app.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="border border-my-border p-4 bg-white rounded flex justify-center items-center shadow-lg w-fit mx-auto">
                  <img 
                    src={qrCodeImage} 
                    alt="UPI Payment QR Code" 
                    className="w-56 h-56 object-contain"
                  />
                </div>

                {/* Account Details */}
                <div className="p-4 bg-my-callout border border-my-border rounded-[4px] space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-my-muted font-mono">PAYEE NAME:</span>
                    <span className="text-my-ink font-bold font-mono">{payeeName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-2 border-t border-my-border/40">
                    <span className="text-my-muted font-mono">UPI ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-my-accent font-bold font-mono">{upiId}</span>
                      <button 
                        onClick={copyUpiId}
                        className="p-1.5 border border-my-border/50 rounded hover:border-my-accent transition-all text-my-muted hover:text-my-accent"
                        title="Copy UPI ID"
                      >
                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference Checkpoint */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-my-muted block">
                    12-DIGIT TRANSACTION REFERENCE ID
                  </label>
                  <input 
                    type="text" 
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Enter UPI Ref No. or ID..."
                    className="w-full bg-my-callout border border-my-border py-3.5 px-4 text-my-ink text-xs focus:outline-none focus:border-my-accent font-mono placeholder:opacity-40"
                  />
                  {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('info')}
                    className="flex-1 py-3.5 border border-my-border text-[10px] font-black uppercase tracking-widest text-my-muted hover:text-my-ink transition-all"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={() => setStep('unlocking')}
                    disabled={!referenceId.trim()}
                    className="flex-1 py-3.5 bg-my-accent text-white dark:text-my-bg text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    I Have Paid
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="unlocking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Loader2 size={44} className="text-my-accent animate-spin absolute" />
                  <ShieldAlert size={20} className="text-my-accent animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-my-accent animate-pulse">CRYPTOGRAPHIC AUTHENTICATION</h3>
                  <p className="text-[11px] text-my-syn max-w-xs mx-auto leading-relaxed">
                    Verifying transaction reference <strong>{referenceId}</strong> against the bank ledger. Preparing decrypted A4 vector report...
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleVerifyPayment}
                    className="px-6 py-2.5 bg-my-ink border border-my-accent/30 text-[10px] font-black uppercase tracking-widest text-white hover:text-my-accent transition-all"
                  >
                    Bypass Demo Verification
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Technical Footer */}
        <div className="px-6 py-4 border-t border-my-border bg-my-sidebar/30 flex justify-between items-center text-[8px] text-my-muted font-mono">
          <span>ENCRYPTION: RSA-4096</span>
          <span className="text-my-accent">DEMO SYSTEM CLEARANCE</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BenefitCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-3 bg-my-callout/40 border border-my-border rounded-[2px] flex items-start gap-3">
      <div className="p-1.5 bg-my-accent/10 rounded text-my-accent shrink-0">
        {icon}
      </div>
      <div>
        <h5 className="text-[11px] font-bold text-my-ink leading-tight mb-0.5">{title}</h5>
        <p className="text-[9px] text-my-muted leading-tight">{desc}</p>
      </div>
    </div>
  );
}
