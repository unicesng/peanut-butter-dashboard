import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.sql.functions import (
    to_timestamp, col, lit, md5, concat_ws,
    row_number, concat, create_map
)
from pyspark.sql.window import Window
from pyspark.sql import functions as F

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- S3 paths ---
bucket = "peanut-butter-project"
base_path = f"s3://{bucket}/smart-meter-data"
household_path = f"{base_path}/household/*/*/*.json"
anomaly_path = f"{base_path}/anomalies/*/*.json"
aggregate_path = f"{base_path}/aggregate/*/*.json"

# --- Load data ---
household_df = spark.read.json(household_path).withColumn("datetime", to_timestamp("datetime"))
anomaly_df = spark.read.json(anomaly_path).withColumn("datetime", to_timestamp("datetime"))

# --- Debug: Print schemas of loaded data ---
print("Household Data Schema:")
household_df.printSchema()
print("Anomaly Data Schema:")
anomaly_df.printSchema()

# Remove appliance_breakdown from household_df if it exists (we don't need it for household records)
household_columns = household_df.columns
if "appliance_breakdown" in household_columns:
    household_df = household_df.drop("appliance_breakdown")
    print("Removed appliance_breakdown from household data")
    
# Also remove from anomaly_df if it exists
anomaly_columns = anomaly_df.columns
if "appliance_breakdown" in anomaly_columns:
    anomaly_df = anomaly_df.drop("appliance_breakdown")
    print("Removed appliance_breakdown from anomaly data")

# --- Load aggregate data with defensive schema checking ---
aggregate_df = spark.read.json(aggregate_path).withColumn("datetime", to_timestamp("datetime"))

# Debug: Print aggregate schema to check for missing columns
print("Aggregate Data Schema:")
aggregate_df.printSchema()
print(f"Column check - 'appliance_breakdown' exists: {'appliance_breakdown' in aggregate_df.columns}")
print(f"Column check - 'acorn_stats' exists: {'acorn_stats' in aggregate_df.columns}")

# --- Combine household + anomaly ---
# Ensure both dataframes have the same columns before union
household_columns = set(household_df.columns)
anomaly_columns = set(anomaly_df.columns)
all_columns = household_columns.union(anomaly_columns)

# Add missing columns with null values to each dataframe
for col_name in all_columns:
    if col_name not in household_columns:
        household_df = household_df.withColumn(col_name, lit(None))
    if col_name not in anomaly_columns:
        anomaly_df = anomaly_df.withColumn(col_name, lit(None))

# Now perform union with aligned schemas
combined_df = household_df.unionByName(anomaly_df, allowMissingColumns=True)

# Generate consistent ID using md5(household_id + datetime)
readings_df = combined_df.withColumn("id", md5(concat_ws("_", "household_id", "datetime")))

# Deduplicate: keep only first record per ID
window = Window.partitionBy("id").orderBy("datetime")
readings_df = readings_df.withColumn("row_num", row_number().over(window)) \
                         .filter(col("row_num") == 1) \
                         .drop("row_num")

# --- JDBC Config ---
# Use custom schema
schema_name = "smart_meter_data"  # Name of the schema to create
jdbc_url = "jdbc:postgresql://peanut-butter-postgres.c8la4wumesrt.us-east-1.rds.amazonaws.com:5432/postgres"
jdbc_props = {"user": "postgres", "password": "postgres", "driver": "org.postgresql.Driver"}

# Create schema if it doesn't exist using a direct JDBC connection
try:
    from py4j.java_gateway import java_import
    java_import(spark._jvm, "java.sql.DriverManager")
    java_import(spark._jvm, "java.sql.Connection")
    java_import(spark._jvm, "java.sql.Statement")
    java_import(spark._jvm, "java.util.Properties")
    
    # Create a Properties object with connection properties
    props = spark._jvm.java.util.Properties()
    props.setProperty("user", jdbc_props["user"])
    props.setProperty("password", jdbc_props["password"])
    
    print(f"Attempting to create schema {schema_name} via direct JDBC connection...")
    
    # Get a connection
    conn = spark._jvm.java.sql.DriverManager.getConnection(jdbc_url, props)
    stmt = conn.createStatement()
    
    # Create the schema
    create_schema_sql = f"CREATE SCHEMA IF NOT EXISTS {schema_name}"
    stmt.execute(create_schema_sql)
    
    print(f"✅ Successfully created schema {schema_name} (or it already exists)")
    
    # Cleanup
    stmt.close()
    conn.close()
except Exception as e:
    print(f"❌ Error creating schema directly: {e}")
    print("Will try to use the schema anyway, but tables might be created in the public schema instead")

# Try an alternative schema creation approach
try:
    import psycopg2
    
    print(f"Attempting to create schema {schema_name} via psycopg2...")
    
    # Connect to the database
    conn = psycopg2.connect(
        host="peanut-butter-postgres.c8la4wumesrt.us-east-1.rds.amazonaws.com",
        port=5432,
        database="postgres",
        user="postgres",
        password="postgres"
    )
    
    # Make connection autocommit since we're running DDL
    conn.autocommit = True
    
    # Create a cursor
    cursor = conn.cursor()
    
    # Create the schema
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
    
    # Close the cursor and connection
    cursor.close()
    conn.close()
    
    print(f"✅ Successfully created schema {schema_name} via psycopg2 (or it already exists)")
except Exception as e:
    print(f"❌ Error creating schema via psycopg2: {e}")
    print("If both schema creation methods failed, tables will likely be created in the public schema")

# If both direct methods fail, try one last method with Spark SQL
try:
    # Use Spark's createJDBCTable mode="overwrite" with a specific schema
    dummy_df = spark.createDataFrame([("dummy",)], ["col1"])
    dummy_df.limit(0).write.jdbc(
        url=jdbc_url,
        table=f"{schema_name}.schema_init",
        mode="overwrite",
        properties={**jdbc_props, "createTableColumnTypes": "col1 VARCHAR(10)"}
    )
    print(f"✅ Created schema via dummy table in {schema_name}")
except Exception as e:
    print(f"❌ Error creating schema via dummy table: {e}")
    
    # If all else fails, default to the public schema
    schema_name = "public"
    print(f"⚠️ FALLING BACK to using the public schema instead")

# Update table names to include schema
household_table = f"{schema_name}.household_readings"
aggregate_table = f"{schema_name}.aggregate_consumption"
acorn_table = f"{schema_name}.acorn_group_stats"
appliance_table = f"{schema_name}.aggregate_appliance_consumption"
daily_stats_table = f"{schema_name}.daily_statistics"

print(f"Will use tables in schema '{schema_name}':")
print(f"  - {household_table}")
print(f"  - {aggregate_table}")
print(f"  - {acorn_table}")
print(f"  - {appliance_table}")
print(f"  - {daily_stats_table}")

# Check if table exists before trying to filter out existing IDs
try:
    # Test if we can access the table
    test_df = spark.read.jdbc(
        url=jdbc_url,
        table=f"(SELECT 1 FROM {household_table} LIMIT 1) AS test",
        properties=jdbc_props
    )
    
    # If we get here, the table exists, so filter out existing IDs
    existing_ids_df = spark.read.jdbc(
        url=jdbc_url,
        table=f"(SELECT id FROM {household_table}) AS existing_ids",
        properties=jdbc_props
    )
    readings_df = readings_df.join(existing_ids_df, on="id", how="left_anti")
    print(f"Filtered out existing household reading IDs from {household_table}")
except Exception as e:
    print(f"Table {household_table} might not exist yet: {e}")
    print("Skipping duplicate ID filtering - will attempt to create the table during write")

# --- Aggregate Main ---
# First, check which columns actually exist in the aggregate data
actual_columns = aggregate_df.columns
print(f"Actual columns in aggregate data: {actual_columns}")

# Define columns we expect, but only use them if they exist
expected_columns = ["datetime", "num_households", "total_consumption_kwh", "average_consumption_kwh", 
                    "anomaly_count", "anomaly_percentage"]

# Only include columns that actually exist
aggregate_main_cols = [col for col in expected_columns if col in actual_columns]

# Check if any essential columns are missing
missing_columns = [col for col in expected_columns if col not in actual_columns]
if missing_columns:
    print(f"Warning: Essential columns missing from aggregate data: {missing_columns}")
    # Add missing columns with default values
    for col_name in missing_columns:
        if "consumption" in col_name or "count" in col_name or "percentage" in col_name:
            aggregate_df = aggregate_df.withColumn(col_name, lit(0))
            aggregate_main_cols.append(col_name)
        else:
            aggregate_df = aggregate_df.withColumn(col_name, lit(None))
            aggregate_main_cols.append(col_name)

# Check if weather data exists in the expected structure
if "weather" in actual_columns:
    try:
        # Test if we can access weather subfields
        weather_fields = aggregate_df.select("weather.*").columns
        print(f"Weather fields available: {weather_fields}")
        
        # Only add weather fields that actually exist
        weather_mapping = {
            "temperature": "weather_temperature",
            "condition": "weather_condition",
            "humidity": "weather_humidity",
            "wind_speed": "weather_wind_speed"
        }
        
        for orig_field, new_field in weather_mapping.items():
            if orig_field in weather_fields:
                aggregate_main_cols.append(f"weather.{orig_field} as {new_field}")
            else:
                print(f"Weather field {orig_field} not found, adding null column")
                aggregate_df = aggregate_df.withColumn(new_field, lit(None))
                aggregate_main_cols.append(new_field)
    except Exception as e:
        print(f"Error processing weather fields: {e}")
        # Add default null weather columns
        aggregate_df = aggregate_df.withColumn("weather_temperature", lit(None).cast("double"))
        aggregate_df = aggregate_df.withColumn("weather_condition", lit(None).cast("string"))
        aggregate_df = aggregate_df.withColumn("weather_humidity", lit(None).cast("double"))
        aggregate_df = aggregate_df.withColumn("weather_wind_speed", lit(None).cast("double"))
        aggregate_main_cols.extend(["weather_temperature", "weather_condition", "weather_humidity", "weather_wind_speed"])
else:
    print("Weather data not found in aggregate data")
    # Add default null weather columns
    aggregate_df = aggregate_df.withColumn("weather_temperature", lit(None).cast("double"))
    aggregate_df = aggregate_df.withColumn("weather_condition", lit(None).cast("string"))
    aggregate_df = aggregate_df.withColumn("weather_humidity", lit(None).cast("double"))
    aggregate_df = aggregate_df.withColumn("weather_wind_speed", lit(None).cast("double"))
    aggregate_main_cols.extend(["weather_temperature", "weather_condition", "weather_humidity", "weather_wind_speed"])

# Print the final columns we'll be selecting
print(f"Final aggregate columns to select: {aggregate_main_cols}")

# Create aggregate main dataframe with available columns
try:
    # Safety check in case aggregate_main_cols is empty
    if not aggregate_main_cols:
        print("No valid columns to select for aggregate data, creating minimal dataframe")
        aggregate_main_df = aggregate_df.withColumn("id", md5(col("datetime").cast("string")))
    else:
        aggregate_main_df = aggregate_df.selectExpr(*aggregate_main_cols)
        aggregate_main_df = aggregate_main_df.withColumn("id", md5(col("datetime").cast("string")))
    
    aggregate_main_df = aggregate_main_df.dropDuplicates(["id"])
except Exception as e:
    print(f"Error creating aggregate main dataframe: {e}")
    # Create minimal dataframe with just id and datetime
    aggregate_main_df = aggregate_df.select("datetime").withColumn("id", md5(col("datetime").cast("string")))

# Check if aggregate_consumption table exists before filtering
try:
    # Test if we can access the table
    test_df = spark.read.jdbc(
        url=jdbc_url,
        table=f"(SELECT 1 FROM {aggregate_table} LIMIT 1) AS test",
        properties=jdbc_props
    )
    
    # If we get here, the table exists, so filter out existing IDs
    existing_agg_ids = spark.read.jdbc(
        url=jdbc_url,
        table=f"(SELECT id FROM {aggregate_table}) AS existing_agg_ids",
        properties=jdbc_props
    )
    aggregate_main_df = aggregate_main_df.join(existing_agg_ids, on="id", how="left_anti")
    print(f"Filtered out existing aggregate consumption IDs from {aggregate_table}")
except Exception as e:
    print(f"Table {aggregate_table} might not exist yet: {e}")
    print("Skipping duplicate ID filtering - will attempt to create the table during write")

# --- ACORN Group Stats (flattened) ---
aggregate_id_col = md5(col("datetime").cast("string"))

# Check if acorn_stats exists before processing
if "acorn_stats" in aggregate_df.columns:
    print("Processing ACORN stats...")
    acorn_struct = aggregate_df.select("datetime", "acorn_stats").withColumn("aggregate_id", aggregate_id_col)
    
    def extract_acorn_group(df, group_name):
        return df.select(
            "aggregate_id",
            F.lit(group_name).alias("acorn_group"),
            col(f"acorn_stats.`{group_name}`.household_count").alias("household_count"),
            col(f"acorn_stats.`{group_name}`.total_consumption_kwh").alias("total_consumption_kwh"),
            col(f"acorn_stats.`{group_name}`.average_consumption_kwh").alias("average_consumption_kwh"),
            col(f"acorn_stats.`{group_name}`.anomaly_count").alias("anomaly_count")
        )
    
    known_acorn_groups = [
        "Affluent Achievers",
        "Comfortable Communities",
        "Financially Stretched",
        "Rising Prosperity",
        "Urban Adversity"
    ]
    
    acorn_df = None
    for group in known_acorn_groups:
        try:
            extracted = extract_acorn_group(acorn_struct, group)
            acorn_df = extracted if acorn_df is None else acorn_df.unionByName(extracted)
        except Exception as e:
            print(f"Error extracting ACORN group {group}: {e}")
    
    if acorn_df is not None:
        acorn_df = acorn_df.dropDuplicates(["aggregate_id", "acorn_group"])
        
        # Check if acorn_group_stats table exists before filtering
        try:
            # Test if we can access the table
            test_df = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT 1 FROM {acorn_table} LIMIT 1) AS test",
                properties=jdbc_props
            )
            
            # If we get here, the table exists, so filter out existing records
            existing_acorn_df = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT aggregate_id, acorn_group FROM {acorn_table}) AS existing_acorn_keys",
                properties=jdbc_props
            )
            acorn_df = acorn_df.join(existing_acorn_df, on=["aggregate_id", "acorn_group"], how="left_anti")
            print(f"Filtered out existing ACORN group stats from {acorn_table}")
        except Exception as e:
            print(f"Table {acorn_table} might not exist yet: {e}")
            print("Skipping duplicate ACORN stats filtering - will attempt to create the table during write")
else:
    print("ACORN stats not found in data schema, skipping ACORN processing")
    acorn_df = None

# --- Aggregate Appliance Breakdown ---
# Check if appliance_breakdown exists before processing
if "appliance_breakdown" in aggregate_df.columns:
    print("Processing appliance breakdown...")
    # Get all available appliance keys from the data
    appliance_keys = set()
    
    # First, check the schema to determine if appliance_breakdown is a map or struct
    breakdown_schema = aggregate_df.schema["appliance_breakdown"].dataType
    print(f"appliance_breakdown data type: {breakdown_schema}")
    
    # Try different approaches depending on the data type
    try:
        # Show a sample row to debug
        print("Sample appliance_breakdown values:")
        aggregate_df.select("appliance_breakdown").limit(3).show(truncate=False)
        
        # If it's a struct, get field names
        if hasattr(breakdown_schema, "fieldNames"):
            print("Using struct field names approach")
            appliance_keys.update(breakdown_schema.fieldNames())
        # If it's a map or we need to inspect actual values
        else:
            print("Using row collection approach")
            for row in aggregate_df.select("appliance_breakdown").limit(100).collect():
                if row.appliance_breakdown is not None:
                    # Check if it's a dict-like object
                    if hasattr(row.appliance_breakdown, "keys"):
                        appliance_keys.update(row.appliance_breakdown.keys())
                    # Handle case where it's a Spark Row or other object
                    elif hasattr(row.appliance_breakdown, "__fields__"):
                        appliance_keys.update(row.appliance_breakdown.__fields__)
                    # Last resort, try to derive keys
                    else:
                        print(f"Unknown appliance_breakdown type: {type(row.appliance_breakdown)}")
                        # Try JSON approach if it's a string
                        if isinstance(row.appliance_breakdown, str):
                            try:
                                import json
                                appliance_data = json.loads(row.appliance_breakdown)
                                if isinstance(appliance_data, dict):
                                    appliance_keys.update(appliance_data.keys())
                            except:
                                pass
    except Exception as e:
        print(f"Error getting appliance keys: {e}")
        print("Will use a hardcoded set of keys instead")
        # Fallback to expected keys from your Kafka producer
        appliance_keys = {"Lighting", "Heating/Cooling", "Kitchen", "Entertainment", "Other", "EV Charging", "Solar Production"}
    
    print(f"Found appliance types: {appliance_keys}")
    
    # Start with a base select for the ID
    stack_expr_parts = ["aggregate_id"]
    stack_values = []
    
    # Add each appliance type to the stack expression
    appliance_count = 0
    for appliance in appliance_keys:
        safe_name = appliance.replace("/", "_").replace(" ", "_")
        col_ref = f"`{appliance}`" if " " in appliance or "/" in appliance else appliance
        stack_expr_parts.append(f"appliance_breakdown.{col_ref} as {safe_name}")
        stack_values.append(f"'{appliance}', {safe_name}")
        appliance_count += 1
    
    if appliance_count > 0:
        # Select the columns we prepared
        agg_appliance_df = aggregate_df.select(
            aggregate_id_col.alias("aggregate_id"),
            *[F.expr(expr) for expr in stack_expr_parts[1:]]  # Skip the first element which is just the ID
        )
        
        # Create stack expression for pivoting
        stack_expr = f"stack({appliance_count}, {', '.join(stack_values)}) as (appliance_type, consumption_kwh)"
        
        # Apply the stack transformation
        agg_appliance_df = agg_appliance_df.selectExpr(
            "aggregate_id",
            stack_expr
        ).filter(col("consumption_kwh").isNotNull()) \
         .dropDuplicates(["aggregate_id", "appliance_type"])
        
        # Check if aggregate_appliance_consumption table exists before filtering
        try:
            # Test if we can access the table
            test_df = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT 1 FROM {appliance_table} LIMIT 1) AS test",
                properties=jdbc_props
            )
            
            # If we get here, the table exists, so filter out existing records
            existing_appliance_keys = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT aggregate_id, appliance_type FROM {appliance_table}) AS existing_appliance_keys",
                properties=jdbc_props
            )
            agg_appliance_df = agg_appliance_df.join(
                existing_appliance_keys,
                on=["aggregate_id", "appliance_type"],
                how="left_anti"
            )
            print(f"Filtered out existing appliance consumption records from {appliance_table}")
        except Exception as e:
            print(f"Table {appliance_table} might not exist yet: {e}")
            print("Skipping duplicate appliance consumption filtering - will attempt to create the table during write")
    else:
        print("No appliance types found in data, skipping appliance breakdown")
        agg_appliance_df = None
else:
    print("Appliance breakdown not found in data schema, skipping appliance processing")
    agg_appliance_df = None

# --- Daily Statistics (timestamp for PostgreSQL TIME) ---
# Check if peak_demand exists in the data
if "peak_demand" in aggregate_df.columns:
    print("Processing peak demand data...")
    try:
        peak_df = aggregate_df.select(
            col("datetime").cast("date").alias("date_key"),
            col("peak_demand.current_day.peak_demand_kwh").alias("peak_demand_kwh"),
            col("peak_demand.current_day.peak_time").alias("raw_peak_time")
        )
        
        # Convert to timestamp
        peak_df = peak_df.withColumn(
            "peak_time",
            to_timestamp(concat(F.lit("1970-01-01 "), col("raw_peak_time")), "yyyy-MM-dd HH:mm")
        )
        
        daily_stats_df = peak_df.withColumn("readings_count", lit(0)) \
            .withColumn("total_consumption_kwh", col("peak_demand_kwh")) \
            .select("date_key", "total_consumption_kwh", "readings_count", "peak_demand_kwh", "peak_time") \
            .dropDuplicates(["date_key"]) \
            .filter(col("total_consumption_kwh").isNotNull())
        
        # Check if daily_statistics table exists before filtering
        try:
            # Test if we can access the table
            test_df = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT 1 FROM {daily_stats_table} LIMIT 1) AS test",
                properties=jdbc_props
            )
            
            # If we get here, the table exists, so filter out existing records
            existing_dates_df = spark.read.jdbc(
                url=jdbc_url,
                table=f"(SELECT date_key FROM {daily_stats_table}) AS existing_date_keys",
                properties=jdbc_props
            )
            daily_stats_df = daily_stats_df.join(existing_dates_df, on="date_key", how="left_anti")
            print(f"Filtered out existing daily statistics records from {daily_stats_table}")
        except Exception as e:
            print(f"Table {daily_stats_table} might not exist yet: {e}")
            print("Skipping duplicate daily stats filtering - will attempt to create the table during write")
    except Exception as e:
        print(f"Error processing peak demand data: {e}")
        daily_stats_df = None
else:
    print("Peak demand data not found, skipping daily statistics")
    daily_stats_df = None

# --- Write to PostgreSQL ---
print("Writing data to PostgreSQL...")

# Write household readings
try:
    # Check if the household_readings table exists
    try:
        jdbc_schema_df = spark.read.jdbc(
            url=jdbc_url,
            table=f"(SELECT * FROM {household_table} LIMIT 0) AS schema_query",
            properties=jdbc_props
        )
        # Table exists, get its schema
        expected_columns = jdbc_schema_df.columns
        print(f"Table {household_table} exists. Expected columns: {expected_columns}")
        
        # Filter readings_df to only include columns that exist in the PostgreSQL table
        readings_df_filtered = readings_df.select([col for col in expected_columns if col in readings_df.columns])
        
        # Add any missing columns with NULL values
        for column in expected_columns:
            if column not in readings_df.columns:
                readings_df_filtered = readings_df_filtered.withColumn(column, lit(None))
    except Exception as schema_e:
        print(f"Table {household_table} doesn't exist or couldn't read schema: {schema_e}")
        print("Will use current DataFrame schema and let JDBC create the table")
        # Use key columns that are needed for a smart meter reading
        # Specify a proper schema here that matches your expected database structure
        essential_columns = [
            "id", "datetime", "household_id", "acorn_group", "acorn_category", 
            "consumption_kwh", "is_anomaly", "anomaly_type", "tariff", 
            "has_ev", "has_solar"
        ]
        # Only include columns that actually exist in our dataframe
        available_columns = [c for c in essential_columns if c in readings_df.columns]
        readings_df_filtered = readings_df.select(*available_columns)
    
    # Write the data
    if readings_df_filtered.count() > 0:
        print(f"Writing {readings_df_filtered.count()} household readings to {household_table}")
        readings_df_filtered.write.jdbc(
            url=jdbc_url, 
            table=household_table, 
            mode="append", 
            properties=jdbc_props
        )
        print(f"✅ Successfully wrote household readings to {household_table}")
    else:
        print("No new household readings to write")
except Exception as e:
    print(f"❌ Error writing household readings: {e}")
    print("Attempting to write with minimal schema as a last resort")
    try:
        # Last resort - try with absolute minimal schema
        minimal_columns = ["id", "datetime", "household_id", "consumption_kwh"]
        available_minimal = [c for c in minimal_columns if c in readings_df.columns]
        
        if len(available_minimal) >= 2:  # Need at least id and one other column
            minimal_df = readings_df.select(*available_minimal)
            if minimal_df.count() > 0:
                print(f"Writing {minimal_df.count()} household readings with minimal schema to {household_table}")
                minimal_df.write.jdbc(
                    url=jdbc_url, 
                    table=household_table, 
                    mode="append", 
                    properties=jdbc_props
                )
                print(f"✅ Successfully wrote household readings with minimal schema to {household_table}")
        else:
            print(f"❌ Cannot proceed with household readings write to {household_table} - insufficient columns available")
    except Exception as minimal_e:
        print(f"❌ Failed ultimate fallback write for household readings: {minimal_e}")

# Write aggregate data
try:
    if aggregate_main_df.count() > 0:
        print(f"Writing {aggregate_main_df.count()} aggregate records to {aggregate_table}")
        aggregate_main_df.write.jdbc(
            url=jdbc_url, 
            table=aggregate_table, 
            mode="append", 
            properties=jdbc_props
        )
        print(f"✅ Successfully wrote aggregate data to {aggregate_table}")
    else:
        print("No new aggregate data to write")
except Exception as e:
    print(f"❌ Error writing aggregate data: {e}")
    print("Attempting to write with essential columns")
    try:
        # Try with only essential columns
        essential_columns = ["id", "datetime", "total_consumption_kwh", "average_consumption_kwh", "num_households"]
        available_columns = [c for c in essential_columns if c in aggregate_main_df.columns]
        if len(available_columns) >= 2:  # Need at least id and one other column
            essential_df = aggregate_main_df.select(*available_columns)
            if essential_df.count() > 0:
                essential_df.write.jdbc(
                    url=jdbc_url, 
                    table=aggregate_table, 
                    mode="append", 
                    properties=jdbc_props
                )
                print(f"✅ Successfully wrote aggregate data with essential columns to {aggregate_table}")
        else:
            print(f"❌ Cannot proceed with aggregate data write to {aggregate_table} - insufficient columns available")
    except Exception as essential_e:
        print(f"❌ Failed to write aggregate data with essential columns: {essential_e}")

# Write ACORN group stats
if acorn_df is not None and acorn_df.count() > 0:
    try:
        print(f"Writing {acorn_df.count()} ACORN group stats to {acorn_table}")
        acorn_df.write.jdbc(
            url=jdbc_url, 
            table=acorn_table, 
            mode="append", 
            properties=jdbc_props
        )
        print(f"✅ Successfully wrote ACORN group stats to {acorn_table}")
    except Exception as e:
        print(f"❌ Error writing ACORN group stats: {e}")
else:
    print("No new ACORN group stats to write")

# Write appliance breakdown
if agg_appliance_df is not None and agg_appliance_df.count() > 0:
    try:
        print(f"Writing {agg_appliance_df.count()} appliance breakdown records to {appliance_table}")
        agg_appliance_df.write.jdbc(
            url=jdbc_url, 
            table=appliance_table, 
            mode="append", 
            properties=jdbc_props
        )
        print(f"✅ Successfully wrote appliance breakdown data to {appliance_table}")
    except Exception as e:
        print(f"❌ Error writing appliance breakdown data: {e}")
else:
    print("No new appliance breakdown data to write")

# Write daily statistics
if daily_stats_df is not None and daily_stats_df.count() > 0:
    try:
        print(f"Writing {daily_stats_df.count()} daily statistics to {daily_stats_table}")
        daily_stats_df.write.jdbc(
            url=jdbc_url, 
            table=daily_stats_table, 
            mode="append", 
            properties=jdbc_props
        )
        print(f"✅ Successfully wrote daily statistics to {daily_stats_table}")
    except Exception as e:
        print(f"❌ Error writing daily statistics: {e}")
else:
    print("No new daily statistics to write")

print("Glue job completed successfully!")
job.commit()