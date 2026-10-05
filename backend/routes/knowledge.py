import shutil
import json
import traceback
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db, SessionLocal
from backend.models import DocumentRecord, DocumentChunk, UploadHistory
from backend.schemas import (
    DocumentResponse, DocumentChunkResponse, HybridSearchRequest, HybridSearchResult,
    RetrievedContextItem, TextKnowledgeEntryRequest, UrlIngestRequest, BatchUploadResponse,
    BatchUploadItemResult, UploadHistoryResponse, DocumentMetadataUpdateRequest
)
from backend.rag.document_loader import EducationalDocumentLoader
from backend.rag.chunking import SemanticChunker, LateChunker
from backend.rag.vector_store import QdrantVectorStore
from backend.rag.bm25_store import BM25Store
from backend.rag.hybrid_retriever import HybridRetriever

router = APIRouter(prefix="/api/knowledge", tags=["ZORO Knowledge System"])

semantic_chunker = SemanticChunker(target_chunk_size=450, overlap_size=80)
late_chunker = LateChunker(semantic_chunker)
vector_store = QdrantVectorStore()
bm25_store = BM25Store()
hybrid_retriever = HybridRetriever(vector_store, bm25_store)


def sync_indexes_from_db(db_session=None):
    """
    Syncs stored document chunks from SQLite into in-memory BM25 and Qdrant index.
    """
    db = db_session or SessionLocal()
    try:
        chunks = db.query(DocumentChunk).all()
        if chunks:
            needs_bm25 = len(bm25_store.chunks) == 0
            needs_vec = False
            try:
                needs_vec = (vector_store.client.count(vector_store.collection_name).count == 0)
            except Exception:
                pass

            if needs_bm25 or needs_vec:
                doc_map = {d.id: d for d in db.query(DocumentRecord).all()}
                chunk_dicts = []
                for c in chunks:
                    doc = doc_map.get(c.document_id)
                    doc_title = doc.title if doc else "AI & DS Curriculum"
                    subject = doc.subject if doc else "Artificial Intelligence & Data Science"
                    class_grade = doc.class_grade if doc else "AI & DS - Semester V"
                    topic = doc.topic if doc else "Machine Learning"
                    chapter = doc.chapter if doc else "Module 1"
                    version = doc.version if doc else 1
                    source_type = doc.source_type if doc else "document"

                    chunk_dicts.append({
                        "document_id": c.document_id,
                        "content": c.content,
                        "page_number": c.page_number,
                        "late_chunk_context": c.late_chunk_context,
                        "metadata": {
                            "doc_title": doc_title,
                            "subject": subject,
                            "class_grade": class_grade,
                            "topic": topic,
                            "chapter": chapter,
                            "version": version,
                            "source_type": source_type,
                            "page": c.page_number
                        }
                    })

                if needs_bm25:
                    bm25_store.add_chunks(chunk_dicts)
                if needs_vec:
                    try:
                        vector_store.add_chunks(chunk_dicts)
                    except Exception:
                        pass
    finally:
        if not db_session:
            db.close()

try:
    sync_indexes_from_db()
except Exception:
    pass


def _process_and_index_pipeline(
    parsed_doc: dict,
    meta: dict,
    db: Session,
    existing_doc_id: Optional[int] = None,
    action: str = "upload"
) -> DocumentRecord:
    """
    Core 9-Stage Processing Pipeline:
    1. File Validation -> 2. Text/Image Extraction -> 3. Multimodal Processing ->
    4. Metadata Extraction -> 5. Semantic Chunking -> 6. Late Chunking ->
    7. Document Embedding -> 8. Hybrid Indexing (Qdrant + BM25) -> 9. Knowledge Base Storage
    """
    title = meta.get("title") or parsed_doc.get("title", "Educational Document")
    subject = meta.get("subject", "Artificial Intelligence & Data Science")
    class_grade = meta.get("class_grade", "AI & DS - Semester V")
    topic = meta.get("topic", "Machine Learning")
    chapter = meta.get("chapter", "Module 1")
    difficulty_level = meta.get("difficulty_level", "Intermediate")
    academic_year = meta.get("academic_year", "2026-2027")
    teacher = meta.get("teacher", "Teacher Robot ZORO")
    custom_tags = meta.get("custom_tags", "")
    source_type = meta.get("source_type") or parsed_doc.get("source_type", "document")
    source_url = parsed_doc.get("source_url")

    # If updating/replacing existing document, clean previous vectors & chunks
    current_version = 1
    if existing_doc_id:
        prev_doc = db.query(DocumentRecord).filter(DocumentRecord.id == existing_doc_id).first()
        if prev_doc:
            current_version = prev_doc.version + 1
            # Remove old vectors & bm25
            vector_store.delete_document_vectors(existing_doc_id)
            bm25_store.delete_document_chunks(existing_doc_id)
            # Remove old chunks in db
            db.query(DocumentChunk).filter(DocumentChunk.document_id == existing_doc_id).delete()

    chunk_metadata = {
        "doc_title": title,
        "subject": subject,
        "class_grade": class_grade,
        "topic": topic,
        "chapter": chapter,
        "difficulty_level": difficulty_level,
        "academic_year": academic_year,
        "teacher": teacher,
        "custom_tags": custom_tags,
        "version": current_version,
        "source_type": source_type
    }

    # 1. Semantic Chunking across document pages/sections
    raw_chunks = []
    for page in parsed_doc.get("pages", []):
        p_chunks = semantic_chunker.chunk_text(
            text=page.get("text", ""),
            page_number=page.get("page_number", 1),
            doc_title=title,
            section=page.get("section", f"Page {page.get('page_number', 1)}"),
            metadata=chunk_metadata
        )
        raw_chunks.extend(p_chunks)

    if not raw_chunks:
        full_text = parsed_doc.get("full_text", title)
        raw_chunks = [{
            "content": full_text[:600],
            "page_number": 1,
            "token_count": len(full_text[:600].split()),
            "metadata": chunk_metadata
        }]

    # 2. Late Chunking: Inject holistic document context + surrounding flow
    enhanced_chunks = late_chunker.apply_late_chunking(
        full_document_text=parsed_doc.get("full_text", title),
        chunks=raw_chunks,
        doc_title=title,
        metadata=chunk_metadata
    )

    # 3. Store / Update DocumentRecord
    if existing_doc_id:
        doc_record = db.query(DocumentRecord).filter(DocumentRecord.id == existing_doc_id).first()
        doc_record.title = title
        doc_record.filename = parsed_doc.get("filename", doc_record.filename)
        doc_record.file_path = str(parsed_doc.get("file_path", doc_record.file_path))
        doc_record.file_size_bytes = parsed_doc.get("file_size", doc_record.file_size_bytes)
        doc_record.total_pages = parsed_doc.get("total_pages", doc_record.total_pages)
        doc_record.chunk_count = len(enhanced_chunks)
        doc_record.status = "indexed"
        doc_record.processing_stage = "indexed"
        doc_record.subject = subject
        doc_record.class_grade = class_grade
        doc_record.topic = topic
        doc_record.chapter = chapter
        doc_record.difficulty_level = difficulty_level
        doc_record.academic_year = academic_year
        doc_record.teacher = teacher
        doc_record.custom_tags = custom_tags
        doc_record.source_type = source_type
        doc_record.version = current_version
        doc_record.source_url = source_url
        doc_record.metadata_json = json.dumps(parsed_doc.get("multimodal_elements", []))
    else:
        doc_record = DocumentRecord(
            title=title,
            filename=parsed_doc.get("filename", "unknown"),
            file_path=str(parsed_doc.get("file_path", "")),
            file_size_bytes=parsed_doc.get("file_size", 0),
            total_pages=parsed_doc.get("total_pages", 1),
            chunk_count=len(enhanced_chunks),
            status="indexed",
            processing_stage="indexed",
            subject=subject,
            class_grade=class_grade,
            topic=topic,
            chapter=chapter,
            difficulty_level=difficulty_level,
            academic_year=academic_year,
            teacher=teacher,
            custom_tags=custom_tags,
            source_type=source_type,
            version=current_version,
            original_filename=parsed_doc.get("filename"),
            source_url=source_url,
            metadata_json=json.dumps(parsed_doc.get("multimodal_elements", []))
        )
        db.add(doc_record)

    db.commit()
    db.refresh(doc_record)

    # 4. Dense Vectors (Qdrant)
    point_ids = vector_store.add_chunks(enhanced_chunks, document_id=doc_record.id)

    # 5. Sparse Lexical (BM25)
    bm25_store.add_chunks(enhanced_chunks, document_id=doc_record.id)

    # 6. Save Chunk Records in DB
    for idx, ec in enumerate(enhanced_chunks):
        chunk_rec = DocumentChunk(
            document_id=doc_record.id,
            chunk_index=idx + 1,
            page_number=ec.get("page_number", 1),
            content=ec["content"],
            token_count=ec.get("token_count", 0),
            embedding_id=point_ids[idx] if idx < len(point_ids) else None,
            late_chunk_context=ec.get("late_chunk_context", ""),
            metadata_json=json.dumps(ec.get("metadata", {}))
        )
        db.add(chunk_rec)

    # 7. Audit log in UploadHistory
    history = UploadHistory(
        document_id=doc_record.id,
        filename=doc_record.filename,
        source_type=source_type,
        subject=subject,
        topic=topic,
        version=current_version,
        status="indexed",
        action=action,
        chunks_created=len(enhanced_chunks)
    )
    db.add(history)
    db.commit()

    return doc_record


# -------------------------------------------------------------
# 1. Document Upload (PDF, DOCX, PPTX, TXT, MD, CSV)
# -------------------------------------------------------------
@router.post("/upload", response_model=DocumentResponse)
def upload_curriculum_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: str = Form("Artificial Intelligence & Data Science"),
    class_grade: str = Form("AI & DS - Semester V"),
    topic: str = Form("Machine Learning"),
    chapter: str = Form("Module 1"),
    difficulty_level: str = Form("Intermediate"),
    academic_year: str = Form("2026-2027"),
    teacher: str = Form("Teacher Robot ZORO"),
    custom_tags: str = Form(""),
    db: Session = Depends(get_db)
):
    safe_filename = Path(file.filename).name
    save_path = settings.UPLOADS_DIR / safe_filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed_doc = EducationalDocumentLoader.load_document(str(save_path), source_type="document")
        meta = {
            "title": title or parsed_doc["title"],
            "subject": subject,
            "class_grade": class_grade,
            "topic": topic,
            "chapter": chapter,
            "difficulty_level": difficulty_level,
            "academic_year": academic_year,
            "teacher": teacher,
            "custom_tags": custom_tags,
            "source_type": "document"
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, action="document_upload")
    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        history = UploadHistory(
            filename=safe_filename,
            source_type="document",
            subject=subject,
            topic=topic,
            status="failed",
            action="document_upload",
            error_message=str(e)
        )
        db.add(history)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to process document: {str(e)}")


# -------------------------------------------------------------
# 2. Image / Diagram / Scanned Notes Upload (JPG, PNG)
# -------------------------------------------------------------
@router.post("/image-upload", response_model=DocumentResponse)
def upload_educational_image(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: str = Form("AI Visual Architecture"),
    class_grade: str = Form("AI & DS - Semester V"),
    topic: str = Form("Deep Learning Architecture"),
    chapter: str = Form("Module 1"),
    difficulty_level: str = Form("Intermediate"),
    academic_year: str = Form("2026-2027"),
    teacher: str = Form("Teacher Robot ZORO"),
    custom_tags: str = Form("diagram, visual"),
    db: Session = Depends(get_db)
):
    safe_filename = Path(file.filename).name
    save_path = settings.UPLOADS_DIR / safe_filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed_doc = EducationalDocumentLoader.load_document(str(save_path), source_type="image")
        meta = {
            "title": title or parsed_doc["title"],
            "subject": subject,
            "class_grade": class_grade,
            "topic": topic,
            "chapter": chapter,
            "difficulty_level": difficulty_level,
            "academic_year": academic_year,
            "teacher": teacher,
            "custom_tags": custom_tags,
            "source_type": "image"
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, action="image_upload")
    except Exception as e:
        history = UploadHistory(
            filename=safe_filename,
            source_type="image",
            subject=subject,
            topic=topic,
            status="failed",
            action="image_upload",
            error_message=str(e)
        )
        db.add(history)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


# -------------------------------------------------------------
# 3. Structured Data Upload (CSV, Excel .xlsx, JSON)
# -------------------------------------------------------------
@router.post("/structured-upload", response_model=DocumentResponse)
def upload_structured_curriculum(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: str = Form("Data Science & ML Datasets"),
    class_grade: str = Form("AI & DS - Semester V"),
    topic: str = Form("Feature Matrix"),
    chapter: str = Form("Module 1"),
    difficulty_level: str = Form("Intermediate"),
    academic_year: str = Form("2026-2027"),
    teacher: str = Form("Teacher Robot ZORO"),
    custom_tags: str = Form("structured, dataset"),
    db: Session = Depends(get_db)
):
    safe_filename = Path(file.filename).name
    save_path = settings.UPLOADS_DIR / safe_filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed_doc = EducationalDocumentLoader.load_document(str(save_path), source_type="structured")
        meta = {
            "title": title or parsed_doc["title"],
            "subject": subject,
            "class_grade": class_grade,
            "topic": topic,
            "chapter": chapter,
            "difficulty_level": difficulty_level,
            "academic_year": academic_year,
            "teacher": teacher,
            "custom_tags": custom_tags,
            "source_type": "structured"
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, action="structured_upload")
    except Exception as e:
        history = UploadHistory(
            filename=safe_filename,
            source_type="structured",
            subject=subject,
            topic=topic,
            status="failed",
            action="structured_upload",
            error_message=str(e)
        )
        db.add(history)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to process structured dataset: {str(e)}")


# -------------------------------------------------------------
# 4. Bulk Upload (Multiple files at once, Folder Ingestion)
# -------------------------------------------------------------
@router.post("/bulk-upload", response_model=BatchUploadResponse)
def bulk_upload_curriculum(
    files: List[UploadFile] = File(...),
    subject: str = Form("Artificial Intelligence & Data Science"),
    class_grade: str = Form("AI & DS - Semester V"),
    academic_year: str = Form("2026-2027"),
    teacher: str = Form("Teacher Robot ZORO"),
    custom_tags: str = Form("bulk"),
    db: Session = Depends(get_db)
):
    items = []
    success_count = 0
    fail_count = 0

    for file in files:
        safe_filename = Path(file.filename).name
        save_path = settings.UPLOADS_DIR / safe_filename

        try:
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            parsed_doc = EducationalDocumentLoader.load_document(str(save_path))
            meta = {
                "title": parsed_doc["title"],
                "subject": subject,
                "class_grade": class_grade,
                "topic": "Bulk Curriculum",
                "chapter": "Curriculum Asset",
                "difficulty_level": "Intermediate",
                "academic_year": academic_year,
                "teacher": teacher,
                "custom_tags": custom_tags,
                "source_type": parsed_doc.get("source_type", "bulk")
            }

            doc_record = _process_and_index_pipeline(parsed_doc, meta, db, action="bulk_upload")
            success_count += 1
            items.append(BatchUploadItemResult(
                filename=safe_filename,
                status="success",
                document_id=doc_record.id,
                chunks_count=doc_record.chunk_count
            ))
        except Exception as e:
            fail_count += 1
            history = UploadHistory(
                filename=safe_filename,
                source_type="bulk",
                subject=subject,
                topic="Bulk Ingestion",
                status="failed",
                action="bulk_upload",
                error_message=str(e)
            )
            db.add(history)
            db.commit()
            items.append(BatchUploadItemResult(
                filename=safe_filename,
                status="failed",
                error_message=str(e)
            ))

    return BatchUploadResponse(
        total_files=len(files),
        successful=success_count,
        failed=fail_count,
        items=items
    )


# -------------------------------------------------------------
# 5. URL / Web Content Ingestion
# -------------------------------------------------------------
@router.post("/url-ingest", response_model=DocumentResponse)
def ingest_url_content(req: UrlIngestRequest, db: Session = Depends(get_db)):
    try:
        parsed_doc = EducationalDocumentLoader.load_url(req.url, custom_title=req.title)
        meta = {
            "title": req.title or parsed_doc["title"],
            "subject": req.subject,
            "class_grade": req.class_grade,
            "topic": req.topic,
            "chapter": req.chapter,
            "difficulty_level": req.difficulty_level,
            "academic_year": req.academic_year,
            "teacher": req.teacher,
            "custom_tags": req.custom_tags,
            "source_type": "url"
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, action="url_ingest")
    except Exception as e:
        history = UploadHistory(
            filename=req.url[:60],
            source_type="url",
            subject=req.subject,
            topic=req.topic,
            status="failed",
            action="url_ingest",
            error_message=str(e)
        )
        db.add(history)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to ingest URL: {str(e)}")


# -------------------------------------------------------------
# 6. Direct Text / Teacher Notes Input
# -------------------------------------------------------------
@router.post("/text-entry", response_model=DocumentResponse)
def create_text_knowledge_entry(req: TextKnowledgeEntryRequest, db: Session = Depends(get_db)):
    try:
        parsed_doc = EducationalDocumentLoader.load_text_entry(req.title, req.content)
        meta = {
            "title": req.title,
            "subject": req.subject,
            "class_grade": req.class_grade,
            "topic": req.topic,
            "chapter": req.chapter,
            "difficulty_level": req.difficulty_level,
            "academic_year": req.academic_year,
            "teacher": req.teacher,
            "custom_tags": req.custom_tags,
            "source_type": "text"
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, action="text_entry")
    except Exception as e:
        history = UploadHistory(
            filename=req.title,
            source_type="text",
            subject=req.subject,
            topic=req.topic,
            status="failed",
            action="text_entry",
            error_message=str(e)
        )
        db.add(history)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to save text notes: {str(e)}")


# -------------------------------------------------------------
# 7. Document Directory & Management
# -------------------------------------------------------------
@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(
    subject: Optional[str] = Query(None),
    class_grade: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DocumentRecord)
    if subject and subject != "all":
        query = query.filter(DocumentRecord.subject == subject)
    if class_grade and class_grade != "all":
        query = query.filter(DocumentRecord.class_grade == class_grade)
    if source_type and source_type != "all":
        query = query.filter(DocumentRecord.source_type == source_type)
    if status and status != "all":
        query = query.filter(DocumentRecord.status == status)

    return query.order_by(DocumentRecord.uploaded_at.desc()).all()


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
def get_single_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/documents/{doc_id}/chunks", response_model=List[DocumentChunkResponse])
def get_document_chunks(doc_id: int, db: Session = Depends(get_db)):
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for document")
    return chunks


# -------------------------------------------------------------
# 8. Document Replace / Version Upgrade
# -------------------------------------------------------------
@router.put("/documents/{doc_id}/replace", response_model=DocumentResponse)
def replace_document(
    doc_id: int,
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    class_grade: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    chapter: Optional[str] = Form(None),
    difficulty_level: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    existing_doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not existing_doc:
        raise HTTPException(status_code=404, detail="Document to replace not found")

    safe_filename = Path(file.filename).name
    save_path = settings.UPLOADS_DIR / safe_filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed_doc = EducationalDocumentLoader.load_document(str(save_path))
        meta = {
            "title": existing_doc.title,
            "subject": subject or existing_doc.subject,
            "class_grade": class_grade or existing_doc.class_grade,
            "topic": topic or existing_doc.topic,
            "chapter": chapter or existing_doc.chapter,
            "difficulty_level": difficulty_level or existing_doc.difficulty_level,
            "academic_year": existing_doc.academic_year,
            "teacher": existing_doc.teacher,
            "custom_tags": existing_doc.custom_tags,
            "source_type": existing_doc.source_type
        }
        return _process_and_index_pipeline(parsed_doc, meta, db, existing_doc_id=doc_id, action="version_upgrade")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to replace document: {str(e)}")


# -------------------------------------------------------------
# 9. Document Re-indexing
# -------------------------------------------------------------
@router.post("/documents/{doc_id}/reindex", response_model=DocumentResponse)
def reindex_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists() and doc.source_type != "url" and doc.source_type != "text":
        raise HTTPException(status_code=400, detail="Original physical file not found on disk")

    try:
        if doc.source_type == "url":
            parsed_doc = EducationalDocumentLoader.load_url(doc.source_url or doc.file_path, custom_title=doc.title)
        elif doc.source_type == "text":
            # Reconstruct from stored chunks
            existing_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).order_by(DocumentChunk.chunk_index).all()
            reconstructed_text = "\n\n".join([c.content for c in existing_chunks])
            parsed_doc = EducationalDocumentLoader.load_text_entry(doc.title, reconstructed_text)
        else:
            parsed_doc = EducationalDocumentLoader.load_document(str(file_path))

        meta = {
            "title": doc.title,
            "subject": doc.subject,
            "class_grade": doc.class_grade,
            "topic": doc.topic,
            "chapter": doc.chapter,
            "difficulty_level": doc.difficulty_level,
            "academic_year": doc.academic_year,
            "teacher": doc.teacher,
            "custom_tags": doc.custom_tags,
            "source_type": doc.source_type
        }

        return _process_and_index_pipeline(parsed_doc, meta, db, existing_doc_id=doc_id, action="reindex")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-indexing failed: {str(e)}")


# -------------------------------------------------------------
# 10. Document Deletion
# -------------------------------------------------------------
@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    title = doc.title
    filename = doc.filename
    source_type = doc.source_type
    subject = doc.subject

    # 1. Delete from Qdrant
    vector_store.delete_document_vectors(doc_id)

    # 2. Delete from BM25
    bm25_store.delete_document_chunks(doc_id)

    # 3. Log Deletion
    history = UploadHistory(
        document_id=doc_id,
        filename=filename,
        source_type=source_type,
        subject=subject,
        status="deleted",
        action="delete"
    )
    db.add(history)

    # 4. Remove file from disk if present
    try:
        p = Path(doc.file_path)
        if p.exists() and p.is_file():
            p.unlink()
    except Exception:
        pass

    # 5. Delete from DB (cascades to DocumentChunk)
    db.delete(doc)
    db.commit()

    return {"status": "success", "message": f"Document '{title}' deleted from all knowledge stores"}


# -------------------------------------------------------------
# 11. Audit History & Error Logs
# -------------------------------------------------------------
@router.get("/upload-history", response_model=List[UploadHistoryResponse])
def get_upload_history(db: Session = Depends(get_db)):
    return db.query(UploadHistory).order_by(UploadHistory.created_at.desc()).limit(50).all()


@router.get("/error-logs", response_model=List[UploadHistoryResponse])
def get_error_logs(db: Session = Depends(get_db)):
    return db.query(UploadHistory).filter(UploadHistory.status == "failed").order_by(UploadHistory.created_at.desc()).limit(50).all()


# -------------------------------------------------------------
# 12. Hybrid Search with Source Citation Tracking
# -------------------------------------------------------------
@router.post("/hybrid-search", response_model=HybridSearchResult)
def test_hybrid_search(req: HybridSearchRequest):
    results = hybrid_retriever.search(
        query=req.query,
        top_k=req.top_k,
        dense_weight=req.dense_weight,
        bm25_weight=req.bm25_weight,
        subject_filter=req.subject_filter,
        grade_filter=req.grade_filter
    )

    items = [
        RetrievedContextItem(
            document_title=r["document_title"],
            page_number=r["page_number"],
            content=r["content"],
            score=r["score"],
            retrieval_method=r["retrieval_method"],
            subject=r.get("subject", "General"),
            topic=r.get("topic", "General"),
            chapter=r.get("chapter", "Chapter 1"),
            version=r.get("version", 1),
            source_type=r.get("source_type", "document"),
            source_citation=r.get("source_citation")
        ) for r in results
    ]

    return HybridSearchResult(
        query=req.query,
        results=items,
        total_found=len(items)
    )
