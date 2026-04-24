let next_id = 0;
let cursorHistory = [0];
let currentPage = 1;
const pageSize = 5;
let airports = [];
let selectedTime = null;
let lastCursor = null;
const base = "https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net";

const resultsDiv = document.getElementById("flightResults");
const pageInfo = document.getElementById("pageInfo");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const fromBox = document.getElementById("from-suggest");
const toBox = document.getElementById("to-suggest");
const timeButtons = document.querySelectorAll(".time-btn");

// 12-hour Time formatting
function formatTime(timeStr) {
    if (!timeStr) return "Unknown Time";
    const [hour, minute] = timeStr.split(":");
    let hours = parseInt(hour);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minute} ${ampm}`;
}

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

// Filter Dropdown
const toggleBtn = document.getElementById("filterToggle");
const filterMenu = document.getElementById("filterMenu");

toggleBtn.addEventListener("click", () => {
    filterMenu.classList.toggle("active");
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (cursorHistory.length > 1) {
        cursorHistory.pop();
        next_id = cursorHistory[cursorHistory.length - 1];
        currentPage--;
        loadFlights();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    if (lastCursor) {
        cursorHistory.push(next_id);
        next_id = lastCursor;
        currentPage++;
        loadFlights();
    }
});

document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    resetPagination();
    loadFlights();
});

// Getting search and filter parameters
function getSearchParams() {
    const from = document.getElementById("from").value.trim();
    const to = document.getElementById("to").value.trim();
    const departureUnformat = document.getElementById("departure").value;
    let departureDate = "";

    if(departureUnformat) {
        //Convert to YYYY-MM-DD format
        const depDateObj = new Date(departureUnformat);
        departureDate = depDateObj.toISOString().split('T')[0];
    }
    return {
        dep_airport: from || null,
        arr_airport: to || null,
        dep_time: departureDate || null
    };
}

function getFilterParams() {
    const min_price = document.getElementById("minPrice").value.trim();
    const max_price = document.getElementById("maxPrice").value.trim();
    const airline = document.getElementById("airline").value;
    const time_range = selectedTime;
    return {
        min_price: min_price || null,
        max_price: max_price || null,
        airline: airline || null,
        time_range: time_range || null
    };
}

// Filter and Search button handler
document.getElementsByClassName("search-btn")[0].addEventListener("click", (e) => {
    e.preventDefault();
    resetPagination();
    loadFlights();
});

document.getElementsByClassName("filter-btn")[0].addEventListener("click", (e) => {
    e.preventDefault();
    resetPagination();
    loadFlights();
});

// Endpoints
function filter () {
    const from = document.getElementById("from").value.trim();
    const to = document.getElementById("to").value.trim();
    const departure = document.getElementById("departure").value;
    const min_price = document.getElementById("minPrice").value.trim();
    const max_price = document.getElementById("maxPrice").value.trim();
    const airline = document.getElementById("airline").value.trim();

    return !!(from || to || departure || min_price || max_price || airline || selectedTime);
}

function get_endpoint() {
    return filter()
    ? "/flight/filters"
    : "/flights";
}

async function loadFlights() {
    try {
        const searchParams = getSearchParams();
        const filterParams = getFilterParams();
        let url = `${base}${get_endpoint()}?next_id=${next_id}&limit=${pageSize}`;

        if(searchParams.dep_airport) url += `&dep_airport=${encodeURIComponent(searchParams.dep_airport)}`;
        if(searchParams.arr_airport) url += `&arr_airport=${encodeURIComponent(searchParams.arr_airport)}`;
        if(searchParams.dep_time) url += `&departure_date=${encodeURIComponent(searchParams.dep_time)}`;
        if(filterParams.min_price) url += `&min_cost=${encodeURIComponent(filterParams.min_price)}`;
        if(filterParams.max_price) url += `&max_cost=${encodeURIComponent(filterParams.max_price)}`;
        if(filterParams.airline) url += `&airline_type=${encodeURIComponent(filterParams.airline)}`;
        if(filterParams.time_range) url += `&time_range=${encodeURIComponent(filterParams.time_range)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();

        lastCursor = data.pagination.next_cursor;
        document.getElementById("nextPage").disabled = !lastCursor;
        document.getElementById("prevPage").disabled = currentPage === 1;
        pageInfo.textContent = `Page ${currentPage}`;

        const flightIds = data.data.map(f => f.flight_id);
        const [_, seatsMap] = await Promise.all([
            Promise.resolve(),
            getSeats(flightIds)
        ]);

        resultsDiv.innerHTML = "";
        await renderFlights(data.data, seatsMap);  // pass seatsMap in

    } catch (err) {
        console.error("Failed to load flights:", err);
        resultsDiv.innerHTML = "<p style='color:red'>Failed to load flights</p>";
    }
}

async function getSeats(flightIds) {
    try {
        const res = await fetch(`${base}/flights/seats/batch?ids=${flightIds.join(",")}`);
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Failed to load seat information:", err);
        return {};
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

async function renderFlights(flights, seatsMap) {
    if (!flights || flights.length === 0) {
        resultsDiv.innerHTML = "<p>No flights found.</p>";
        return;
    }
    resultsDiv.innerHTML = "";
    flights.forEach(flight => {
        const seatInfo = seatsMap[flight.flight_id] || { booked_seats: 0, total_seats: 0 };
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
                <div class="seats">👤 ${seatInfo.booked_seats}/${seatInfo.total_seats}</div>
                <div class="date">
                    <span>${flight.departure_date || "Unknown Date"}</span>
                </div>
                <div class="times">
                    <span>${formatTime(flight.departure_time)} → ${formatTime(flight.arrival_time)}</span>
                </div>
            </div>
            <div class="flight-right">
                <span class="price">${flight.cost != null ? "$" + flight.cost : "N/A"}</span>
                <button class="book-btn">Book now</button>
            </div>
        `;
        
        const bookBtn = card.querySelector(".book-btn");
        const flightData = {
            id: flight.flight_id,
            number: flight.flight_number,
            dep_airport: flight.dep_airport,
            arr_airport: flight.arr_airport,
            airline: flight.owner,
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

async function loadAirports() {
    try {
        const resp = await fetch(`https://flightapi-hbcdfpabdqhqbudb.eastus-01.azurewebsites.net/airports`);
        const data = await resp.json();
        airports = data.airports;
    } catch(err) {
        console.error("Failed to get airports:", err);
    }
}

function autoComp(query) {
    if(!query) return [];
    return airports.filter(a => a.display.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
}

function renderSuggest(items, box, input) {
    box.innerHTML = "";
    if(items.length === 0) return;
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggest-item";
        div.textContent = item.display;

        div.addEventListener("click", () => {
            input.value = item.display;
            box.innerHTML = "";
        });

        box.appendChild(div);
    });
}

fromInput.addEventListener("input", (e) => {
    const matches = autoComp(e.target.value);
    renderSuggest(matches, fromBox, fromInput);
});

toInput.addEventListener("input", (e) => {
    const matches = autoComp(e.target.value);
    renderSuggest(matches, toBox, toInput);
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-wrapper")) {
        fromBox.innerHTML = "";
        toBox.innerHTML = "";
    }
});

timeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        timeButtons.forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        selectedTime = btn.dataset.time;
    });
});

function resetPagination() {
    next_id = 0;
    cursorHistory = [0];
    currentPage = 1;
    lastCursor = null;
}

loadAirports();
loadFlights();