import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)

# Default persist path — can be overridden in tests
BM25_CORPUS_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "bm25_corpus.json"


class BM25Store:
    """
    In-memory BM25 index with disk persistence.
    The full corpus is saved to data/bm25_corpus.json after every mutation
    and reloaded on startup so the index survives server restarts.
    Fix 4: Resolves the critical bug where BM25 returned empty results after restart,
    leaving hybrid RRF relying solely on (broken) vector embeddings.
    """

    def __init__(self, corpus_path: Optional[Path] = None):
        self.corpus_path = corpus_path or BM25_CORPUS_PATH
        self.chunks: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self._load_from_disk()

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_]+\b', text.lower())

    def _save_to_disk(self):
        """Persist corpus to disk for restart recovery."""
        try:
            self.corpus_path.parent.mkdir(parents=True, exist_ok=True)
            # Only persist lightweight fields needed to rebuild the index
            saveable = []
            for c in self.chunks:
                entry = {
                    "content": c.get("content", ""),
                    "page_number": c.get("page_number", 1),
                    "late_chunk_context": c.get("late_chunk_context", ""),
                    "document_id": c.get("document_id"),
                    "metadata": c.get("metadata", {})
                }
                saveable.append(entry)
            with open(self.corpus_path, "w", encoding="utf-8") as f:
                json.dump(saveable, f, ensure_ascii=False)
            logger.info(f"[ZORO BM25] Corpus persisted: {len(saveable)} chunks -> {self.corpus_path}")
        except Exception as e:
            logger.warning(f"[ZORO BM25] Failed to persist corpus: {e}")

    def _load_from_disk(self):
        """Reload corpus from disk on startup."""
        if not self.corpus_path.exists():
            logger.info("[ZORO BM25] No persisted corpus found. Starting with empty index.")
            return
        try:
            with open(self.corpus_path, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)
            self._rebuild_index()
            logger.info(f"[ZORO BM25] Corpus reloaded: {len(self.chunks)} chunks from {self.corpus_path}")
        except Exception as e:
            logger.warning(f"[ZORO BM25] Failed to reload corpus: {e}. Starting fresh.")
            self.chunks = []

    def add_chunks(self, chunks: List[Dict[str, Any]], document_id: Optional[int] = None):
        for c in chunks:
            item = dict(c)
            if document_id is not None:
                item["document_id"] = document_id
            self.chunks.append(item)
        self._rebuild_index()
        self._save_to_disk()

    def delete_document_chunks(self, document_id: int):
        self.chunks = [c for c in self.chunks if c.get("document_id") != document_id]
        self._rebuild_index()
        self._save_to_disk()

    def _rebuild_index(self):
        if not self.chunks:
            self.bm25 = None
            return
        tokenized_corpus = [self._tokenize(c["content"]) for c in self.chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(
        self,
        query: str,
        top_k: int = 5,
        subject_filter: Optional[str] = None,
        grade_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not self.bm25 or not self.chunks:
            return []

        tokenized_query = self._tokenize(query)
        if not tokenized_query:
            return []

        scores = self.bm25.get_scores(tokenized_query)
        scored_indices = sorted(
            enumerate(scores),
            key=lambda x: x[1],
            reverse=True
        )

        max_score = max(scores) if len(scores) > 0 and max(scores) > 0 else 1.0

        results = []
        for idx, score in scored_indices:
            if score <= 0:
                continue
            chunk = self.chunks[idx]
            meta = chunk.get("metadata", {})
            subject = meta.get("subject", "Artificial Intelligence & Data Science")
            class_grade = meta.get("class_grade", "AI & DS - Semester V")

            if subject_filter and subject_filter != "all" and subject != subject_filter:
                continue
            if grade_filter and grade_filter != "all" and class_grade != grade_filter:
                continue

            doc_title = meta.get("doc_title", "General Curriculum")
            page_num = chunk.get("page_number", 1)
            topic = meta.get("topic", "General")
            chapter = meta.get("chapter", "Chapter 1")
            version = meta.get("version", 1)
            source_type = meta.get("source_type", "document")
            citation = f'[ZORO Source: "{doc_title}" (v{version}) | Subject: {subject} | Page: {page_num} | Chapter: {chapter}]'

            results.append({
                "content": chunk.get("content", ""),
                "document_title": doc_title,
                "page_number": page_num,
                "subject": subject,
                "topic": topic,
                "chapter": chapter,
                "version": version,
                "source_type": source_type,
                "source_citation": citation,
                "score": float(score / max_score),
                "raw_score": float(score),
                "retrieval_method": "bm25",
                "late_chunk_context": chunk.get("late_chunk_context", "")
            })

            if len(results) >= top_k:
                break

        return results

