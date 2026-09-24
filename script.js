"use strict";

/* ===== GRITEX – Phase 1 + 2 =====
   Kalender, Monatswechsel, Datum auswählen, Navigation. */

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]; // Index = Date.getDay()
const PLAN_DAYS = ["MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG", "SONNTAG"];

// Zentraler Zustand der App
const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedKey: "",
  view: "calendar"
};

/* ----- Hilfsfunktionen ----- */
function $(id) { return document.getElementById(id); }

function pad(n) { return n < 10 ? "0" + n : String(n); }

// Datum -> "2026-09-24" (ohne Zeitzonen-Probleme)
function toKey(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

// "2026-09-24" -> Date (mittags, damit Sommerzeit nie stört)
function parseKey(key) {
  const p = String(key).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}

/* ----- Trainingsindikatoren -----
   Kommt in Phase 3/4: gibt dann z. B. ["planned"], ["done"] oder ["rest"] zurück. */
function getDayMarkers(key) {
  return [];
}

/* ----- Kalender ----- */
function renderCalendar() {
  const grid = $("calendar-grid");
  const title = $("month-title");
  if (!grid || !title) return;

  const year = state.viewYear;
  const month = state.viewMonth;
  title.textContent = MONTHS[month] + " " + year;

  // Woche beginnt am Montag: getDay() 0 (So) -> 6, 1 (Mo) -> 0, ...
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const todayKey = toKey(new Date());

  const frag = document.createDocumentFragment();
  for (let i = 0; i < totalCells; i++) {
    // Tag 1 - offset ergibt automatisch Tage des Vor-/Folgemonats
    const d = new Date(year, month, 1 - offset + i, 12, 0, 0);
    const key = toKey(d);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day";
    btn.dataset.date = key;
    if (d.getMonth() !== month) btn.classList.add("other");
    if (key === todayKey) btn.classList.add("today");
    if (key === state.selectedKey) btn.classList.add("selected");
    btn.setAttribute("aria-label", WEEKDAYS[d.getDay()] + ", " + d.getDate() + ". " + MONTHS[d.getMonth()]);

    const num = document.createElement("span");
    num.textContent = d.getDate();
    btn.appendChild(num);

    const dots = document.createElement("div");
    dots.className = "dots";
    getDayMarkers(key).forEach(function (type) {
      const dot = document.createElement("i");
      dot.className = "dot dot-" + type;
      dots.appendChild(dot);
    });
    btn.appendChild(dots);

    frag.appendChild(btn);
  }
  grid.innerHTML = "";
  grid.appendChild(frag);
}

/* ----- Tagesübersicht ----- */
function renderSelectedDay() {
  const label = $("day-label");
  const title = $("day-title");
  const content = $("day-content");
  if (!label || !title || !content) return;

  const sel = parseKey(state.selectedKey);
  const today = parseKey(toKey(new Date()));
  const diff = Math.round((sel - today) / 86400000);

  label.textContent = diff === 0 ? "HEUTE" : diff === 1 ? "MORGEN" : diff === -1 ? "GESTERN" : "AUSGEWÄHLT";
  title.textContent = WEEKDAYS[sel.getDay()] + ", " + sel.getDate() + ". " + MONTHS[sel.getMonth()];

  // Noch keine Trainingsdaten: sinnvoller Leerzustand
  content.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card empty";
  const strong = document.createElement("strong");
  strong.textContent = "Keine Einheit geplant.";
  const span = document.createElement("span");
  span.textContent = "Hier erscheint dein Training für diesen Tag.";
  card.appendChild(strong);
  card.appendChild(span);
  content.appendChild(card);
}

/* ----- Wochenplan (Grundstruktur) ----- */
function renderWeeklyPlan() {
  const list = $("plan-list");
  if (!list) return;
  list.innerHTML = "";
  PLAN_DAYS.forEach(function (name) {
    const row = document.createElement("div");
    row.className = "plan-row";
    const strong = document.createElement("strong");
    strong.textContent = name;
    const span = document.createElement("span");
    span.textContent = "Noch nichts geplant";
    row.appendChild(strong);
    row.appendChild(span);
    list.appendChild(row);
  });
}

/* ----- Aktionen ----- */
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
  state.viewYear = d.getFullYear();   // springt bei Tagen des Nachbarmonats dorthin
  state.viewMonth = d.getMonth();
  renderCalendar();
  renderSelectedDay();
}

function showView(name) {
  const views = ["calendar", "plan", "settings"];
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
}

/* ----- Event-Listener (einmalig beim Start) ----- */
function setupEventListeners() {
  $("prev-month").addEventListener("click", function () { changeMonth(-1); });
  $("next-month").addEventListener("click", function () { changeMonth(1); });

  // Ein Listener für alle Kalendertage
  $("calendar-grid").addEventListener("click", function (e) {
    const btn = e.target.closest(".day");
    if (btn && btn.dataset.date) selectDate(btn.dataset.date);
  });

  // Alle Elemente mit data-view (Tabbar + Header-Button)
  document.querySelectorAll("[data-view]").forEach(function (el) {
    el.addEventListener("click", function () { showView(el.dataset.view); });
  });
}

/* ----- Start ----- */
function init() {
  try {
    const now = new Date();
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    state.selectedKey = toKey(now);

    renderCalendar();
    renderSelectedDay();
    renderWeeklyPlan();
    setupEventListeners();
  } catch (error) {
    console.error("GRITEX Startfehler:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);
