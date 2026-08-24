import React from 'react';
import type { Note } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { Pin, PinOff, Pencil, Trash2 } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
}) => {
  const { togglePin } = useNotes();

  return (
    <div
      className={`bg-surface rounded-lg p-3.5 border transition-all flex flex-col ${
        note.pinned
          ? 'border-brand/60 shadow-md shadow-orange-950/40'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Card header */}
      <div className='flex items-start justify-between gap-2 mb-1.5'>
        <h3 className='text-sm font-bold text-white tracking-tight leading-snug break-words'>
          {note.title}
        </h3>
        <div className='flex items-center gap-0.5 shrink-0'>
          <button
            onClick={() => togglePin(note.id)}
            aria-label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
            aria-pressed={note.pinned}
            className={`p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors ${
              note.pinned ? 'text-brand' : 'text-slate-400 hover:text-white'
            }`}
          >
            {note.pinned ? (
              <Pin className='w-3.5 h-3.5 fill-current' />
            ) : (
              <PinOff className='w-3.5 h-3.5' />
            )}
          </button>
          <button
            onClick={() => onEdit(note)}
            aria-label={`Editar nota ${note.title}`}
            className='p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors'
          >
            <Pencil className='w-3.5 h-3.5' />
          </button>
          <button
            onClick={() => onDelete(note)}
            aria-label={`Eliminar nota ${note.title}`}
            className='p-1.5 rounded bg-white/5 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors'
          >
            <Trash2 className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>

      {/* Content */}
      <p className='text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words flex-1'>
        {note.content}
      </p>

      {/* Footer meta */}
      <div className='mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500'>
        <span>Creada {formatDate(note.createdAt)}</span>
        {note.updatedAt !== note.createdAt && (
          <span>Editada {formatDate(note.updatedAt)}</span>
        )}
      </div>
    </div>
  );
};
