import React from 'react';
import type { Note } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { Copy, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { toast } from '../../utils/toastBus';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

/** Fecha relativa corta: "recién", "hace 25 min", "Ayer 21:04", "12 mar". */
function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const days = Math.round(diffMin / 1440);
  const time = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (days === 1) return `Ayer ${time}`;
  if (days < 7) return `hace ${days} días`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/** Umbral de corte: más que esto se muestra colapsado con "Ver más". */
const CLAMP_LENGTH = 320;

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
}) => {
  const { togglePin } = useNotes();
  const [expanded, setExpanded] = React.useState(false);
  const isLong = note.content.length > CLAMP_LENGTH;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${note.title}\n\n${note.content}`,
      );
      toast.success('Nota copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div
      className={`bg-surface rounded-lg p-3.5 border transition-all flex flex-col ${
        note.pinned
          ? 'border-brand/50 shadow-sm shadow-black/20'
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
            onClick={handleCopy}
            aria-label={`Copiar nota ${note.title}`}
            title='Copiar nota'
            className='p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors'
          >
            <Copy className='w-3.5 h-3.5' />
          </button>
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
      <p
        className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words flex-1 ${
          isLong && !expanded ? 'line-clamp-5' : ''
        }`}
      >
        {note.content}
      </p>
      {isLong && (
        <button
          type='button'
          onClick={() => setExpanded((prev) => !prev)}
          className='mt-1 self-start text-[11px] font-semibold text-brand/90 hover:text-brand'
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}

      {/* Footer meta */}
      <div
        className='mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500'
        title={`Creada ${new Date(note.createdAt).toLocaleString('es-AR')}`}
      >
        <span>{formatRelative(note.updatedAt)}</span>
        {note.updatedAt !== note.createdAt && <span>editada</span>}
      </div>
    </div>
  );
};
