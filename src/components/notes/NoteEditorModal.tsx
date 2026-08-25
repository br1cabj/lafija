import React, { useState } from 'react';
import type { Note, NoteDraft } from '../../types/note';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface NoteEditorModalProps {
  /** null = nueva nota */
  note: Note | null;
  isOpen: boolean;
  onSave: (draft: NoteDraft) => void;
  onClose: () => void;
}

/** Plantillas de arranque: estructura lista, el usuario completa. */
const TEMPLATES: { label: string; title: string; content: string }[] = [
  {
    label: 'Estrategia',
    title: 'Estrategia: ',
    content:
      'Objetivo:\n\nReglas:\n- \n- \n\nGestión de stake:\n',
  },
  {
    label: 'Lección',
    title: 'Lección aprendida',
    content: 'Qué pasó:\n\nQué hice mal:\n\nPara la próxima:\n',
  },
  {
    label: 'Reseña de apuesta',
    title: 'Reseña: ',
    content: 'Apuesta:\n\nCuota y stake:\n\nResultado:\n\nAnálisis:\n',
  },
];

const MAX_NOTE_LENGTH = 20_000;

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  isOpen,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');

  const canSave = Boolean(title.trim() || content.trim());

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({ title, content });
    onClose();
  };

  // ⌘/Ctrl + Enter guarda sin salir del teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={note ? 'Editar nota' : 'Nueva nota'}
      maxWidthClass='max-w-lg'
    >
      <h2 className='text-base font-semibold tracking-tight text-white mb-4'>
        {note ? 'Editar nota' : 'Nueva nota'}
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        onKeyDown={handleKeyDown}
        className='space-y-3'
      >
        {/* Plantillas solo al crear: arranque sin página en blanco */}
        {!note && (
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-[11px] text-slate-500'>Plantilla:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type='button'
                onClick={() => {
                  setTitle(t.title);
                  setContent(t.content);
                }}
                className='rounded-full border border-white/10 bg-panel px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white'
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div>
          <label
            htmlFor='note-title'
            className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'
          >
            Título
          </label>
          <input
            id='note-title'
            type='text'
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Opcional, pero ayuda a encontrarla después'
            autoFocus={!note}
            className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
          />
        </div>

        <div>
          <label
            htmlFor='note-content'
            className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'
          >
            Contenido
          </label>
          <textarea
            id='note-content'
            required
            rows={8}
            maxLength={MAX_NOTE_LENGTH}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='Escribí libremente…'
            className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none resize-y leading-relaxed'
          />
          <div className='mt-1 flex items-center justify-between text-[10px] text-slate-500'>
            <span>⌘/Ctrl + Enter para guardar</span>
            <span
              className={
                content.length > MAX_NOTE_LENGTH * 0.9
                  ? 'text-amber-400'
                  : undefined
              }
            >
              {content.length.toLocaleString('es-AR')} /{' '}
              {(MAX_NOTE_LENGTH / 1000).toFixed(0)}k caracteres
            </span>
          </div>
        </div>

        <div className='flex items-center justify-end gap-3 pt-4 border-t border-white/10'>
          <Button variant='ghost' className='text-slate-400' onClick={onClose}>
            Cancelar
          </Button>
          <Button variant='primary' type='submit' disabled={!canSave}>
            {note ? 'Guardar cambios' : 'Crear nota'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
