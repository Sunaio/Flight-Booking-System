from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import pyodbc
from dbutils.pooled_db import PooledDB

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
connection_str = os.getenv("DB_ACCESS_KEY")

def create_connection():
    return pyodbc.connect(connection_str)

pool = PooledDB(
    creator=create_connection,
    maxconnections=10,
    mincached=2,
    blocking=True,
    ping=1
)

@app.get("/flights")
def get_flights(next_id: int = 0, limit: int = 5):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            owner, 
            flight_id,
            flight_number,
            type, type_icao,
            dep_airport_iata,
            arr_airport_iata,
            dep_airport,
            arr_airport,
            date, 
            time,
            time_arr, 
            cost
        FROM flights.flight_data
        WHERE flight_id > ?
        ORDER BY flight_id
        OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY
    """, (next_id, limit))

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    data = [dict(zip(columns, row)) for row in rows]
    return {
        "data": data,
        "pagination": {
            "next_id": next_id,
            "limit": limit,
            "next_cursor": data[-1]["flight_id"] if data else None
        }
    }

@app.get("/flights/seats/batch")
def get_seats_batch(ids: str):
    conn = get_connection()
    cursor = conn.cursor()
    id_list = [int(i) for i in ids.split(",")]
    hold = ",".join("?" * len(id_list))
    cursor.execute(f"""
        SELECT 
            flight_id,
            COUNT(*) AS total_seats,
            SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) AS unbooked_seats,
            SUM(CASE WHEN is_available = 0 THEN 1 ELSE 0 END) AS booked_seats
        FROM flights.seats
        WHERE flight_id IN ({hold})
        GROUP BY flight_id
    """, id_list)
    rows = cursor.fetchall()
    conn.close()
    return {row[0]: {
        "flight_id": row[0],
        "total_seats": row[1],
        "unbooked_seats": row[2],
        "booked_seats": row[3]
    } for row in rows}

@app.get("/flights/{flight_id}/seats")
def get_seats(flight_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            seat_number,
            is_available
        FROM flights.seats
        WHERE flight_id = ?
        ORDER BY seat_number
    """, (flight_id,))

    rows = cursor.fetchall()
    conn.close()
    return {
        "flight_id": flight_id,
        "seats": [{"seat_number": r[0], "is_available": bool(r[1])} for r in rows]
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
        cursor.execute("""
            SELECT
                seat_number,
                is_available
            FROM flights.seats
            WHERE flight_id = ? AND seat_number = ?
        """, (id, seat))
        row = cursor.fetchone()
        if not row:
            return {"status": "FAILED", "error": "Seat not found"}
        if row[0] == 0:
            return {"status": "FAILED", "error": "Seat already booked"}
        cursor.execute("""
            UPDATE flights.seats SET is_available = 0
            WHERE flight_id = ? AND seat_number = ?
        """, (id, seat))
        return {"status": "SUCCESS"}

    try:
        fstatus = book(flight_id, seat_number)
        if fstatus["status"] == "FAILED":
            conn.rollback()
            conn.close()
            return fstatus
        if return_id and return_seat:
            rstatus = book(return_id, return_seat)
            if rstatus["status"] == "FAILED":
                conn.rollback()
                conn.close()
                return rstatus
        conn.commit()
        return {"status": "SUCCESS", "message": "Booking completed successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/flight/filters")
def get_flight_filters(
    next_id: int = 0,
    limit: int = 5,
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

    query = """
        SELECT 
            owner,
            flight_id,
            flight_number,
            type AS plane_type,
            type_icao AS plane_icao,
            dep_airport_iata AS dep_airport,
            arr_airport_iata AS arr_airport,
            dep_airport AS dep_airport_name,
            arr_airport AS arr_airport_name,
            date AS departure_date,
            time AS departure_time,
            time_arr AS arrival_time,
            cost
        FROM flights.flight_data
        WHERE flight_id > ?
    """
    params = [next_id]

    if dep_airport:
        dep_airport = dep_airport.strip().upper()
        query += " AND (dep_airport_iata = ? OR dep_airport LIKE ?)"
        params.extend([dep_airport, f"%{dep_airport}%"])
    if arr_airport:
        arr_airport = arr_airport.strip().upper()
        query += " AND (arr_airport_iata = ? OR arr_airport LIKE ?)"
        params.extend([arr_airport, f"%{arr_airport}%"])
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
        ranges = {
            "morning":   (5, 11),
            "afternoon": (12, 17),
            "night":     (18, 23)
        }
        if time_range in ranges:
            lo, hi = ranges[time_range]
            query += f" AND DATEPART(HOUR, time) BETWEEN {lo} AND {hi}"

    query += " ORDER BY flight_id OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY"
    params.append(limit)

    cursor.execute(query, params)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    data = [dict(zip(columns, row)) for row in rows]
    return {
        "data": data,
        "pagination": {
            "next_cursor": data[-1]["flight_id"] if data else None,
            "limit": limit
        }
    }

@app.get("/airports")
def get_airports():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT dep_airport, dep_airport_iata 
        FROM flights.flight_data
        UNION
        SELECT arr_airport, arr_airport_iata 
        FROM flights.flight_data
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"airports": [
        {"name": r[0], "iata": r[1], "display": f"{r[1]} - {r[0]}"}
        for r in rows
    ]}

@app.get("/db-test")
def db_test():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM flights.flight_data")
        row = cursor.fetchone()
        conn.close()
        return {"status": "DB connected", "sample_row": str(row)} if row else {"status": "DB connected but no data"}
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}