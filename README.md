# Flight Booking System

Purdue 2026 Capstone
A flight booking platform that allows allows to search and book flights with seat selection functionality and flight filtering.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This system is a web-based application that enables passengers to search for flights, select seats, and book flights. 

---

## Features

- **Flight Search** — Search flights by dep_airport -> arr_airport
- **Seat Selection** — Interactive cabin map for economy, business, and first class
- **Seat Updates** - Seat automatic updates when booked
- **Booking** — Booking confirmations

---

## Technology Used

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | HTML, CSS, Javascript             |
| Backend      | Python, FastAPI                   |
| Database     | Microsoft AzureSQL Server         |
| Flight Data  | Microsoft AzureAPI Server         |
| Deployment   | GitHub Pages                      |

---

### How to Use

1. **Go to webpage**
   https://sunaio.github.io/Flight-Booking-System/index.html
   or
   https://sunaio.github.io/Flight-Booking-System/booksearch.html

2. **Wait**
   If server wasn't up and running already, you might have to wait a couple of seconds.
   This may take 1-3 minutes. Make sure to refresh the page.

3. **Enter Information**
   The input box "From" is where you are departuring from.
   The input box "To" is where you are arriving to.
   The date box is what date you want to departure.

4. **Filtering**
   There is a filter button right under the "Search Flights" box.
   Clicking on this will show a filtering dropdown options.
   You can input min and max flight cost, departure time ranges, and airlines.
   Put "Apply filters" to apply your filter.

5. **Booking**
   When you find a flight that interests you, you can hit "Book Now" button and
   it will bring you to the checkout page.
   Fill out the information there and hit confirm booking.
   Make sure to check your information before submitting.

## Project Structure

```
flight-booking-system/
├── assets/                  # Includes all images used in this project
├── css/                     # Includes all css files
│   ├── booksearch.css       # Styling for flight search page
│   ├── checkout.css         # Styling for flight checkout page
│   ├── styles.css           # Styling for index page or homepage
├── dataset/                 # Dataset used in this project
├── scripts/                 # Includes all JavaScript
├── booksearch.html
├── checkout.html
├── indexl.html
├── flightapi.py             # Backend code (API)
├── requirements.txt         # Text file that has all required dependency for the server
└── README.md
```

---

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that runs tests and deploys to Microsoft Azure Hosting Servers on pushes to `main`.

---

## License

This project is licensed under the MIT License
