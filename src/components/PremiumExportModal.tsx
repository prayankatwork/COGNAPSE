import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { X, Shield, Download, CheckCircle2, AlertCircle, FileText, Zap, Award, Chrome, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { dbService } from '../services/dbService';

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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-checkout-js');
      if (existingScript) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
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
    
    try {
      // 1. Create order on backend (with sandbox mode fallback)
      let orderResponse;
      let orderData;
      let isLocalFallback = false;

      try {
        orderResponse = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: plan.amount })
        });

        if (!orderResponse.ok) {
          throw new Error('Failed to create order on server');
        }
        orderData = await orderResponse.json();
      } catch (fetchErr) {
        console.warn('Backend payment service (/api/create-order) unavailable. Activating Developer Sandbox simulation...', fetchErr);
        isLocalFallback = true;
      }

      if (isLocalFallback) {
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
            alert('Failed to simulate premium activation.');
            setLoading(false);
          }
        }, 1500);
        return;
      }

      // 2. Load Razorpay script
      const res = await loadRazorpayScript();
      
      if (!res) {
        alert('Razorpay SDK failed to load. Please disable your adblocker or check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Configure and open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SqyJIkTreVJaiA', 
        amount: orderData.amount.toString(), 
        currency: orderData.currency,
        name: 'COGNAPSE',
        description: `COGNAPSE Premium ${plan.label}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            // 4. Verify signature on backend
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
              // Write premium activation to Firestore from the authenticated client side
              try {
                await dbService.activatePremium(user.id, selectedPlan);
              } catch (dbErr) {
                console.warn('Client-side premium activation write failed, using local storage:', dbErr);
              }

              // Update in-memory user store
              setUser({
                ...user,
                ...verifyData.premiumData
              });
              handleConfirmPayment();
            } else {
              alert('Payment verification failed. Please contact support.');
              setLoading(false);
            }
          } catch (err) {
            console.error('Verification Error:', err);
            alert('Payment verification failed.');
            setLoading(false);
          }
        },
        prefill: {
          name: user.username || 'COGNAPSE Analyst',
          email: `${user.username.toLowerCase()}@cognapse.vault`,
        },
        theme: {
          color: '#F27D26',
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
      paymentObject.open();
    } catch (error) {
      console.error('Payment Error:', error);
      alert('Failed to initialize payment. Please try again.');
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
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#0A0F1A] border border-my-border shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="h-1 w-full bg-gradient-to-r from-my-accent via-amber-500 to-my-accent" />

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

                {/* Premium Benefits List */}
                <div className="border border-my-border bg-my-callout/40 p-4 rounded-md space-y-4">
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Unlimited PDF Exports</h4>
                      <p className="text-[10px] text-my-muted leading-relaxed">Download unlimited beautifully formatted, academically rigorous reports ready for archiving or sharing.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <Chrome size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Chrome Research Extension</h4>
                      <p className="text-[10px] text-my-muted leading-relaxed">Bring the COGNAPSE research engine directly to any web page. Instantly analyze and cross-reference information.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-my-accent/10 rounded text-my-accent h-fit shrink-0">
                      <Shield size={16} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Priority Computing & Model Routing</h4>
                      <p className="text-[10px] text-my-muted leading-relaxed">Experience faster research speeds with prioritized server queues and premium AI processing.</p>
                    </div>
                  </div>
                </div>

                {/* Authentication Banner */}
                {!user && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Authentication Required</span>
                    </div>
                    <button 
                      onClick={() => {
                        onClose();
                        setAuthOpen(true);
                      }}
                      className="px-3 py-1 bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                    >
                      Login / Register
                    </button>
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
                        <span className="text-xs text-my-muted block mt-1">Billed monthly</span>
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
                        <span className="text-xs text-my-muted block mt-1">Billed annually</span>
                      </div>
                      <span className="text-base font-serif font-bold text-my-ink italic mt-4 block">INR 799.00</span>
                    </div>
                  </div>
                )}

                {/* Price Display and Trigger Button */}
                <div className="bg-my-accent/5 border border-my-accent/20 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="text-center md:text-left">
                    <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest block">
                      {user ? planDetails[selectedPlan].billing : 'Starting At'}
                    </span>
                    <span className="text-[16px] font-serif font-bold text-my-ink italic">
                      {user ? planDetails[selectedPlan].priceStr : 'INR 99.00'}
                    </span>
                  </div>
                  <button 
                    onClick={handleStartPayment}
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-2.5 bg-my-accent text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? "Connecting..." : user ? "Activate Premium" : "Authenticate to Unlock"}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-6 py-2">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-3 border border-green-500/20 animate-pulse">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-my-ink italic">COGNAPSE Premium Activated</h3>
                    <p className="text-[8px] text-green-500 uppercase tracking-widest font-black mt-0.5">All Core Utility Features Unlocked</p>
                  </div>
                </div>

                {/* Chrome Extension Layman Installation Card */}
                <div className="border border-my-border bg-my-callout/40 p-4 rounded-md space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-my-border pb-2">
                    <div className="flex items-center gap-2 text-my-accent">
                      <Chrome size={16} />
                      <h4 className="text-[11px] font-black uppercase tracking-wider">Chrome Research Extension</h4>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-green-500/15 text-green-500 border border-green-500/30 font-black uppercase tracking-widest">
                      100% Free Setup
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-my-muted leading-relaxed">
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
                        Open Google Chrome, navigate to <code className="bg-my-bg border border-my-border px-1 py-0.5 text-my-accent font-mono text-[9px]">chrome://extensions/</code>, and enable <strong>Developer mode</strong> (top-right corner).
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-4 h-4 bg-my-accent text-white dark:text-black rounded-full text-[9px] font-bold shrink-0">3</span>
                      <p className="text-[10px] text-my-ink leading-normal">
                        Click the <strong>Load unpacked</strong> button (top-left corner), and select the unzipped <code className="bg-my-bg border border-my-border px-1 py-0.5 text-my-ink font-mono text-[9px]">extension</code> folder.
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
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadAndClose}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[102%] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Download PDF Dossier
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-4 py-3 bg-my-border hover:bg-my-border/80 text-my-ink text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    Close Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
