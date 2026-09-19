from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.root import router as root_router
from app.api.investigation import router as investigation_router, plural_router as investigations_plural_router
from app.api.demo import router as demo_router
from app.api.dashboard import router as dashboard_router
from app.api.signoz import router as signoz_router
from app.api.telemetry import router as telemetry_router
from app.api.auth import router as auth_router

from app.telemetry.tracing import setup_tracing
from app.core.settings import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="Evidence-Driven Incident Intelligence",
    version=settings.APP_VERSION,
)

cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173",
]
if settings.FRONTEND_ORIGIN and settings.FRONTEND_ORIGIN not in cors_origins:
    cors_origins.append(settings.FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://.*\.amplifyapp\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(root_router)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(investigation_router)
app.include_router(investigations_plural_router)
app.include_router(demo_router)
app.include_router(dashboard_router)
app.include_router(signoz_router)
app.include_router(telemetry_router)

setup_tracing(app)
