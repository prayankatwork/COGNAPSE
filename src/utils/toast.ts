/**
 * Toast notification system for COGNAPSE.
 * A lightweight, self-contained toast manager.
 * Usage: import { toast } from '../utils/toast';
 *        toast.show('Message', 'success' | 'error' | 'info');
 */

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

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = nextId++;
    toasts = [...toasts, { id, message, type }];
    notify();
    setTimeout(() => remove(id), duration);
  },

  success(message: string) {
    this.show(message, 'success');
  },

  error(message: string) {
    this.show(message, 'error', 6000);
  },

  info(message: string) {
    this.show(message, 'info');
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
