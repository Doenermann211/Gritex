const weekDays = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag"
];

let currentDate = new Date();
let selectedDate = new Date();

let weeklyPlan = JSON.parse(localStorage.getItem("gritexPlan")) || {
    1: { name: "Lockerer Lauf", description: "30 Minuten entspannt laufen" },
    2: null,
    3: { name: "Intervalle", description: "40 Minuten Intervalltraining" },
    4: null,
    5: { name: "Radfahren", description: "45 Minuten locker Rad fahren" },
    6: { name: "Langer Lauf", description: "60 Minuten ruhiger Lauf" },
    0: null
};

let restDays = JSON.parse(localStorage.getItem("gritexRestDays")) || {};

document.addEventListener("DOMContentLoaded", () => {
    updateToday();
    renderCalendar();
    renderWeeklyPlan();
});


/* -------------------------
   SEITEN
------------------------- */

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (pageId === "homePage") {
        document.querySelectorAll(".nav-item")[0].classList.add("active");
    }

    if (pageId === "planPage") {
        document.querySelectorAll(".nav-item")[1].classList.add("active");
    }

    window.scrollTo(0, 0);
}

function openSettings() {
    showPage("settingsPage");
}


/* -------------------------
   HEUTE
------------------------- */

function updateToday() {
    const today = new Date();

    document.getElementById("todayText").textContent =
        today.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    const training = getTrainingForDate(today);

    const title = document.getElementById("todayTraining");
    const description = document.getElementById("todayDescription");

    if (training) {
        title.textContent = training.name;
        description.textContent = training.description;
    } else {
        title.textContent = "Ruhetag";
        description.textContent = "Heute steht kein Training an.";
    }
}


/* -------------------------
   KALENDER
------------------------- */

function renderCalendar() {
    const calendar = document.getElementById("calendar");
    const monthTitle = document.getElementById("monthTitle");

    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthTitle.textContent = currentDate.toLocaleDateString(
        "de-DE",
        {
            month: "long",
            year: "numeric"
        }
    );

    const firstDay = new Date(year, month, 1);

    let startDay = firstDay.getDay();

    // Sonntag wird im Kalender ans Ende verschoben
    startDay = startDay === 0 ? 6 : startDay - 1;

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const date = new Date(year, month, day);

        const button = document.createElement("button");
        button.className = "day";
        button.textContent = day;

        if (isToday(date)) {
            button.classList.add("today");
        }

        if (isSameDate(date, selectedDate)) {
            button.classList.add("selected");
        }

        if (restDays[getDateKey(date)]) {
            button.classList.add("rest-day");
        } else if (getTrainingForDate(date)) {
            button.classList.add("has-training");
        }

        button.onclick = () => {
            selectedDate = date;
            openDay(date);
        };

        calendar.appendChild(button);
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}


/* -------------------------
   TAGESANSICHT
------------------------- */

function openDay(date) {
    selectedDate = date;

    document.getElementById("selectedDayDate").textContent =
        date.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const content =
        document.getElementById("selectedDayContent");

    const training = getTrainingForDate(date);

    if (restDays[getDateKey(date)]) {

        document.getElementById("selectedDayTitle").textContent =
            "Ruhetag";

        content.innerHTML = `
            <div class="training-detail">
                <h2>🛌 Kein Training</h2>
                <p>
                    Du hast diesen Tag manuell als Ruhetag festgelegt.
                </p>
            </div>
        `;

    } else if (training) {

        document.getElementById("selectedDayTitle").textContent =
            training.name;

        content.innerHTML = `
            <div class="training-detail">
                <h2>${training.name}</h2>
                <p>${training.description}</p>
            </div>
        `;

    } else {

        document.getElementById("selectedDayTitle").textContent =
            "Ruhetag";

        content.innerHTML = `
            <div class="training-detail">
                <h2>🛌 Kein Training</h2>
                <p>
                    Laut deinem Wochenplan ist heute kein Training vorgesehen.
                </p>
            </div>
        `;
    }

    renderCalendar();
    showPage("dayPage");
}


/* -------------------------
   RUHETAG
------------------------- */

function setRestDay() {
    const key = getDateKey(selectedDate);

    restDays[key] = true;

    localStorage.setItem(
        "gritexRestDays",
        JSON.stringify(restDays)
    );

    openDay(selectedDate);
    updateToday();
}


/* -------------------------
   WOCHENPLAN
------------------------- */

function renderWeeklyPlan() {
    const container =
        document.getElementById("weeklyPlan");

    container.innerHTML = "";

    weekDays.forEach((day, index) => {

        const plan = weeklyPlan[index];

        const div = document.createElement("div");
        div.className = "plan-day";

        div.innerHTML = `
            <div class="plan-day-header">
                <div>
                    <h3>${day}</h3>
                    <p>
                        ${plan
                            ? plan.name
                            : "Ruhetag"}
                    </p>
                </div>

                <button
                    class="edit-button"
                    onclick="editTraining(${index})">
                    ✎
                </button>
            </div>
        `;

        container.appendChild(div);
    });
}


/* -------------------------
   TRAINING BEARBEITEN
------------------------- */

function editTraining(dayIndex) {

    const dayName = weekDays[dayIndex];

    const name = prompt(
        `Training für ${dayName}:\n\nName des Trainings:`,
        weeklyPlan[dayIndex]?.name || ""
    );

    if (name === null) {
        return;
    }

    if (name.trim() === "") {
        weeklyPlan[dayIndex] = null;
    } else {

        const description = prompt(
            "Beschreibung des Trainings:",
            weeklyPlan[dayIndex]?.description || ""
        );

        weeklyPlan[dayIndex] = {
            name: name.trim(),
            description:
                description?.trim() || "Trainingseinheit"
        };
    }

    localStorage.setItem(
        "gritexPlan",
        JSON.stringify(weeklyPlan)
    );

    renderWeeklyPlan();
    renderCalendar();
    updateToday();
}


/* -------------------------
   TRAINING FÜR EIN DATUM
------------------------- */

function getTrainingForDate(date) {

    const key = getDateKey(date);

    // Ein manuell gesetzter Ruhetag hat Vorrang
    if (restDays[key]) {
        return null;
    }

    const day = date.getDay();

    return weeklyPlan[day] || null;
}


/* -------------------------
   BENACHRICHTIGUNGEN
------------------------- */

function requestNotifications() {

    if (!("Notification" in window)) {
        alert(
            "Dieser Browser unterstützt keine Benachrichtigungen."
        );
        return;
    }

    Notification.requestPermission().then(permission => {

        if (permission === "granted") {

            const training = getTrainingForDate(new Date());

            if (training) {
                new Notification("Gritex", {
                    body:
                        `Heute steht an: ${training.name}`
                });
            } else {
                new Notification("Gritex", {
                    body:
                        "Heute steht kein Training an."
                });
            }

        } else {
            alert(
                "Benachrichtigungen wurden nicht aktiviert."
            );
        }
    });
}


/* -------------------------
   HILFSFUNKTIONEN
------------------------- */

function getDateKey(date) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isToday(date) {
    return isSameDate(date, new Date());
}

function isSameDate(a, b) {

    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
