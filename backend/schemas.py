import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Student schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    grade: str = "AI & DS - Semester V"
    learning_level: str = "Intermediate"
    mastery_score: float = 65.0
    weak_topics: List[str] = Field(default_factory=list)

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    learning_level: Optional[str] = None
    mastery_score: Optional[float] = None
    weak_topics: Optional[List[str]] = None

class StudentResponse(StudentBase):
    id: int
    face_image_path: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Attendance schemas
class AttendanceMarkRequest(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    image_base64: Optional[str] = None
    status: str = "Present"
    confidence_score: float = 0.95

class AttendanceRecordResponse(BaseModel):
    id: int
    student_id: Optional[int] = None
    student_name: str
    date: str
    timestamp: datetime.datetime
    status: str
    confidence_score: float
    snapshot_path: Optional[str] = None

    class Config:
        from_attributes = True

# Interaction & Chat schemas
class ChatRequest(BaseModel):
    student_id: Optional[str] = None
    question: str
    mode: str = "Text"  # "Voice" or "Text"
    use_rag: bool = True
    adapt_learning_level: bool = True

class RetrievedContextItem(BaseModel):
    document_title: str
    page_number: int
    content: str
    score: float
    retrieval_method: str  # "vector", "bm25", "hybrid"
    subject: Optional[str] = "General"
    topic: Optional[str] = "General"
    chapter: Optional[str] = "Chapter 1"
    version: Optional[int] = 1
    source_type: Optional[str] = "document"
    source_citation: Optional[str] = None

class ChatResponse(BaseModel):
    question: str
    answer: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_level: Optional[str] = None
    adapted_complexity: str
    contexts: List[RetrievedContextItem] = Field(default_factory=list)
    audio_base64: Optional[str] = None
    response_time_ms: float
    confidence_score: float = 0.92

# Voice schemas
class SpeechToTextRequest(BaseModel):
    audio_base64: str

class SpeechToTextResponse(BaseModel):
    transcript: str
    confidence: float
    duration_sec: float

class TextToSpeechRequest(BaseModel):
    text: str
    voice: Optional[str] = None

class TextToSpeechResponse(BaseModel):
    audio_base64: str
    format: str = "audio/mp3"

# Knowledge & RAG schemas
class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    file_size_bytes: int
    total_pages: int
    chunk_count: int
    status: str
    processing_stage: str = "indexed"
    uploaded_at: datetime.datetime

    # Knowledge Organization
    subject: str = "Artificial Intelligence & Data Science"
    class_grade: str = "AI & DS - Semester V"
    topic: str = "Machine Learning"
    chapter: str = "Module 1"
    difficulty_level: str = "Intermediate"
    academic_year: str = "2026-2027"
    teacher: str = "ZORO Teacher Robot"
    custom_tags: str = ""

    # Source Tracking & Versioning
    source_type: str = "document"
    version: int = 1
    original_filename: Optional[str] = None
    source_url: Optional[str] = None
    error_log: Optional[str] = None
    metadata_json: Optional[str] = "{}"

    class Config:
        from_attributes = True

class DocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    page_number: int
    content: str
    token_count: int
    late_chunk_context: Optional[str] = None
    metadata_json: Optional[str] = "{}"

    class Config:
        from_attributes = True

class TextKnowledgeEntryRequest(BaseModel):
    title: str
    content: str
    subject: str = "Artificial Intelligence & Data Science"
    class_grade: str = "AI & DS - Semester V"
    topic: str = "Machine Learning"
    chapter: str = "Module 1"
    difficulty_level: str = "Intermediate"
    academic_year: str = "2026-2027"
    teacher: str = "ZORO Teacher Robot"
    custom_tags: str = ""

class UrlIngestRequest(BaseModel):
    url: str
    title: Optional[str] = None
    subject: str = "Artificial Intelligence & Data Science"
    class_grade: str = "AI & DS - Semester V"
    topic: str = "Machine Learning"
    chapter: str = "Module 1"
    difficulty_level: str = "Intermediate"
    academic_year: str = "2026-2027"
    teacher: str = "ZORO Teacher Robot"
    custom_tags: str = ""

class DocumentMetadataUpdateRequest(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    class_grade: Optional[str] = None
    topic: Optional[str] = None
    chapter: Optional[str] = None
    difficulty_level: Optional[str] = None
    academic_year: Optional[str] = None
    teacher: Optional[str] = None
    custom_tags: Optional[str] = None

class BatchUploadItemResult(BaseModel):
    filename: str
    status: str  # success, failed
    document_id: Optional[int] = None
    chunks_count: int = 0
    error_message: Optional[str] = None

class BatchUploadResponse(BaseModel):
    total_files: int
    successful: int
    failed: int
    items: List[BatchUploadItemResult]

class UploadHistoryResponse(BaseModel):
    id: int
    document_id: Optional[int] = None
    filename: str
    source_type: str
    subject: str
    topic: str
    version: int
    status: str
    action: str
    error_message: Optional[str] = None
    chunks_created: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class HybridSearchRequest(BaseModel):
    query: str
    top_k: int = 4
    dense_weight: float = 0.6
    bm25_weight: float = 0.4
    subject_filter: Optional[str] = None
    grade_filter: Optional[str] = None

class HybridSearchResult(BaseModel):
    query: str
    results: List[RetrievedContextItem]
    total_found: int

# Evaluation schemas
class EvaluationRunRequest(BaseModel):
    query: str
    ground_truth: Optional[str] = ""
    run_rag_pipeline: bool = True

class EvaluationMetricResponse(BaseModel):
    id: int
    run_id: str
    timestamp: datetime.datetime
    query: str
    ground_truth: str
    retrieved_context: str
    generated_answer: str
    faithfulness_score: float
    context_relevance_score: float
    answer_relevance_score: float
    overall_score: float
    latency_ms: float

    class Config:
        from_attributes = True

# Hardware & Telemetry schemas
class HardwareCommandRequest(BaseModel):
    action: str
    speed: int = 100
    pan_angle: Optional[int] = None
    tilt_angle: Optional[int] = None

class HardwareStateResponse(BaseModel):
    battery_level: float
    cpu_temp_celsius: float
    left_motor_speed: int
    right_motor_speed: int
    pan_angle: int
    tilt_angle: int
    camera_active: bool
    mic_active: bool
    speaker_active: bool
    last_action: str
    timestamp: datetime.datetime
