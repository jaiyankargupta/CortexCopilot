import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes import auth_router, analytics_router, copilot_router

load_dotenv()

app = FastAPI(
    title="Cortex Copilot — Industrial Energy & Cost Optimization Engine",
    description="Autonomous Agentic Energy Intelligence & Industrial Tariff Analytics API",
    version="1.0.0"
)

# Configure CORS for Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cortex-copilot-xyz.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(copilot_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Cortex Copilot Backend Engine"}
