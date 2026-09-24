/* ===== GRITEX – Grunddesign ===== */
:root {
  --bg: #07090D;
  --panel: #11151C;
  --panel-2: #181D27;
  --accent: #8067FF;
  --text: #F5F7FB;
  --muted: #858D9C;
  --green: #45E0A3;
  --line: rgba(255, 255, 255, 0.07);
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  overflow-x: hidden;
}

button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; padding: 0; }

.app {
  max-width: 680px;
  margin: 0 auto;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 100px);
}

/* ----- Header ----- */
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.logo h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 5px; }
.logo p { margin: 3px 0 0; font-size: 10px; letter-spacing: 3px; color: var(--accent); font-weight: 600; }

.icon-btn {
  width: 44px; height: 44px; border-radius: 14px;
  background: var(--panel); border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
}
svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ----- Ansichten ----- */
.view { display: none; }
.view.active { display: block; animation: fade 0.25s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.eyebrow { margin: 0; font-size: 11px; letter-spacing: 2.5px; color: var(--accent); font-weight: 700; }
.page-title { margin: 4px 0 16px; font-size: 28px; font-weight: 800; }
.hint { color: var(--muted); font-size: 14px; line-height: 1.5; margin: -6px 0 16px; }

.panel {
  background: linear-gradient(180deg, var(--panel-2), var(--panel));
  border: 1px solid var(--line);
  border-radius: 24px;
}

/* ----- Kalender ----- */
.calendar { padding: 14px 10px 12px; }
.month-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.month-title { font-size: 18px; font-weight: 700; }
.nav-btn {
  width: 44px; height: 44px; border-radius: 14px; font-size: 26px; line-height: 1;
  background: rgba(255, 255, 255, 0.05);
}
.nav-btn:active, .icon-btn:active { transform: scale(0.94); }

/* Wochentage und Tage nutzen exakt dasselbe 7-Spalten-Grid */
.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.weekdays span { text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--muted); padding: 6px 0; }

.day {
  min-width: 0; height: 50px; border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: 16px; font-weight: 600;
  border: 1.5px solid transparent;
  transition: background 0.15s ease;
}
.day:active { transform: scale(0.94); }
.day.other { opacity: 0.28; }
.day.today { border-color: var(--accent); color: var(--accent); }
.day.selected { background: var(--accent); color: #fff; border-color: var(--accent); }

.dots { height: 5px; display: flex; gap: 3px; }
.dot { width: 5px; height: 5px; border-radius: 50%; }
.dot-planned { background: var(--accent); }
.dot-done { background: var(--green); }
.dot-rest { background: var(--muted); }
.day.selected .dot-planned { background: #fff; }

/* ----- Tagesübersicht ----- */
.day-label { margin-top: 26px; }
.day-title { margin: 4px 0 14px; font-size: 22px; font-weight: 800; }

.card {
  padding: 20px; border-radius: 22px;
  background: var(--panel); border: 1px solid var(--line);
  animation: fade 0.25s ease;
}
.card.empty { text-align: center; color: var(--muted); }
.card.empty strong { display: block; color: var(--text); font-size: 16px; margin-bottom: 6px; }
.card.empty span { font-size: 14px; line-height: 1.5; }

/* ----- Wochenplan ----- */
.plan-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; margin-bottom: 10px; border-radius: 18px;
  background: var(--panel); border: 1px solid var(--line);
}
.plan-row strong { font-size: 13px; letter-spacing: 2px; }
.plan-row span { font-size: 14px; color: var(--muted); }

/* ----- Einstellungen ----- */
.settings-list { padding: 4px 18px; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
.row:last-child { border-bottom: 0; }
.row em { font-style: normal; font-size: 13px; color: var(--muted); }

/* ----- Bottom Navigation ----- */
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  max-width: 680px; margin: 0 auto;
  display: flex; gap: 6px;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px);
  background: rgba(13, 16, 22, 0.97);
  border-top: 1px solid var(--line);
}
.tab {
  flex: 1; min-height: 56px; border-radius: 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: var(--muted); font-size: 11px; font-weight: 600;
}
.tab:active { transform: scale(0.95); }
.tab.active { color: var(--accent); background: rgba(128, 103, 255, 0.12); }

/* ----- Kleine Bildschirme ----- */
@media (max-width: 360px) {
  .day { height: 44px; font-size: 14px; }
  .page-title { font-size: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
