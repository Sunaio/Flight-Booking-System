from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import pyodbc

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    connection_str = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(connection_str)

@app.get("/flights")
def get_flights(
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
        CAST(owner AS VARCHAR(255)) AS owner,
        CAST(flight_number AS VARCHAR(255)) AS flight_number,
        CAST(type AS VARCHAR(255)) AS plane_type,
        CAST(type_icao AS VARCHAR(255)) AS plane_icao,
        CAST(dep_airport_iata AS VARCHAR(255)) AS dep_airport,
        CAST(arr_airport_iata AS VARCHAR(255)) AS arr_airport,
        CAST(dep_airport AS VARCHAR(255)) AS dep_airport_name,
        CAST(arr_airport AS VARCHAR(255)) AS arr_airport_name,
        CAST(date AS VARCHAR(255)) AS departure_date,
        CAST(time AS VARCHAR(255)) AS departure_time,
        CAST(time_arr AS VARCHAR(255)) AS arrival_time,
        CAST(cost AS VARCHAR(255)) AS cost
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