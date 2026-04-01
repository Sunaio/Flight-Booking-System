from fastapi import FastAPI, Query
import os
import pyodbc

app = FastAPI()

def get_connection():
    connection_str = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(connection_str)

@app.get("/flights")
def get_flights(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    conn = get_connection()
    cursor = conn.cursor()

    offset = (page - 1) * page_size

    query = """
        SELECT *
        FROM dbo.flight_data
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """

    cursor.execute(query, offset, page_size)

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()

    conn.close()

    return {
        "page": page,
        "page_size": page_size,
        "data": [dict(zip(columns, row)) for row in rows]
    }