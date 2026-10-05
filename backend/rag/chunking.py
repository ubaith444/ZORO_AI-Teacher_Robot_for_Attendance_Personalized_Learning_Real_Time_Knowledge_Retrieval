import re
from typing import List, Dict, Any, Optional

class SemanticChunker:
    """
    Splits educational documents into semantically coherent segments using sentence boundaries,
    heading patterns, list hierarchies, and paragraph transitions.
    """
    def __init__(self, target_chunk_size: int = 450, overlap_size: int = 80):
        self.target_chunk_size = target_chunk_size
        self.overlap_size = overlap_size

    def chunk_text(
        self,
        text: str,
        page_number: int = 1,
        doc_title: str = "",
        section: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        clean_text = re.sub(r'\r\n', '\n', text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text).strip()
        
        if not clean_text:
            return []

        base_meta = dict(metadata or {})
        base_meta.update({
            "doc_title": doc_title,
            "page": page_number,
            "section": section or f"Page {page_number}",
            "chunk_strategy": "semantic"
        })

        # Split into semantic paragraphs or structural blocks
        raw_paragraphs = re.split(r'\n\s*\n', clean_text)
        paragraphs = [p.strip() for p in raw_paragraphs if p.strip()]

        chunks = []
        current_chunk = []
        current_length = 0

        for p in paragraphs:
            p_len = len(p)
            
            # If paragraph itself is very long, split by sentences
            if p_len > self.target_chunk_size * 1.5:
                sentences = re.split(r'(?<=[.!?])\s+', p)
                for s in sentences:
                    s_clean = s.strip()
                    if not s_clean:
                        continue
                    if current_length + len(s_clean) > self.target_chunk_size and current_chunk:
                        chunk_text = " ".join(current_chunk)
                        chunks.append({
                            "content": chunk_text,
                            "page_number": page_number,
                            "token_count": len(chunk_text.split()),
                            "metadata": dict(base_meta)
                        })
                        if len(current_chunk) > 1:
                            current_chunk = [current_chunk[-1], s_clean]
                            current_length = len(current_chunk[0]) + len(s_clean)
                        else:
                            current_chunk = [s_clean]
                            current_length = len(s_clean)
                    else:
                        current_chunk.append(s_clean)
                        current_length += len(s_clean)
            else:
                if current_length + p_len > self.target_chunk_size and current_chunk:
                    chunk_text = " ".join(current_chunk)
                    chunks.append({
                        "content": chunk_text,
                        "page_number": page_number,
                        "token_count": len(chunk_text.split()),
                        "metadata": dict(base_meta)
                    })
                    if len(current_chunk) > 1:
                        current_chunk = [current_chunk[-1], p]
                        current_length = len(current_chunk[0]) + p_len
                    else:
                        current_chunk = [p]
                        current_length = p_len
                else:
                    current_chunk.append(p)
                    current_length += p_len

        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append({
                "content": chunk_text,
                "page_number": page_number,
                "token_count": len(chunk_text.split()),
                "metadata": dict(base_meta)
            })

        return chunks


class LateChunker:
    """
    Applies Late Chunking principles: preserves broader document-level context during embedding
    and pools surrounding document context into chunk embeddings to avoid semantic degradation.
    """
    def __init__(self, semantic_chunker: Optional[SemanticChunker] = None):
        self.chunker = semantic_chunker or SemanticChunker()

    def apply_late_chunking(
        self,
        full_document_text: str,
        chunks: List[Dict[str, Any]],
        doc_title: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        meta = metadata or {}
        subject = meta.get("subject", "Artificial Intelligence & Data Science")
        class_grade = meta.get("class_grade", "AI & DS - Semester V")
        topic = meta.get("topic", "General")
        chapter = meta.get("chapter", "Chapter 1")
        version = meta.get("version", 1)
        source_type = meta.get("source_type", "document")

        doc_words = full_document_text.split()
        global_context_lead = " ".join(doc_words[:120]) if doc_words else doc_title
        
        enhanced_chunks = []
        total_chunks = len(chunks)

        for i, chunk in enumerate(chunks):
            prev_context = chunks[i - 1]["content"][:140] if i > 0 else ""
            next_context = chunks[i + 1]["content"][:140] if i < total_chunks - 1 else ""

            # Synthesize Late-Chunking contextual envelope
            context_envelope = (
                f"[ZORO Knowledge Engine | Title: {doc_title} (v{version}) | "
                f"Subject: {subject} | Class: {class_grade} | Chapter: {chapter} | Topic: {topic} | "
                f"Source: {source_type}] "
                f"Macro Context: {global_context_lead}"
            )
            if prev_context:
                context_envelope += f" | Preceding Context: {prev_context}..."
            if next_context:
                context_envelope += f" | Next Context: ...{next_context}"

            chunk_copy = dict(chunk)
            chunk_copy["late_chunk_context"] = context_envelope
            chunk_meta = dict(chunk_copy.get("metadata", {}))
            chunk_meta.update({
                "late_chunked": True,
                "chunk_position": f"{i + 1}/{total_chunks}",
                "doc_title": doc_title,
                "subject": subject,
                "class_grade": class_grade,
                "topic": topic,
                "chapter": chapter,
                "version": version,
                "source_type": source_type,
            })
            chunk_copy["metadata"] = chunk_meta
            enhanced_chunks.append(chunk_copy)

        return enhanced_chunks
