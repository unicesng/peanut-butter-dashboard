from fastapi import FastAPI
from .functions import averageDailyConsumption

app = FastAPI()

# Include routers from separate files
app.include_router(energy.router, prefix="/api/energy", tags=["Energy"])
app.include_router(ev.router, prefix="/api/ev", tags=["EV"])