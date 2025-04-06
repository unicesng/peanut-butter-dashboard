from fastapi import APIRouter
from config import get_redshift_connection
import pandas as pd
import folium
from shapely.geometry import Point, Polygon
import numpy as np
from scipy.cluster.vq import kmeans2
import boto3
import os

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
        SELECT year,
            CAST(FLOOR(absolutechange) AS INTEGER) AS ev_absolute_change,
            percentagechange
        FROM dev.public.ev_growth;
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    conn.close()

    return ({
             "year": row[0],
             "absolutechange": row[1],
             "percentagechange": row[2],
        } for row in rows)

@ev_app.get("/adoption-rate")
async def adoptionRate():
    conn = get_redshift_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            year,
            electricvehicles AS ev_count,
            nonelectric AS non_ev_count,
            adoptionrate AS ev_adoption_rate
        FROM dev.public.ev_adoption
        ORDER BY year desc
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    conn.close()

    return ({
             "year": row[0],
             "electric": row[1],
             "nonelectric": row[2],
             "adoptionrate": row[3]
        } for row in rows)

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

@ev_app.get("/get_chargepoints")
def get_chargepoints(n: int = 100):

    # === Step 0: Redshift connection ===
    conn = get_redshift_connection()
    try:
        query = "SELECT * FROM public.EV_chargepoints"
        with conn.cursor() as cur:
            cur.execute(query)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            df = pd.DataFrame(rows, columns=columns)

        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()

        # Clean and prep data
        df[['latitude', 'longitude']] = df[['latitude', 'longitude']].apply(pd.to_numeric, errors='coerce')
        df.dropna(subset=['latitude', 'longitude'], inplace=True)

        df['high usage'] = (
            (df['energy consumption (kwh)'] > (df['charging station capacity (kw)'] / 2)) &
            (df['availability status'] != 'Out of Service')
        )
        
        df['is unavailable'] = df['availability status'] == 'Out of Service'

        # === STEP 3: KMeans Clustering (Suggested Locations) ===
        coordinates = df[['latitude', 'longitude']].to_numpy()
        k = n
        centroids, labels = kmeans2(coordinates, k=k, minit='++')
        df['cluster'] = labels

        # === STEP 4: Create Map and Layers ===
        map_ev = folium.Map(location=[df['latitude'].mean(), df['longitude'].mean()], zoom_start=12)

        group_all = folium.FeatureGroup(name="All Available Stations").add_to(map_ev)
        group_high = folium.FeatureGroup(name="High Usage Stations").add_to(map_ev)
        group_unavailable = folium.FeatureGroup(name="Unavailable Stations").add_to(map_ev)
        group_suggested = folium.FeatureGroup(name="Suggested Charging Points").add_to(map_ev)

        # === STEP 5: Plot Charging Stations ===
        for _, row in df.iterrows():
            lat, lon = row['latitude'], row['longitude']
            usage = row['usage frequency (daily sessions)']
            capacity = row['charging station capacity (kw)']
            status = row['availability status']
            popup_text = f"{row['station type']}<br>Usage: {usage} sessions<br>Status: {status}"

            if status in ['Available', 'In Use']:
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=5,
                    color='green',
                    fill=True,
                    popup=popup_text,
                ).add_to(group_all)

            if row['high usage']:
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=6,
                    color='orange',
                    fill=True,
                    popup="⚠️ High Usage<br>" + popup_text,
                ).add_to(group_high)

            if status not in ['Available', 'In Use']:
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=5,
                    color='red',
                    fill=True,
                    popup="❌ Unavailable<br>" + popup_text,
                ).add_to(group_unavailable)

        # === STEP 6: Plot Suggested Cluster Centers ===
        for lat, lon in centroids:
            folium.Marker(
                location=[lat, lon],
                icon=folium.Icon(color='blue', icon='plus'),
                popup="🔌 Suggested Charging Point"
            ).add_to(group_suggested)

        folium.LayerControl(collapsed=False).add_to(map_ev)
        map_ev.save("ev_charging_map_filtered.html")

        # === STEP 7: Upload CSV to S3 and COPY to Redshift ===
        csv_path = "suggested_charging_locations.csv"
        pd.DataFrame(centroids, columns=['latitude', 'longitude']).to_csv(csv_path, index=False)

        S3_BUCKET = 'peanut-butter-project'
        S3_KEY = 'suggested/suggested_charging_locations.csv'
        S3_PATH = f's3://{S3_BUCKET}/{S3_KEY}'
        IAM_ROLE_ARN = 'arn:aws:iam::536697253251:role/redshiftreads3'

        s3 = boto3.client('s3')
        s3.upload_file(csv_path, S3_BUCKET, S3_KEY)

        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.suggested_locations (
                    latitude FLOAT,
                    longitude FLOAT
                );
            """)
            cur.execute("TRUNCATE public.suggested_locations;")
            cur.execute(f"""
                COPY public.suggested_locations
                FROM '{S3_PATH}'
                IAM_ROLE '{IAM_ROLE_ARN}'
                FORMAT AS CSV
                IGNOREHEADER 1;
            """)
            conn.commit()

        os.remove(csv_path)
        # === Final Return ===
        return {"message": "Map saved and suggested locations uploaded to Redshift successfully."}

    finally:
        conn.close()


@ev_app.get("/final_chargepoints")
def final_chargepoints(energy_per_charger_kwh: float = 40):
    print("🚀 Entered /final_chargepoints route")

    conn = get_redshift_connection()
    cursor = conn.cursor()

    # SQL queries
    query_charging = "SELECT * FROM public.suggested_locations"
    query_energy = "SELECT * FROM public.avg_daily_energy_per_lclid"
    query_segments = "SELECT * FROM public.acorn_segments"

    try:
        # Charging locations
        cursor.execute(query_charging)
        charging_rows = cursor.fetchall()
        charging_df = pd.DataFrame(charging_rows)
        charging_df.columns = ["Latitude", "Longitude"]

        # Energy data
        cursor.execute(query_energy)
        energy_rows = cursor.fetchall()
        energy_df = pd.DataFrame(energy_rows)
        energy_df.columns = ["Segment", "energy_sum"]

        # Segment boundaries
        cursor.execute(query_segments)
        segment_rows = cursor.fetchall()
        segments_df = pd.DataFrame(segment_rows)
        segments_df.columns = [
            "Segment",         
            "Description",     
            "acorn_group",     
            "group_detail",   
            "NW",            
            "NE",            
            "SW",             
            "SE"             
        ]

    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")

    if charging_df.empty or energy_df.empty or segments_df.empty:
        return {"error": "One or more input tables are empty."}

    # Coordinate parser
    def parse_coord(coord_str):
        lat, lon = coord_str.strip("()").split(", ")
        return float(lon), float(lat)

    # Build polygons
    segment_polygons = []
    for _, row in segments_df.iterrows():
        try:
            polygon = Polygon([
                parse_coord(row["NW"]),
                parse_coord(row["NE"]),
                parse_coord(row["SE"]),
                parse_coord(row["SW"]),
            ]).buffer(0.0005)
            segment_polygons.append({
                "Segment": row["Segment"],
                "Polygon": polygon
            })
        except Exception as e:
            print(f"Error building polygon for segment {row.get('Segment', 'unknown')}: {e}")

    # Assign segment to each charger
    def assign_segment(lat, lon, polygons):
        point = Point(lon, lat)
        for entry in polygons:
            if entry["Polygon"].intersects(point):
                return entry["Segment"]
        return "Unclassified"

    charging_df.dropna(subset=["Latitude", "Longitude"], inplace=True)
    charging_df["Segment"] = charging_df.apply(
        lambda row: assign_segment(row["Latitude"], row["Longitude"], segment_polygons),
        axis=1
    )

    # Count chargers per segment
    charger_counts = charging_df["Segment"].value_counts().reset_index()
    charger_counts.columns = ["Segment", "New Chargers"]

    # Merge with energy data
    combined_df = energy_df.merge(charger_counts, on="Segment", how="left")
    combined_df["New Chargers"] = combined_df["New Chargers"].fillna(0)
    combined_df["New Load (kWh)"] = combined_df["New Chargers"] * energy_per_charger_kwh
    combined_df["New Total Load"] = combined_df["energy_sum"] + combined_df["New Load (kWh)"]
    combined_df["Increase (%)"] = (combined_df["New Load (kWh)"] / combined_df["energy_sum"]) * 100

    # Risk flagging
    def flag_risk(pct):
        if pct <= 5:
            return "Safe"
        elif pct <= 15:
            return "Monitor"
        elif pct <= 30:
            return "Caution"
        else:
            return "Do Not Add"

    combined_df["Risk Level"] = combined_df["Increase (%)"].apply(flag_risk)

    # Final decision
    if "Do Not Add" in combined_df["Risk Level"].values:
        decision = "❌ Rejected – at least one segment exceeds 30% load increase"
    elif "Caution" in combined_df["Risk Level"].values:
        decision = "⚠️ Flagged – one or more segments exceed 15% load"
    else:
        decision = "✔️ Approved – all segments within acceptable range"

    print("\n=== CHARGING FEASIBILITY SUMMARY ===")
    print(combined_df[["Segment", "New Chargers", "Increase (%)", "Risk Level"]])
    print("\nDecision:", decision)

    # Generate map
    map_path = generate_charger_risk_map(charging_df, combined_df)

    return {
        "summary": combined_df.to_dict(orient="records"),
        "decision": decision,
        "map_file": map_path
    }


# Helper: Generate map
def generate_charger_risk_map(charging_df, risk_df, output_map="charging_port_risk_map.html"):
    merged_df = charging_df.merge(
        risk_df[["Segment", "Risk Level"]],
        on="Segment",
        how="left"
    )

    risk_colors = {
        "Safe": "green",
        "Monitor": "lightred",
        "Caution": "orange",
        "Do Not Add": "red",
        "Unclassified": "gray"
    }

    risk_map = folium.Map(
        location=[charging_df["Latitude"].mean(), charging_df["Longitude"].mean()],
        zoom_start=11
    )

    for _, row in merged_df.iterrows():
        color = risk_colors.get(row["Risk Level"], "gray")
        folium.Marker(
            location=[row["Latitude"], row["Longitude"]],
            icon=folium.Icon(color=color, icon="flash"),
            popup=(f"<b>Segment:</b> {row['Segment']}<br><b>Risk:</b> {row['Risk Level']}")
        ).add_to(risk_map)

    risk_map.save(output_map)
    print(f"✅ Map saved to: {output_map}")
    return output_map

