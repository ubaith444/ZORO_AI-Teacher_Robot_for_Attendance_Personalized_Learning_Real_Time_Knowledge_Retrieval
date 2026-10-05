from typing import List, Dict, Any, Optional
from backend.rag.vector_store import QdrantVectorStore
from backend.rag.bm25_store import BM25Store
from backend.config import settings

class HybridRetriever:
    """
    Combines dense semantic vector retrieval (Qdrant) and sparse lexical retrieval (BM25)
    using Reciprocal Rank Fusion (RRF) for robust classroom educational search.
    Applies minimum RRF confidence threshold to prevent context pollution.
    """
    # Minimum fused RRF score a result must achieve to be included in the LLM context.
    # At k=60 with weight=0.4, rank-1 BM25-only score = 0.4/61 = 0.00656.
    # Threshold of 0.0040 allows top-ranking lexical or semantic hits to qualify while discarding irrelevant noise.
    MINIMUM_RRF_SCORE: float = 0.0040

    def __init__(self, vector_store: QdrantVectorStore, bm25_store: BM25Store, rrf_k: int = 60):
        self.vector_store = vector_store
        self.bm25_store = bm25_store
        self.rrf_k = rrf_k

    def search(
        self,
        query: str,
        top_k: int = 4,
        dense_weight: float = 0.6,
        bm25_weight: float = 0.4,
        subject_filter: Optional[str] = None,
        grade_filter: Optional[str] = None,
        min_rrf_score: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns top_k chunks fused via RRF, filtered by minimum score threshold.
        Results with fused_score < min_rrf_score are dropped before reaching the LLM.
        """
        if min_rrf_score is None:
            min_rrf_score = self.MINIMUM_RRF_SCORE

        # Fetch candidate pools
        pool_size = max(top_k * 3, 10)
        dense_hits = self.vector_store.search(
            query=query,
            top_k=pool_size,
            subject_filter=subject_filter,
            grade_filter=grade_filter
        )
        bm25_hits = self.bm25_store.search(
            query=query,
            top_k=pool_size,
            subject_filter=subject_filter,
            grade_filter=grade_filter
        )

        fused_scores = {}
        candidate_map = {}

        # 1. Process Dense Vector Candidates
        for rank, hit in enumerate(dense_hits):
            key = f"{hit['document_title']}__p{hit['page_number']}__{hit['content'][:60]}"
            candidate_map[key] = hit
            rrf_score = dense_weight * (1.0 / (self.rrf_k + rank + 1))
            fused_scores[key] = fused_scores.get(key, 0.0) + rrf_score

        # 2. Process BM25 Sparse Lexical Candidates
        for rank, hit in enumerate(bm25_hits):
            key = f"{hit['document_title']}__p{hit['page_number']}__{hit['content'][:60]}"
            if key not in candidate_map:
                candidate_map[key] = hit
            rrf_score = bm25_weight * (1.0 / (self.rrf_k + rank + 1))
            fused_scores[key] = fused_scores.get(key, 0.0) + rrf_score

        # 3. Sort by fused RRF score
        sorted_keys = sorted(fused_scores.keys(), key=lambda k: fused_scores[k], reverse=True)

        results = []
        for key in sorted_keys[:top_k]:
            # Fix 1: Minimum RRF confidence gate — discard low-quality fused results
            if fused_scores[key] < min_rrf_score:
                continue
            item = dict(candidate_map[key])
            item["score"] = round(float(fused_scores[key]), 5)
            item["retrieval_method"] = "hybrid_rrf"
            results.append(item)

        return results
