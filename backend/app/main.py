import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.database.session import init_db, SessionLocal
from backend.app.api import auth, datasets, retail, fraud, maintenance, healthcare, recommendations, autods, copilot, platform
from backend.app.models.user import User
from backend.app.core.security import hash_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    init_db()
    
    # Seed default demo/admin user if not exists
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "demo@intellisphere.ai").first()
        if not admin_user:
            admin_user = User(
                email="demo@intellisphere.ai",
                hashed_password=hash_password("IntelliSphere2026!"),
                full_name="Lead AI Scientist",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified Enterprise Predictive Intelligence Platform combining 6 AI engines with Autonomous Data Science Agent and Copilot.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Latency Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time-Ms"] = str(round(process_time * 1000, 2))
    return response

# Include Sub-Routers
app.include_router(auth.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(retail.router, prefix="/api")
app.include_router(fraud.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(healthcare.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(autods.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")
app.include_router(platform.router, prefix="/api")

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

# Production Static SPA Mounting
dist_path = os.path.join(settings.BASE_DIR, "frontend", "dist")
assets_path = os.path.join(dist_path, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Don't intercept API or docs routes
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))
