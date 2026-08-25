# Plan: Fix cajas del mercado + diccionario de mercados

Aprobado por el usuario (opción "CSS + diccionario").

## 1. `src/data/markets.ts` (NUEVO)
Diccionario `KNOWN_MARKETS: readonly string[]` con mercados canónicos que
`detectApiCategory()` trackea sin ambigüedad:
- Goles Totales (goals)
- Córners Totales (corners)
- Tarjetas (cards)
- Tiros al Arco (shotsOnTarget)
- Tiros Totales (shots)
- Faltas (fouls)
- Props de Jugador (manual intencional)
- Resultado Final / Hándicap Asiático / Ambos Anotan (manual)

Comentario de cabecera aclarando: sugiere, no restringe (texto libre).

## 2. `src/components/AddBetModal.tsx`
### CSS fix de las filas de condiciones
- Input **Mercado**: agregar `w-full` (hoy solo `sm:w-1/3`) → caja consistente
  en móvil; al tipear no se rompe la fila.
- Columnas de la fila (`sm:w-1/3` x3): agregar `min-w-0` para que ningún
  contenido desborde el contenedor flex.

### Diccionario con autocompletado nativo
- Import `KNOWN_MARKETS` desde `../data/markets`.
- Renderizar UN `<datalist id='abm-market-options'>` compartido dentro del form.
- Atributo `list='abm-market-options'` en cada input de Mercado.

## 3. QA
- npm run build · npm run lint · npm test (63 tests intactos — sin cambios de lógica).
- Deploy: npx vercel --prod --yes → smoke.
- Commit + push: `fix(ux): layout de condiciones y autocompletado de mercados canonicos`.

Sin cambios en tipos, sanitización ni tracking. detectApiCategory NO se toca.
