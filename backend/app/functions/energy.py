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
async def avgDailyConsumption():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT EXTRACT(YEAR FROM DAY) AS year, AVG(energy_mean) AS avg_value
        FROM daily_dataset
        GROUP BY EXTRACT(YEAR FROM DAY)
        ORDER BY year DESC
        LIMIT 2
    """
    cursor.execute(query)
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

@energy_app.get("/energy-anomaly")
async def energyAnomaly():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT day, SUM(energy_max) AS energy_max
        FROM daily_dataset
        GROUP BY day
        ORDER BY day desc
        LIMIT 10;
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    data = []

    for row in rows[::-1]:
        day = row[0]
        energy_max = row[1]
        
        if energy_max > 4500:
            data.append({"date": day, "tooltip": "Critically high/Peak"})
        elif energy_max > 2500:
            data.append({"date": day, "tooltip": "Moderate"})
        else:
            data.append({"date": day, "tooltip": "Low"})

    conn.close()

    return data

@energy_app.get("/energy-consumption")
async def energyAnomaly():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT acorn, acorn_grouped, AVG(energy_mean) as avg_energy, AVG(energy_sum) as sum_energy
        FROM final_merged_data
        GROUP BY acorn, acorn_grouped
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    data = {}

    for row in rows:
        acorn = row[0]
        acorn_grouped = row[1]
        avg_energy = row[2]
        sum_energy = row[3]

        if acorn_grouped not in data:
            data[acorn_grouped] = [{
                "acorn": acorn,
                "average": round(avg_energy,3),
                "total": round(sum_energy,3)
            }]
        else:
            data[acorn_grouped].append({
                "acorn": acorn,
                "average": round(avg_energy,3),
                "total": round(sum_energy,3)
            })

    conn.close()

    return data
