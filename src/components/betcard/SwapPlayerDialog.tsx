import React from 'react';
import type { BetCondition } from '../../types/bet';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SwapPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  condition: BetCondition | null;
  swapText: string;
  onSwapTextChange: (value: string) => void;
  onConfirm: (newName: string) => void;
}

/** Diálogo Super Sub: el suplente que entró hereda la línea. */
export const SwapPlayerDialog: React.FC<SwapPlayerDialogProps> = ({
  isOpen,
  onClose,
  condition,
  swapText,
  onSwapTextChange,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel='Super Sub: cambio de jugador'
      maxWidthClass='max-w-md'
    >
      <h2 className='mb-1 text-sm font-semibold text-white'>
        Super Sub — cambio de jugador
      </h2>
      <p className='mb-4 text-xs text-slate-400'>
        El suplente que entró hereda la línea con la misma cuota. Editá el
        nombre en la selección.
      </p>
      {condition?.supersubFrom && (
        <p className='mb-3 rounded-md border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs text-slate-400'>
          Heredó de:{' '}
          <span className='text-slate-500 line-through decoration-slate-600'>
            {condition.supersubFrom}
          </span>{' '}
          <span className='font-semibold text-cyan-300'>➜ suplente</span>
        </p>
      )}
      <label className='mb-1 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
        Selección con el suplente
      </label>
      <input
        type='text'
        value={swapText}
        onChange={(e) => onSwapTextChange(e.target.value)}
        autoFocus
        className='w-full rounded-md border border-white/10 bg-base px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none'
      />
      <div className='mt-5 flex justify-end gap-2 border-t border-white/10 pt-4'>
        <Button variant='ghost' onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant='primary'
          disabled={!swapText.trim() || swapText.trim() === condition?.selection}
          onClick={() => {
            if (swapText.trim()) onConfirm(swapText.trim());
          }}
        >
          Confirmar cambio
        </Button>
      </div>
    </Modal>
  );
};
