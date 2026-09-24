"use strict";

/* ===== GRITEX – Phase 3 =====
   Kalender + Trainingseinheiten (hinzufügen, bearbeiten, löschen) + Wochenplan.
   Daten liegen noch im Arbeitsspeicher (LocalStorage folgt in Phase 4). */

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

const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedKey: "",
  view: "calendar",
  sessions: [],                              // Einheiten mit Datum
  weeklyPlan: [[], [], [], [], [], [], []],  // Standardwoche: 0 = Montag ... 6 = Sonntag
  editing: null                              // aktuell offenes Modal: { kind, date/day, id }
};

/* ----- Hilfsfunktionen ----- */
function $(id) { return document.getElementById(id); }
function pad(n) { return n < 10 ? "0" + n : String(n); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

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

// Element mit Klasse und Text erzeugen
function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Fehlerhafte Einheiten werden ignoriert, statt die App zu stören
function isValid(item) {
  return !!item && typeof item.id === "string" && typeof item.title === "string";
}

function typeOf(type) { return TYPES[type] || TYPES.other; }

function getSessionsForDate(key) {
  return state.sessions.filter(function (s) { return isValid(s) && s.date === key; });
}

// Liste, in der ein Eintrag liegt (Kalender-Einheiten oder Wochenplan-Tag)
function getList(ctx) {
  return ctx.kind === "plan" ? state.weeklyPlan[ctx.day] : state.sessions;
}

function findItem(ctx) {
  if (!ctx.id) return null;
  const list = getList(ctx) || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === ctx.id) return list[i];
  }
  return null;
}

/* ----- Kalenderpunkte ----- */
function getDayMarkers(key) {
  return getSessionsForDate(key).length > 0 ? ["planned"] : [];
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
  const todayKey = toKey(new Date());

  const frag = document.createDocumentFragment();
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - offset + i, 12, 0, 0);
    const key = toKey(d);

    const btn = h("button", "day");
    btn.type = "button";
    btn.dataset.date = key;
    if (d.getMonth() !== month) btn.classList.add("other");
    if (key === todayKey) btn.classList.add("today");
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

/* ----- Trainingskarte (für Tagesansicht und Wochenplan) ----- */
function buildCard(item, onEdit) {
  const t = typeOf(item.type);
  const card = h("div", "card-item");
  card.appendChild(h("div", "card-icon", t.icon));

  const body = h("div", "card-body");
  body.appendChild(h("strong", "", item.title));
  if (item.description) body.appendChild(h("p", "", item.description));
  if (item.duration > 0) body.appendChild(h("div", "card-meta", item.duration + " MIN"));
  card.appendChild(body);

  const edit = h("button", "edit-btn", "✎");
  edit.type = "button";
  edit.setAttribute("aria-label", item.title + " bearbeiten");
  edit.addEventListener("click", onEdit);
  card.appendChild(edit);
  return card;
}

function buildAddButton(onClick) {
  const btn = h("button", "add-btn", "+ Training hinzufügen");
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
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
  title.textContent = formatDate(sel);

  content.innerHTML = "";
  const key = state.selectedKey;
  const items = getSessionsForDate(key);

  if (items.length === 0) {
    const card = h("div", "card empty");
    card.appendChild(h("strong", "", "Keine Einheit geplant."));
    card.appendChild(h("span", "", "Für diesen Tag steht noch nichts auf dem Plan."));
    content.appendChild(card);
  } else {
    items.forEach(function (item) {
      content.appendChild(buildCard(item, function () {
        openModal({ kind: "session", date: key, id: item.id });
      }));
    });
  }
  content.appendChild(buildAddButton(function () {
    openModal({ kind: "session", date: key, id: null });
  }));
}

/* ----- Wochenplan ----- */
function renderWeeklyPlan() {
  const list = $("plan-list");
  if (!list) return;
  list.innerHTML = "";

  PLAN_DAYS.forEach(function (name, dayIndex) {
    const wrap = h("div", "plan-day");
    const head = h("div", "plan-head");
    head.appendChild(h("strong", "", name));

    const add = h("button", "mini-add", "+");
    add.type = "button";
    add.setAttribute("aria-label", "Training für " + name.charAt(0) + name.slice(1).toLowerCase() + " hinzufügen");
    add.addEventListener("click", function () {
      openModal({ kind: "plan", day: dayIndex, id: null });
    });
    head.appendChild(add);
    wrap.appendChild(head);

    const items = (state.weeklyPlan[dayIndex] || []).filter(isValid);
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
}

/* ----- Modal: hinzufügen / bearbeiten ----- */
function openModal(ctx) {
  const item = findItem(ctx);
  state.editing = ctx;

  $("modal-title").textContent = item ? "Training bearbeiten" : "Training hinzufügen";
  $("modal-sub").textContent = ctx.kind === "plan" ? "Jede Woche: " + PLAN_DAYS[ctx.day] : formatDate(parseKey(ctx.date));

  $("f-type").value = item ? item.type : "running";
  $("f-title").value = item ? item.title : "";
  $("f-desc").value = item ? (item.description || "") : "";
  $("f-duration").value = item && item.duration > 0 ? item.duration : "";
  $("modal-delete").hidden = !item;
  $("modal").hidden = false;
}

function closeModal() {
  $("modal").hidden = true;
  $("confirm").hidden = true;
  state.editing = null;
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

  const existing = findItem(ctx);
  if (existing) {
    existing.type = type;
    existing.title = title;
    existing.description = description;
    existing.duration = duration;
  } else {
    const item = { id: uid(), type: type, title: title, description: description, duration: duration, completed: false };
    if (ctx.kind === "session") item.date = ctx.date;
    getList(ctx).push(item);
  }
  closeModal();
  renderAll();
}

/* ----- Löschen mit Sicherheitsabfrage ----- */
function askDelete() {
  $("confirm").hidden = false;
}

function confirmDelete() {
  const ctx = state.editing;
  if (ctx && ctx.id) {
    const list = getList(ctx);
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === ctx.id) { list.splice(i, 1); break; }
    }
  }
  closeModal();
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
  $("confirm-cancel").addEventListener("click", function () { $("confirm").hidden = true; });
  $("confirm-ok").addEventListener("click", confirmDelete);

  // Tipp auf den dunklen Hintergrund schließt das Fenster
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });
  $("confirm").addEventListener("click", function (e) { if (e.target === $("confirm")) $("confirm").hidden = true; });
}

// Auswahlliste der Trainingsarten befüllen
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

    fillTypeSelect();
    renderAll();
    setupEventListeners();
  } catch (error) {
    console.error("GRITEX Startfehler:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);
