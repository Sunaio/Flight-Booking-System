from fastapi import FastAPI, Query
import os
import pyodbc

app = FastAPI()

def get_connection():
    connection_str = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(connection_str)

@app.get("/flights")
def get_flights():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 5 * FROM dbo.flight_db_cleaned")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    data = [dict(zip(columns, row)) for row in rows]
    conn.close()
    return {"data": data}

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