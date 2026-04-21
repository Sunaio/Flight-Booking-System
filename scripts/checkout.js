const params = new URLSearchParams(window.location.search);
let flight = {};
try {
    flight = JSON.parse(decodeURIComponent(params.get("flight") || "{}"));
} catch (e) {
    console.error("Failed to parse flight data:", e);
}

let seatMap = {};

// 12-hour Time formatting
function formatTime(timeStr) {
    if (!timeStr) return "Unknown Time";
    const [hour, minute] = timeStr.split(":");
    let hours = parseInt(hour);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minute} ${ampm}`;
}

// Populate flight summary
document.getElementById("depAirport").textContent  = flight.dep_airport  || "—";
document.getElementById("arrAirport").textContent  = flight.arr_airport  || "—";
document.getElementById("flightCost").textContent = flight.cost != null ? "$" + flight.cost : "";
document.getElementById("airline").textContent   = flight.airline || "—";
document.getElementById("date").textContent = flight.departure_date || "—";
document.getElementById("time").textContent = flight.departure_time && flight.arrival_time ? `${formatTime(flight.departure_time)} → ${formatTime(flight.arrival_time)}` : "—";

// Seat mappings
const ROWS = 21;
const COLS = ["A", "B", "C", "D", "E", "F"];

async function loadSeats() {
    try {
        const response = await fetch(`https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flights/${flight.id}/seats`);
        const data = await response.json();
        seatMap = {};
        data.seats.forEach(seat => {
            seatMap[seat.seat_number] = !seat.is_available;
        });
    } catch (err) {
        console.error("Failed to load seat information:", err);
    }
}

let selectedSeat = null;
const baseCost = flight.cost;
let seatFee = 0;
let costMult = 1;

function buildSeatGrid(cabin) {
    const grid = document.getElementById("seatGrid");
    grid.innerHTML = "";

    const startRow = cabin === "first" ? 1 : cabin === "business" ? 4 : 8;
    const numRows  = cabin === "first" ? 3 : cabin === "business" ? 4 : ROWS - 8;

    for (let r = startRow; r < startRow + numRows; r++) {
        const rowEl = document.createElement("div");
        rowEl.className = "seat-row";

        // Row number label
        const numEl = document.createElement("span");
        numEl.className = "row-num";
        numEl.textContent = r;
        rowEl.appendChild(numEl);

        COLS.forEach((col, ci) => {
            // Aisle gap between C and D
            if (ci === 3) {
                const gap = document.createElement("div");
                gap.className = "aisle-gap";
                rowEl.appendChild(gap);
            }

            const seatId = `${r}${col}`;
            const taken  = seatMap[seatId] === true;

            const seat = document.createElement("div");
            seat.className = "seat" + (taken ? " taken" : "");
            seat.dataset.seat = seatId;
            seat.textContent = seatId;

            if (!taken) {
                seat.addEventListener("click", () => selectSeat(seat, seatId));
                if (selectedSeat === seatId) seat.classList.add("selected");
            }
            rowEl.appendChild(seat);
        });

        grid.appendChild(rowEl);
    }
}

function updateCost() {
    const totalCost = (baseCost * costMult) + seatFee;
    document.getElementById("flightCost").textContent = "$" + totalCost;
}

function selectSeat(el, seatId) {
    document.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
    el.classList.add("selected");
    selectedSeat = seatId;
    document.getElementById("selectedSeatDisplay").textContent = seatId;
    let cabin = document.querySelector(".tab.active").dataset.class;
    seatFee = 0;
    // Economy base - Free, Window +$25
    // Business +$400 fee, All seats free
    // First class +$600 fee, All seats free
    if (cabin === "economy") {
        if (seatId.endsWith("A") || seatId.endsWith("F")) {
            seatFee = 25;
        }
    }

    if (cabin === "business") seatFee = 400;
    if (cabin === "first") seatFee = 600;
    updateCost();
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        buildSeatGrid(tab.dataset.class);
        // Reset seat selection and cost when switching cabins
        selectedSeat = null;
        seatFee = 0;
        document.getElementById("selectedSeatDisplay").textContent = "None";
        updateCost();
    });
});

async function renderSeats(cabin) {
    const grid = document.getElementById("seatGrid");
    grid.innerHTML = "<p><br>Fetching Seats...</p>";
    await loadSeats();
    buildSeatGrid(cabin);
}

async function init() {
    await renderSeats("economy");
}

init();

document.getElementById("confirmButton").addEventListener("click", (e) => {
    e.preventDefault();

    if (!selectedSeat) {
        alert("Please select a seat before confirming.");
        return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName  = document.getElementById("lastName").value.trim();
    if (!firstName || !lastName) {
        alert("Please enter both first and last names.");
        return;
    }

    // Build confirmation message
    const route = `${flight.dep_airport || "?"} → ${flight.arr_airport || "?"}`;
    document.getElementById("confirmSummary").innerHTML =
        `Name: ${firstName} ${lastName} <br>
        ${route} <br>
        Seat: ${selectedSeat} <br>
        Cost: ${document.getElementById("flightCost").textContent} <br>
        Type: ${document.getElementById("type").value === "round" ? "Round-Trip" : "One-Way"}`;

    document.getElementById("confirmPopup").hidden = false;
});

document.querySelector("#confirmPopup .submit-btn").addEventListener("click", () => {
    document.getElementById("confirmPopup").hidden = true;
    document.getElementById("bookingConfirmPopup").hidden = false;
});

document.getElementById("type").addEventListener("change", (e) => {
    costMult = (e.target.value === "round") ? 2 : 1;
    updateCost();
});
