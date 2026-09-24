"use strict";

/* ===== GRITEX – Phase 4 =====
   Wochenplan wiederholt sich im Kalender, einzelne Tage können überschrieben
   werden (Ausnahmen), Ruhetage, Speicherung im LocalStorage. */

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

const KEY_PLAN = "gritex_weekly_plan";
const KEY_OVERRIDES = "gritex_overrides";

/* Datenmodell:
   weeklyPlan: 7 Listen (0 = Montag ... 6 = Sonntag) mit Standard-Einheiten.
   overrides:  { "2026-10-07": { rest: false, items: [...] } }
               Ist für ein Datum ein Eintrag vorhanden, ersetzt er den Wochenplan
               nur an diesem Tag. Ohne Eintrag gilt der Wochenplan. */
const state = {
  viewYear: 0,
  viewMonth: 0,
  selectedKey: "",
  view: "calendar",
  weeklyPlan: emptyPlan(),
  overrides: {},
  editing: null   // offenes Modal: { kind: "plan" | "session", day / date, id }
};

/* ----- Hilfsfunktionen ----- */
function $(id) { return document.getElementById(id); }
function pad(n) { return n < 10 ? "0" + n : String(n); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function emptyPlan() { return [[], [], [], [], [], [], []]; }

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

// Eine gespeicherte Einheit prüfen und bereinigen; null = ignorieren
function cleanItem(x) {
  if (!x || typeof x !== "object") return null;
  const type = TYPES[x.type] ? x.type : "other";
  let duration = Math.round(Number(x.duration));
  if (isNaN(duration) || duration < 0) duration = 0;
  if (duration > 999) duration = 999;
  const title = String(x.title || "").trim().slice(0, 60) || TYPES[type].label;
  return {
    id: x.id ? String(x.id) : uid(),
    type: type,
    title: title,
    description: String(x.description || "").slice(0, 200),
    duration: duration,
    completed: x.completed === true
  };
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(cleanItem).filter(function (i) { return i !== null; });
}

function loadData() {
  // Wochenplan
  const plan = safeGet(KEY_PLAN);
  const cleanPlan = emptyPlan();
  if (Array.isArray(plan)) {
    for (let i = 0; i < 7; i++) cleanPlan[i] = cleanList(plan[i]);
  }
  state.weeklyPlan = cleanPlan;

  // Ausnahmen pro Datum
  const ov = safeGet(KEY_OVERRIDES);
  const cleanOv = {};
  if (ov && typeof ov === "object" && !Array.isArray(ov)) {
    Object.keys(ov).forEach(function (key) {
      const v = ov[key];
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && v && typeof v === "object") {
        cleanOv[key] = { rest: v.rest === true, items: cleanList(v.items) };
      }
    });
  }
  state.overrides = cleanOv;
}

function saveData() {
  safeSet(KEY_PLAN, state.weeklyPlan);
  safeSet(KEY_OVERRIDES, state.overrides);
}

/* ----- Tageslogik: Wochenplan + Ausnahme ----- */
function getPlanItems(key) {
  return (state.weeklyPlan[weekdayIndex(key)] || []).filter(isValid);
}

// Was gilt an diesem Datum? { rest, items, custom }
function getDay(key) {
  const ov = state.overrides[key];
  if (ov && typeof ov === "object") {
    return { rest: ov.rest === true, items: (ov.items || []).filter(isValid), custom: true };
  }
  return { rest: false, items: getPlanItems(key), custom: false };
}

// Legt bei Bedarf eine Ausnahme an (Kopie des Wochenplans für diesen Tag)
function ensureOverride(key) {
  let ov = state.overrides[key];
  if (!ov) {
    ov = { rest: false, items: getPlanItems(key).map(function (i) { return Object.assign({}, i); }) };
    state.overrides[key] = ov;
  }
  return ov;
}

function getDayMarkers(key) {
  const day = getDay(key);
  if (day.rest) return ["rest"];
  if (day.items.length === 0) return [];
  const allDone = day.items.every(function (i) { return i.completed; });
  return [allDone ? "done" : "planned"];
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

/* ----- Trainingskarte ----- */
function buildCard(item, onEdit) {
  const t = typeOf(item.type);
  const card = h("div", "card-item");
  card.appendChild(h("div", "card-icon", t.icon));

  const body = h("div", "card-body");
  body.appendChild(h("strong", "", item.title));
  if (item.description) body.appendChild(h("p", "", item.description));
  if (item.duration > 0) body.appendChild(h("div", "card-meta", item.duration + " MIN"));
  card.appendChild(body);

  const edit = makeBtn("edit-btn", "✎", onEdit);
  edit.setAttribute("aria-label", item.title + " bearbeiten");
  card.appendChild(edit);
  return card;
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
  const day = getDay(key);

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
      }));
    });
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

/* ----- Modal: hinzufügen / bearbeiten ----- */
function findItem(ctx) {
  if (!ctx.id) return null;
  const list = ctx.kind === "plan" ? (state.weeklyPlan[ctx.day] || []) : getDay(ctx.date).items;
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
    ? "Jede Woche: " + PLAN_DAYS[ctx.day]
    : formatDate(parseKey(ctx.date)) + " (nur dieser Tag)";

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

// Liste, in die gespeichert wird: Wochenplan-Tag oder Ausnahme dieses Datums
function getWritableList(ctx) {
  if (ctx.kind === "plan") return state.weeklyPlan[ctx.day];
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
    list.push({ id: uid(), type: type, title: title, description: description, duration: duration, completed: false });
  }
  saveData();
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
    const list = getWritableList(ctx);
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === ctx.id) { list.splice(i, 1); break; }
    }
    saveData();
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

  $("modal-cancel").addEventListener("click", closeModal);
  $("modal-save").addEventListener("click", saveModal);
  $("modal-delete").addEventListener("click", askDelete);
  $("confirm-cancel").addEventListener("click", function () { $("confirm").hidden = true; });
  $("confirm-ok").addEventListener("click", confirmDelete);

  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });
  $("confirm").addEventListener("click", function (e) { if (e.target === $("confirm")) $("confirm").hidden = true; });
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
    fillTypeSelect();
    renderAll();
    setupEventListeners();
  } catch (error) {
    console.error("GRITEX Startfehler:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);
