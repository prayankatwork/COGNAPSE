/**
 * Toast notification system for COGNAPSE.
 * A lightweight, self-contained toast manager.
 * Usage: import { toast } from '../utils/toast';
 *        toast.show('Message', 'success' | 'error' | 'info');
 */

import { audioSystem } from '../services/audioService';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

function remove(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

/**
 * Safely convert a value to a string for display.
 * Prevents [object Object] rendering errors.
 */
function safeString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.message;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

export const toast = {
  show(message: unknown, type: ToastType = 'info', duration = 4000) {
    const id = nextId++;
    toasts = [...toasts, { id, message: safeString(message), type }];
    notify();
    setTimeout(() => remove(id), duration);

    // Play corresponding notification sound
    const event = type === 'success' ? 'notification-success'
      : type === 'error' ? 'notification-error'
      : 'notification-info';
    audioSystem.play(event);
  },

  success(message: unknown) {
    this.show(message, 'success');
  },

  error(message: unknown) {
    this.show(message, 'error', 6000);
  },

  info(message: unknown) {
    this.show(message, 'info');
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
