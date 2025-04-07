from fastapi import FastAPI
from starlette.staticfiles import StaticFiles  # ✅ Fixed import!
from functions.energy import energy_app
from functions.ev import ev_app
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ✅ CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register routers
app.include_router(energy_app, prefix="/energy")
app.include_router(ev_app, prefix="/ev")