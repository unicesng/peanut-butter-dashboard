from fastapi import FastAPI
from typing import List
from config import get_redshift_connection

app = FastAPI()

@app.get("/health")
async def health_check():
    conn = get_redshift_connection()
    conn.close()
    
    return "Server OK"

@app.get("/count")
async def count():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT count(*) FROM "dev"."public"."demand_data_2025";
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    return rows