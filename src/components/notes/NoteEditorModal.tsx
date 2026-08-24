import React, { useState } from 'react';
import type { Note, NoteDraft } from '../../types/note';
import { Modal } from '../ui/Modal';

interface NoteEditorModalProps {
  /** null = nueva nota */
  note: Note | null;
  isOpen: boolean;
  onSave: (draft: NoteDraft) => void;
  onClose: () => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  isOpen,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    onSave({ title, content });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={note ? 'Editar nota' : 'Nueva nota'}
      maxWidthClass='max-w-lg'
    >
      <h2 className='text-lg font-bold text-white uppercase tracking-wider font-mono mb-4'>
        {note ? 'Editar Nota' : 'Nueva Nota'}
      </h2>

      <form onSubmit={handleSubmit} className='space-y-3'>
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none resize-y leading-relaxed'
          />
        </div>

        <div className='flex items-center justify-end gap-3 pt-4 border-t border-white/10'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white transition-colors'
          >
            Cancelar
          </button>
          <button
            type='submit'
            className='px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center gap-1.5'
          >
            {note ? 'Guardar Cambios' : 'Crear Nota'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
