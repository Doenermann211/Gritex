document.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app");

    app.innerHTML = `
        <div class="card">
            <h2>Willkommen bei Gritex</h2>
            <p>Deine Trainingsplan-App.</p>

            <label for="sport">Sport auswählen</label>
            <select id="sport">
                <option value="running">Laufen</option>
                <option value="cycling">Radfahren</option>
                <option value="swimming">Schwimmen</option>
            </select>

            <button id="startButton">Training starten</button>

            <p id="message"></p>
        </div>
    `;

    const button = document.getElementById("startButton");
    const sport = document.getElementById("sport");
    const message = document.getElementById("message");

    button.addEventListener("click", () => {
        const selectedSport = sport.options[sport.selectedIndex].text;
        message.textContent = `Dein ${selectedSport}-Training wurde ausgewählt.`;
    });
});
