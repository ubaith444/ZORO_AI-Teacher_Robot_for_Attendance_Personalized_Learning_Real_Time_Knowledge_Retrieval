import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
STUDENT_FACES_DIR = DATA_DIR / "faces"
QDRANT_STORAGE_DIR = DATA_DIR / "qdrant_storage"

for directory in [DATA_DIR, UPLOADS_DIR, STUDENT_FACES_DIR, QDRANT_STORAGE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "AI-Enabled Intelligent Teacher Robot"
    VERSION: str = "1.0.0"
    DATA_DIR: Path = DATA_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    STUDENT_FACES_DIR: Path = STUDENT_FACES_DIR
    QDRANT_STORAGE_DIR: Path = QDRANT_STORAGE_DIR
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'teacher_robot.db'}"
    
    # Deepgram Configuration
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    DEEPGRAM_MODEL: str = "nova-2"
    DEEPGRAM_TTS_VOICE: str = "aura-asteria-en"
    
    # Ollama Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    
    # Qdrant Configuration
    QDRANT_COLLECTION_NAME: str = "curriculum_knowledge"
    EMBEDDING_DIMENSION: int = 384
    
    # Hybrid Search Weights
    RRF_K: int = 60
    VECTOR_WEIGHT: float = 0.6
    BM25_WEIGHT: float = 0.4
    
    # DeepFace Configuration
    DEEPFACE_MODEL: str = "VGG-Face"
    DEEPFACE_DETECTOR: str = "opencv"
    FACE_SIMILARITY_THRESHOLD: float = 0.40
    
    # Raspberry Pi GPIO Pins (Physical / BCM numbering for L298N/Driver)
    MOTOR_LEFT_PWM: int = 12
    MOTOR_LEFT_DIR: int = 16
    MOTOR_RIGHT_PWM: int = 13
    MOTOR_RIGHT_DIR: int = 19
    SERVO_PAN_PIN: int = 18
    SERVO_TILT_PIN: int = 23
    HARDWARE_MOCK_MODE: bool = os.getenv("HARDWARE_MOCK_MODE", "true").lower() in ("true", "1")

settings = Settings()
