let start = 1;
let end = 5;
const pageSize = 5;

const resultsDiv = document.getElementById("flightResults");
const pageInfo = document.getElementById("pageInfo");

// Fly Home Click Handler
document.addEventListener('DOMContentLoaded', function() {
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html'; // Redirect to homepage
        });
    }
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (start > 1) {
        start = Math.max(1, start - pageSize);
        end = start + pageSize - 1;
        loadFlights();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    start = end + 1;
    end = start + pageSize - 1;
    loadFlights();
});

document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    start = 1;
    end = pageSize;
    loadFlights();
});

async function loadFlights() {
    try {
        const url = `https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/flights?start=${start}&end=${end}`;
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
                <div class="date">
                    <span>${flight.departure_date || "Unknown Date"}</span>
                </div>
                <div class="times">${flight.departure_time || "Unknown Departure Time"} → ${flight.arrival_time || "Unknown Arrival Time"}</div>
            </div>
            <div class="flight-right">
                <span class="price">${flight.cost != null ? "$" + flight.cost : "N/A"}</span>
                <button class="book-btn">Book now</button>
            </div>
        `;
        
        const bookBtn = card.querySelector(".book-btn");
        const flightData = {
            id: flight.flight_number,
            dep_airport: flight.dep_airport,
            arr_airport: flight.arr_airport,
            departure_date: flight.departure_date,
            departure_time: flight.departure_time,
            arrival_time: flight.arrival_time,
            cost: flight.cost
        };

        bookBtn.addEventListener("click", () => {
        const flightsParam = encodeURIComponent(JSON.stringify(flightData));
        window.location.href = `checkout.html?flight=${flightsParam}`;
        });

        resultsDiv.appendChild(card);
    });
}

loadFlights();