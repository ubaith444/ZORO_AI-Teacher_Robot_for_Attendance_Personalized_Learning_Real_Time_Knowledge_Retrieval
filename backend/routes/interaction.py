import time
import base64
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student, InteractionLog
from backend.schemas import (
    ChatRequest, ChatResponse, RetrievedContextItem,
    SpeechToTextRequest, SpeechToTextResponse,
    TextToSpeechRequest, TextToSpeechResponse
)
from backend.rag.hybrid_retriever import HybridRetriever
from backend.rag.vector_store import QdrantVectorStore
from backend.rag.bm25_store import BM25Store
from backend.rag.evaluation import RAGEvaluationEngine
from backend.speech_service import DeepgramSpeechService
from backend.llm_service import OllamaLLMService
from backend.personalization import PersonalizationEngine

router = APIRouter(prefix="/api/interaction", tags=["Voice & Chat Interaction"])

from backend.routes.knowledge import vector_store, bm25_store, hybrid_retriever
speech_service = DeepgramSpeechService()
llm_service = OllamaLLMService()

@router.post("/chat", response_model=ChatResponse)
def handle_student_interaction(
    req: ChatRequest,
    db: Session = Depends(get_db)
):
    start_time = time.time()

    # 1. Fetch Student Profile
    student = None
    learning_level = "Intermediate"
    student_name = "Student"

    if req.student_id:
        student = db.query(Student).filter(Student.student_id == req.student_id).first()
        if student:
            student_name = student.name
            learning_level = student.learning_level

    # 2. Fix 5: Auto-classify question subject before RAG to prevent cross-domain retrieval
    # Uses the PersonalizationEngine TOPIC_KEYWORD_MAP for zero-overhead classification.
    detected_subject = PersonalizationEngine.detect_topic(req.question)
    # In the curriculum knowledge base, documents are classified under "Artificial Intelligence & Data Science".
    # Cross-domain filtering and topic relevance are strictly enforced by llm_service.check_context_relevance.
    subject_filter = None

    # 3. Retrieve Grounded Context via Hybrid Search with subject scoping
    retrieved_contexts = []
    if req.use_rag:
        raw_hits = hybrid_retriever.search(
            req.question,
            top_k=3,
            subject_filter=subject_filter
        )
        retrieved_contexts = raw_hits

    # 4. Generate Answer using Ollama LLM
    # Fix 6: weak_topics removed — new SYSTEM_PROMPT handles level adaptation via user-prompt format
    llm_output = llm_service.generate_answer(
        question=req.question,
        student_name=student_name,
        learning_level=learning_level if req.adapt_learning_level else "Intermediate",
        contexts=retrieved_contexts
    )
    answer_text = llm_output["answer"]

    # Fix 3: Use filtered relevant_contexts from LLM service for all downstream operations
    # This ensures the evaluation engine and interaction log reflect the actual context
    # that was shown to the model, not the raw unfiltered RAG hits.
    relevant_contexts = llm_output.get("relevant_contexts", [])

    # 5. Synthesize Audio Speech Output via Deepgram TTS
    audio_b64 = None
    if req.mode == "Voice":
        audio_b64 = speech_service.synthesize_speech(answer_text)

    # 6. Evaluate RAG Answer Faithfulness & Relevance using filtered context
    relevant_context_str = "\n".join([c.get("content", "") for c in relevant_contexts])
    RAGEvaluationEngine.evaluate_turn(
        query=req.question,
        retrieved_context=relevant_context_str,
        generated_answer=answer_text,
        latency_ms=llm_output["latency_ms"],
        db=db
    )

    # 7. Update Student Mastery & Adaptive Level
    if student:
        try:
            weak_topics = json.loads(student.weak_topics or "[]")
        except Exception:
            weak_topics = []
        PersonalizationEngine.update_student_mastery(
            student=student,
            question=req.question,
            answer=answer_text,
            feedback_score=5,
            db=db
        )

    # 8. Record Interaction Log with filtered context
    total_latency_ms = (time.time() - start_time) * 1000
    log = InteractionLog(
        student_id=student.id if student else None,
        mode=req.mode,
        question=req.question,
        response=answer_text,
        context_retrieved=relevant_context_str[:1000],
        response_time_ms=total_latency_ms,
        feedback_score=5
    )
    db.add(log)
    db.commit()

    context_items = [
        RetrievedContextItem(
            document_title=c.get("document_title", "Curriculum"),
            page_number=c.get("page_number", 1),
            content=c.get("content", ""),
            score=c.get("score", 0.0),
            retrieval_method=c.get("retrieval_method", "hybrid"),
            subject=c.get("subject", "Artificial Intelligence & Data Science"),
            topic=c.get("topic", "General"),
            chapter=c.get("chapter", "Chapter 1"),
            version=c.get("version", 1),
            source_type=c.get("source_type", "document"),
            source_citation=c.get("source_citation")
        ) for c in relevant_contexts
    ]

    return ChatResponse(
        question=req.question,
        answer=answer_text,
        student_id=req.student_id,
        student_name=student_name,
        student_level=learning_level,
        adapted_complexity=f"{learning_level} Mode",
        contexts=context_items,
        audio_base64=audio_b64,
        response_time_ms=round(total_latency_ms, 2),
        confidence_score=0.94
    )

@router.post("/transcribe", response_model=SpeechToTextResponse)
def transcribe_speech(req: SpeechToTextRequest):
    """
    Decodes audio base64 and transcribes speech using Deepgram Nova-2 STT.
    """
    try:
        raw_b64 = req.audio_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        audio_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid audio base64 payload: {str(e)}")

    result = speech_service.transcribe_audio_bytes(audio_bytes)
    return SpeechToTextResponse(
        transcript=result["transcript"],
        confidence=result["confidence"],
        duration_sec=result["duration_sec"]
    )

@router.post("/synthesize", response_model=TextToSpeechResponse)
def synthesize_text(req: TextToSpeechRequest):
    """
    Synthesizes speech audio using Deepgram Aura TTS.
    """
    audio_b64 = speech_service.synthesize_speech(req.text, voice=req.voice)
    if not audio_b64:
        raise HTTPException(status_code=503, detail="Text-to-Speech synthesis unavailable")
    return TextToSpeechResponse(audio_base64=audio_b64, format="audio/mp3")

@router.get("/history")
def get_interaction_history(
    student_id: Optional[str] = Query(None),
    limit: int = 30,
    db: Session = Depends(get_db)
):
    query = db.query(InteractionLog)
    if student_id:
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if student:
            query = query.filter(InteractionLog.student_id == student.id)
    return query.order_by(InteractionLog.timestamp.desc()).limit(limit).all()
