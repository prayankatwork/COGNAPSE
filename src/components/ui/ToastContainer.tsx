import { useEffect, useState } from 'react';
import { toast } from '../../utils/toast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const icons = {
  success: <CheckCircle size={14} className="text-emerald-500 shrink-0" />,
  error: <AlertCircle size={14} className="text-red-500 shrink-0" />,
  info: <Info size={14} className="text-blue-500 shrink-0" />,
};

const styles = {
  success: 'border-emerald-500/20 bg-emerald-500/5',
  error: 'border-red-500/20 bg-red-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
};

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = toast.subscribe((toasts) => setItems(toasts));
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 md:right-6 left-4 md:left-auto z-[100] flex flex-col gap-2 max-w-sm md:max-w-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 px-4 py-3 border ${styles[item.type]} bg-my-bg shadow-xl text-my-ink text-[12px] leading-relaxed animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-forwards`}
        >
          {icons[item.type]}
          <span className="flex-1">{item.message}</span>
        </div>
      ))}
    </div>
  );
}
