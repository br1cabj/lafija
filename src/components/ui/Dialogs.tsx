import React, { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

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
        <h2 className='text-sm font-semibold text-white'>{title}</h2>
        <p className='mt-1 text-xs text-slate-400'>{message}</p>
      </div>
    </div>

    <div className='mt-5 flex justify-end gap-2 border-t border-white/10 pt-4'>
      <Button variant='ghost' onClick={onClose}>
        {cancelLabel}
      </Button>
      <Button
        variant={destructive ? 'danger' : 'primary'}
        autoFocus
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </Button>
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
      <h2 className='mb-4 text-sm font-semibold text-white'>{title}</h2>
      <form onSubmit={handleSubmit}>
        <label className='mb-1 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
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
          className={`font-mono-numbers w-full rounded-md border bg-base px-3 py-2 text-sm font-bold text-white transition-colors focus:outline-none ${
            error ? 'border-red-500/60' : 'border-white/10 focus:border-brand'
          }`}
        />
        {error && <p className='mt-1.5 text-[11px] text-red-400'>{error}</p>}

        <div className='mt-5 flex justify-end gap-2 border-t border-white/10 pt-4'>
          <Button variant='ghost' type='button' onClick={onClose}>
            Cancelar
          </Button>
          <Button variant='primary' type='submit'>
            {submitLabel}
          </Button>
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
