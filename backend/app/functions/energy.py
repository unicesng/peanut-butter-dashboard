from fastapi import APIRouter
from config import get_redshift_connection

# Create a FastAPI router instead of the app instance
energy_app = APIRouter()

@energy_app.get("/health")
async def health_check():
    conn = get_redshift_connection()
    conn.close()
    return "Server OK Redshift OK"

@energy_app.get("/count")
async def count():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """SELECT count(*) FROM "dev"."public"."demand_data_2025";"""
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return rows

@energy_app.get("/avg-daily-consumption")
async def count():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """SELECT count(*) FROM "dev"."public"."demand_data_2025";"""
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return rows