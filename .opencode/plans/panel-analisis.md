# Plan: Panel de Análisis profesional (vista propia)

## Decisión de arquitectura
Nueva vista completa `analytics` (como Notas), NO un modal. Reemplaza al
AnalyticsModal actual (una sola superficie de análisis, sin duplicados).

## 1. Navegación
- `AppView = 'dashboard' | 'notes' | 'analytics'`
- Header: icono BarChart2 abre la vista (ya existía como botón)
- MobileNav: tab Métricas → onChangeView('analytics')
- Borrar `AnalyticsModal.tsx`, su lazy import y estados asociados

## 2. `src/components/analytics/AnalyticsPage.tsx` (nueva)
Layout profesional en secciones:
- **Cabecera**: título + chips de período (7D · 30D · 90D · Todo) + botón Export CSV
- **KPIs del período**: P&L · ROI · Win rate · Apostado · Apuestas resueltas
- **Gráfico de bankroll** (SVG propio, SIN dependencias):
  - Curva de ganancia acumulada sobre apuestas resueltas del período
  - Área sutil bajo la curva, línea de cero, etiquetas min/max/último valor
  - Colores semánticos: verde si termina arriba del inicio, rojo si abajo
- **Breakdowns** (3 bloques, barras horizontales proporcionales):
  - Por casa de apuestas (`bookmaker`)
  - Por tipo de boleta (Simple / Parlay / Bet Builder)
  - Por liga (`league`)
  - Cada fila: nombre · n apuestas · apostado · P&L · ROI% coloreado
- Estados vacíos: mensaje si no hay apuestas resueltas en el período

## 3. `src/utils/csv.ts` (nuevo)
`exportBetsCsv(bets)`: genera y descarga `lafija-apuestas.csv`
(fecha, título, deporte, liga, casa, tipo, stake, cuota, estado, retorno, ganancia)
con BOM UTF-8 para Excel.

## 4. Utilidad compartida
`computeSettled(bets, days)` helper para filtrar resueltas por período
(WON/LOST/CASHOUT cuentan; VOID es neutro).

## 5. QA
npm test/build/lint + deploy prod + smoke visual de la nueva vista +
commit/push `feat(analytics): panel completo en vista propia con grafico y csv`

Sin dependencias nuevas. Sin cambios de modelo de datos.
