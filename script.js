const DAYS = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag"
];

const SHORT_DAYS = [
    "SO",
    "MO",
    "DI",
    "MI",
    "DO",
    "FR",
    "SA"
];

const DEFAULT_PLAN = {
    0: null,
    1: {
        name: "Lockerer Lauf",
        description: "30 Minuten entspannt laufen."
    },
    2: null,
    3: {
        name: "Intervalltraining",
        description: "5 × 4 Minuten schnell, dazwischen locker erholen."
    },
    4: null,
    5: {
        name: "Kraft & Stabilität",
        description: "30 Minuten Ganzkörpertraining."
    },
    6: {
        name: "Langer Lauf",
        description: "Ruhiger Lauf mit gleichmäßigem Tempo."
    }
};


/* =========================
   DATEN LADEN
========================= */

let weeklyPlan =
    JSON.parse(localStorage.getItem("gritexWeeklyPlan")) ||
    DEFAULT_PLAN;

let restDays =
    JSON.parse(localStorage.getItem("gritexRestDays")) ||
    {};

let currentMonth = new Date();
currentMonth.setDate(1);

let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);

let editingDay = null;


/* =========================
   HILFSFUNKTIONEN
========================= */

function saveData() {
    localStorage.setItem(
        "gritexWeeklyPlan",
        JSON.stringify(weeklyPlan)
    );

    localStorage.setItem(
        "gritexRestDays",
        JSON.stringify(restDays)
    );
}


function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function sameDate(a, b) {
    return dateKey(a) === dateKey(b);
}


function getTraining(date) {

    const key = dateKey(date);

    // Ein individueller Ruhetag hat Vorrang
    if (restDays[key]) {
        return {
            rest: true,
            name: "Ruhetag",
            description: "Für diesen Tag wurde manuell ein Ruhetag festgelegt."
        };
    }

    const weekday = date.getDay();

    return weeklyPlan[weekday] || null;
}


function formatLongDate(date) {

    return date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}


function formatMonth(date) {

    return date.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric"
    });
}


/* =========================
   KALENDER
========================= */

function renderCalendar() {

    const grid = document.getElementById("calendarGrid");
    const title = document.getElementById("monthTitle");

    grid.innerHTML = "";

    title.textContent = formatMonth(currentMonth);


    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);

    // Montag = 0
    let startDay = firstDay.getDay() - 1;

    if (startDay < 0) {
        startDay = 6;
    }


    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const previousMonthDays =
        new Date(year, month, 0).getDate();


    // Tage des vorherigen Monats
    for (let i = startDay - 1; i >= 0; i--) {

        const dayNumber = previousMonthDays - i;

        const date = new Date(
            year,
            month - 1,
            dayNumber
        );

        createCalendarDay(
            grid,
            date,
            true
        );
    }


    // Aktueller Monat
    for (let day = 1; day <= daysInMonth; day++) {

        const date = new Date(
            year,
            month,
            day
        );

        createCalendarDay(
            grid,
            date,
            false
        );
    }


    // Tage des nächsten Monats
    const totalCells = 42;

    const currentCells =
        startDay + daysInMonth;

    for (
        let day = 1;
        currentCells < totalCells;
        day++
    ) {

        const date = new Date(
            year,
            month + 1,
            day
        );

        createCalendarDay(
            grid,
            date,
            true
        );
    }
}


function createCalendarDay(
    grid,
    date,
    otherMonth
) {

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";

    if (otherMonth) {
        button.classList.add("other-month");
    }


    if (sameDate(date, new Date())) {
        button.classList.add("today");
    }


    if (sameDate(date, selectedDate)) {
        button.classList.add("selected");
    }


    const number = document.createElement("span");

    number.className = "day-number";
    number.textContent = date.getDate();

    button.appendChild(number);


    const training = getTraining(date);

    if (training) {

        const dot = document.createElement("span");

        dot.className = "dot";

        if (training.rest) {
            dot.classList.add("rest-dot");
        } else {
            dot.classList.add("training-dot");
        }

        button.appendChild(dot);
    }


    button.addEventListener(
        "click",
        () => {

            selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);

            // Wenn ein anderer Monat angeklickt wurde,
            // wechseln wir automatisch dorthin.
            if (otherMonth) {
                currentMonth = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1
                );
            }

            renderCalendar();
            renderSelectedDay();
        }
    );


    grid.appendChild(button);
}


/* =========================
   AUSGEWÄHLTER TAG
========================= */

function renderSelectedDay() {

    const dateElement =
        document.getElementById("selectedDate");

    const nameElement =
        document.getElementById("selectedTrainingName");

    const descriptionElement =
        document.getElementById("selectedTrainingDescription");

    const iconElement =
        document.getElementById("selectedDayIcon");

    const editButton =
        document.getElementById("editDayBtn");

    const restButton =
        document.getElementById("restDayBtn");


    dateElement.textContent =
        formatLongDate(selectedDate);


    const training =
        getTraining(selectedDate);


    if (!training) {

        nameElement.textContent =
            "Kein Training";

        descriptionElement.textContent =
            "Für diesen Tag ist momentan keine Einheit geplant.";

        iconElement.textContent = "—";

        editButton.style.display = "none";

    } else if (training.rest) {

        nameElement.textContent =
            "Ruhetag";

        descriptionElement.textContent =
            training.description;

        iconElement.textContent = "🛌";

        editButton.style.display = "none";

    } else {

        nameElement.textContent =
            training.name;

        descriptionElement.textContent =
            training.description;

        iconElement.textContent = "🏃";

        editButton.style.display = "block";
    }


    if (restDays[dateKey(selectedDate)]) {

        restButton.textContent =
            "Ruhetag entfernen";

    } else {

        restButton.textContent =
            "🛌 Ruhetag";
    }
}


/* =========================
   WOCHENPLAN
========================= */

function renderWeeklyPlan() {

    const container =
        document.getElementById("weeklyPlan");

    container.innerHTML = "";


    // Montag bis Sonntag
    for (let day = 1; day <= 7; day++) {

        const weekday =
            day === 7 ? 0 : day;

        const training =
            weeklyPlan[weekday];


        const card =
            document.createElement("div");

        card.className = "plan-card";


        const dayBadge =
            document.createElement("div");

        dayBadge.className = "plan-day";

        dayBadge.textContent =
            SHORT_DAYS[weekday];


        const info =
            document.createElement("div");

        info.className = "plan-info";


        const title =
            document.createElement("h3");

        title.textContent =
            training
                ? training.name
                : "Kein Training";


        const description =
            document.createElement("p");

        description.textContent =
            training
                ? training.description
                : "Freier Tag";


        info.appendChild(title);
        info.appendChild(description);


        const editButton =
            document.createElement("button");

        editButton.type = "button";
        editButton.className = "edit-plan-btn";
        editButton.textContent = "✎";

        editButton.addEventListener(
            "click",
            () => openEditor(weekday)
        );


        card.appendChild(dayBadge);
        card.appendChild(info);
        card.appendChild(editButton);

        container.appendChild(card);
    }
}


/* =========================
   MODAL
========================= */

function openEditor(day) {

    editingDay = day;

    const modal =
        document.getElementById("editModal");

    const nameInput =
        document.getElementById("trainingName");

    const descriptionInput =
        document.getElementById("trainingDescription");


    const training =
        weeklyPlan[day];


    nameInput.value =
        training ? training.name : "";

    descriptionInput.value =
        training ? training.description : "";


    modal.classList.remove("hidden");
}


function closeEditor() {

    document
        .getElementById("editModal")
        .classList.add("hidden");

    editingDay = null;
}


function saveTraining() {

    if (editingDay === null) {
        return;
    }


    const name =
        document
            .getElementById("trainingName")
            .value
            .trim();

    const description =
        document
            .getElementById("trainingDescription")
            .value
            .trim();


    if (!name) {

        alert("Bitte gib einen Namen für das Training ein.");

        return;
    }


    weeklyPlan[editingDay] = {
        name: name,
        description:
            description ||
            "Trainingseinheit"
    };


    saveData();

    closeEditor();

    renderWeeklyPlan();
    renderCalendar();
    renderSelectedDay();
}


function deleteTraining() {

    if (editingDay === null) {
        return;
    }


    weeklyPlan[editingDay] = null;

    saveData();

    closeEditor();

    renderWeeklyPlan();
    renderCalendar();
    renderSelectedDay();
}


/* =========================
   RUHETAG
========================= */

function toggleRestDay() {

    const key =
        dateKey(selectedDate);


    if (restDays[key]) {

        delete restDays[key];

    } else {

        restDays[key] = true;
    }


    saveData();

    renderCalendar();
    renderSelectedDay();
}


/* =========================
   NAVIGATION
========================= */

function showScreen(screen) {

    const calendarScreen =
        document.getElementById("calendarScreen");

    const planScreen =
        document.getElementById("planScreen");

    const settingsScreen =
        document.getElementById("settingsScreen");


    calendarScreen.classList.add("hidden");
    planScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");


    document
        .getElementById("calendarNav")
        .classList.remove("active");

    document
        .getElementById("planNav")
        .classList.remove("active");

    document
        .getElementById("settingsNav")
        .classList.remove("active");


    if (screen === "calendar") {

        calendarScreen.classList.remove("hidden");

        document
            .getElementById("calendarNav")
            .classList.add("active");

    }


    if (screen === "plan") {

        planScreen.classList.remove("hidden");

        document
            .getElementById("planNav")
            .classList.add("active");

        renderWeeklyPlan();
    }


    if (screen === "settings") {

        settingsScreen.classList.remove("hidden");

        document
            .getElementById("settingsNav")
            .classList.add("active");
    }
}


/* =========================
   BENACHRICHTIGUNGEN
========================= */

async function enableNotifications() {

    if (!("Notification" in window)) {

        alert(
            "Dieser Browser unterstützt keine Benachrichtigungen."
        );

        return;
    }


    const permission =
        await Notification.requestPermission();


    if (permission === "granted") {

        alert(
            "Benachrichtigungen wurden aktiviert."
        );

        showTodayNotification();

    } else {

        alert(
            "Benachrichtigungen wurden nicht aktiviert."
        );
    }
}


function showTodayNotification() {

    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }


    const today =
        new Date();

    const training =
        getTraining(today);


    if (!training) {
        return;
    }


    const lastNotification =
        localStorage.getItem(
            "gritexLastNotification"
        );


    const todayKey =
        dateKey(today);


    if (lastNotification === todayKey) {
        return;
    }


    new Notification(
        training.rest
            ? "Gritex – Ruhetag"
            : "Gritex – Training heute",
        {
            body:
                training.name +
                "\n" +
                training.description
        }
    );


    localStorage.setItem(
        "gritexLastNotification",
        todayKey
    );
}


/* =========================
   BUTTONS
========================= */

document
    .getElementById("prevMonth")
    .addEventListener(
        "click",
        () => {

            currentMonth.setMonth(
                currentMonth.getMonth() - 1
            );

            renderCalendar();
        }
    );


document
    .getElementById("nextMonth")
    .addEventListener(
        "click",
        () => {

            currentMonth.setMonth(
                currentMonth.getMonth() + 1
            );

            renderCalendar();
        }
    );


document
    .getElementById("restDayBtn")
    .addEventListener(
        "click",
        toggleRestDay
    );


document
    .getElementById("editDayBtn")
    .addEventListener(
        "click",
        () => {

            const weekday =
                selectedDate.getDay();

            openEditor(weekday);
        }
    );


document
    .getElementById("saveTrainingBtn")
    .addEventListener(
        "click",
        saveTraining
    );


document
    .getElementById("deleteTrainingBtn")
    .addEventListener(
        "click",
        deleteTraining
    );


document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        closeEditor
    );


document
    .getElementById("editModal")
    .addEventListener(
        "click",
        (event) => {

            if (
                event.target.id === "editModal"
            ) {
                closeEditor();
            }
        }
    );


document
    .getElementById("calendarNav")
    .addEventListener(
        "click",
        () => showScreen("calendar")
    );


document
    .getElementById("planNav")
    .addEventListener(
        "click",
        () => showScreen("plan")
    );


document
    .getElementById("settingsNav")
    .addEventListener(
        "click",
        () => showScreen("settings")
    );


document
    .getElementById("settingsBtn")
    .addEventListener(
        "click",
        () => showScreen("settings")
    );


document
    .getElementById("notificationBtn")
    .addEventListener(
        "click",
        enableNotifications
    );


/* =========================
   START
========================= */

document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString("de-DE", {
        day: "numeric",
        month: "short"
    });


renderCalendar();
renderSelectedDay();
