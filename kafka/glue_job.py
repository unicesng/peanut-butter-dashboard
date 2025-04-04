import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql import functions as F
from pyspark.sql.types import *
from pyspark.sql.window import Window

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read data from S3
s3_bucket = "peanut-butter-project"
s3_aggregate_path = f"s3://{s3_bucket}/smart-meter-data/aggregate/"
s3_household_path = f"s3://{s3_bucket}/smart-meter-data/household/"
s3_anomaly_path = f"s3://{s3_bucket}/smart-meter-data/anomalies/"

# Read aggregate data
aggregate_dyf = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": [s3_aggregate_path], "recurse": True},
    format="json"
)

# Read household data
household_dyf = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": [s3_household_path], "recurse": True},
    format="json"
)

# Read anomaly data
anomaly_dyf = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": [s3_anomaly_path], "recurse": True},
    format="json"
)

# Convert to Spark DataFrames
aggregate_df = aggregate_dyf.toDF()
household_df = household_dyf.toDF()
anomaly_df = anomaly_dyf.toDF()

# Transform aggregate data
def transform_aggregate_data(df):
    # First handle the time series data
    if "time_series" in df.columns:
        # Explode time_series array into separate rows
        time_series_df = df.select(
            F.col("datetime").alias("aggregate_datetime"),
            F.explode("time_series").alias("ts_entry")
        )
        
        # Extract fields from the exploded structure
        time_series_df = time_series_df.select(
            "aggregate_datetime",
            F.col("ts_entry.datetime").alias("ts_datetime"),
            F.col("ts_entry.total_consumption_kwh").alias("ts_total_consumption"),
            F.col("ts_entry.average_consumption_kwh").alias("ts_average_consumption"),
            F.col("ts_entry.temperature").alias("ts_temperature"),
            F.col("ts_entry.weather_condition").alias("ts_weather_condition")
        )
        
        # Format time for dashboard
        time_series_df = time_series_df.withColumn(
            "time",
            F.date_format(F.to_timestamp("ts_datetime"), "HH:mm")
        )
        
        # Create the hourly_data array expected by dashboard
        hourly_data = time_series_df.select(
            "aggregate_datetime",
            F.struct(
                "time",
                F.col("ts_total_consumption").alias("consumption"),
                F.col("ts_average_consumption").alias("average"),
                F.lit(False).alias("anomaly") # Default to false, could be calculated
            ).alias("hourly_point")
        ).groupBy("aggregate_datetime").agg(
            F.collect_list("hourly_point").alias("hourly_data")
        )
        
        # Join back to main dataframe
        df = df.join(hourly_data, df.datetime == hourly_data.aggregate_datetime, "left")
        df = df.drop("aggregate_datetime")
    
    # Transform peak demand
    if "peak_demand" in df.columns:
        # Extract peak demand time string
        df = df.withColumn(
            "peak_demand_time", 
            F.when(
                F.col("peak_demand.current_day.peak_time").isNotNull(),
                F.concat(
                    F.round(F.col("peak_demand.current_day.peak_demand_kwh"), 1).cast("string"),
                    F.lit(" kWh at "),
                    F.col("peak_demand.current_day.peak_time")
                )
            ).otherwise(F.lit("No data"))
        )
        
        # Extract peak change string
        df = df.withColumn(
            "peak_change",
            F.when(
                F.col("peak_demand.vs_previous_day.percentage").isNotNull(),
                F.concat(
                    F.when(F.col("peak_demand.vs_previous_day.percentage") >= 0, F.lit("+")).otherwise(F.lit("")),
                    F.round(F.col("peak_demand.vs_previous_day.percentage"), 1).cast("string"),
                    F.lit("% vs yesterday")
                )
            ).otherwise(F.lit("No data"))
        )
    
    # Transform historical comparison to previous_data
    if "historical_comparison" in df.columns:
        df = df.withColumn(
            "previous_data",
            F.when(
                F.col("historical_comparison.vs_yesterday_avg.value").isNotNull(),
                F.struct(
                    F.col("num_households").alias("num_households"),
                    F.col("anomaly_count").alias("anomaly_count"),
                    (F.col("average_consumption_kwh") - F.col("historical_comparison.vs_yesterday_avg.value"))
                      .alias("average_consumption_kwh")
                )
            ).otherwise(F.lit(None))
        )
    
    # Calculate appliance breakdown percentages
    if "appliance_breakdown" in df.columns:
        appliance_cols = df.select("appliance_breakdown.*").columns
        
        # First, get the absolute total of all values
        total_expr = "+".join([f"abs(appliance_breakdown.`{col}`)" for col in appliance_cols])
        df = df.withColumn("total_appliance_consumption", F.expr(total_expr))
        
        # Calculate percentage for each category
        for col in appliance_cols:
            df = df.withColumn(
                f"appliance_pct_{col}", 
                (F.abs(F.col(f"appliance_breakdown.{col}")) / F.col("total_appliance_consumption")) * 100
            )
        
        # Create a new struct with the percentages
        percentage_cols = [F.col(f"appliance_pct_{col}").alias(col) for col in appliance_cols]
        df = df.withColumn("appliance_breakdown_percentages", F.struct(*percentage_cols))
        
        # Drop the temporary columns
        df = df.drop("total_appliance_consumption", *[f"appliance_pct_{col}" for col in appliance_cols])
    
    return df

# Apply transformations
transformed_aggregate_df = transform_aggregate_data(aggregate_df)

# Transform household data (simpler transformation)
def transform_household_data(df):
    # No major transformations needed for household data
    return df

transformed_household_df = transform_household_data(household_df)

# Prepare data for RDS
# 1. Write to temporary location on S3
temp_bucket = "peanut-butter-project-temp"
aggregate_output = f"s3://{temp_bucket}/transformed/aggregate/"
household_output = f"s3://{temp_bucket}/transformed/household/"
anomaly_output = f"s3://{temp_bucket}/transformed/anomaly/"

# Write transformed data as Parquet
transformed_aggregate_df.write.mode("overwrite").parquet(aggregate_output)
transformed_household_df.write.mode("overwrite").parquet(household_output)
anomaly_df.write.mode("overwrite").parquet(anomaly_output)

job.commit()