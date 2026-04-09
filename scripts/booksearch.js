let start = 1;
let end = 5;
const pageSize = 5;

const resultsDiv = document.getElementById("flightResults");
const pageInfo = document.getElementById("pageInfo");

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
                <div class="plane-type">
                    <span>${flight.plane_type || "Unknown Plane Type"}</span>
                </div>
                <div class="route_iata">
                    <span>${flight.dep_airport}</span>
                    <span class="route-arrow">→</span>
                    <span>${flight.arr_airport}</span>
                </div>
                <div class="route_name">
                    <span>${flight.dep_airport_name}</span>
                    <span class="route-arrow">→</span>
                    <span>${flight.arr_airport_name}</span>
                </div>
                <div class="date">
                    <span>${flight.departure_date || "Unknown Date"}</span>
                </div>
                <div class="times">${flight.departure_time || ""} → ${flight.arrival_time || ""}</div>
            </div>
            <div class="flight-right">
                <span class="price">${flight.cost != null ? "$" + flight.cost : "N/A"}</span>
                <button class="book-btn">Book now</button>
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

loadFlights();