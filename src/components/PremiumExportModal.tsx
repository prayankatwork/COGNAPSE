import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { X, Shield, Download, CheckCircle2, AlertCircle, FileText, Zap, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PremiumExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  researchId: string;
  query: string;
  onUnlockSuccess: () => void;
}

export default function PremiumExportModal({ isOpen, onClose, researchId, query: researchQuery, onUnlockSuccess }: PremiumExportModalProps) {
  const { unlockReport, addExport, user, currentReport, deepResearch } = useStore();
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
    setLoading(true);
    
    try {
      // 1. Create order on backend
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 2900 }) // Amount in paise
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }
      
      const orderData = await orderResponse.json();

      // 2. Load Razorpay script
      const res = await loadRazorpayScript();
      
      if (!res) {
        alert('Razorpay SDK failed to load. Please disable your adblocker or check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Configure and open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SqrBlXoXysz16A', 
        amount: orderData.amount.toString(), 
        currency: orderData.currency,
        name: 'COGNAPSE',
        description: 'Premium Intelligence Dossier Export',
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
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
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
          name: user?.name || 'COGNAPSE Analyst',
          email: 'analyst@cognapse.core',
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

  const handleConfirmPayment = async () => {
    setLoading(true);
    // Simulate slight verification delay for premium feel
    setTimeout(async () => {
      unlockReport(researchId);
      
      // Fire premium feedback success!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F27D26', '#10B981', '#FFFFFF']
      });

      // Save to Firebase exports history
      if (user) {
        await addExport({
          id: Math.random().toString(36).substring(7),
          userId: user.id,
          researchId: researchId,
          exportType: deepResearch.thesis ? 'deep' : 'normal',
          aiProvider: currentReport?.provider || 'gemini',
          query: researchQuery,
          timestamp: new Date().toISOString()
        });
      }

      setLoading(false);
      setStep('success');
    }, 1500);
  };

  const handleDownloadAndClose = () => {
    onUnlockSuccess();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          className="relative w-full max-w-lg bg-my-bg border border-my-border shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top border glow line */}
          <div className="h-1 w-full bg-gradient-to-r from-my-accent via-amber-500 to-my-accent" />

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-my-muted hover:text-my-ink transition-colors z-50"
          >
            <X size={18} />
          </button>

          {/* Main Container */}
          <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
            {step === 'info' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-my-accent/10 rounded-full flex items-center justify-center text-my-accent mb-4">
                    <Award size={24} />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-my-ink italic">Upgrade to Intelligence Dossier</h2>
                  <p className="text-xs text-my-muted uppercase tracking-widest mt-1">Unlock Premium PDF Export</p>
                </div>

                <div className="border border-my-border bg-my-callout/40 p-4 rounded-md space-y-3">
                  <div className="flex gap-3">
                    <Shield size={16} className="text-my-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Futuristic Dark Theme</h4>
                      <p className="text-[10px] text-my-muted">Beautifully tailored SaaS-style template formatted for print and screens.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <FileText size={16} className="text-my-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Full Research Synthesis</h4>
                      <p className="text-[10px] text-my-muted">Includes complete Deep Analysis, consensus scores, SWOT grids, and references.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Zap size={16} className="text-my-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Credentials & Verification</h4>
                      <p className="text-[10px] text-my-muted">AES-256 secure verification signature block, timestamps, and AI metadata.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-my-accent/5 border border-my-accent/20 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest block">Premium License Code</span>
                    <span className="text-[16px] font-serif font-bold text-my-ink italic">INR 29.00 <span className="text-xs font-sans text-my-muted not-italic">/ single synthesis</span></span>
                  </div>
                  <button 
                    onClick={handleStartPayment}
                    disabled={loading}
                    className="px-6 py-2.5 bg-my-accent text-white dark:text-my-bg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                  >
                    {loading ? "Connecting to Razorpay..." : "Pay with Razorpay"}
                  </button>
                </div>
              </div>
            )}

            {/* Payment step is now handled by Razorpay overlay, but we keep this empty or remove it. I'll remove it entirely. */}

            {step === 'success' && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-4 border border-green-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-my-ink italic">Protocol Authorized</h3>
                  <p className="text-[9px] text-green-500 uppercase tracking-widest font-black mt-1">Premium PDF Token Unlocked Successfully</p>
                </div>

                <p className="text-[10px] text-my-muted leading-relaxed max-w-sm mx-auto">
                  Your payment has been successfully recorded in Firestore telemetry. The secure PDF packaging tool is compiled and ready to compile your strategic report.
                </p>

                <button 
                  onClick={handleDownloadAndClose}
                  className="w-full py-4 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[102%] transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  <Download size={14} /> Download Secure PDF Report
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
