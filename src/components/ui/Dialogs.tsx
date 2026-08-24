import React, { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onClose,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} ariaLabel={title} maxWidthClass='max-w-sm'>
    <div className='flex items-start gap-3'>
      <div
        className={`p-2 rounded shrink-0 ${
          destructive
            ? 'bg-red-950/60 text-red-400'
            : 'bg-orange-500/20 text-brand'
        }`}
      >
        <AlertTriangle className='w-5 h-5' />
      </div>
      <div className='min-w-0'>
        <h2 className='text-sm font-bold text-white uppercase tracking-wider font-mono'>
          {title}
        </h2>
        <p className='text-xs text-slate-400 mt-1'>{message}</p>
      </div>
    </div>

    <div className='flex justify-end gap-2 mt-5 pt-4 border-t border-white/10'>
      <button
        onClick={onClose}
        className='px-4 py-1.5 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white transition-colors'
      >
        {cancelLabel}
      </button>
      <button
        onClick={() => {
          onConfirm();
          onClose();
        }}
        autoFocus
        className={`px-4 py-1.5 rounded text-xs font-bold uppercase text-white shadow active:scale-95 transition-all ${
          destructive
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-brand hover:bg-brand-hover'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue: string;
  submitLabel?: string;
  /** Devuelve un mensaje de error si el valor es inválido, o null si es válido. */
  validate?: (value: string) => string | null;
  onSubmit: (value: number) => void;
  onClose: () => void;
}

/** Contenido interno: se monta fresco en cada apertura (Modal desmonta al cerrar). */
const NumberInputForm: React.FC<{
  title: string;
  label: string;
  initialValue: string;
  submitLabel: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: number) => void;
  onClose: () => void;
}> = ({ title, label, initialValue, submitLabel, validate, onSubmit, onClose }) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        inputRef.current?.focus();
        return;
      }
    }
    onSubmit(parseFloat(value.replace(',', '.')));
    onClose();
  };

  return (
    <>
      <h2 className='text-sm font-bold text-white uppercase tracking-wider font-mono mb-4'>
        {title}
      </h2>
      <form onSubmit={handleSubmit}>
        <label className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'>
          {label}
        </label>
        <input
          ref={inputRef}
          type='number'
          step='0.01'
          min='0'
          required
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(error)}
          className={`w-full bg-base border rounded px-3 py-2 text-sm text-white font-mono-numbers font-bold focus:outline-none ${
            error ? 'border-red-500/60' : 'border-white/10 focus:border-brand'
          }`}
        />
        {error && <p className='mt-1.5 text-[11px] text-red-400'>{error}</p>}

        <div className='flex justify-end gap-2 mt-5 pt-4 border-t border-white/10'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white transition-colors'
          >
            Cancelar
          </button>
          <button
            type='submit'
            className='px-4 py-1.5 rounded bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase shadow active:scale-95 transition-all'
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </>
  );
};

export const NumberInputDialog: React.FC<InputDialogProps> = ({
  submitLabel = 'Guardar',
  ...props
}) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} ariaLabel={props.title} maxWidthClass='max-w-sm'>
    {props.isOpen && <NumberInputForm {...props} submitLabel={submitLabel} />}
  </Modal>
);
