import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Check if the environment variables are loaded correctly
print(f"REDSHIFT_DB: {os.getenv('REDSHIFT_DB')}")
print(f"REDSHIFT_USER: {os.getenv('REDSHIFT_USER')}")
print(f"REDSHIFT_PASSWORD: {os.getenv('REDSHIFT_PASSWORD')}")
print(f"REDSHIFT_HOST: {os.getenv('REDSHIFT_HOST')}")

def get_redshift_connection():
    # Debug print to ensure variables are loaded
    print(f"Connecting to database: {os.getenv('REDSHIFT_DB')}")
    
    return psycopg2.connect(
        dbname=os.getenv("REDSHIFT_DB"),
        user=os.getenv("REDSHIFT_USER"),
        password=os.getenv("REDSHIFT_PASSWORD"),
        host=os.getenv("REDSHIFT_HOST"),
        port="5439",
        sslmode="require"
    )