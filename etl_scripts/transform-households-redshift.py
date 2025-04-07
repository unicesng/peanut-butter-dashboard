import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.sql.functions import regexp_extract, when, col
from awsglue.dynamicframe import DynamicFrame

# Set up Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Replace with your actual S3 path
s3_input_path = "s3://peanut-butter-project/read/informations_households.csv"

# Read CSV with header
df = spark.read.option("header", "true").csv(s3_input_path)

# Rename columns
df = df.toDF("ID", "Type", "Acorn", "Old_Label", "Block")

# Extract Acorn Code (e.g., 'ACORN-D' -> 'D')
df = df.withColumn("Acorn_Code", regexp_extract("Acorn", r"ACORN-([A-Z])", 1))

# Map Acorn_Code to Segment
df = df.withColumn(
    "Segment",
    when(col("Acorn_Code").isin("A", "B", "C"), "Affluent Achievers")
    .when(col("Acorn_Code").isin("D", "E"), "Rising Prosperity")
    .when(col("Acorn_Code").isin("F", "G", "H", "I", "J"), "Comfortable Communities")
    .when(col("Acorn_Code").isin("K", "L", "M", "N"), "Financially Stretched")
    .when(col("Acorn_Code").isin("O", "P", "Q"), "Urban Adversity")
    .otherwise("Not Private Households")
)

# Keep only relevant columns
df = df.select("ID", "Acorn", "Segment")

# Convert to DynamicFrame
dyf = DynamicFrame.fromDF(df, glueContext, "dyf")

# Write to Redshift, clearing table first
glueContext.write_dynamic_frame.from_jdbc_conf(
    frame=dyf,
    catalog_connection="peanut-butter-redshift",
    connection_options={
        "dbtable": "households_with_segment",
        "database": "dev",
        "preactions": """
            TRUNCATE TABLE households_with_segment;
            CREATE TABLE IF NOT EXISTS households_with_segment (
                ID VARCHAR(50),
                Acorn VARCHAR(50),
                Segment VARCHAR(100)
            );
        """
    },
    redshift_tmp_dir="s3://peanut-butter-project/redshift-temp/",
    transformation_ctx="datasink_redshift"
)
