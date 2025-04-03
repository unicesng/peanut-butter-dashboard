from fastapi import FastAPI
import os
import psycopg2
from typing import List

app = FastAPI()

def get_redshift_connection():
    return psycopg2.connect(
        dbname=os.getenv("REDSHIFT_DB"),
        user=os.getenv("REDSHIFT_USER"),
        password=os.getenv("REDSHIFT_PASSWORD"),
        host=os.getenv("REDSHIFT_HOST"),
        port="5439"
    )

@app.get("/api/energy")
async def get_data():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT department, SUM(sales) as total_sales
    FROM sales_table
    GROUP BY department;
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    return [{"department": row[0], "total_sales": row[1]} for row in rows]
