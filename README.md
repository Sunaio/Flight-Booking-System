# ✈️ Flight Booking System

**Purdue 2026 Capstone Project**

A web-based flight booking platform that allows users to search for flights, select seats, and complete bookings with real-time seat availability updates and flight filtering.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [How to Use](#how-to-use)
- [Project Structure](#project-structure)
- [CI/CD](#cicd)
- [License](#license)

---

## Overview

This system is a web-based application that enables passengers to search for flights by departure and arrival airport, filter results by cost, time, and airline, select seats from an interactive cabin map, and complete bookings with instant confirmation.

---

## Features

- **Flight Search** — Search flights by departure and arrival airport with a selected date
- **Flight Filtering** — Filter results by price range, departure time, and airline
- **Seat Selection** — Interactive cabin map for economy, business, and first class
- **Real-Time Seat Updates** — Seat availability automatically updates when a booking is confirmed
- **Booking Confirmation** — Instant confirmation upon completing checkout

---

## Tech Stack

| Layer        | Technology                  |
|--------------|-----------------------------|
| Frontend     | HTML, CSS, JavaScript       |
| Backend      | Python, FastAPI             |
| Database     | Microsoft Azure SQL Server  |
| Flight Data  | Microsoft Azure API         |
| Deployment   | GitHub Pages + Azure        |

---

## How to Use

### 1. Open the App

Visit one of the following pages:

- **Homepage:** https://sunaio.github.io/Flight-Booking-System/index.html
- **Flight Search:** https://sunaio.github.io/Flight-Booking-System/booksearch.html

### 2. Wait for the Server

If the backend server was not already running, it may take **1–3 minutes** to boot up.
Refresh the page if nothing shows up or an error shows up.

### 3. Enter Flight Information

| Field    | Description                        |
|----------|------------------------------------|
| **From** | Departure airport                  |
| **To**   | Arrival airport                    |
| **Date** | Desired departure date             |

Click **Search Flights** to view available results.

### 4. Filtering

Click the **Filter** button beneath the search box to expand filtering options:

- Minimum and maximum flight cost
- Departure time range
- Airline preference

Click **Apply Filters** to update the results.

### 5. Book a Flight

1. Find a flight you want and click **Book Now**
2. You will be taken to the checkout page
3. Fill in your passenger information
4. Click **Confirm Booking** after you filled out your information or cancel if you don't like your current flight
5. Check your information and then click **Submit**

### Final Note:
If no flights are loaded after *1-3 minutes*, this could mean 2 possible things:
1. Microsoft Azure funding exhausted - Currently as of April 24, 2026, there is $100 worth of free student funding.
2. Student funds expired - Azure free student funds last for 12 months (1 year) upon obtainment.

If the funds expired/ran out, I will not be recharging with actual money as the servers are expensive to run.

---

## Project Structure

```
flight-booking-system/
├── assets/              # Images used throughout the project
├── css/
│   ├── styles.css       # Styling for the homepage (index)
│   ├── booksearch.css   # Styling for the flight search page
│   └── checkout.css     # Styling for the checkout page
├── dataset/             # Dataset used in this project
├── scripts/             # JavaScript files
├── index.html           # Homepage
├── booksearch.html      # Flight search page
├── checkout.html        # Booking checkout page
├── flightapi.py         # Backend FastAPI server
├── requirements.txt     # Python dependencies
└── README.md
```

---

## CI/CD

This project uses a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to Microsoft Azure hosting servers on every push to `main`.

---

## License

This project is licensed under the [MIT License](./LICENSE).
