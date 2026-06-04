import React, { useState } from 'react';
import { Button } from './ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { X, Shield, Download, CheckCircle2, AlertCircle, FileText, Zap, Award, Chrome, Check } from 'lucide-react';
import { toast } from '../utils/toast';
import confetti from 'canvas-confetti';
import { dbService } from '../services/dbService';
import { apiFetch } from '../services/apiClient';
import { ensurePaymentAuth } from '../services/authSession';

interface PremiumExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  researchId: string;
  query: string;
  onUnlockSuccess: () => void;
}

export default function PremiumExportModal({ isOpen, onClose, researchId, query: researchQuery, onUnlockSuccess }: PremiumExportModalProps) {
  const { user, setUser, setAuthOpen } = useStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [step, setStep] = useState<'info' | 'success'>('info');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isPreviewDeploy =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.vercel.app') &&
    window.location.hostname !== 'cognapse.vercel.app';

  const planDetails = {
    monthly: {
      amount: 9900, // paise
      priceStr: 'INR 99.00',
      label: 'Monthly Pass',
      billing: 'Billed monthly'
    },
    yearly: {
      amount: 79900, // paise
      priceStr: 'INR 799.00',
      label: 'Annual Pass',
      billing: 'Billed annually • Save 33%'
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const finish = () => resolve(!!(window as any).Razorpay);
      let script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = finish;
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
        return;
      }

      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(finish, 4000);
    });
  };

  const handleStartPayment = async () => {
    if (!user) {
      onClose();
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    const plan = planDetails[selectedPlan];

    if (isPreviewDeploy) {
      toast.info('Payments only work on the production site. Open cognapse.vercel.app, sign in, then try again.');
      setLoading(false);
      return;
    }

    const authReady = await ensurePaymentAuth(user);
    if (!authReady.ok) {
      toast.error('message' in authReady ? authReady.message : 'Please sign in again before paying.');
      setLoading(false);
      return;
    }
    
    try {
      // 1. Create order on backend (with sandbox mode fallback)
      let orderResponse;
      let orderData;
      let isLocalFallback = false;

      try {
        orderResponse = await apiFetch('/api/create-order', {
          method: 'POST',
          body: JSON.stringify({ plan: selectedPlan }),
        });

        if (!orderResponse.ok) {
          const errBody = await orderResponse.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Payment server error (${orderResponse.status})`
          );
        }
        orderData = await orderResponse.json();
      } catch (fetchErr) {
        if (import.meta.env.DEV) {
          console.warn('Backend payment unavailable. Developer sandbox only runs in local dev.', fetchErr);
          isLocalFallback = true;
        } else {
          throw fetchErr;
        }
      }

      if (isLocalFallback && import.meta.env.DEV) {
        // Developer Sandbox Mode simulation
        setTimeout(async () => {
          try {
            // Activate Premium via dbService (which will fall back to local storage seamlessly)
            const premiumData = {
              premium: true,
              premiumPlan: selectedPlan,
              premiumActivatedAt: new Date().toISOString(),
              premiumExpiresAt: selectedPlan === 'yearly'
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };
            
            await dbService.activatePremium(user.id, selectedPlan);
            
            setUser({
              ...user,
              ...premiumData
            });

            handleConfirmPayment();
          } catch (e) {
            console.error('Sandbox Local Activation Error:', e);
            toast.error('Failed to simulate premium activation.');
            setLoading(false);
          }
        }, 1500);
        return;
      }

      // 2. Load Razorpay script
      const res = await loadRazorpayScript();
      
      if (!res) {
        toast.error('Razorpay SDK failed to load. Please disable your adblocker or check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Configure and open Razorpay (key from server so it always matches the order)
      const razorpayKey =
        orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey || !String(razorpayKey).startsWith('rzp_')) {
        toast.error('Payments are not configured. Please contact support.');
        setLoading(false);
        return;
      }

      const options = {
        key: razorpayKey, 
        amount: orderData.amount.toString(), 
        currency: orderData.currency,
        name: 'COGNAPSE',
        description: `COGNAPSE Premium ${plan.label}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            // 4. Verify signature on backend
            const verifyResponse = await apiFetch('/api/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                plan: selectedPlan
              })
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success && verifyData.premiumData) {
              await dbService.activatePremium(user.id, selectedPlan);

              // Update in-memory user store
              setUser({
                ...user,
                ...verifyData.premiumData
              });
              handleConfirmPayment();
            } else {
              toast.error('Payment verification failed. Please contact support.');
              setLoading(false);
            }
          } catch (err) {
            console.error('Verification Error:', err);
            toast.error('Payment verification failed.');
            setLoading(false);
          }
        },
        prefill: {
          name: user.username || 'COGNAPSE Analyst',
          email: `${user.username.toLowerCase()}@cognapse.vault`,
        },
        theme: {
          color: '#F27D26', /* Razorpay brand — keep literal */
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
      paymentObject.open();
    } catch (error) {
      console.error('Payment Error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to initialize payment.';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setLoading(true);
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F27D26', '#10B981', '#FFFFFF']
      });
      setLoading(false);
      setStep('success');
    }, 1000);
  };

  const handleDownloadAndClose = () => {
    onUnlockSuccess();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#0A0F1A] border border-my-border shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="h-1 w-full bg-gradient-to-r from-my-accent via-my-signal to-my-accent" />

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-my-muted hover:text-my-ink transition-colors z-50"
          >
            <X size={18} />
          </button>

          <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
            {step === 'info' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-my-accent/10 rounded-full flex items-center justify-center text-my-accent mb-4">
                    <Award size={24} />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-my-ink italic">COGNAPSE Premium Required</h2>
                  <p className="text-xs text-my-muted uppercase tracking-widest mt-1">Unlock Advanced Research Tools</p>
                </div>

                {isPreviewDeploy && (
                  <div className="p-3 bg-my-signal/10 border border-my-signal/30 text-[10px] text-my-ink leading-relaxed rounded-[2px]">
                    <strong>Preview deploy detected.</strong> Payments only work on{' '}
                    <a
                      href="https://cognapse.vercel.app"
                      className="text-my-accent font-bold underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      cognapse.vercel.app
                    </a>
                    . Open that link, sign in, then activate premium.
                  </div>
                )}

                {/* Premium Benefits List */}
                <div className="border border-my-border bg-my-callout dark:bg-black/30 p-4 rounded-md space-y-4">
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Unlimited PDF Exports</h4>
                      <p className="text-[10px] text-my-ink/80 leading-relaxed">Download unlimited beautifully formatted, academically rigorous reports ready for archiving or sharing.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <Chrome size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Chrome Research Extension</h4>
                      <p className="text-[10px] text-my-ink/80 leading-relaxed">Bring the COGNAPSE research engine directly to any web page. Instantly analyze and cross-reference information.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <Shield size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Priority Computing & Model Routing</h4>
                      <p className="text-[10px] text-my-ink/80 leading-relaxed">Experience faster research speeds with prioritized server queues and premium AI processing.</p>
                    </div>
                  </div>
                </div>

                {/* Authentication Banner */}
                {!user && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 ds-text-danger">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Authentication Required</span>
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => {
                        onClose();
                        setAuthOpen(true);
                      }}
                      className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider !bg-red-500 !text-white hover:!bg-red-600 !border-red-500/30"
                    >
                      Login / Register
                    </Button>
                  </div>
                )}

                {/* Plan Selector */}
                {user && (
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => setSelectedPlan('monthly')}
                      className={`p-4 border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'monthly' 
                          ? 'border-my-accent bg-my-accent/5 shadow-md' 
                          : 'border-my-border hover:border-my-accent/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-my-ink uppercase tracking-wider">Monthly Pass</span>
                          {selectedPlan === 'monthly' && <Check size={12} className="text-my-accent" />}
                        </div>
                        <span className="text-xs text-my-ink/70 block mt-1">Billed monthly</span>
                      </div>
                      <span className="text-base font-serif font-bold text-my-ink italic mt-4 block">INR 99.00</span>
                    </div>

                    <div 
                      onClick={() => setSelectedPlan('yearly')}
                      className={`p-4 border cursor-pointer relative transition-all flex flex-col justify-between ${
                        selectedPlan === 'yearly' 
                          ? 'border-my-accent bg-my-accent/5 shadow-md' 
                          : 'border-my-border hover:border-my-accent/50'
                      }`}
                    >
                      <div className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-my-accent text-white dark:text-black text-[7px] font-black uppercase tracking-wider">
                        Save 33%
                      </div>
                      <div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-bold text-my-ink uppercase tracking-wider">Annual Pass</span>
                          {selectedPlan === 'yearly' && <Check size={12} className="text-my-accent" />}
                        </div>
                        <span className="text-xs text-my-ink/70 block mt-1">Billed annually</span>
                      </div>
                      <span className="text-base font-serif font-bold text-my-ink italic mt-4 block">INR 799.00</span>
                    </div>
                  </div>
                )}

                {/* Price Display and Trigger Button */}
                <div className="bg-my-accent/5 border border-my-accent/20 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="text-center md:text-left">
                    <span className="text-[10px] font-bold text-my-ink/70 uppercase tracking-widest block">
                      {user ? planDetails[selectedPlan].billing : 'Starting At'}
                    </span>
                    <span className="text-[16px] font-serif font-bold text-my-ink italic">
                      {user ? planDetails[selectedPlan].priceStr : 'INR 99.00'}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleStartPayment}
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-2.5 text-[10px] hover:scale-105 shadow-lg"
                  >
                    {loading ? "Connecting..." : user ? "Activate Premium" : "Authenticate to Unlock"}
                  </Button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-6 py-2">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center ds-text-success mb-3 border border-green-500/20 animate-pulse">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-my-ink italic">COGNAPSE Premium Activated</h3>
                    <p className="text-[8px] ds-text-success uppercase tracking-widest font-black mt-0.5">All Core Utility Features Unlocked</p>
                  </div>
                </div>

                {/* Chrome Extension Layman Installation Card */}
                <div className="border border-my-border bg-my-callout dark:bg-black/30 p-4 rounded-md space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-my-border pb-2">
                    <div className="flex items-center gap-2 text-my-accent">
                      <Chrome size={16} />
                      <h4 className="text-[11px] font-black uppercase tracking-wider">Chrome Research Extension</h4>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-green-500/15 ds-text-success border border-green-500/30 font-black uppercase tracking-widest">
                      100% Free Setup
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-my-ink/80 leading-relaxed">
                    Bring the COGNAPSE AI Research Swarm directly to any webpage. Follow these simple steps to install the extension for free:
                  </p>

                  {/* Step-by-Step Onboarding */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-4 h-4 bg-my-accent text-white dark:text-black rounded-full text-[9px] font-bold shrink-0">1</span>
                      <p className="text-[10px] text-my-ink leading-normal">
                        <strong>Download extension zip</strong> by clicking the yellow button below and extract (unzip) it on your computer.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-4 h-4 bg-my-accent text-white dark:text-black rounded-full text-[9px] font-bold shrink-0">2</span>
                      <p className="text-[10px] text-my-ink leading-normal">
                        Open Google Chrome, navigate to <code className="bg-my-callout dark:bg-black border border-my-border px-1.5 py-0.5 text-my-accent font-mono text-[9px] rounded-sm font-bold">chrome://extensions/</code>, and enable <strong>Developer mode</strong> (top-right corner).
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-4 h-4 bg-my-accent text-white dark:text-black rounded-full text-[9px] font-bold shrink-0">3</span>
                      <p className="text-[10px] text-my-ink leading-normal">
                        Click the <strong>Load unpacked</strong> button (top-left corner), and select the unzipped <code className="bg-my-callout dark:bg-black border border-my-border px-1.5 py-0.5 text-my-ink font-mono text-[9px] rounded-sm font-bold">extension</code> folder.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-4 h-4 bg-my-accent text-white dark:text-black rounded-full text-[9px] font-bold shrink-0">4</span>
                      <p className="text-[10px] text-my-ink leading-normal">
                        Click the puzzle piece icon (🧩) in Chrome, pin <strong>COGNAPSE Strategic Analyst</strong>, highlight any webpage text, right-click, and select <strong>"Analyze with COGNAPSE"</strong>!
                      </p>
                    </div>
                  </div>

                  {/* Primary Call to Action: ZIP Download */}
                  <a 
                    href="/cognapse-extension.zip" 
                    download="cognapse-extension.zip"
                    className="w-full py-3 bg-my-accent text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:scale-[101%] transition-all shadow-md flex items-center justify-center gap-2 rounded-sm border border-transparent text-center block"
                  >
                    <Download size={12} /> Download Extension Package (ZIP)
                  </a>
                </div>                  <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleDownloadAndClose}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white dark:text-white text-[10px] hover:scale-[102%] shadow-lg border-0"
                    icon={<Download size={14} />}
                  >
                    Download PDF Dossier
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Close Setup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
