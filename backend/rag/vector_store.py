import math
import hashlib
import logging
import requests
import uuid
import numpy as np
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, FilterSelector
)
from backend.config import settings

logger = logging.getLogger(__name__)

# Lazy singleton for CPU sentence-transformer fallback
_st_model = None
_st_model_loaded: bool = False

def _get_st_model():
    """Lazy-load sentence-transformers all-MiniLM-L6-v2 once on first call."""
    global _st_model, _st_model_loaded
    if _st_model_loaded:
        return _st_model
    try:
        from sentence_transformers import SentenceTransformer
        _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("[ZORO Embedding] sentence-transformers all-MiniLM-L6-v2 loaded as semantic fallback.")
    except Exception as e:
        logger.warning(f"[ZORO Embedding] sentence-transformers unavailable: {e}. Using zero-vector emergency fallback.")
        _st_model = None
    _st_model_loaded = True
    return _st_model

class QdrantVectorStore:
    def __init__(self):
        try:
            self.client = QdrantClient(path=str(settings.QDRANT_STORAGE_DIR))
        except Exception:
            self.client = QdrantClient(":memory:")

        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.dimension = settings.EMBEDDING_DIMENSION
        self._ensure_collection()

    def _ensure_collection(self):
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE)
            )

    def _generate_semantic_fallback_embedding(self, text: str) -> List[float]:
        """
        Fix 2: Semantic fallback using sentence-transformers all-MiniLM-L6-v2.
        This produces real semantic embeddings (384-dim) so that cosine similarity
        is meaningful even when Ollama's embedding endpoint is offline.
        Replaces the previous hash-based positional fallback which was non-semantic.
        """
        model = _get_st_model()
        if model is not None:
            try:
                vec = model.encode(text, normalize_embeddings=True)
                arr = np.array(vec, dtype=np.float32)
                # Resize to configured dimension if model output differs
                if len(arr) > self.dimension:
                    arr = arr[:self.dimension]
                    arr = arr / (np.linalg.norm(arr) + 1e-8)
                elif len(arr) < self.dimension:
                    padded = np.zeros(self.dimension, dtype=np.float32)
                    padded[:len(arr)] = arr
                    arr = padded
                return arr.tolist()
            except Exception as e:
                logger.warning(f"[ZORO Embedding] sentence-transformers encode failed: {e}")

        # Last-resort: zero vector (will score 0.0 against everything, filtered by threshold)
        logger.error("[ZORO Embedding] All embedding methods failed. Returning zero vector.")
        return [0.0] * self.dimension

    def embed_text(self, text: str) -> List[float]:
        """Primary: Ollama nomic-embed-text. Secondary: sentence-transformers. Tertiary: zero vector."""
        try:
            url = f"{self.base_url}/api/embeddings"
            payload = {
                "model": settings.OLLAMA_EMBED_MODEL,
                "prompt": text
            }
            res = requests.post(url, json=payload, timeout=2.0)
            if res.status_code == 200:
                data = res.json()
                embedding = data.get("embedding", [])
                if len(embedding) == self.dimension:
                    return embedding
                elif len(embedding) > self.dimension:
                    arr = np.array(embedding[:self.dimension], dtype=np.float32)
                    arr = arr / (np.linalg.norm(arr) + 1e-8)
                    return arr.tolist()
                elif len(embedding) > 0:
                    arr = np.zeros(self.dimension, dtype=np.float32)
                    arr[:len(embedding)] = embedding
                    arr = arr / (np.linalg.norm(arr) + 1e-8)
                    return arr.tolist()
        except Exception:
            pass

        # Ollama offline — fall back to sentence-transformers semantic embeddings
        logger.warning("[ZORO Embedding] Ollama embedding unavailable. Using sentence-transformers fallback.")
        return self._generate_semantic_fallback_embedding(text)

    def add_chunks(self, chunks: List[Dict[str, Any]], document_id: Optional[int] = None) -> List[str]:
        points = []
        point_ids = []

        for chunk in chunks:
            embed_input = chunk["content"]
            if chunk.get("late_chunk_context"):
                embed_input = f"{chunk['late_chunk_context']}\nContent: {chunk['content']}"

            vector = self.embed_text(embed_input)
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)

            meta = chunk.get("metadata", {})
            doc_title = meta.get("doc_title", "AI & DS Curriculum")
            subject = meta.get("subject", "Artificial Intelligence & Data Science")
            class_grade = meta.get("class_grade", "AI & DS - Semester V")
            topic = meta.get("topic", "General")
            chapter = meta.get("chapter", "Chapter 1")
            version = meta.get("version", 1)
            source_type = meta.get("source_type", "document")
            page_num = chunk.get("page_number", 1)

            payload = {
                "document_id": document_id,
                "content": chunk["content"],
                "page_number": page_num,
                "doc_title": doc_title,
                "subject": subject,
                "class_grade": class_grade,
                "topic": topic,
                "chapter": chapter,
                "version": version,
                "source_type": source_type,
                "late_chunk_context": chunk.get("late_chunk_context", ""),
                "token_count": chunk.get("token_count", len(chunk["content"].split())),
                "metadata": meta,
                "source_citation": f'[ZORO Source: "{doc_title}" (v{version}) | Subject: {subject} | Page: {page_num} | Chapter: {chapter}]'
            }

            points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        if points:
            self.client.upsert(collection_name=self.collection_name, points=points)

        return point_ids

    def delete_document_vectors(self, document_id: int):
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[
                            FieldCondition(
                                key="document_id",
                                match=MatchValue(value=document_id)
                            )
                        ]
                    )
                )
            )
        except Exception as e:
            print(f"Warning deleting vectors for doc {document_id}: {e}")

    MINIMUM_COSINE_SCORE: float = 0.40

    def search(
        self,
        query: str,
        top_k: int = 5,
        subject_filter: Optional[str] = None,
        grade_filter: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns semantically relevant chunks above the minimum cosine similarity threshold.
        Chunks scoring below min_score are discarded to prevent context pollution.
        """
        if min_score is None:
            min_score = self.MINIMUM_COSINE_SCORE
        query_vector = self.embed_text(query)

        query_filter = None
        filter_conditions = []
        if subject_filter and subject_filter != "all":
            filter_conditions.append(FieldCondition(key="subject", match=MatchValue(value=subject_filter)))
        if grade_filter and grade_filter != "all":
            filter_conditions.append(FieldCondition(key="class_grade", match=MatchValue(value=grade_filter)))

        if filter_conditions:
            query_filter = Filter(must=filter_conditions)

        search_result = []
        try:
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k
            )
        except Exception:
            try:
                res = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=top_k
                )
                search_result = res.points
            except Exception:
                search_result = []

        results = []
        for hit in search_result:
            # Fix 1: Cosine similarity threshold gate — reject low-quality hits
            if float(hit.score) < min_score:
                continue

            payload = hit.payload or {}
            doc_title = payload.get("doc_title", "General Curriculum")
            page_num = payload.get("page_number", 1)
            # Fix 7: Align subject default with ingestion-time default
            subject = payload.get("subject", "Artificial Intelligence & Data Science")
            topic = payload.get("topic", "General")
            chapter = payload.get("chapter", "Chapter 1")
            version = payload.get("version", 1)
            source_type = payload.get("source_type", "document")
            citation = payload.get(
                "source_citation",
                f'[ZORO Source: "{doc_title}" (v{version}) | Subject: {subject} | Page: {page_num} | Chapter: {chapter}]'
            )

            results.append({
                "content": payload.get("content", ""),
                "document_title": doc_title,
                "page_number": page_num,
                "subject": subject,
                "topic": topic,
                "chapter": chapter,
                "version": version,
                "source_type": source_type,
                "source_citation": citation,
                "score": float(hit.score),
                "retrieval_method": "vector",
                "late_chunk_context": payload.get("late_chunk_context", "")
            })

        return results
