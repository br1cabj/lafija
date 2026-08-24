import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Note, NoteDraft } from '../types/note';
import { useAuth } from './AuthContext';
import { canSyncToCloud } from '../services/supabase';
import { fetchRemoteNotes, syncNotesToCloud } from '../services/notesRepo';

interface NotesContextType {
  notes: Note[];
  addNote: (draft: NoteDraft) => void;
  updateNote: (id: string, draft: NoteDraft) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = 'lafija_notes_v1';

function readStoredNotes(): Note[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage bloqueado (p.ej. Safari privado): se ignora.
  }
}

export const NotesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(readStoredNotes);

  // Persist to localStorage
  useEffect(() => {
    writeStoredNotes(notes);
  }, [notes]);

  // Mirror ref so handlers always read fresh state
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // ---- Supabase cloud sync ----
  const cloudUserId =
    user && !user.isGuest && canSyncToCloud() ? user.id : null;

  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const syncReady = Boolean(cloudUserId) && syncedUserId === cloudUserId;

  useEffect(() => {
    if (!cloudUserId) return;
    let cancelled = false;
    fetchRemoteNotes(cloudUserId).then((remoteNotes) => {
      if (cancelled) return;
      if (remoteNotes.length > 0) {
        setNotes(remoteNotes);
      } else {
        // First login: seed the cloud account with local data.
        syncNotesToCloud(cloudUserId, notesRef.current).catch(() => {});
      }
      setSyncedUserId(cloudUserId);
    });
    return () => {
      cancelled = true;
    };
  }, [cloudUserId]);

  // Debounced push of every local change while signed in.
  useEffect(() => {
    if (!cloudUserId || !syncReady) return;
    const timer = setTimeout(() => {
      syncNotesToCloud(cloudUserId, notes).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [notes, cloudUserId, syncReady]);

  const makeNote = (id: string, draft: NoteDraft, createdAt: string): Note => ({
    id,
    title: draft.title.trim() || 'Nota sin título',
    content: draft.content,
    pinned: false,
    createdAt,
    updatedAt: createdAt,
  });

  const addNote = (draft: NoteDraft) => {
    const now = new Date().toISOString();
    const newNote = makeNote(`note-${Date.now()}`, draft, now);
    setNotes((prev) => [newNote, ...prev]);
  };

  const updateNote = (id: string, draft: NoteDraft) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              title: draft.title.trim() || note.title,
              content: draft.content,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    );
  };

  const deleteNote = (id: string) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  const togglePin = (id: string) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    );

  return (
    <NotesContext.Provider
      value={{ notes, addNote, updateNote, deleteNote, togglePin }}
    >
      {children}
    </NotesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
