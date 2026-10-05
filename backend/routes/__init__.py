from backend.routes.attendance import router as attendance_router
from backend.routes.interaction import router as interaction_router
from backend.routes.knowledge import router as knowledge_router
from backend.routes.evaluation import router as evaluation_router
from backend.routes.hardware import router as hardware_router
from backend.routes.analytics import router as analytics_router

__all__ = [
    "attendance_router",
    "interaction_router",
    "knowledge_router",
    "evaluation_router",
    "hardware_router",
    "analytics_router",
]
