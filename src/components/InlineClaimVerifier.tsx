import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import type { COGNAPSE_Output } from '../types';

interface VerifiedClaim {
  text: string;
  cleanText: string;
  citations: number[];
  premise: string | null;
  label: 'entailment' | 'neutral' | 'contradiction' | 'orphan' | 'pending';
  score: number;
  isOrphan: boolean;
  paragraphIndex: number;
  sentenceIndex: number;
}

// ─── Inline Citation Chip ───────────────────────────────────────────────
function CitationChip({ id }: { id: number }) {
  return (
    <span className="inline-flex items-center text-[9px] font-black text-my-muted bg-my-callout border border-my-border px-1 py-0.5 rounded-sm mx-0.5 align-middle cursor-pointer hover:border-my-accent hover:text-my-accent transition-colors" title={`Source [${id}]`}>
      [{id}]
    </span>
  );
}

export interface NliSummary {
  total: number;
  verified: number;
  neutral: number;
  contradicted: number;
  alignmentScore: number; // 0-100
}

export default function InlineClaimVerifier({
  report,
  triggered = true,
  onVerificationComplete
}: {
  report: COGNAPSE_Output;
  triggered?: boolean;
  onVerificationComplete?: (summary: NliSummary) => void;
}) {
  const synthesis = report.summary?.full_synthesis || '';
  const sources = Array.isArray(report.sources) ? report.sources : [];

  const [claimsData, setClaimsData] = useState<VerifiedClaim[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  const paragraphs = useMemo(() => {
    return synthesis.split('\n');
  }, [synthesis]);

  useEffect(() => {
    if (!synthesis || !triggered) return;
    
    const baseClaims: VerifiedClaim[] = [];
    paragraphs.forEach((p, pIdx) => {
      const sentences = p.replace(/([.!?])\s+/g, '$1|SPLIT|').split('|SPLIT|').filter(s => s.trim().length > 0);
      
      sentences.forEach((sentence, sIdx) => {
        const matches = [...sentence.matchAll(/\[(\d+)\]/g)];
        const citationIds = [...new Set(matches.map(m => parseInt(m[1])))];
        
        let premise = null;
        let isOrphan = false;

        if (citationIds.length > 0 && sources.length > 0) {
          // Use specific cited sources
          const citedSources = sources.filter(s => citationIds.includes(s.id));
          premise = citedSources.map(s => s.summary || s.key_finding || s.title).join(' ');
        } else if (sources.length > 0) {
          // Fallback: AI forgot to cite inline. Use all available sources as the premise.
          premise = sources.map(s => s.summary || s.key_finding || s.title).join(' ');
        } else {
          // No sources available at all in this report
          isOrphan = true;
        }

        // IMPORTANT: BERT models have a strict 512 token limit. 
        // We must truncate the premise to avoid a catastrophic WebAssembly memory crash.
        if (premise && premise.length > 1200) {
           premise = premise.substring(0, 1200) + "...";
        }

        baseClaims.push({
          text: sentence,
          cleanText: sentence.replace(/\[\d+\]/g, '').trim(),
          citations: citationIds,
          premise,
          label: isOrphan ? 'orphan' : 'pending',
          score: 0,
          isOrphan,
          paragraphIndex: pIdx,
          sentenceIndex: sIdx
        });
      });
    });

    setClaimsData(baseClaims);

    // Filter out orphan claims or very short sentences. They don't go to the neural network.
    const claimsToAnalyze = baseClaims.filter(c => !c.isOrphan && c.cleanText.length > 25 && c.premise);
    
    if (claimsToAnalyze.length > 0) {
      setIsAnalyzing(true);
      const worker = new Worker(new URL('../workers/nliWorker.ts', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        if (e.data.status === 'progress') {
           if (e.data.data && e.data.data.status === 'downloading') {
              setDownloadProgress(`Downloading Neural Weights... ${Math.round((e.data.data.loaded / e.data.data.total) * 100)}%`);
           } else if (e.data.data && e.data.data.status === 'init') {
              setDownloadProgress('Initializing NLI Network...');
           } else {
              setDownloadProgress('Verifying Facts (NLI)...');
           }
        } else if (e.data.status === 'complete') {
          const dlResults = e.data.results;
          setClaimsData(prev => {
            const updated = prev.map(claim => {
              const dl = dlResults.find((r: any) => r.hypothesis === claim.cleanText);
              if (dl) return { ...claim, label: dl.label, score: dl.score };
              return claim;
            });

            // Compute and fire summary to parent
            if (onVerificationComplete) {
              const analyzed = updated.filter(c => !c.isOrphan && c.label !== 'pending');
              // label_0=contradiction, label_1=entailment, label_2=neutral
              const verified = analyzed.filter(c => c.label === 'entailment' || c.label === 'label_1').length;
              const neutral = analyzed.filter(c => c.label === 'neutral' || c.label === 'label_2').length;
              const contradicted = analyzed.filter(c => c.label === 'contradiction' || c.label === 'label_0').length;
              const total = analyzed.length;
              // Penalty-based score: only contradictions lower the score.
              // "Not mentioned" is neutral — the source is just silent on it, not wrong.
              // Score = 100% minus a proportional deduction for each mismatch.
              const alignmentScore = total > 0
                ? Math.max(0, Math.round(100 - (contradicted / total) * 100))
                : 100;
              onVerificationComplete({ total, verified, neutral, contradicted, alignmentScore });
            }

            return updated;
          });
          setIsAnalyzing(false);
          setDownloadProgress('');
          worker.terminate();
        } else if (e.data.status === 'error') {
          console.error("DL Worker Error", e.data.error);
          setDownloadProgress(`Error: ${e.data.error}`);
          setTimeout(() => setIsAnalyzing(false), 3000);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        console.error("Worker catastrophic error:", err);
        setDownloadProgress('Failed to load neural network. (Check console)');
        setTimeout(() => setIsAnalyzing(false), 3000);
        worker.terminate();
      };

      // Send [{premise, hypothesis}] pairs
      const pairs = claimsToAnalyze.map(c => ({
        premise: c.premise,
        hypothesis: c.cleanText
      }));

      worker.postMessage({ id: 'verify', pairs });
      return () => worker.terminate();
    }
  }, [synthesis, sources, paragraphs, triggered, onVerificationComplete]);

  return (
    <div className="relative">
      {isAnalyzing && (
        <div className="absolute -top-6 right-0 flex items-center gap-2 text-[10px] text-my-accent animate-pulse font-black uppercase tracking-widest bg-my-accent/10 px-2 py-1 rounded border border-my-accent/20">
          <div className="w-1.5 h-1.5 rounded-full bg-my-accent" /> {downloadProgress || 'NLI Verification Active'}
        </div>
      )}
      
      <div className="leading-relaxed text-[14px] text-my-syn">
        {paragraphs.map((pText, pIdx) => {
          if (!pText.trim()) return <br key={pIdx} />;

          const pClaims = claimsData.filter(c => c.paragraphIndex === pIdx);
          
          return (
            <p key={pIdx} className="mb-4">
              {pClaims.map(claim => {
                let styling = '';
                let tooltip = '';

                // Handle orphan / very short claims without waiting for worker
                if (claim.isOrphan) {
                  styling = 'border-b border-dashed border-red-500/50 hover:bg-red-500/10 cursor-help transition-colors';
                  tooltip = 'Unverified: This sentence has no cited source data.';
                } else if (!isAnalyzing) {
                  const lbl = claim.label.toLowerCase();
                  // label_0 = CONTRADICTION, label_1 = ENTAILMENT, label_2 = NEUTRAL
                  if (lbl === 'contradiction' || lbl === 'label_0') {
                    styling = 'border-b border-dashed border-red-500/70 hover:bg-red-500/10 cursor-help transition-colors';
                    tooltip = `⚠️ This sentence may not match what the source said. Worth double-checking.`;
                  } else if (lbl === 'neutral' || lbl === 'label_2') {
                    styling = 'border-b border-dashed border-yellow-500/60 hover:bg-yellow-500/10 cursor-help transition-colors';
                    tooltip = `ℹ️ The source doesn't specifically mention this. It may still be correct, but it isn't directly backed by the cited reference.`;
                  } else if (lbl === 'entailment' || lbl === 'label_1') {
                    styling = 'border-b border-dashed border-green-500/30 hover:bg-green-500/10 cursor-help transition-colors';
                    tooltip = `✅ This sentence matches what the source says.`;
                  }
                }

                const parts = claim.text.split(/(\[\d+\])/g);

                return (
                  <span 
                    key={claim.sentenceIndex} 
                    className={clsx('relative group mr-1', styling)}
                    title={tooltip || undefined}
                  >
                    {parts.map((part, i) => {
                      const match = part.match(/^\[(\d+)\]$/);
                      if (match) {
                        return <CitationChip key={i} id={parseInt(match[1])} />;
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
