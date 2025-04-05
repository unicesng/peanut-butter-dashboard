from fastapi import APIRouter
from config import get_redshift_connection

# Create a FastAPI router instead of the app instance
ev_app = APIRouter()

@ev_app.get("/health")
async def health_check():
    conn = get_redshift_connection()
    conn.close()
    return "Server OK Redshift OK"