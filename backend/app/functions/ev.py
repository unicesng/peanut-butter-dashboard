from fastapi import APIRouter
from config import get_redshift_connection

# Create a FastAPI router instead of the app instance
ev_app = APIRouter()

@ev_app.get("/health")
async def health_check():
    conn = get_redshift_connection()
    conn.close()
    return "Server OK Redshift OK"

@ev_app.get("/annual-growth")
async def annualGrowth():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT *
        FROM final_merged_data
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    conn.close()

    return rows

@ev_app.get("/adoption-rate")
async def adoptionRate():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT *
        FROM final_merged_data
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    conn.close()

    return rows

@ev_app.get("/manufacturers")
async def manufacturers():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT *
        FROM final_merged_data
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    conn.close()

    return rows

@ev_app.get("/projected-growth")
async def projectedGrowth():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            year,
            CAST(actual AS INTEGER) AS actual_ev_count,
            CAST(predicted AS INTEGER) AS predicted_ev_count
        FROM dev.public.ev_forecast
        WHERE year >=2015;
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    data = []
    for row in rows:
        data.append({
             "month": row[0],
             "predicted": row[2],
             "actual": row[1]
        })
    
    conn.close()

    return data