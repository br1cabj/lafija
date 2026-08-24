import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the dialog */
  ariaLabel: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel, e.g. 'max-w-md' */
  maxWidthClass?: string;
  /** Extra classes for the panel (bg/border overrides) */
  panelClassName?: string;
  hideCloseButton?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal accesible compartido: overlay, cierre con Escape / click fuera,
 * focus trap y restauración de foco, role="dialog" + aria-modal.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
  maxWidthClass = 'max-w-2xl',
  panelClassName,
  hideCloseButton = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus the panel itself so Tab starts cycling inside it
    requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    // Minimal focus trap
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={ariaLabel}
        tabIndex={-1}
        className={clsx(
          'faceit-card border border-white/15 w-full rounded-lg shadow-2xl p-5 md:p-6 my-4 sm:my-8 text-slate-200 outline-none',
          maxWidthClass,
          panelClassName,
        )}
      >
        {!hideCloseButton && (
          <button
            onClick={onClose}
            aria-label='Cerrar'
            className='absolute right-4 top-4 p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
