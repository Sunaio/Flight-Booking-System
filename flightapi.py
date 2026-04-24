from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import pyodbc

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    connection_str = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(connection_str)

@app.get("/flights")
def get_flights(start: int = 1, end: int = 5):
    conn = get_connection()
    cursor = conn.cursor()
    offset = start - 1
    limit = end - start + 1

    query = """
    SELECT 
        owner,
        flight_id ,
        flight_number,
        type AS plane_type,
        dep_airport_iata AS dep_airport,
        arr_airport_iata AS arr_airport,
        dep_airport AS dep_airport_name,
        arr_airport AS arr_airport_name,
        date AS departure_date,
        time AS departure_time,
        time_arr AS arrival_time,
        cost
    FROM flights.flight_data
    ORDER BY flight_id
    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """

    cursor.execute(query, (offset, limit))
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    data = [dict(zip(columns, row)) for row in rows]
    conn.close()
    return {
        "data": data,
        "pagination": {
            "start": start,
            "end": end,
            "page_size": limit,
            "page": ((start - 1) // limit) + 1
        }
    }

@app.get("/flight/filters")
def get_flight_filters(
    start: int = 1,
    end: int = 5,
    dep_airport: str = None,
    arr_airport: str = None,
    departure_date: str = None,
    min_cost: float = None,
    max_cost: float = None,
    airline_type: str = None,
    time_range: str = None
):
    conn = get_connection()
    cursor = conn.cursor()
    offset = start - 1
    limit = end - start + 1

    query = """
    SELECT 
        owner,
        flight_id,
        flight_number,
        type AS plane_type,
        dep_airport_iata AS dep_airport,
        arr_airport_iata AS arr_airport,
        dep_airport AS dep_airport_name,
        arr_airport AS arr_airport_name,
        date AS departure_date,
        time AS departure_time,
        time_arr AS arrival_time,
        cost
    FROM flights.flight_data
    WHERE 1=1
    """
    params = []

    # Filters
    if dep_airport:
        dep_airport = dep_airport.strip().upper()
        query += """
        AND (
            dep_airport_iata = ?
            OR dep_airport LIKE ?
            OR dep_airport_iata + ' - ' + dep_airport LIKE ?
        )
        """
        params.extend([
            dep_airport,
            f"%{dep_airport}%",
            f"%{dep_airport}%"
        ])
    if arr_airport:
        arr_airport = arr_airport.strip().upper()
        query += """
        AND (
            arr_airport_iata = ?
            OR arr_airport LIKE ?
            OR arr_airport_iata + ' - ' + arr_airport LIKE ?
        )
        """
        params.extend([
            arr_airport,
            f"%{arr_airport}%",
            f"%{arr_airport}%"
        ])
    if departure_date:
        query += " AND date = ?"
        params.append(departure_date)
    if min_cost is not None:
        query += " AND cost >= ?"
        params.append(min_cost)
    if max_cost is not None:
        query += " AND cost <= ?"
        params.append(max_cost)
    if airline_type:
        query += " AND owner = ?"
        params.append(airline_type)
    if time_range:
        if time_range == "morning":
            query += " AND DATEPART(HOUR, time) BETWEEN 5 AND 11"
        elif time_range == "afternoon":
            query += " AND DATEPART(HOUR, time) BETWEEN 12 AND 17"
        elif time_range == "night":
            query += " AND DATEPART(HOUR, time) BETWEEN 18 AND 23"
    query += """
    ORDER BY flight_id
    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    params.extend([offset, limit])

    cursor.execute(query, params)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    data = [dict(zip(columns, row)) for row in rows]
    conn.close()
    return {
        "data": data,
        "pagination": {
            "start": start,
            "end": end,
            "page_size": limit,
            "page": ((start - 1) // limit) + 1
        }
    }

@app.get("/flights/{flight_id}/seats/summary")
def get_seat_summary(flight_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        flight_id,
        COUNT(*) AS total_seats,
        SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) AS unbooked_seats,
        SUM(CASE WHEN is_available = 0 THEN 1 ELSE 0 END) AS booked_seats
    FROM flights.seats
    WHERE flight_id = ?
    GROUP BY flight_id
    """
    cursor.execute(query, (flight_id,))
    rows = cursor.fetchone()
    conn.close()
    if not rows:
        return {
            "flight_id": flight_id,
            "total_seats": 0,
            "unbooked_seats": 0,
            "booked_seats": 0
        }
    return {
        "flight_id": rows[0],
        "total_seats": rows[1],
        "unbooked_seats": rows[2],
        "booked_seats": rows[3]
    }

@app.get("/flights/{flight_id}/seats")
def get_seats(flight_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        seat_number,
        is_available
    FROM flights.seats
    WHERE flight_id = ?
    ORDER BY seat_number
    """
    cursor.execute(query, (flight_id,))
    rows = cursor.fetchall()
    conn.close()
    return {
        "flight_id": flight_id,
        "seats": [
            {
                "seat_number": row[0],
                "is_available": bool(row[1])
            } for row in rows
        ]
    }

@app.post("/flights/book")
def book_seat(data: dict):
    flight_id = data.get("flight_id")
    seat_number = data.get("seat_number")
    return_id = data.get("return_id")
    return_seat = data.get("return_seat")

    conn = get_connection()
    cursor = conn.cursor()

    def book(id, seat):
        # Check if seat is available
        cursor.execute(
        """
        SELECT is_available FROM flights.seats
        WHERE flight_id = ? AND seat_number = ?
        """, (id, seat))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"status": "FAILED", "error": "Seat not found"}
        if row[0] == 0:
            conn.close()
            return {"status": "FAILED", "error": "Seat already booked"}

        # Book the seat
        cursor.execute(
        """
        UPDATE flights.seats
        SET is_available = 0
        WHERE flight_id = ? AND seat_number = ?
        """, (id, seat))
        return {"status": "SUCCESS"}

    try:
        # Book flight
        fstatus = book(flight_id, seat_number)
        if fstatus["status"] == "FAILED":
            conn.rollback()
            return fstatus
    
        # Book return flight
        if return_id and return_seat:
            rstatus = book(return_id, return_seat)
            if rstatus["status"] == "FAILED":
                conn.rollback()
                return rstatus

        conn.commit()
        return {
            "status": "SUCCESS",
            "message": "Booking completed successfully"
        }
    finally:
        conn.close()

@app.get("/airports")
def get_airports():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DISTINCT dep_airport, dep_airport_iata
        FROM flights.flight_data
        UNION
        SELECT DISTINCT arr_airport AS name, arr_airport_iata AS iata
        FROM flights.flight_data
    """)
    rows = cursor.fetchall()
    result = [
        {
            "name": r[0],
            "iata": r[1],
            "display": f"{r[1]} - {r[0]}"
        }
        for r in rows
    ]
    return {"airports": result}

@app.get("/db-test")
def db_test():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT TOP 1 * FROM flights.flight_data")
        row = cursor.fetchone()

        conn.close()

        if row:
            return {"status": "DB connected", "sample_row": str(row)}
        else:
            return {"status": "DB connected but no data"}

    except Exception as e:
        return {"status": "FAILED", "error": str(e)}