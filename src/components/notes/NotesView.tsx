import React, { useMemo, useState } from 'react';
import type { Note, NoteDraft } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { NoteCard } from './NoteCard';
import { NoteEditorModal } from './NoteEditorModal';
import { ConfirmDialog } from '../ui/Dialogs';
import { NotebookPen, Plus, Search } from 'lucide-react';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useNotes();

  const [searchQuery, setSearchQuery] = useState('');
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    note: Note | null;
  }>({ isOpen: false, note: null });
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Pinned first, then most recently updated
  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [notes],
  );

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return sortedNotes;
    const query = searchQuery.toLowerCase();
    return sortedNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query),
    );
  }, [sortedNotes, searchQuery]);

  const handleSave = (draft: NoteDraft) => {
    if (editorState.note) {
      updateNote(editorState.note.id, draft);
    } else {
      addNote(draft);
    }
  };

  return (
    <div className='space-y-3'>
      {/* Search + New note */}
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
          <input
            type='search'
            aria-label='Buscar notas'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Buscar en tus notas...'
            className='w-full bg-surface border border-white/5 focus:border-brand pl-8 pr-3 py-1.5 rounded text-xs text-white placeholder-slate-500 focus:outline-none'
          />
        </div>
        <button
          onClick={() => setEditorState({ isOpen: true, note: null })}
          className='flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase px-3 py-2 rounded shadow active:scale-95 transition-all shrink-0'
        >
          <Plus className='w-4 h-4' />
          <span>Nueva Nota</span>
        </button>
      </div>

      {/* Count */}
      {notes.length > 0 && (
        <span className='text-xs font-mono text-slate-400'>
          {filteredNotes.length}{' '}
          {filteredNotes.length === 1 ? 'nota' : 'notas'}
        </span>
      )}

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div className='bg-surface border border-dashed border-white/10 rounded-lg p-8 text-center'>
          <div className='w-10 h-10 rounded-full bg-orange-500/10 text-brand flex items-center justify-center mx-auto mb-2.5'>
            <NotebookPen className='w-5 h-5' />
          </div>
          <h3 className='text-sm font-bold text-white mb-1'>
            Tu diario está vacío
          </h3>
          <p className='text-xs text-slate-400 mb-3 max-w-xs mx-auto'>
            Anota estrategias, reflexiones post-partido o lecciones aprendidas
            para mejorar como tipster.
          </p>
          <button
            onClick={() => setEditorState({ isOpen: true, note: null })}
            className='px-3.5 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase rounded shadow'
          >
            + Crear Primera Nota
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className='bg-surface border border-dashed border-white/10 rounded-lg p-8 text-center'>
          <p className='text-xs text-slate-400'>
            Sin resultados para "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n) => setEditorState({ isOpen: true, note: n })}
              onDelete={(n) => setNoteToDelete(n)}
            />
          ))}
        </div>
      )}

      {/* Editor - mounted fresh on every open */}
      {editorState.isOpen && (
        <NoteEditorModal
          isOpen
          note={editorState.note}
          onSave={handleSave}
          onClose={() => setEditorState({ isOpen: false, note: null })}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        title='Eliminar nota'
        message={
          noteToDelete
            ? `¿Seguro que quieres eliminar "${noteToDelete.title}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel='Eliminar'
        destructive
        onConfirm={() => {
          if (noteToDelete) deleteNote(noteToDelete.id);
        }}
      />
    </div>
  );
};
