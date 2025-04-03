import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_redshift_connection():
    return psycopg2.connect(
        dbname=os.getenv("REDSHIFT_DB"),
        user=os.getenv("REDSHIFT_USER"),
        password=os.getenv("REDSHIFT_PASSWORD"),
        host=os.getenv("REDSHIFT_HOST"),
        port="5439"
    )