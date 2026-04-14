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
        owner AS owner,
        flight_number AS flight_number,
        type AS plane_type,
        type_icao AS plane_icao,
        dep_airport_iata AS dep_airport,
        arr_airport_iata AS arr_airport,
        dep_airport AS dep_airport_name,
        arr_airport AS arr_airport_name,
        date AS departure_date,
        time AS departure_time,
        time_arr AS arrival_time,
        cost AS cost
    FROM flights.flight_data
    ORDER BY (SELECT NULL)
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
    airline_type: str = None
):
    conn = get_connection()
    cursor = conn.cursor()
    offset = start - 1
    limit = end - start + 1

    query = """
    SELECT 
        owner AS owner,
        flight_number AS flight_number,
        type AS plane_type,
        type_icao AS plane_icao,
        dep_airport_iata AS dep_airport,
        arr_airport_iata AS arr_airport,
        dep_airport AS dep_airport_name,
        arr_airport AS arr_airport_name,
        date AS departure_date,
        time AS departure_time,
        time_arr AS arrival_time,
        cost AS cost
    FROM flights.flight_data
    WHERE 1=1
    """
    params = []

    # Filters
    if dep_airport:
        query += " AND dep_airport_iata = ?"
        params.append(dep_airport)
    if arr_airport:
        query += " AND arr_airport_iata = ?"
        params.append(arr_airport)
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
        query += " AND type = ?"
        params.append(airline_type)

    query += """
    ORDER BY (SELECT NULL)
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