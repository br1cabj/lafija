# Plan: Auditoría completa LA FIJA — limpieza y refactor aprobado (todo)

## Fase 1 — Serverless sin copy-paste
1. **`api/_lib.ts` (NUEVO)**: extraer de results.ts/sports.ts lo idéntico:
   - Guardián de cuota: `DAILY_QUOTA_LIMIT`, reset diario, `canCallApiFootball()`, `consumeQuota(label)`
   - `sendJson(res, status, data)`
   - Method guard (`405`)
   - `fetchJson(url, opts)` con User-Agent y manejo de errores
2. Ambos endpoints importan de `./_lib`. Comportamiento EXACTO (mismo orden de cuota, mismos logs `[api/results]`/`[api/sports]` pasando label).

## Fase 2 — Un único tipo de stats
3. `api/results.ts` elimina su `interface PartialStats` y hace `import type { LiveFixtureStats } from '../src/services/sportsApi'`
   - Import SOLO de tipos: se borra en transpile → sin riesgo de bundle en Vercel
   - Verificar que `npm run build` (tsc -b con tsconfig.node incluyendo api/) resuelve bien
   - Ajustar campos opcionales si hay diferencias mínimas (cards home/away ya alineadas)

## Fase 3 — Dead code + keys estables
4. Eliminar `needsStats()` de liveSync.ts; el test usa `b.conditions.some(conditionNeedsStats)`
5. AddBetModal: filas de condición con **key estable**: los drafts llevan `rowKey: number` (contador de módulo, igual que grupos); `key={c.rowKey}` en la lista y en el preview del paso 3

## Fase 4 — Split AddBetModal (1105 líneas)
Carpeta `src/components/addbet/`:
- `AddBetModal.tsx`: shell del wizard + TODO el estado y handlers (fuente única de verdad)
- `StepMatch.tsx`: paso ① (presentacional, recibe props/callbacks)
- `StepSelections.tsx`: paso ② (chips, presets, tarjetas de condición)
- `StepStake.tsx`: paso ③ (casa, stake/cuota/equivalencias, preview)
- Barra de progreso: componente interno compartido en el mismo archivo del shell o `WizardProgress.tsx`

## Fase 5 — Split BetCard (944 líneas)
Carpeta `src/components/betcard/`:
- `SuspendDialog.tsx` (con editor de cuotas reales y preview de liquidación)
- `SwapPlayerDialog.tsx`
- `ConditionRow.tsx` (la fila de condición con controles +/- y Super Sub)
- `BetCard.tsx` queda como shell de la tarjeta (header, partidos extra, strip financiero, menú)

Reglas de los splits: movimientos MECÁNICOS (mismo JSX/mismo estado via props), cero cambios visuales, cero cambios de lógica. Si algo empieza a necesitar lógica nueva, no va en esta pasada.

## Fase 6 — QA
- `npm test` (75 tests deben seguir verdes; ajustar solo el import de needsStats→conditionNeedsStats)
- `npm run build` + `npm run lint`
- Deploy `npx vercel --prod --yes` + smoke: crear combinada multi-partido de prueba, verificar tarjeta con ambos partidos, wizard completo
- Commit + push: `refactor: lib compartida serverless, tipos unicos de stats, splits de modales`

## Riesgos
- Serverless: cambiar cuota/guards puede romper producción → revisar diff línea a línea antes de deploy; smoke del endpoint /api/results tras deploy
- Splits UI: regresión visual posible → comparar build de dev antes/después
