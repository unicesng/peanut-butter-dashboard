from fastapi import FastAPI
from functions.energy import energy_app
from functions.ev import ev_app

app = FastAPI()

# Include routers from separate files
app.include_router(energy_app, prefix="/energy")
app.include_router(energy_app, prefix="/ev")