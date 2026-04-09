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
def get_flights(start: int = 1, end: int = 5):
    conn = get_connection()
    cursor = conn.cursor()
    offset = start - 1
    limit = end - start + 1

    query = """
    SELECT 
        CAST(owner AS VARCHAR(255)) AS owner,
        CAST(type_icao AS VARCHAR(255)) AS plane_type,
        CAST(dep_airport AS VARCHAR(255)) AS dep_airport,
        CAST(arr_airport AS VARCHAR(255)) AS arr_airport,
        CAST(date AS DATE) AS departure_date,
        CAST(time AS TIME) AS departure_time
    FROM dbo.flight_db_cleaned
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

@app.get("/db-test")
def db_test():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT TOP 1 * FROM dbo.flight_db_cleaned")
        row = cursor.fetchone()

        conn.close()

        if row:
            return {"status": "DB connected", "sample_row": str(row)}
        else:
            return {"status": "DB connected but no data"}

    except Exception as e:
        return {"status": "FAILED", "error": str(e)}