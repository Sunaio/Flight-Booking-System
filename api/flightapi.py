from fastapi import FastAPI
import os
import pyodbc

app = FastAPI()

def get_connection():
    connection = os.getenv("DB_ACCESS_KEY")
    return pyodbc.connect(conection)

@app.get("/")
def home():
    return {"status": "API running"}

@app.get("/data")
def get_data():
    connect = get_connection()
    cursor = connect.cursor()
    cursor.execute("SELECT TOP 10 * FROM dbo.table.flight_data")

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()

    connect.close()
    return [dict(zip(columns, row)) for row in rows]