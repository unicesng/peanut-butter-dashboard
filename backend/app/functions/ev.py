from fastapi import APIRouter
from config import get_redshift_connection
import pandas as pd
import folium
from shapely.geometry import Point, Polygon
import numpy as np
from scipy.cluster.vq import kmeans2

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
    row = rows[0]

    conn.close()

    return ({
             "year": row[0],
             "electric": row[1],
             "nonelectric": row[2],
             "adoptionrate": row[3]
        } for row in rows)

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

@ev_app.get("/get_chargepoints")
async def get_chargepoints(n=100):
    conn = get_redshift_connection()
    try:
        query = "SELECT * FROM public.EV_chargepoints"
        rows = await conn.fetch(query)

        # Convert rows to pandas DataFrame
        df = pd.DataFrame([dict(row) for row in rows])

        # Clean and prep data
        df[['Latitude', 'Longitude']] = df[['Latitude', 'Longitude']].apply(pd.to_numeric, errors='coerce')
        df.dropna(subset=['Latitude', 'Longitude'], inplace=True)

        # === STEP 2: High Usage & Availability Classification ===
        df['High Usage'] = (
            (df['Energy Consumption (kWh)'] > (df['Charging Station Capacity (kW)'] / 2)) &
            (df['Availability Status'] != 'Out of Service')
        )
        df['Is Unavailable'] = df['Availability Status'] == 'Out of Service'

        # === STEP 3: KMeans Clustering (Suggested Locations) ===
        coordinates = df[['Latitude', 'Longitude']].to_numpy()
        k = n
        centroids, labels = kmeans2(coordinates, k=k, minit='++')
        df['Cluster'] = labels

        # === STEP 4: Create Map and Layers ===
        map_ev = folium.Map(location=[df['Latitude'].mean(), df['Longitude'].mean()], zoom_start=12)

        # Feature groups
        group_all = folium.FeatureGroup(name="All Stations").add_to(map_ev)
        group_high = folium.FeatureGroup(name="High Usage Stations").add_to(map_ev)
        group_unavailable = folium.FeatureGroup(name="Unavailable Stations").add_to(map_ev)
        group_suggested = folium.FeatureGroup(name="Suggested Charging Points").add_to(map_ev)

        # === STEP 5: Plot Charging Stations ===
        for _, row in df.iterrows():
            lat, lon = row['Latitude'], row['Longitude']
            usage = row['Usage Frequency (Daily Sessions)']
            capacity = row['Charging Station Capacity (kW)']
            status = row['Availability Status']
            popup_text = f"{row['Station Type']}<br>Usage: {usage} sessions<br>Status: {status}"

            if status in ['Available', 'In Use']:
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=5,
                    color='green',
                    fill=True,
                    popup=popup_text,
                ).add_to(group_all)

            if row['High Usage']:
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

        # Add Layer Control
        folium.LayerControl(collapsed=False).add_to(map_ev)

        # Save map and centroids
        map_ev.save("ev_charging_map_filtered.html")
        pd.DataFrame(centroids, columns=['Latitude', 'Longitude']).to_csv("suggested_charging_locations.csv", index=False)

        return {"message": "Map and suggested locations saved successfully."}

    finally:
        await conn.close()

@ev_app.get("/get_chargepoints")
async def get_chargepoints(
    energy_per_charger_kwh=40,
):
    
    conn = get_redshift_connection()

    query_charging = "SELECT * FROM public.EV_chargepoints"
    query_energy = "SELECT * FROM public.energy_table_name"  # replace with actual table
    query_segments = "SELECT * FROM public.segment_table_name"  # replace with actual table

    # Fetch rows from Redshift
    charging_rows = await conn.fetch(query_charging)
    energy_rows = await conn.fetch(query_energy)
    segment_rows = await conn.fetch(query_segments)

    # Convert to pandas DataFrames
    charging_df = pd.DataFrame([dict(row) for row in charging_rows])
    energy_df = pd.DataFrame([dict(row) for row in energy_rows])
    segments_df = pd.DataFrame([dict(row) for row in segment_rows])

    charging_df = pd.read_csv(charging_file)
    energy_df = pd.read_csv(energy_file)
    segments_df = pd.read_csv(segment_file)

    # Parse bounding box coordinates
    def parse_coord(coord_str):
        lat, lon = coord_str.strip("()").split(", ")
        return float(lon), float(lat)

    # Build segment polygons
    segment_polygons = []
    for _, row in segments_df.iterrows():
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

    # Assign segment to each charger
    def assign_segment(lat, lon, polygons):
        point = Point(lon, lat)
        for entry in polygons:
            if entry["Polygon"].intersects(point):
                return entry["Segment"]
        return "Unclassified"

    charging_df["Segment"] = charging_df.apply(
        lambda row: assign_segment(row["Latitude"], row["Longitude"], segment_polygons),
        axis=1
    )

    # Count chargers per segment
    charger_counts = charging_df["Segment"].value_counts().reset_index()
    charger_counts.columns = ["Segment", "New Chargers"]

    # Merge and calculate energy load
    combined_df = energy_df.merge(charger_counts, on="Segment", how="left")
    combined_df["New Chargers"] = combined_df["New Chargers"].fillna(0)
    combined_df["New Load (kWh)"] = combined_df["New Chargers"] * energy_per_charger_kwh
    combined_df["New Total Load"] = combined_df["energy_sum"] + combined_df["New Load (kWh)"]
    combined_df["Increase (%)"] = (combined_df["New Load (kWh)"] / combined_df["energy_sum"]) * 100

    # Risk flag
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

    # Determine verdict
    if "Do Not Add" in combined_df["Risk Level"].values:
        decision = "❌ Rejected – at least one segment exceeds 100% load increase"
    elif "Caution" in combined_df["Risk Level"].values:
        decision = "⚠️ Flagged – one or more segments exceed 50% load"
    else:
        decision = "✔️ Approved – all segments within acceptable range"

    print("\n=== CHARGING FEASIBILITY SUMMARY ===")
    print(combined_df[["Segment", "New Chargers", "Increase (%)", "Risk Level"]])
    print("\nDecision:", decision)

    return combined_df, decision, charging_df


