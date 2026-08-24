export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Datos que edita el formulario de notas (sin timestamps ni id). */
export type NoteDraft = Pick<Note, 'title' | 'content'>;
