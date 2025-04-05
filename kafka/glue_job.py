import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.sql.functions import to_timestamp
import boto3
from datetime import datetime

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- Define source paths ---
bucket = "peanut-butter-project"
base_path = f"s3://{bucket}/smart-meter-data"

# --- Use more specific path pattern for date-based directories ---
# This will match any date folder in the format YYYY-MM-DD
household_path = f"{base_path}/household/*/*.json"
anomaly_path = f"{base_path}/anomalies/*/*.json"
aggregate_path = f"{base_path}/aggregate/*/*.json"

# --- Debug: Print the paths we're trying to access ---
print(f"Attempting to read from household path: {household_path}")
print(f"Attempting to read from anomaly path: {anomaly_path}")
print(f"Attempting to read from aggregate path: {aggregate_path}")

# --- Load data from S3 with error handling ---
try:
    household_df = spark.read.json(household_path)
    print(f"Successfully loaded household data: {household_df.count()} records")
except Exception as e:
    print(f"Error loading household data: {str(e)}")
    household_df = spark.createDataFrame([], "datetime timestamp, household_id string, consumption_kwh double")
    print("Created empty household dataframe")

try:
    anomaly_df = spark.read.json(anomaly_path)
    print(f"Successfully loaded anomaly data: {anomaly_df.count()} records")
except Exception as e:
    print(f"Error loading anomaly data: {str(e)}")
    anomaly_df = spark.createDataFrame([], "datetime timestamp, household_id string, anomaly_type string, severity double")
    print("Created empty anomaly dataframe")

try:
    aggregate_df = spark.read.json(aggregate_path)
    print(f"Successfully loaded aggregate data: {aggregate_df.count()} records")
except Exception as e:
    print(f"Error loading aggregate data: {str(e)}")
    aggregate_df = spark.createDataFrame([], "datetime timestamp, num_households int, total_consumption_kwh double, average_consumption_kwh double, anomaly_count int, anomaly_percentage double, weather struct<temperature:double,condition:string,humidity:double,wind_speed:double>")
    print("Created empty aggregate dataframe")

# --- Process data only if we have records ---
if household_df.count() > 0:
    household_df = household_df.withColumn("datetime", to_timestamp("datetime"))
    
if anomaly_df.count() > 0:
    anomaly_df = anomaly_df.withColumn("datetime", to_timestamp("datetime"))
    
if aggregate_df.count() > 0:
    aggregate_df = aggregate_df.withColumn("datetime", to_timestamp("datetime"))
    
    # --- Flatten aggregate (weather) ---
    aggregate_df_flat = aggregate_df.selectExpr(
        "datetime", 
        "num_households", 
        "total_consumption_kwh", 
        "average_consumption_kwh", 
        "anomaly_count", 
        "anomaly_percentage",
        "weather.temperature as weather_temp",
        "weather.condition as weather_condition",
        "weather.humidity as weather_humidity",
        "weather.wind_speed as weather_wind_speed"
    )
else:
    # Create empty flattened dataframe if no records
    aggregate_df_flat = spark.createDataFrame([], "datetime timestamp, num_households int, total_consumption_kwh double, average_consumption_kwh double, anomaly_count int, anomaly_percentage double, weather_temp double, weather_condition string, weather_humidity double, weather_wind_speed double")

# --- JDBC write config ---
jdbc_url = "jdbc:postgresql://your-actual-rds-endpoint:5432/your-database"
jdbc_properties = {
    "user": "your-username",
    "password": "your-password",
    "driver": "org.postgresql.Driver"
}

# --- Write to RDS only if we have data ---
if household_df.count() > 0:
    household_df.write.jdbc(
        url=jdbc_url,
        table="household_readings",
        mode="append",
        properties=jdbc_properties
    )
    print("Successfully wrote household data to RDS")

if anomaly_df.count() > 0:
    anomaly_df.write.jdbc(
        url=jdbc_url,
        table="anomaly_readings",
        mode="append",
        properties=jdbc_properties
    )
    print("Successfully wrote anomaly data to RDS")

if aggregate_df_flat.count() > 0:
    aggregate_df_flat.write.jdbc(
        url=jdbc_url,
        table="aggregate_readings",
        mode="append",
        properties=jdbc_properties
    )
    print("Successfully wrote aggregate data to RDS")

job.commit()