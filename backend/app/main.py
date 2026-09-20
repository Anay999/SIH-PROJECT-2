from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine
from app.api.api_router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("heatshield.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing HeatShield AI platform services...")
    # Create DB tables if not existing
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database initialized. Engine connected to {engine.dialect.name}.")
    
    # Auto-seed demo data if empty
    try:
        from app.data.seed_chennai import seed_database
        seed_database()
    except Exception as exc:
        logger.warning(f"Auto-seed check note: {exc}")

    yield
    logger.info("Shutting down HeatShield AI platform services...")

app = FastAPI(
    title=f"{settings.PROJECT_NAME} v{settings.VERSION}",
    description=(
        "**Extreme Heatwave Early Warning & Human Thermal Stress Intelligence Platform**\n\n"
        "Translates ambient weather variables into physiological human thermal stress (Rothfusz HI, "
        "Liljegren WBGT, Bröde UTCI, HTSI), fuses ward vulnerability profiles, projects heat-attributable "
        "health burdens (HAMRI & surge), and dispatches actionable heat action plans.\n\n"
        "**Notice:** Synthetic datasets and prototype models are clearly labeled. Not clinically validated."
    ),
    version=settings.VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers (standard v1 and backwards-compatible /api)
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_PREFIX}/health",
        "demo_mode": settings.DEMO_MODE,
        "active_city": settings.DEFAULT_CITY
    }
