import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base, engine

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    grade = Column(String(50), default="AI & DS - Semester V")
    learning_level = Column(String(50), default="Intermediate")  # Beginner, Intermediate, Advanced
    mastery_score = Column(Float, default=65.0)  # Percentage 0-100
    weak_topics = Column(Text, default="[]")  # JSON string of list of topics
    face_image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    interactions = relationship("InteractionLog", back_populates="student", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String(100), nullable=False)
    date = Column(String(20), index=True)  # YYYY-MM-DD
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="Present")  # Present, Late, Absent
    confidence_score = Column(Float, default=0.0)
    snapshot_path = Column(String(255), nullable=True)

    student = relationship("Student", back_populates="attendance_records")

class InteractionLog(Base):
    __tablename__ = "interaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    mode = Column(String(20), default="Voice")  # Voice, Text
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    context_retrieved = Column(Text, default="")
    response_time_ms = Column(Float, default=0.0)
    audio_duration_sec = Column(Float, default=0.0)
    feedback_score = Column(Integer, default=5)  # 1 to 5
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="interactions")

class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    total_pages = Column(Integer, default=1)
    chunk_count = Column(Integer, default=0)
    status = Column(String(50), default="indexed")  # indexed, processing, failed
    processing_stage = Column(String(50), default="indexed")  # validating, extracting, multimodal, chunking, embedding, indexed, failed
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Educational Knowledge Organization & Taxonomy
    subject = Column(String(100), default="Artificial Intelligence & Data Science")
    class_grade = Column(String(50), default="AI & DS - Semester V")
    topic = Column(String(150), default="Machine Learning")
    chapter = Column(String(150), default="Module 1")
    difficulty_level = Column(String(50), default="Intermediate")  # Beginner, Intermediate, Advanced
    academic_year = Column(String(50), default="2026-2027")
    teacher = Column(String(100), default="ZORO Teacher Robot")
    custom_tags = Column(String(255), default="")

    # Ingestion Source & Version Tracking
    source_type = Column(String(50), default="document")  # document, image, structured, bulk, url, text
    version = Column(Integer, default=1)
    parent_document_id = Column(Integer, ForeignKey("document_records.id"), nullable=True)
    original_filename = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    error_log = Column(Text, nullable=True)
    metadata_json = Column(Text, default="{}")

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("document_records.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    embedding_id = Column(String(100), nullable=True)
    late_chunk_context = Column(Text, default="")
    metadata_json = Column(Text, default="{}")

    document = relationship("DocumentRecord", back_populates="chunks")

class UploadHistory(Base):
    __tablename__ = "upload_history"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=True)
    filename = Column(String(255), nullable=False)
    source_type = Column(String(50), default="document")
    subject = Column(String(100), default="General")
    topic = Column(String(150), default="General")
    version = Column(Integer, default=1)
    status = Column(String(50), default="completed")  # success, failed, updated, reindexed, deleted
    action = Column(String(50), default="upload")  # upload, bulk_upload, replace, reindex, delete, url_ingest, text_entry
    error_message = Column(Text, nullable=True)
    chunks_created = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EvaluationMetric(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    query = Column(Text, nullable=False)
    ground_truth = Column(Text, default="")
    retrieved_context = Column(Text, default="")
    generated_answer = Column(Text, default="")
    faithfulness_score = Column(Float, default=0.0)
    context_relevance_score = Column(Float, default=0.0)
    answer_relevance_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)

class RobotState(Base):
    __tablename__ = "robot_states"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    battery_level = Column(Float, default=95.0)
    cpu_temp_celsius = Column(Float, default=42.5)
    left_motor_speed = Column(Integer, default=0)
    right_motor_speed = Column(Integer, default=0)
    pan_angle = Column(Integer, default=90)
    tilt_angle = Column(Integer, default=90)
    camera_active = Column(Boolean, default=True)
    mic_active = Column(Boolean, default=True)
    speaker_active = Column(Boolean, default=True)
    last_action = Column(String(100), default="Idle")


def migrate_database():
    import sqlite3
    from backend.config import settings
    
    db_path = settings.DATA_DIR / "teacher_robot.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check document_records columns
    existing_cols = [c[1] for c in cursor.execute("PRAGMA table_info(document_records)").fetchall()]
    
    cols_to_add = [
        ("subject", "TEXT DEFAULT 'Artificial Intelligence & Data Science'"),
        ("class_grade", "TEXT DEFAULT 'AI & DS - Semester V'"),
        ("topic", "TEXT DEFAULT 'General'"),
        ("chapter", "TEXT DEFAULT 'Chapter 1'"),
        ("difficulty_level", "TEXT DEFAULT 'Intermediate'"),
        ("academic_year", "TEXT DEFAULT '2026-2027'"),
        ("teacher", "TEXT DEFAULT 'ZORO Teacher Robot'"),
        ("custom_tags", "TEXT DEFAULT ''"),
        ("source_type", "TEXT DEFAULT 'document'"),
        ("version", "INTEGER DEFAULT 1"),
        ("parent_document_id", "INTEGER"),
        ("original_filename", "TEXT"),
        ("source_url", "TEXT"),
        ("processing_stage", "TEXT DEFAULT 'indexed'"),
        ("error_log", "TEXT"),
        ("metadata_json", "TEXT DEFAULT '{}'")
    ]
    
    for col_name, col_type in cols_to_add:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE document_records ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to document_records")
            
    conn.commit()
    conn.close()
    
    # Create any missing tables (like upload_history)
    Base.metadata.create_all(bind=engine)
    print("Database migrations verified and applied.")

if __name__ == '__main__':
    migrate_database()
