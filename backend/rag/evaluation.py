import re
import uuid
import time
from typing import List, Dict, Any
from backend.models import EvaluationMetric
from sqlalchemy.orm import Session

class RAGEvaluationEngine:
    """
    Ragas-aligned evaluation framework for RAG pipeline benchmarking.
    Calculates Faithfulness, Context Relevance, and Answer Relevance metrics.
    """

    @staticmethod
    def _extract_keywords(text: str) -> set:
        stopwords = {
            "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at",
            "to", "for", "with", "by", "about", "as", "into", "like", "through", "after",
            "over", "between", "out", "against", "during", "without", "before", "under",
            "it", "this", "that", "these", "those", "can", "will", "would", "should", "of"
        }
        tokens = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return {t for t in tokens if t not in stopwords}

    @staticmethod
    def calculate_faithfulness(answer: str, context: str) -> float:
        """
        Faithfulness: Measures whether the claims made in the answer are grounded in the retrieved context.
        Range: 0.0 to 1.0.
        """
        if not answer.strip() or not context.strip():
            return 0.50

        # Split answer into propositions/sentences
        answer_sentences = [s.strip() for s in re.split(r'[.!?]+', answer) if len(s.strip()) > 10]
        if not answer_sentences:
            return 0.70

        context_words = RAGEvaluationEngine._extract_keywords(context)
        if not context_words:
            return 0.50

        grounded_sentences = 0
        for sent in answer_sentences:
            sent_words = RAGEvaluationEngine._extract_keywords(sent)
            if not sent_words:
                continue
            # Check overlap proportion with retrieved curriculum context
            overlap = sent_words.intersection(context_words)
            overlap_ratio = len(overlap) / len(sent_words)
            if overlap_ratio >= 0.20:
                grounded_sentences += 1

        total_tested = max(len(answer_sentences), 1)
        score = grounded_sentences / total_tested
        return min(max(round(score, 3), 0.1), 1.0)

    @staticmethod
    def calculate_context_relevance(query: str, context: str) -> float:
        """
        Context Relevance: Measures what proportion of retrieved context is pertinent to the question.
        Range: 0.0 to 1.0.
        """
        if not query.strip() or not context.strip():
            return 0.40

        query_words = RAGEvaluationEngine._extract_keywords(query)
        if not query_words:
            return 0.70

        context_sentences = [s.strip() for s in re.split(r'[.!?]+', context) if len(s.strip()) > 10]
        if not context_sentences:
            return 0.50

        relevant_sentences = 0
        for sent in context_sentences:
            sent_words = RAGEvaluationEngine._extract_keywords(sent)
            if query_words.intersection(sent_words):
                relevant_sentences += 1

        score = relevant_sentences / max(len(context_sentences), 1)
        # Normalize with minimum baseline for educational domains
        return min(max(round(0.3 + 0.7 * score, 3), 0.1), 1.0)

    @staticmethod
    def calculate_answer_relevance(query: str, answer: str) -> float:
        """
        Answer Relevance: Evaluates how directly the answer addresses the question.
        Range: 0.0 to 1.0.
        """
        if not query.strip() or not answer.strip():
            return 0.30

        query_words = RAGEvaluationEngine._extract_keywords(query)
        answer_words = RAGEvaluationEngine._extract_keywords(answer)

        if not query_words:
            return 0.80

        overlap = query_words.intersection(answer_words)
        overlap_score = len(overlap) / len(query_words)

        length_penalty = 1.0
        if len(answer.split()) < 5:
            length_penalty = 0.5

        score = (0.4 + 0.6 * overlap_score) * length_penalty
        return min(max(round(score, 3), 0.1), 1.0)

    @classmethod
    def evaluate_turn(
        cls,
        query: str,
        retrieved_context: str,
        generated_answer: str,
        ground_truth: str = "",
        latency_ms: float = 0.0,
        run_id: str = None,
        db: Session = None
    ) -> Dict[str, Any]:
        faithfulness = cls.calculate_faithfulness(generated_answer, retrieved_context)
        context_rel = cls.calculate_context_relevance(query, retrieved_context)
        answer_rel = cls.calculate_answer_relevance(query, generated_answer)

        overall = round((faithfulness * 0.4) + (context_rel * 0.3) + (answer_rel * 0.3), 3)

        metric_data = {
            "run_id": run_id or str(uuid.uuid4())[:8],
            "query": query,
            "ground_truth": ground_truth,
            "retrieved_context": retrieved_context[:1000],
            "generated_answer": generated_answer,
            "faithfulness_score": faithfulness,
            "context_relevance_score": context_rel,
            "answer_relevance_score": answer_rel,
            "overall_score": overall,
            "latency_ms": latency_ms
        }

        if db:
            record = EvaluationMetric(**metric_data)
            db.add(record)
            db.commit()
            db.refresh(record)
            metric_data["id"] = record.id

        return metric_data
