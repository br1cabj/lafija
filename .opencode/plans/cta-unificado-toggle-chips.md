# Plan: Un solo CTA + toggle-chips visibles (aprobado)

## 1. Nuevo componente `src/components/ui/ToggleChip.tsx`
Chip-checkbox con estado visible:
- Props: `label`, `icon`, `checked`, `onChange`, `activeClass?` (tono semántico)
- `role='checkbox'` / `aria-checked`, ✓ (Check icon) cuando activo
- Activo: borde/texto del tono pasado + bg suave; inactivo: neutro gris
- Compacto: `text-xs px-2.5 py-1 rounded-full border` (mismo lenguaje que los tabs de filtro)

## 2. Fila del contador → barra de controles (`App.tsx`)
Reemplazar el botón ghost "+ Nueva apuesta" por los 3 chips:
- `Datos reales` ← `isRealMode/toggleRealMode` (activo = verde)
- `Simulador` ← `isSimulating/toggleSimulation` (activo = naranja marca;
  exclusión mutua ya vive en el contexto)
- `Sonido` ← `isMuted/handleToggleSound` de sounds (activo = neutro claro)
Layout: `flex items-center justify-between` — contador izquierda, chips derecha,
`flex-wrap` para móviles chicos.

## 3. Header: menú Ajustes fuera, navegación directa
- Quitar dropdown Ajustes completo (SettingsItem incluido si no se usa en otro lado)
- Agregar dos IconButtons permanentes (solo desktop `hidden md:inline-flex`,
  móvil ya tiene tabs): Diario (NotebookPen) y Estadísticas (BarChart2),
  con aria-label y title
- Sonido: queda SOLO como chip del feed (un solo control, un lugar)
- Limpiar imports muertos resultantes

## 4. CTA único
- Borrar el botón ghost "Nueva apuesta" del feed (App.tsx) — quedan FAB (móvil)
  y Header primary (siempre visible)

## 5. QA
- npm test (75) · build · lint · deploy prod · commit/push
- Verificar manualmente: chips reflejan estado real tras reload (persistencia),
  exclusión mutua simulador/datos reales, header sin overflow en ~1024px

Sin cambios de lógica de negocio ni persistencia nueva.
