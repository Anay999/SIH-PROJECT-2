from datetime import datetime, timezone
from fastapi import APIRouter

from app.core.config import settings
from app.core.database import check_db_health
from app.api.routes_gis import router as gis_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_facilities import router as facilities_router
from app.api.routes_weather import router as weather_router
from app.api.routes_thermal import router as thermal_router
from app.api.routes_vulnerability import router as vulnerability_router
from app.api.routes_health_risk import router as health_risk_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_simulations import router as simulations_router
from app.api.routes_auth import router as auth_router
from app.api.routes_emergency import router as emergency_router
from app.api.routes_notifications import router as notifications_router
from app.api.routes_system_monitor import router as system_monitor_router
from app.api.routes_admin import router as admin_router
from app.api.routes_thermomap import router as thermomap_router

api_router = APIRouter()

@api_router.get("/health", tags=["System"])
def get_health():
    """Health diagnostic endpoint returning API, DB, and mode status."""
    db_health = check_db_health()
    return {
        "status": "online" if db_health["status"] == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "version": settings.VERSION,
        "environment": settings.ENV,
        "demo_mode": settings.DEMO_MODE,
        "database": db_health,
        "active_city": settings.DEFAULT_CITY,
        "disclaimer": settings.DATA_DISCLAIMER,
        "server_time_utc": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/system/info", tags=["System"])
def get_system_info():
    """Returns platform capabilities, scientific engine versions, and data pedigree rules."""
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "capabilities": [
            "Rothfusz NOAA Heat Index",
            "Liljegren/ISO Wet-Bulb Globe Temperature (Direct & Estimated)",
            "Bröde Universal Thermal Climate Index (UTCI Operational Approximation)",
            "Composite Human Thermal Stress Index (HTSI 0-100)",
            "Heat-Attributable Mortality Risk Index (HAMRI Research Demo)",
            "Hospitalization Surge & Inpatient Pressure Forecasting",
            "Heat Action Plan Multi-Department Directive Dispatcher",
            "Deterministic 6-Scenario Simulation Engine",
            "Ward-Level Interactive GIS Choropleth (Leaflet)",
            "Emergency GIS & OSRM Routing Engine",
            "CallMeBot WhatsApp Test Console & Fast2SMS Dispatcher",
            "Audited Operational Mutations & Role-Based Permissions"
        ],
        "default_geography": {
            "city": settings.DEFAULT_CITY,
            "state": settings.DEFAULT_STATE,
            "country": settings.DEFAULT_COUNTRY
        },
        "data_provenance_contract": {
            "fields_required": ["source", "type", "timestamp", "unit", "quality_score", "model_version"],
            "types_supported": ["observed", "forecast", "simulated", "research_estimate"]
        }
    }

# Mount modular routers
api_router.include_router(dashboard_router)
api_router.include_router(gis_router)
api_router.include_router(facilities_router)
api_router.include_router(weather_router)
api_router.include_router(thermal_router)
api_router.include_router(vulnerability_router)
api_router.include_router(health_risk_router)
api_router.include_router(alerts_router)
api_router.include_router(simulations_router)
api_router.include_router(auth_router)
api_router.include_router(emergency_router)
api_router.include_router(notifications_router)
api_router.include_router(system_monitor_router)
api_router.include_router(admin_router)
api_router.include_router(thermomap_router)
