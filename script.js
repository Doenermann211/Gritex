function selectSport(sport, button) {
    document.querySelectorAll(".sport").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");

    document.getElementById("sportTitle").textContent =
        sport === "Laufen" ? "Laufplan" :
        sport === "Radfahren" ? "Radfahrplan" :
        "Schwimmplan";

    document.getElementById("message").textContent =
        `${sport} ausgewählt.`;
}

function startTraining() {
    document.getElementById("message").textContent =
        "Training gestartet! Viel Erfolg 💪";
}
