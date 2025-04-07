import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
import pyspark.sql.functions as F

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- Config ---
s3_path = "s3://peanut-butter-project/read/daily_dataset.csv"

redshift_host = "default-workgroup.536697253251.us-east-1.redshift-serverless.amazonaws.com"
redshift_db = "dev"
redshift_user = "redshift_user"
redshift_password = "MySecurePassword123!"
redshift_port = "5439"
target_table = "public.avg_daily_energy_per_lclid"

# --- Step 1: Load CSV from S3 ---
daily_df = spark.read.option("header", True).csv(s3_path)

# --- Step 2: Load households_with_segment from Redshift ---
redshift_jdbc = f"jdbc:redshift://{redshift_host}:{redshift_port}/{redshift_db}"

households_df = spark.read \
    .format("jdbc") \
    .option("url", redshift_jdbc) \
    .option("user", redshift_user) \
    .option("password", redshift_password) \
    .option("dbtable", "public.households_with_segment") \
    .load() \
    .withColumnRenamed("id", "LCLid") \
    .withColumnRenamed("segment", "Segment")

# --- Step 3: Join on LCLid ---
merged_df = daily_df.join(households_df, on="LCLid", how="inner")

# --- Step 4: Convert date column to DateType ---
merged_df = merged_df.withColumn("day", F.to_date("day"))

# --- Step 5: Group by Segment and day, sum energy_sum ---
daily_energy_df = merged_df.groupBy("Segment", "day") \
    .agg(F.sum("energy_sum").alias("daily_energy_sum"))

# --- Step 6: Group by Segment and compute average energy ---
avg_energy_df = daily_energy_df.groupBy("Segment") \
    .agg(F.avg("daily_energy_sum").alias("avg_daily_energy_sum"))

# --- Step 7: Write results to Redshift table (table already exists) ---
avg_energy_df.write \
    .format("jdbc") \
    .option("url", redshift_jdbc) \
    .option("user", redshift_user) \
    .option("password", redshift_password) \
    .option("dbtable", target_table) \
    .mode("overwrite") \
    .save()

print("✅ Data written to Redshift.")
job.commit()
