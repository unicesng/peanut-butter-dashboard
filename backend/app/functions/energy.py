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
    query1 = """
        SELECT EXTRACT(YEAR FROM DAY) AS year, AVG(energy_mean) AS avg_value
        FROM daily_dataset
        GROUP BY EXTRACT(YEAR FROM DAY)
        ORDER BY year DESC
        LIMIT 2
    """
    cursor.execute(query1)
    rows = cursor.fetchall()
    
    if len(rows) < 2:
        return {"error": "Not enough data to calculate change"}

    latest_average = rows[0][1]  # Index 1 corresponds to the avg_value in the result
    second_latest_average = rows[1][1]

    if second_latest_average != 0:
        change = (latest_average - second_latest_average) / second_latest_average * 100
    else:
        change = None 

    conn.close()

    return {
        "average": round(latest_average,5),
        "change": round(change,1)
    }