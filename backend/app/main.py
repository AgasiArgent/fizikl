"""
Fizikl Backend API
Health survey with personalized insights
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import database to initialize on startup
from . import database  # noqa: F401
from .routes import router

app = FastAPI(
    title="Fizikl API",
    description="Health survey backend with personalized insights",
    version="1.0.0"
)

# Include API routes
app.include_router(router)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint"""
    return {"message": "Fizikl API v1.0.0"}
