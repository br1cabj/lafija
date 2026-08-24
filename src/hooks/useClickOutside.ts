import { useEffect, type RefObject } from 'react';

/** Cierra dropdowns/menús al hacer click (o touch) fuera del elemento. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const handle = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };

    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [ref, onOutside, enabled]);
}
