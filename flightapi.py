from fastapi import FastAPI, Query
import os
import pyodbc

app = FastAPI()

def get_connection():
    connection_str = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(connection_str)

@app.get("/flights")
def get_flights( page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    conn = get_connection()
    cursor = conn.cursor()

    offset = (page - 1) * page_size

    query = """
        SELECT *
        FROM dbo.flight_db_cleaned
        ORDER BY (SELECT NULL)
        OFFSET {offset} ROWS FETCH NEXT {page_size} ROWS ONLY
    """

    cursor.execute(query)

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()

    conn.close()

    return {
        "page": page,
        "page_size": page_size,
        "data": [dict(zip(columns, row)) for row in rows]
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