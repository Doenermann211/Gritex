"use strict";

/* ===== GRITEX – Version 0.7 =====
   Kalender, Wochenplan MIT VERLAUF, Ausnahmen pro Tag, Ruhetage,
   Abhaken (nur am aktuellen Tag), Rangsystem, Designauswahl,
   Einstellungen, LocalStorage. */

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]; // Index = Date.getDay()
const PLAN_DAYS = ["MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG", "SONNTAG"];

const TYPES = {
  running:   { icon: "🏃", label: "Laufen" },
  cycling:   { icon: "🚴", label: "Radfahren" },
  swimming:  { icon: "🏊", label: "Schwimmen" },
  strength:  { icon: "💪", label: "Krafttraining" },
  intervals: { icon: "⚡", label: "Intervalltraining" },
  endurance: { icon: "🔥", label: "Ausdauer" },
  other:     { icon: "🎯", label: "Sonstiges" }
};

// Ränge: min = benötigte Anzahl erledigter Einheiten; c1/c2 = Farbverlauf, glow = Leuchtfarbe
const RANKS = [
  { name: "Bronze",   min: 0,   c1: "#F0B27A", c2: "#8A5325", glow: "rgba(205,127,50,0.55)" },
  { name: "Silber",   min: 5,   c1: "#F4F7FB", c2: "#7F8B9B", glow: "rgba(200,210,225,0.45)" },
  { name: "Gold",     min: 30,  c1: "#FFE38A", c2: "#C4901A", glow: "rgba(255,208,80,0.55)" },
  { name: "Diamant",  min: 50,  c1: "#9CF6FF", c2: "#2C8CF0", glow: "rgba(90,210,255,0.55)" },
  { name: "Platin",   min: 100, c1: "#F3F1FF", c2: "#8C86C8", glow: "rgba(190,180,255,0.5)" },
  { name: "Meister",  min: 250, c1: "#C9A8FF", c2: "#5B32D6", glow: "rgba(150,100,255,0.6)" },
  { name: "Champion", min: 500, c1: "#FF9A6B", c2: "#E0264F", glow: "rgba(255,80,110,0.6)" }
];

// Maße des Rangwegs (in Pixeln)
const RANK_SEG = 140;   // Abstand zwischen zwei Rängen
const RANK_PAD = 70;    // Rand oben und unten

// Designs: ändern nur die Akzentfarbe (Rest der App bleibt gleich)
const THEMES = [
  { id: "violet",  name: "Violett", accent: "#8067FF", light: "#B9A8FF", rgb: "128, 103, 255" },
  { id: "blue",    name: "Blau",    accent: "#4F8CFF", light: "#A8C8FF", rgb: "79, 140, 255" },
  { id: "teal",    name: "Türkis",  accent: "#22C3A6", light: "#8FEAD6", rgb: "34, 195, 166" },
  { id: "orange",  name: "Orange",  accent: "#FF9F45", light: "#FFCF9E", rgb: "255, 159, 69" },
  { id: "pink",    name: "Pink",    accent: "#FF5FA8", light: "#FFB4D6", rgb: "255, 95, 168" }
];

const KEY_PLAN_OLD = "gritex_weekly_plan";       // altes Format (Version 0.5 und früher)
const KEY_PLAN_HISTORY = "gritex_plan_history";  // Format mit Verlauf (ab Version 0.6)
const KEY_OVERRIDES = "gritex_overrides";
const KEY_DONE = "gritex_done";
const KEY_THEME = "gritex_theme";

/* Datenmodell:
   planHistory: [{ from: "2026-09-25", plan: [7 Listen] }, ...] – aufsteigend sortiert.
                Für ein Datum gilt immer die zuletzt begonnene Version mit from <= Datum.
                So bleiben ältere Tage beim Ändern des Wochenplans unverändert.
   overrides:   { "2026-10-07": { rest: false, items: [...] } } – ersetzt den Plan nur an diesem Tag.
   done:        { "2026-10-07": { "<einheit-id>": true } } – erledigt pro Datum.
   theme:       id eines Eintrags aus THEMES. */
const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedKey: "",
  view: "calendar",
  planHistory: [],
  overrides: {},
  done: {},
  theme: THEMES[0].id,
  markerY: 0,            // Position des Punkts im Rangweg
  editing: null,         // offenes Modal: { kind: "plan" | "session", day / date, id }
  confirmAction: null    // Aktion der Sicherheitsabfrage
};

let badgeSeq = 0;        // eindeutige IDs für die Abzeichen-Farbverläufe

/* ----- Hilfsfunktionen ----- */
function $(id) { return document.getElementById(id); }
function pad(n) { return n < 10 ? "0" + n : String(n); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function emptyPlan() { return [[], [], [], [], [], [], []]; }
function todayKey() { return toKey(new Date()); }

function toKey(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function parseKey(key) {
  const p = String(key).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}

function formatDate(d) {
  return WEEKDAYS[d.getDay()] + ", " + d.getDate() + ". " + MONTHS[d.getMonth()];
}

// 0 = Montag ... 6 = Sonntag
function weekdayIndex(key) {
  return (parseKey(key).getDay() + 6) % 7;
}

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function makeBtn(cls, text, onClick) {
  const b = h("button", cls, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function isValid(item) {
  return !!item && typeof item.id === "string" && typeof item.title === "string";
}

function typeOf(type) { return TYPES[type] || TYPES.other; }

/* ----- LocalStorage (sicher) ----- */
function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;   // kaputtes JSON oder kein Zugriff -> Standardwerte
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("GRITEX: Speichern nicht möglich", e);
  }
}

function cleanItem(x) {
  if (!x || typeof x !== "object") return null;
  const type = TYPES[x.type] ? x.type : "other";
  let duration = Math.round(Number(x.duration));
  if (isNaN(duration) || duration < 0) duration = 0;
  if (duration > 999) duration = 999;
  return {
    id: x.id ? String(x.id) : uid(),
    type: type,
    title: String(x.title || "").trim().slice(0, 60) || TYPES[type].label,
    description: String(x.description || "").slice(0, 200),
    duration: duration
  };
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(cleanItem).filter(function (i) { return i !== null; });
}

function cleanPlanArray(arr) {
  const plan = emptyPlan();
  if (Array.isArray(arr)) {
    for (let i = 0; i < 7; i++) plan[i] = cleanList(arr[i]);
  }
  return plan;
}

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function loadData() {
  // Wochenplan-Verlauf
  const historyRaw = safeGet(KEY_PLAN_HISTORY);
  let history = [];
  if (Array.isArray(historyRaw)) {
    historyRaw.forEach(function (entry) {
      if (isPlainObject(entry) && /^\d{4}-\d{2}-\d{2}$/.test(entry.from)) {
        history.push({ from: entry.from, plan: cleanPlanArray(entry.plan) });
      }
    });
  } else {
    // Kein Verlauf gespeichert -> evtl. altes Format (vor Version 0.6) migrieren
    const oldPlan = safeGet(KEY_PLAN_OLD);
    if (Array.isArray(oldPlan)) {
      history.push({ from: "0001-01-01", plan: cleanPlanArray(oldPlan) });
    }
  }
  history.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
  state.planHistory = history;

  // Ausnahmen pro Datum
  const ov = safeGet(KEY_OVERRIDES);
  const cleanOv = {};
  if (isPlainObject(ov)) {
    Object.keys(ov).forEach(function (key) {
      const v = ov[key];
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isPlainObject(v)) {
        cleanOv[key] = { rest: v.rest === true, items: cleanList(v.items) };
      }
    });
  }
  state.overrides = cleanOv;

  // Erledigt-Status
  const dn = safeGet(KEY_DONE);
  const cleanDone = {};
  if (isPlainObject(dn)) {
    Object.keys(dn).forEach(function (key) {
      const v = dn[key];
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isPlainObject(v)) {
        const ids = {};
        Object.keys(v).forEach(function (id) {
          if (v[id] === true && id !== "__proto__") ids[id] = true;
        });
        if (Object.keys(ids).length > 0) cleanDone[key] = ids;
      }
    });
  }
  state.done = cleanDone;

  // Design
  const th = safeGet(KEY_THEME);
  state.theme = (typeof th === "string" && THEMES.some(function (t) { return t.id === th; }))
    ? th
    : THEMES[0].id;
}

function saveData() {
  safeSet(KEY_PLAN_HISTORY, state.planHistory);
  safeSet(KEY_OVERRIDES, state.overrides);
  safeSet(KEY_DONE, state.done);
}

/* ----- Design ----- */
function applyTheme(id) {
  const t = THEMES.find(function (x) { return x.id === id; }) || THEMES[0];
  const root = document.documentElement.style;
  root.setProperty("--accent", t.accent);
  root.setProperty("--accent-light", t.light);
  root.setProperty("--accent-rgb", t.rgb);
}

function setTheme(id) {
  state.theme = THEMES.some(function (t) { return t.id === id; }) ? id : THEMES[0].id;
  applyTheme(state.theme);
  safeSet(KEY_THEME, state.theme);
  renderThemePicker();
}

function renderThemePicker() {
  const row = $("theme-row");
  if (!row) return;
  row.innerHTML = "";
  THEMES.forEach(function (t) {
    const btn = h("button", "theme-swatch" + (t.id === state.theme ? " active" : ""));
    btn.type = "button";
    const dot = h("div", "theme-dot");
    dot.style.background = t.accent;
    btn.appendChild(dot);
    btn.appendChild(h("span", "", t.name));
    btn.setAttribute("aria-label", "Design " + t.name + (t.id === state.theme ? " (ausgewählt)" : ""));
    btn.addEventListener("click", function () { setTheme(t.id); });
    row.appendChild(btn);
  });
}

/* ----- Wochenplan-Verlauf ----- */
// Findet die Plan-Version, die an diesem Datum galt (letzte Version mit from <= key)
function getActiveEntry(key) {
  let best = null;
  state.planHistory.forEach(function (entry) {
    if (entry.from <= key && (!best || entry.from > best.from)) best = entry;
  });
  return best;
}

// Liefert die bearbeitbare Version für HEUTE. Gibt es noch keine für heute,
// wird die aktuell gültige Version kopiert (Vergangenheit bleibt dadurch unangetastet).
function ensureEditableEntry() {
  const today = todayKey();
  const active = getActiveEntry(today);
  if (active && active.from === today) return active;

  const newPlan = active
    ? active.plan.map(function (list) { return list.map(function (i) { return Object.assign({}, i); }); })
    : emptyPlan();
  const newEntry = { from: today, plan: newPlan };
  state.planHistory.push(newEntry);
  state.planHistory.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
  return newEntry;
}

function getPlanItems(key) {
  const entry = getActiveEntry(key);
  return entry ? (entry.plan[weekdayIndex(key)] || []).filter(isValid) : [];
}

/* ----- Tageslogik: Wochenplan + Ausnahme + Erledigt ----- */

// Was gilt an diesem Datum? { rest, items, custom }
function getDay(key) {
  const ov = state.overrides[key];
  if (ov && typeof ov === "object") {
    return { rest: ov.rest === true, items: (ov.items || []).filter(isValid), custom: true };
  }
  return { rest: false, items: getPlanItems(key), custom: false };
}

// Legt bei Bedarf eine Ausnahme an (Kopie des geltenden Plans für diesen Tag, gleiche IDs)
function ensureOverride(key) {
  let ov = state.overrides[key];
  if (!ov) {
    ov = { rest: false, items: getPlanItems(key).map(function (i) { return Object.assign({}, i); }) };
    state.overrides[key] = ov;
  }
  return ov;
}

function isDone(key, id) {
  return !!(state.done[key] && state.done[key][id]);
}

// Abhaken ist nur für den heutigen Tag erlaubt
function toggleDone(key, id) {
  if (key !== todayKey()) return;
  if (!state.done[key]) state.done[key] = {};
  if (state.done[key][id]) {
    delete state.done[key][id];
    if (Object.keys(state.done[key]).length === 0) delete state.done[key];
  } else {
    state.done[key][id] = true;
  }
  saveData();
  renderCalendar();
  renderSelectedDay();
  renderRanks();
}

// Erledigt-Markierung an einem bestimmten Datum entfernen (z. B. wenn dort gelöscht wird)
function pruneDoneAt(id, dateKey) {
  if (state.done[dateKey] && state.done[dateKey][id]) {
    delete state.done[dateKey][id];
    if (Object.keys(state.done[dateKey]).length === 0) delete state.done[dateKey];
  }
}

function getDayMarkers(key) {
  const day = getDay(key);
  if (day.rest) return ["rest"];
  if (day.items.length === 0) return [];
  const allDone = day.items.every(function (i) { return isDone(key, i.id); });
  return [allDone ? "done" : "planned"];
}

/* ----- Rangsystem ----- */
// Zählt alle Einheiten, die es noch gibt und die abgehakt sind
function countCompleted() {
  let n = 0;
  Object.keys(state.done).forEach(function (key) {
    const day = getDay(key);
    if (day.rest) return;
    day.items.forEach(function (item) {
      if (isDone(key, item.id)) n++;
    });
  });
  return n;
}

function getRankIndex(count) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (count >= RANKS[i].min) idx = i;
  }
  return idx;
}

function unitWord(n) { return n === 1 ? "Einheit" : "Einheiten"; }

// Symbol im Schild (Koordinaten im 100er-Raster)
function emblem(i, id) {
  const f = "url(#" + id + ")";
  const chev = function (y) {
    return '<path d="M33 ' + y + ' L50 ' + (y + 13) + ' L67 ' + y + '" fill="none" stroke="' + f + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
  };
  const star = "M50 31 L56 45.5 L72 46.8 L60 57 L63.8 72.5 L50 64 L36.2 72.5 L40 57 L28 46.8 L44 45.5 Z";
  const crown = '<path d="M31 64 L33 40 L43 51 L50 36 L57 51 L67 40 L69 64 Z" fill="' + f + '"/>' +
                '<rect x="31" y="67" width="38" height="6" rx="3" fill="' + f + '"/>';

  if (i === 0) return chev(45);
  if (i === 1) return chev(38) + chev(54);
  if (i === 2) return chev(32) + chev(47) + chev(62);
  if (i === 3) {
    return '<path d="M50 32 L68 47 L50 72 L32 47 Z" fill="' + f + '"/>' +
           '<path d="M32 47 H68 M42 47 L50 72 L58 47 L50 32 Z" fill="none" stroke="#0B0E14" stroke-opacity="0.4" stroke-width="2" stroke-linejoin="round"/>';
  }
  if (i === 4) return '<path d="' + star + '" fill="' + f + '"/>';
  if (i === 5) return crown;
  return '<g transform="translate(0 4)">' + crown + '</g>' +
         '<path d="' + star + '" fill="' + f + '" transform="translate(50 29) scale(0.4) translate(-50 -52)"/>';
}

// Komplettes Abzeichen als SVG-Text (nur feste, eigene Werte – keine Nutzereingaben)
function badgeSvg(i) {
  const r = RANKS[i];
  const id = "grad" + (badgeSeq++);
  const defs = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + r.c1 + '"/><stop offset="1" stop-color="' + r.c2 + '"/></linearGradient></defs>';
  const shield =
    '<path d="M50 5 L89 19 V52 C89 75 71 91 50 97 C29 91 11 75 11 52 V19 Z" fill="url(#' + id + ')"/>' +
    '<path d="M50 14 L80 25 V52 C80 69 66 82 50 88 C34 82 20 69 20 52 V25 Z" fill="#0B0E14" fill-opacity="0.72"/>' +
    '<path d="M50 5 L89 19 V36 L50 24 L11 36 V19 Z" fill="#fff" fill-opacity="0.14"/>';
  return '<svg viewBox="0 0 100 102" aria-hidden="true">' + defs + shield + emblem(i, id) + '</svg>';
}

function badgeEl(i, cls) {
  const d = h("div", cls);
  d.innerHTML = badgeSvg(i);
  return d;
}

function renderRanks() {
  const hero = $("rank-hero");
  const path = $("rank-path");
  if (!hero || !path) return;

  const count = countCompleted();
  const cur = getRankIndex(count);
  const rank = RANKS[cur];
  const next = cur < RANKS.length - 1 ? RANKS[cur + 1] : null;

  // Oben: aktueller Rang groß
  hero.innerHTML = "";
  const box = h("div", "panel rank-hero");
  box.appendChild(h("div", "eyebrow", "DEIN RANG"));
  const big = badgeEl(cur, "rank-badge-big");
  big.style.filter = "drop-shadow(0 0 22px " + rank.glow + ")";
  box.appendChild(big);
  box.appendChild(h("div", "rank-name", rank.name));
  box.appendChild(h("div", "rank-count", count + " " + unitWord(count) + " absolviert"));

  const bar = h("div", "rank-progress");
  const fill = h("div", "rank-progress-fill");
  const pct = next ? Math.round(((count - rank.min) / (next.min - rank.min)) * 100) : 100;
  fill.style.width = pct + "%";
  bar.appendChild(fill);
  box.appendChild(bar);
  box.appendChild(h("div", "rank-next", next ? "Noch " + (next.min - count) + " bis " + next.name : "Höchster Rang erreicht"));
  hero.appendChild(box);

  // Darunter: Weg (Champion oben, Bronze unten)
  const n = RANKS.length;
  const yOf = function (i) { return RANK_PAD + (n - 1 - i) * RANK_SEG; };

  // Punkt liegt zwischen aktuellem und nächstem Rang, passend zum Fortschritt
  let markerY = yOf(cur);
  if (next) markerY -= ((count - rank.min) / (next.min - rank.min)) * RANK_SEG;
  state.markerY = markerY;

  path.innerHTML = "";
  path.style.height = (RANK_PAD * 2 + (n - 1) * RANK_SEG) + "px";

  const track = h("div", "track");
  track.style.top = yOf(n - 1) + "px";
  track.style.height = ((n - 1) * RANK_SEG) + "px";
  path.appendChild(track);

  const trackFill = h("div", "track-fill");
  trackFill.style.top = markerY + "px";
  trackFill.style.height = (yOf(0) - markerY) + "px";
  path.appendChild(trackFill);

  RANKS.forEach(function (r, i) {
    const y = yOf(i);

    const dot = h("div", "node-dot" + (i <= cur ? " reached" : ""));
    dot.style.top = (y - 7) + "px";
    path.appendChild(dot);

    const card = h("div", "rank-card " + (i < cur ? "reached" : i === cur ? "current" : "locked"));
    card.style.top = (y - 44) + "px";
    card.appendChild(badgeEl(i, "badge"));
    const text = h("div", "rank-text");
    text.appendChild(h("strong", "", r.name));
    text.appendChild(h("span", "", r.min === 0 ? "Startrang" : "ab " + r.min + " Einheiten"));
    card.appendChild(text);
    path.appendChild(card);
  });

  const marker = h("div", "marker", String(count));
  marker.style.top = (markerY - 19) + "px";
  marker.setAttribute("aria-label", count + " " + unitWord(count) + " absolviert");
  path.appendChild(marker);
}

// Weg so scrollen, dass der Punkt in der Mitte sichtbar ist
function scrollRanksToMarker() {
  const wrap = $("rank-scroll");
  if (!wrap) return;
  wrap.scrollTop = Math.max(0, state.markerY - wrap.clientHeight / 2);
}

/* ----- Kalender ----- */
function renderCalendar() {
  const grid = $("calendar-grid");
  const title = $("month-title");
  if (!grid || !title) return;

  const year = state.viewYear;
  const month = state.viewMonth;
  title.textContent = MONTHS[month] + " " + year;

  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const tKey = todayKey();

  const frag = document.createDocumentFragment();
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - offset + i, 12, 0, 0);
    const key = toKey(d);

    const btn = h("button", "day");
    btn.type = "button";
    btn.dataset.date = key;
    if (d.getMonth() !== month) btn.classList.add("other");
    if (key === tKey) btn.classList.add("today");
    if (key === state.selectedKey) btn.classList.add("selected");
    btn.setAttribute("aria-label", formatDate(d));

    btn.appendChild(h("span", "", d.getDate()));
    const dots = h("div", "dots");
    getDayMarkers(key).forEach(function (type) {
      dots.appendChild(h("i", "dot dot-" + type));
    });
    btn.appendChild(dots);
    frag.appendChild(btn);
  }
  grid.innerHTML = "";
  grid.appendChild(frag);
}

/* ----- Trainingskarte -----
   dayKey: Datum der Tagesansicht (für den Erledigt-Status).
   editable: nur beim heutigen Tag true -> dann ist der Haken klickbar. */
function buildCard(item, onEdit, dayKey, editable) {
  const t = typeOf(item.type);
  const done = dayKey ? isDone(dayKey, item.id) : false;
  const card = h("div", "card-item" + (done ? " done" : ""));
  card.appendChild(h("div", "card-icon", t.icon));

  const body = h("div", "card-body");
  body.appendChild(h("strong", "", item.title));
  if (item.description) body.appendChild(h("p", "", item.description));
  if (item.duration > 0) body.appendChild(h("div", "card-meta", item.duration + " MIN"));
  card.appendChild(body);

  const edit = makeBtn("edit-btn", "✎", onEdit);
  edit.setAttribute("aria-label", item.title + " bearbeiten");
  card.appendChild(edit);

  if (dayKey) {
    if (editable) {
      const check = makeBtn("check-btn", "✓", function () { toggleDone(dayKey, item.id); });
      check.setAttribute("aria-label", done ? "Als nicht erledigt markieren" : "Als erledigt markieren");
      check.setAttribute("aria-pressed", done ? "true" : "false");
      card.appendChild(check);
    } else if (done) {
      const staticCheck = h("div", "check-static", "✓");
      staticCheck.setAttribute("aria-label", "Erledigt");
      card.appendChild(staticCheck);
    }
  }
  return card;
}

/* ----- Tagesübersicht ----- */
function renderSelectedDay() {
  const label = $("day-label");
  const title = $("day-title");
  const content = $("day-content");
  if (!label || !title || !content) return;

  const sel = parseKey(state.selectedKey);
  const tKey = todayKey();
  const today = parseKey(tKey);
  const diff = Math.round((sel - today) / 86400000);
  label.textContent = diff === 0 ? "HEUTE" : diff === 1 ? "MORGEN" : diff === -1 ? "GESTERN" : "AUSGEWÄHLT";
  title.textContent = formatDate(sel);

  content.innerHTML = "";
  const key = state.selectedKey;
  const day = getDay(key);
  const isToday = key === tKey;

  if (day.rest) {
    const card = h("div", "card-item");
    card.appendChild(h("div", "card-icon rest", "🌙"));
    const body = h("div", "card-body");
    body.appendChild(h("strong", "", "Ruhetag"));
    body.appendChild(h("p", "", "Erholung gehört zum Training."));
    card.appendChild(body);
    content.appendChild(card);
  } else if (day.items.length === 0) {
    const card = h("div", "card empty");
    card.appendChild(h("strong", "", "Keine Einheit geplant."));
    card.appendChild(h("span", "", "Für diesen Tag steht noch nichts auf dem Plan."));
    content.appendChild(card);
  } else {
    day.items.forEach(function (item) {
      content.appendChild(buildCard(item, function () {
        openModal({ kind: "session", date: key, id: item.id });
      }, key, isToday));
    });
    if (!isToday) {
      content.appendChild(h("p", "hint day-hint", "Abhaken ist nur am aktuellen Tag möglich."));
    }
  }

  content.appendChild(makeBtn("add-btn", "+ Training hinzufügen", function () {
    openModal({ kind: "session", date: key, id: null });
  }));

  const actions = h("div", "actions");
  if (day.rest) {
    actions.appendChild(makeBtn("ghost-btn", "Ruhetag aufheben", function () { clearOverride(key); }));
  } else {
    actions.appendChild(makeBtn("ghost-btn", "🌙 Ruhetag", function () { setRestDay(key); }));
    if (day.custom) {
      actions.appendChild(makeBtn("ghost-btn", "Auf Wochenplan zurücksetzen", function () { clearOverride(key); }));
    }
  }
  content.appendChild(actions);
}

/* ----- Wochenplan ----- */
function renderWeeklyPlan() {
  const list = $("plan-list");
  if (!list) return;
  list.innerHTML = "";

  const entry = getActiveEntry(todayKey());
  const plan = entry ? entry.plan : emptyPlan();

  PLAN_DAYS.forEach(function (name, dayIndex) {
    const wrap = h("div", "plan-day");
    const head = h("div", "plan-head");
    head.appendChild(h("strong", "", name));

    const add = makeBtn("mini-add", "+", function () {
      openModal({ kind: "plan", day: dayIndex, id: null });
    });
    add.setAttribute("aria-label", "Training für " + name.charAt(0) + name.slice(1).toLowerCase() + " hinzufügen");
    head.appendChild(add);
    wrap.appendChild(head);

    const items = (plan[dayIndex] || []).filter(isValid);
    if (items.length === 0) {
      wrap.appendChild(h("span", "plan-empty", "Noch nichts geplant"));
    } else {
      items.forEach(function (item) {
        wrap.appendChild(buildCard(item, function () {
          openModal({ kind: "plan", day: dayIndex, id: item.id });
        }));
      });
    }
    list.appendChild(wrap);
  });
}

function renderAll() {
  renderCalendar();
  renderSelectedDay();
  renderWeeklyPlan();
  renderRanks();
  renderThemePicker();
}

/* ----- Ruhetag / Ausnahme entfernen ----- */
function setRestDay(key) {
  state.overrides[key] = { rest: true, items: [] };
  saveData();
  renderAll();
}

function clearOverride(key) {
  delete state.overrides[key];
  saveData();
  renderAll();
}

/* ----- Fenster sperren den Hintergrund ----- */
function updateLock() {
  document.body.classList.toggle("locked", !$("modal").hidden || !$("confirm").hidden);
}

/* ----- Modal: hinzufügen / bearbeiten ----- */
function findItem(ctx) {
  if (!ctx.id) return null;
  let list;
  if (ctx.kind === "plan") {
    const entry = getActiveEntry(todayKey());
    list = entry ? (entry.plan[ctx.day] || []) : [];
  } else {
    list = getDay(ctx.date).items;
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === ctx.id) return list[i];
  }
  return null;
}

function openModal(ctx) {
  const item = findItem(ctx);
  state.editing = ctx;

  $("modal-title").textContent = item ? "Training bearbeiten" : "Training hinzufügen";
  $("modal-sub").textContent = ctx.kind === "plan"
    ? "Jede Woche: " + PLAN_DAYS[ctx.day] + " (Änderung gilt ab heute)"
    : formatDate(parseKey(ctx.date)) + " (nur dieser Tag)";

  $("f-type").value = item ? item.type : "running";
  $("f-title").value = item ? item.title : "";
  $("f-desc").value = item ? (item.description || "") : "";
  $("f-duration").value = item && item.duration > 0 ? item.duration : "";
  $("modal-delete").hidden = !item;
  $("modal").hidden = false;
  updateLock();
}

function closeModal() {
  $("modal").hidden = true;
  closeConfirm();
  state.editing = null;
  updateLock();
}

// Liste, in die gespeichert wird: die bearbeitbare (heutige) Wochenplan-Version
// oder die Ausnahme dieses Datums
function getWritableList(ctx) {
  if (ctx.kind === "plan") return ensureEditableEntry().plan[ctx.day];
  const ov = ensureOverride(ctx.date);
  ov.rest = false;   // Training an einem Ruhetag hebt den Ruhetag auf
  return ov.items;
}

function saveModal() {
  const ctx = state.editing;
  if (!ctx) return;

  const type = TYPES[$("f-type").value] ? $("f-type").value : "other";
  const title = $("f-title").value.trim() || TYPES[type].label;
  const description = $("f-desc").value.trim();
  let duration = parseInt($("f-duration").value, 10);
  if (isNaN(duration) || duration < 0) duration = 0;
  if (duration > 999) duration = 999;

  const list = getWritableList(ctx);
  let existing = null;
  for (let i = 0; i < list.length; i++) {
    if (ctx.id && list[i] && list[i].id === ctx.id) { existing = list[i]; break; }
  }

  if (existing) {
    existing.type = type;
    existing.title = title;
    existing.description = description;
    existing.duration = duration;
  } else {
    list.push({ id: uid(), type: type, title: title, description: description, duration: duration });
  }
  saveData();
  closeModal();
  renderAll();
}

function confirmDelete() {
  const ctx = state.editing;
  if (ctx && ctx.id) {
    const list = getWritableList(ctx);
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === ctx.id) { list.splice(i, 1); break; }
    }
    // Nur bei einer Einzeltag-Einheit den Erledigt-Status genau dieses Tages entfernen.
    // Beim Löschen aus dem Wochenplan bleibt die bisherige Historie erhalten.
    if (ctx.kind === "session") pruneDoneAt(ctx.id, ctx.date);
    saveData();
  }
  closeModal();
  renderAll();
}

/* ----- Sicherheitsabfrage (für mehrere Aktionen) ----- */
function askConfirm(title, text, okLabel, action) {
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = text;
  $("confirm-ok").textContent = okLabel;
  state.confirmAction = action;
  $("confirm").hidden = false;
  updateLock();
}

function closeConfirm() {
  $("confirm").hidden = true;
  state.confirmAction = null;
  updateLock();
}

function askDelete() {
  askConfirm("Training löschen?", "Diese Trainingseinheit wird gelöscht.", "Löschen", confirmDelete);
}

/* ----- Einstellungen ----- */
// Setzt den Wochenplan ab heute auf leer zurück. Vergangene Tage und
// bereits abgehakte Einheiten bleiben unverändert erhalten.
function resetPlan() {
  const entry = ensureEditableEntry();
  entry.plan = emptyPlan();
  saveData();
  renderAll();
}

function clearAllData() {
  state.planHistory = [];
  state.overrides = {};
  state.done = {};
  saveData();
  renderAll();
}

/* ----- Navigation / Datum ----- */
function changeMonth(delta) {
  let m = state.viewMonth + delta;
  let y = state.viewYear;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  state.viewMonth = m;
  state.viewYear = y;
  renderCalendar();
}

function selectDate(key) {
  const d = parseKey(key);
  if (isNaN(d.getTime())) return;
  state.selectedKey = key;
  state.viewYear = d.getFullYear();
  state.viewMonth = d.getMonth();
  renderCalendar();
  renderSelectedDay();
}

function showView(name) {
  const views = ["calendar", "plan", "ranks", "settings"];
  if (views.indexOf(name) === -1) return;
  state.view = name;
  views.forEach(function (v) {
    const el = $("view-" + v);
    if (el) el.classList.toggle("active", v === name);
  });
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.classList.toggle("active", tab.dataset.view === name);
  });
  window.scrollTo(0, 0);
  if (name === "ranks") {
    renderRanks();
    scrollRanksToMarker();   // erst nach dem Einblenden möglich
  }
}

/* ----- Event-Listener (einmalig beim Start) ----- */
function setupEventListeners() {
  $("prev-month").addEventListener("click", function () { changeMonth(-1); });
  $("next-month").addEventListener("click", function () { changeMonth(1); });

  $("calendar-grid").addEventListener("click", function (e) {
    const btn = e.target.closest(".day");
    if (btn && btn.dataset.date) selectDate(btn.dataset.date);
  });

  document.querySelectorAll("[data-view]").forEach(function (el) {
    el.addEventListener("click", function () { showView(el.dataset.view); });
  });

  // Modal
  $("modal-cancel").addEventListener("click", closeModal);
  $("modal-save").addEventListener("click", saveModal);
  $("modal-delete").addEventListener("click", askDelete);
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });

  // Sicherheitsabfrage
  $("confirm-cancel").addEventListener("click", closeConfirm);
  $("confirm-ok").addEventListener("click", function () {
    const action = state.confirmAction;
    closeConfirm();
    if (action) action();
  });
  $("confirm").addEventListener("click", function (e) { if (e.target === $("confirm")) closeConfirm(); });

  // Einstellungen
  $("reset-plan").addEventListener("click", function () {
    askConfirm("Wochenplan zurücksetzen?", "Der Wochenplan wird ab heute geleert. Vergangene Tage und bereits abgehakte Einheiten bleiben unverändert.", "Zurücksetzen", resetPlan);
  });
  $("clear-data").addEventListener("click", function () {
    askConfirm("Alle Daten löschen?", "Wochenplan, einzelne Tage und erledigte Einheiten werden vollständig von diesem Gerät gelöscht.", "Alles löschen", clearAllData);
  });

  // Esc schließt Fenster (Desktop)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("confirm").hidden) closeConfirm();
    else if (!$("modal").hidden) closeModal();
  });
}

function fillTypeSelect() {
  const select = $("f-type");
  select.innerHTML = "";
  Object.keys(TYPES).forEach(function (key) {
    const opt = h("option", "", TYPES[key].icon + "  " + TYPES[key].label);
    opt.value = key;
    select.appendChild(opt);
  });
}

/* ----- Start ----- */
function init() {
  try {
    const now = new Date();
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    state.selectedKey = toKey(now);

    loadData();          // fällt bei Problemen auf leere Standardwerte zurück
    applyTheme(state.theme);
    fillTypeSelect();
    renderAll();
    setupEventListeners();
  } catch (error) {
    console.error("GRITEX Startfehler:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);l
