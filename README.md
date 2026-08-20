# ⚡ LA FIJA // Live Sports Bet Tracker (Esports-Inspired)

![LA FIJA](https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80)

> **LA FIJA** es una aplicación web progresiva (PWA) de seguimiento de apuestas deportivas en vivo con estética **FACEIT (Dark Esports)**. Permite desglosar apuestas simples, combinadas y *Bet Builders* condición por condición (córners, remates al arco, goles, tarjetas) con cálculo dinámico de Cashout, soporte multiformato de cuotas y exportación de boletos oficiales en alta resolución para redes sociales.

---

## 🚀 Características Principales

- **🎮 Estética Esports / FACEIT:** Tema oscuro de alto contraste (`#0E1017` + `#FF5500`), tipografías tabulares legibles y HUD de estadísticas.
- **📋 Live Condition Breaker:** Seguimiento tramo a tramo de combinadas y Bet Builders (ej. `3/3 goles`, `2/2 remates`, `7/9 córners`).
- **🇦🇷 Casas de Apuestas Integradas:** Selector táctil con las casas autorizadas en Argentina (*Betsson, Betano, Bet365, Codere, bplay, Jugadon, Casino BA*) e internacionales (*Stake, 1xBet, Pinnacle, Betfair*).
- **🧮 Motor Multiformato de Cuotas:** Conversión y visualización instantánea en **Decimal (`2.50`)**, **Americana (`+150`)**, **Fraccional (`3/2`)** y **Probabilidad Implícita (`40%`)**.
- **📸 Exportador de Boletos Oficiales (Canvas 2D):** Genera imágenes PNG en alta definición (2x Retina) listas para compartir o guardar en la galería sin deformaciones ni esquinas blancas.
- **🔊 Motor de Audio & Vibración Háptica:** Sintetizador Web Audio API con alertas sonoras para condiciones cumplidas (`HIT!`), fanfarria de victoria y advertencias de peligro en minutos finales (*Clutch*).
- **🔐 Autenticación Flexible:** Login y registro con Email y Contraseña, y Modo Invitado con cliente Supabase integrado.
- **📱 PWA Móvil Instalable:** Soporte completo para instalar como app nativa a pantalla completa en iOS y Android.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`).
- **Iconografía & Gráficos:** Lucide React, HTML5 2D Canvas Renderer, Canvas Confetti.
- **Audio & Hápticos:** Web Audio API nativo + Mobile Vibration API.
- **Backend & Auth (Opcional):** `@supabase/supabase-js` (PostgreSQL + Auth + WebSockets).
- **Datos Deportivos:** Conector listo para *API-Football* (`src/services/sportsApi.ts`).

---

## 💻 Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/br1cabj/lafija.git
cd lafija

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo en red local
npm run dev -- --host
```

---

## 🌐 Configuración de Variables de Entorno (Opcional)

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
# Supabase Authentication
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# API-Football (Live Match Data)
VITE_SPORTS_API_KEY=tu-api-key
```

---

## 📄 Licencia

MIT License © 2026 LA FIJA Team.
