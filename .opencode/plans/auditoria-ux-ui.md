# Plan: Auditoría UX/UI completa — implementación total (aprobado)

## Fase 1 — Confianza y seguridad del usuario (críticos)
1. **ConfirmDialog al eliminar apuesta** (`BetCard.tsx:297`): estado `confirmDelete`
   + `ui/Dialogs.ConfirmDialog` ("¿Eliminar esta apuesta? No se puede deshacer").
2. **Sistema de toasts liviano** (nuevo `src/components/ui/Toasts.tsx` + hook en
   BetContext o contexto propio):
   - `toast.success/error/info(msg)` — stack abajo-arriba (arriba de MobileNav,
     respetando safe-area), auto-dismiss 3s, aria-live="polite", sin deps nuevas.
   - Wire: guardar apuesta ✅, cashout ✅, anular ℹ️, error de sync ❌ (con
     reintentar), copiar/compartir boleto ✅/❌.
3. **Confirmación en "Anular"** del menú de tarjeta (mismo ConfirmDialog).
4. **Spinner global para Suspense** (nuevo `ui/PageLoader.tsx`, fallback centrado
   con animate-pulse) — reemplaza los `fallback={null}` de App.tsx.

## Fase 2 — Consistencia visual
5. **Wizard → ui/Button**: los 3 footers de navegación (StepMatch/StepSelections/
   StepStake) migran a `<Button variant>`; botón primario usa variant primary.
6. **Formato monetario unificado**: nuevo helper `formatMoney(n, symbol)` en
   utils/odds.ts usando toLocaleString('es-AR'); aplicar en BetCard strip,
   FilterBar, SuspendDialog preview, StepStake retorno.
7. **Empty state de búsqueda**: si `searchQuery` no vacío y 0 resultados →
   "Sin resultados para «X»" + botón "Limpiar búsqueda" (limpia searchQuery).
8. **MobileNav simplificado**: quitar tab Simulador (queda solo en Header →
   Ajustes); 4 tabs + FAB.

## Fase 3 — Pulido fino
9. **TeamInput keyboard nav**: flechas ↑↓ mueven índice activo, Enter selecciona,
   Escape cierra; `role="listbox"/"option"`, `aria-expanded`, `aria-activedescendant`.
10. **Contrastes**: hints informativos `text-slate-600` → `text-slate-400`;
    revisar text-[9px] críticos → mínimo 10px.
11. **Transición del wizard**: contenedor con key={step} + animación CSS simple
    (fade/slide-in 150ms, keyframes nuevos en index.css).
12. **Menú de tarjeta**: role="menu"/menuitem, cierre con Escape.

## Fase 4 — QA
- npm test (75 verdes) · build · lint
- Deploy prod + smoke manual de flujos: crear combinada multi-partido, eliminar
  (con confirmación), toasts visibles, búsqueda con "limpiar"
- Commit + push: `feat(ux): confirmaciones, toasts, consistencia visual y a11y`

## Fuera de alcance (documentado)
- Light mode (dark-only es decisión de producto válida)
- Animaciones complejas/librerías nuevas (sin deps)
