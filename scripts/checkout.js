const params = new URLSearchParams(window.location.search);
let flight = {};
try {
    flight = JSON.parse(decodeURIComponent(params.get("flight") || "{}"));
} catch (e) {
    console.error("Failed to parse flight data:", e);
}

let seatMap = {};
let returnMap = {};
let returnId = null;
let start = 1;
let end = 5;
const pageSize = 5;

const resultsDiv = document.getElementById("flightResults");
const pageInfo = document.getElementById("pageInfo");

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

async function loadSeats(isRound) {
    try {
        let url = `https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flights/`;
        if(isRound) {
            url += `${returnId}/seats`;
        }else {
            url += `${flight.id}/seats`;
        }
        const response = await fetch(url);
        const data = await response.json();
        let seats = data.seats;
        if (!seats) {
            console.error("No seats found in response:", data);
            return;
        }

        let map = {};
        seats.forEach(seat => {
            map[seat.seat_number] = !seat.is_available;
        });

        if(isRound) {
            returnMap = map;
        }else {
            seatMap = map;
        }
    } catch (err) {
        console.error("Failed to load seat information:", err);
    }
}

let selectedSeat = null;
let returnSeat = null;
const baseCost = flight.cost;
let seatFee = 0;
let returnFee = 0;
let costMult = 1;

function buildSeatGrid(cabin, isRound) {
    let grid;
    if(isRound) {
        grid = document.getElementById("returnSeatGrid");
    }else {
        grid = document.getElementById("seatGrid");
    }
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
            let taken;
            if(isRound) {
                taken = returnMap[seatId] === true;
            }else {
                taken = seatMap[seatId] === true;
            }

            const seat = document.createElement("div");
            seat.className = "seat" + (taken ? " taken" : "");
            seat.dataset.seat = seatId;
            seat.textContent = seatId;

            if (!taken) {
                seat.addEventListener("click", () => selectSeat(seat, seatId, isRound));
                if(isRound && returnSeat === seatId) {
                    seat.classList.add("selected");
                }

                if (!isRound && selectedSeat === seatId) {
                    seat.classList.add("selected");
                }
            }
            rowEl.appendChild(seat);
        });

        grid.appendChild(rowEl);
    }
}

function updateCost() {
    const totalCost = (baseCost * costMult) + seatFee + returnFee;
    document.getElementById("flightCost").textContent = "$" + totalCost;
}

function clearSelectedSeats(gridId) {
    document.querySelectorAll(`#${gridId} .seat.selected`)
        .forEach(s => s.classList.remove("selected"));
}

function selectSeat(el, seatId, isRound) {
    let gridId = isRound ? "returnSeatGrid" : "seatGrid";
    clearSelectedSeats(gridId);
    el.classList.add("selected");
    if(isRound) {
        returnSeat = seatId;
        document.getElementById("returnSelectedSeatDisplay").textContent = seatId;
    }else {
        selectedSeat = seatId;
        document.getElementById("selectedSeatDisplay").textContent = seatId;
    }
    let cabin;
    if(isRound) {
        cabin = document.querySelector(".rtab.active").dataset.class
    }else {
        cabin = document.querySelector(".tab.active").dataset.class;
    }
    let fee = 0;
    // Economy base - Free, Window +$25
    // Business +$400 fee, All seats free
    // First class +$600 fee, All seats free
    // Return Seat back will be free of charge
    // Still fees for > economy class for return flight
    if (cabin === "economy" && !isRound) {
        if (seatId.endsWith("A") || seatId.endsWith("F")) {
            fee = 25;
        }
    }

    if (cabin === "business") fee = 400;
    if (cabin === "first") fee = 600;

    if(isRound) {
        returnSeat = seatId;
        document.getElementById("returnSelectedSeatDisplay").textContent = seatId;
        returnFee = fee;
    }else {
        selectedSeat = seatId;
        document.getElementById("selectedSeatDisplay").textContent = seatId;
        seatFee = fee;
    }
    
    updateCost();
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        buildSeatGrid(tab.dataset.class, false);
        // Reset seat selection and cost when switching cabins
        selectedSeat = null;
        seatFee = 0;
        document.getElementById("selectedSeatDisplay").textContent = "None";
        updateCost();
    });
});

document.querySelectorAll(".rtab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".rtab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        buildSeatGrid(tab.dataset.class, true);
        // Reset seat selection and cost when switching cabins
        returnSeat = null;
        returnFee = 0;
        document.getElementById("returnSelectedSeatDisplay").textContent = "None";
        updateCost();
    });
});

async function renderSeats(cabin, isRound) {
    let grid;
    if(isRound) {
        grid = document.getElementById("returnSeatGrid")
    }else {
        grid = document.getElementById("seatGrid");
    }
    grid.innerHTML = "<p><br>Fetching Seats...</p>";
    await loadSeats(isRound);
    buildSeatGrid(cabin, isRound);
}

async function init() {
    await renderSeats("economy", false);
}

init();

document.getElementById("confirmButton").addEventListener("click", (e) => {
    e.preventDefault();

    if (!selectedSeat) {
        alert("Please select a seat before confirming.");
        return;
    }

    if(!returnSeat && !document.querySelector(".seat-section").hidden) {
        alert("Please select a return seat before confirming.");
        return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName  = document.getElementById("lastName").value.trim();
    if (!firstName || !lastName) {
        alert("Please enter both first and last names.");
        return;
    }

    // Build confirmation message
    const type = document.getElementById("type").value === "round" ? "Round-Trip" : "One-Way";
    const cost = document.getElementById("flightCost").textContent;
    const departingRoute = `${flight.dep_airport || "?"} → ${flight.arr_airport || "?"}`;
    let returnRoute = "";
    if (returnSeat) {
        returnRoute = `${flight.arr_airport || "?"} → ${flight.dep_airport || "?"}`;
    }

    document.getElementById("confirmSummary").innerHTML = `
        <div class="confirm-wrapper">
            <div class="confirm-card">
                <h3>Departing Flight</h3>
                <div class="confirm-row"><span>Route</span><span>${departingRoute}</span></div>
                <div class="confirm-row"><span>Seat</span><span>${selectedSeat}</span></div>
            </div>
            ${type === "Round-Trip" ? `
            <div class="confirm-card">
                <h3>Return Flight</h3>
                <div class="confirm-row"><span>Route</span><span>${returnRoute}</span></div>
                <div class="confirm-row"><span>Seat</span><span>${returnSeat}</span></div>
            </div>
            ` : ""}
            <div class="confirm-card summary">
                <h3>Summary</h3>
                <div class="confirm-row">
                    <span>Name</span><span>${firstName} ${lastName}</span></div>
                </div>
                <div class="confirm-row">
                    <span>Trip Type</span>
                    <span>${type}</span>
                </div>
                <div class="confirm-row total">
                    <span>Total Cost</span>
                    <span>${cost}</span>
                </div>
            </div>
        </div>
`;
    document.getElementById("confirmPopup").hidden = false;
});

document.querySelector("#confirmPopup .submit-btn").addEventListener("click", async () => {
    try {
        const response = await fetch("https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flights/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                flight_id: flight.id,
                seat_number: selectedSeat,
                return_id: returnId || null,
                return_seat: returnSeat || null
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Booking failed");
        }
    document.getElementById("confirmPopup").hidden = true;
    document.getElementById("bookingConfirmPopup").hidden = false;
    } catch (err) {
        console.error("Booking error:", err);
        alert("Failed to book the flight: " + err.message);
    }
});

document.getElementById("type").addEventListener("change", async (e) => {
    const isRoundTrip = e.target.value === "round";
    costMult = isRoundTrip ? 2 : 1;
    updateCost();

    const resultsSect = document.querySelector(".results-section");
    const seatsSect = document.querySelector(".seat-section");
    if(isRoundTrip) {
        await loadReturnFlight();
        resultsSect.hidden = false;
    }else {
        resultsSect.hidden = true;
        seatsSect.hidden = true;
    }
});

async function loadReturnFlight() {
    try {
        const url = `https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flight/filters?dep_airport=${flight.arr_airport}&arr_airport=${flight.dep_airport}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        renderFlights(data.data);
        pageInfo.textContent = `Page ${data.pagination.page}`;
    } catch (err) {
        console.error("Failed to load flights:", err);
        resultsDiv.innerHTML = "<p style='color:red'>Failed to load flights</p>";
    }
}

function getAirlineLogo(airline) {
    const logos = {
        "United Airlines": "assets/unitedlogo.png",
        "Delta Airlines": "assets/Delta-Logo.png",
        "American Airlines": "assets/americanlogo.jpg",
        "Spirit Airlines": "assets/Spirit-Airlines-logo.png",
        "Southwest Airlines": "assets/southwestlogo.png",
    };

    return logos[airline] || "assets/nothing.png";
}

async function getSeats(flightId) {
    try {
        const res = await fetch(`https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flights/${flightId}/seats/summary`);
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Failed to load seat information:", err);
        return {
            flight_id: flightId,
            total_seats: 0,
            unbooked_seats: 0,
            booked_seats: 0
        };
    }
}

function renderFlights(flights) {
    resultsDiv.innerHTML = "";
    if (!flights || flights.length === 0) {
        resultsDiv.innerHTML = "<p>No flights found.</p>";
        return;
    }
    flights.forEach(flight => {
        const card = document.createElement("div");
        card.className = "flight-card";
        card.innerHTML = `
            <div class="flight-left">
                <div class="airline-sec">
                    <img class="airline-logo" src="${getAirlineLogo(flight.owner)}" alt="${flight.owner || "Airline Logo"}">
                    <span class="airline-name">${flight.owner || "Unknown Airline"}</span>
                </div>
                <div class="flight-num">
                    <span>${flight.flight_number || "Unknown Flight Number"}</span>
                </div>
                <div class="plane-info">
                    <span>${flight.plane_type || "Unknown Plane Type"}</span>
                    <span>${flight.plane_icao || "Unknown ICAO"}</span>
                </div>
                <div class="route_iata">
                    <span>${flight.dep_airport || "Unknown Departure Airport"}</span>
                    <span class="route-arrow">→</span>
                    <span>${flight.arr_airport || "Unknown Arrival Airport"}</span>
                </div>
                <div class="route_name">
                    <span>${flight.dep_airport_name || "Unknown Departure Airport Name"}</span>
                    <span class="route-arrow">→</span>
                    <span>${flight.arr_airport_name || "Unknown Arrival Airport Name"}</span>
                </div>
                <div class="seats">
                    <span> Loading seats... </span>
                </div>
                <div class="date">
                    <span>${flight.departure_date || "Unknown Date"}</span>
                </div>
                <div class="times">
                    <span>${formatTime(flight.departure_time)} → ${formatTime(flight.arrival_time)}</span>
                </div>
            </div>
            <div class="flight-right">
                <button class="book-btn">Select</button>
            </div>
        `;
        
        const bookBtn = card.querySelector(".book-btn");
        bookBtn.addEventListener("click", async () => {
            returnId = flight.flight_id;
            const resultsSect = document.querySelector(".results-section");
            const seatsSect = document.querySelector(".seat-section");
            await renderSeats("economy", true);
            resultsSect.hidden = true;
            seatsSect.hidden = false;
        });

        const seatsDiv = card.querySelector(".seats");
        getSeats(flight.flight_id).then(seatInfo => {
            const seatText = `👤 ${seatInfo.booked_seats}/${seatInfo.total_seats}`;
            seatsDiv.textContent = seatText;
        }).catch(() => {
            seatsDiv.textContent = "Seats: Unknown";
        });

        resultsDiv.appendChild(card);
    });
}