/** Tipos internos compartidos entre los pasos del wizard. */
import type { BetCondition } from '../../types/bet';

export type ConditionField = keyof Pick<
  BetCondition,
  'market' | 'selection' | 'currentValue' | 'targetValue' | 'odds'
>;
