/** Bus de toasts sin React: usable desde contextos, servicios o handlers. */

type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return items;
}

function dismiss(id: number): void {
  items = items.filter((t) => t.id !== id);
  notify();
}

function push(kind: ToastKind, msg: string): void {
  const item: ToastItem = { id: ++seq, kind, msg };
  // Máximo 3 visibles: los viejos salen solos
  items = [...items.slice(-2), item];
  notify();
  setTimeout(() => dismiss(item.id), 3500);
}

export const toast = {
  success: (msg: string) => push('success', msg),
  error: (msg: string) => push('error', msg),
  info: (msg: string) => push('info', msg),
};
