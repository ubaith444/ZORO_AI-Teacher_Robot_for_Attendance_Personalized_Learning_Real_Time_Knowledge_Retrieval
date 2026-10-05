import cv2
import json
import base64
import numpy as np
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student, AttendanceRecord
from backend.schemas import (
    StudentCreate, StudentResponse, AttendanceRecordResponse, AttendanceMarkRequest
)
from backend.face_engine import FaceRecognitionEngine
from backend.hardware import robot_hardware

router = APIRouter(prefix="/api/attendance", tags=["Attendance & Facial Recognition"])
face_engine = FaceRecognitionEngine()

@router.get("/students", response_model=List[StudentResponse])
def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    results = []
    for s in students:
        try:
            wt = json.loads(s.weak_topics or "[]")
        except Exception:
            wt = []
        results.append(StudentResponse(
            id=s.id,
            student_id=s.student_id,
            name=s.name,
            grade=s.grade,
            learning_level=s.learning_level,
            mastery_score=s.mastery_score,
            weak_topics=wt,
            face_image_path=s.face_image_path,
            created_at=s.created_at
        ))
    return results

@router.post("/register", response_model=StudentResponse)
def register_student(
    student_id: str = Form(...),
    name: str = Form(...),
    grade: str = Form("AI & DS - Batch A"),
    learning_level: str = Form("Intermediate"),
    image_base64: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Check if student_id already exists
    existing = db.query(Student).filter(Student.student_id == student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID already registered")

    face_path = None
    img_np = None

    if file:
        file_bytes = file.file.read()
        nparr = cv2.imdecode(np.frombuffer(file_bytes, np.uint8), cv2.IMREAD_COLOR)
        if nparr is not None:
            img_np = nparr
    elif image_base64:
        img_np = face_engine.decode_base64_image(image_base64)
    else:
        # Capture from current robot camera frame
        img_np = robot_hardware.capture_frame()

    if img_np is not None:
        face_path = face_engine.register_student(student_id, img_np)

    new_student = Student(
        student_id=student_id,
        name=name,
        grade=grade,
        learning_level=learning_level,
        mastery_score=65.0,
        weak_topics=json.dumps([]),
        face_image_path=face_path
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return StudentResponse(
        id=new_student.id,
        student_id=new_student.student_id,
        name=new_student.name,
        grade=new_student.grade,
        learning_level=new_student.learning_level,
        mastery_score=new_student.mastery_score,
        weak_topics=[],
        face_image_path=new_student.face_image_path,
        created_at=new_student.created_at
    )

@router.post("/scan")
def scan_and_identify(
    image_base64: Optional[str] = None,
    auto_mark: bool = True,
    db: Session = Depends(get_db)
):
    """
    Captures camera frame or processes incoming image, detects faces,
    identifies student, and records attendance.
    """
    if image_base64:
        frame = face_engine.decode_base64_image(image_base64)
    else:
        frame = robot_hardware.capture_frame()

    if frame is None:
        raise HTTPException(status_code=400, detail="Unable to acquire camera frame")

    # Fetch all registered students
    students = db.query(Student).all()
    student_list = [
        {"id": s.id, "student_id": s.student_id, "name": s.name, "face_image_path": s.face_image_path}
        for s in students
    ]

    ident_result = face_engine.identify_face(frame, student_list)

    record_created = None
    today_str = date.today().isoformat()

    if ident_result["identified"] and auto_mark and ident_result["student_id"]:
        # Check if already marked today
        matched_student = db.query(Student).filter(Student.student_id == ident_result["student_id"]).first()
        if matched_student:
            existing_rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == matched_student.id,
                AttendanceRecord.date == today_str
            ).first()

            if not existing_rec:
                new_rec = AttendanceRecord(
                    student_id=matched_student.id,
                    student_name=matched_student.name,
                    date=today_str,
                    status="Present",
                    confidence_score=ident_result["confidence"]
                )
                db.add(new_rec)
                db.commit()
                db.refresh(new_rec)
                record_created = {
                    "id": new_rec.id,
                    "student_name": new_rec.student_name,
                    "status": new_rec.status,
                    "date": new_rec.date
                }
            else:
                record_created = {
                    "id": existing_rec.id,
                    "student_name": existing_rec.student_name,
                    "status": existing_rec.status,
                    "date": existing_rec.date,
                    "already_marked": True
                }

    return {
        "identification": ident_result,
        "attendance_record": record_created,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/mark", response_model=AttendanceRecordResponse)
def mark_attendance(
    req: AttendanceMarkRequest,
    db: Session = Depends(get_db)
):
    student = None
    if req.student_id:
        student = db.query(Student).filter(Student.student_id == req.student_id).first()

    name = req.student_name or (student.name if student else "Unknown Student")
    today_str = date.today().isoformat()

    record = AttendanceRecord(
        student_id=student.id if student else None,
        student_name=name,
        date=today_str,
        status=req.status,
        confidence_score=req.confidence_score
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record

@router.get("/records", response_model=List[AttendanceRecordResponse])
def get_attendance_records(
    date_filter: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord)
    if date_filter:
        query = query.filter(AttendanceRecord.date == date_filter)
    else:
        query = query.filter(AttendanceRecord.date == date.today().isoformat())

    return query.order_by(AttendanceRecord.timestamp.desc()).all()

@router.get("/stats")
def get_attendance_stats(db: Session = Depends(get_db)):
    today_str = date.today().isoformat()
    total_students = db.query(Student).count()
    today_records = db.query(AttendanceRecord).filter(AttendanceRecord.date == today_str).all()

    present_count = sum(1 for r in today_records if r.status == "Present")
    late_count = sum(1 for r in today_records if r.status == "Late")
    absent_count = max(0, total_students - (present_count + late_count))

    rate = (present_count / total_students * 100) if total_students > 0 else 100.0

    return {
        "date": today_str,
        "total_students": total_students,
        "present_count": present_count,
        "late_count": late_count,
        "absent_count": absent_count,
        "attendance_rate_percent": round(rate, 1)
    }
