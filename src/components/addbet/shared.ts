import type { BetCondition } from '../../types/bet';

/** Fila en blanco para empezar a cargar condiciones desde cero. */
export const EMPTY_CONDITION: Omit<BetCondition, 'id'> = {
  market: '',
  selection: '',
  targetValue: 1,
  currentValue: 0,
  progress: 0,
  status: 'PENDING',
  isLock: false,
};

/** Borrador de condición con key estable para React (se descarta al guardar). */
export type ConditionDraft = Omit<BetCondition, 'id'> & { rowKey: number };

/**
 * Grupo de condiciones que comparten un mismo partido. En builders
 * multi-partido cada grupo declara sus equipos para el tracking exacto.
 */
export interface ConditionGroup {
  key: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  conditions: ConditionDraft[];
}

let groupKeySeq = 1;
let rowKeySeq = 1;

export const newDraft = (): ConditionDraft => ({
  ...EMPTY_CONDITION,
  rowKey: rowKeySeq++,
});

export const newGroup = (): ConditionGroup => ({
  key: groupKeySeq++,
  homeTeam: '',
  awayTeam: '',
  conditions: [newDraft()],
});
