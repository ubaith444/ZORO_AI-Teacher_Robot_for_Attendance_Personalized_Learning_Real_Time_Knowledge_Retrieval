import asyncio
import json
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.models import Student, DocumentRecord, DocumentChunk, EvaluationMetric, AttendanceRecord
from backend.routes import (
    attendance_router,
    interaction_router,
    knowledge_router,
    evaluation_router,
    hardware_router,
    analytics_router,
)
from backend.routes.knowledge import semantic_chunker, late_chunker, vector_store, bm25_store
from backend.hardware import robot_hardware

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

def seed_initial_curriculum_and_students():
    """
    Initializes foundational student rosters and curriculum knowledge base
    if the SQLite database is currently empty.
    """
    db = SessionLocal()
    try:
        # Check if database has old school documents or needs initial AI & DS seed
        old_school_doc = db.query(DocumentRecord).filter(
            (DocumentRecord.title.like("%General Science%")) | (DocumentRecord.title.like("%Photosynthesis%"))
        ).first()

        if db.query(DocumentRecord).count() == 0 or old_school_doc:
            from generate_ai_ds_curriculum import generate_curriculum_materials, ingest_and_reindex_all
            specs = generate_curriculum_materials()
            ingest_and_reindex_all(specs)
    except Exception as e:
        print(f"Curriculum seeding error: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed curriculum
    from backend.models import migrate_database
    migrate_database()
    Base.metadata.create_all(bind=engine)
    seed_initial_curriculum_and_students()
    from backend.routes.knowledge import sync_indexes_from_db
    sync_indexes_from_db()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-world intelligent teacher robot API for automated attendance, voice interaction, RAG knowledge retrieval, and personalized learning.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(attendance_router)
app.include_router(interaction_router)
app.include_router(knowledge_router)
app.include_router(evaluation_router)
app.include_router(hardware_router)
app.include_router(analytics_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "deepface_loaded": face_engine_status(),
        "hardware_mock_mode": settings.HARDWARE_MOCK_MODE
    }

def face_engine_status() -> bool:
    try:
        from backend.face_engine import FaceRecognitionEngine
        fe = FaceRecognitionEngine()
        return fe.is_deepface_loaded
    except Exception:
        return False

# Real-Time WebSockets
@app.websocket("/ws/robot")
async def websocket_robot_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Emit telemetry state every 1.5 seconds
            telemetry = robot_hardware.get_telemetry()
            # Serialize datetime
            telemetry_data = dict(telemetry)
            telemetry_data["timestamp"] = telemetry_data["timestamp"].isoformat()
            await websocket.send_json({
                "type": "telemetry",
                "data": telemetry_data
            })
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or broadcast incoming client event
            await manager.broadcast({
                "type": "client_message",
                "message": data
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
