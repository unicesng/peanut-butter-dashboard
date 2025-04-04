from fastapi import FastAPI
from app.functions.energy import app as energy_app

app = FastAPI()

# Include routers from separate files
app.include_router(energy_app, prefix="/energy")