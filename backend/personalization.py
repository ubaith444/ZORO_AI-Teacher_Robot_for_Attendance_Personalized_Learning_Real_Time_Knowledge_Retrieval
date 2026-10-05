import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Student, InteractionLog

class PersonalizationEngine:
    """
    Analyzes student interaction patterns, tracks mastery progression,
    identifies topical weaknesses, and recommends customized learning trajectories.
    """

    TOPIC_KEYWORD_MAP = {
        "Machine Learning Foundations": ["regression", "gradient descent", "loss function", "linear regression", "logistic", "cost function", "mse", "gradient", "stochastic"],
        "Deep Learning & Neural Networks": ["neural network", "backpropagation", "cnn", "convolution", "rnn", "lstm", "activation", "weights", "bias", "perceptron", "mlp", "epoch"],
        "Model Evaluation & Generalization": ["overfitting", "underfitting", "bias-variance", "precision", "recall", "f1", "roc", "auc", "cross-validation", "regularization", "dropout"],
        "Unsupervised Learning & Clustering": ["clustering", "k-means", "pca", "dimensionality reduction", "unsupervised", "latent", "centroid", "eigenvalue", "hierarchical"],
        "NLP & Vector Retrieval": ["transformer", "attention", "self-attention", "token", "embedding", "llm", "bert", "gpt", "rag", "vector", "qdrant", "bm25", "retrieval"],
        "Data Science & Feature Engineering": ["pandas", "dataframe", "preprocessing", "imputation", "outlier", "feature engineering", "normalization", "standardization", "eda", "statistics"]
    }

    @classmethod
    def detect_topic(cls, text: str) -> Optional[str]:
        text_lower = text.lower()
        for topic, keywords in cls.TOPIC_KEYWORD_MAP.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                    return topic
        return "Artificial Intelligence & Data Science"

    @classmethod
    def update_student_mastery(
        cls,
        student: Student,
        question: str,
        answer: str,
        feedback_score: int,  # 1 to 5
        db: Session
    ):
        detected_topic = cls.detect_topic(question)

        # Parse weak topics list from student
        try:
            weak_list = json.loads(student.weak_topics or "[]")
        except Exception:
            weak_list = []

        # Recalculate mastery based on feedback (5 is high mastery, 1 is struggling)
        adjustment = (feedback_score - 3) * 2.5
        new_mastery = max(min(student.mastery_score + adjustment, 100.0), 10.0)
        student.mastery_score = round(new_mastery, 1)

        # If student rated 1 or 2, flag detected topic as weak
        if feedback_score <= 2 and detected_topic not in weak_list and detected_topic != "General Science":
            weak_list.append(detected_topic)
        # If student rated 4 or 5 and mastery is high, remove from weak topics
        elif feedback_score >= 4 and detected_topic in weak_list and new_mastery > 70:
            weak_list.remove(detected_topic)

        student.weak_topics = json.dumps(weak_list)

        # Adapt learning level based on mastery score
        if student.mastery_score >= 80.0:
            student.learning_level = "Advanced"
        elif student.mastery_score <= 45.0:
            student.learning_level = "Beginner"
        else:
            student.learning_level = "Intermediate"

        db.commit()
        db.refresh(student)

    @classmethod
    def get_student_analytics(cls, student: Student, db: Session) -> Dict[str, Any]:
        interactions = db.query(InteractionLog).filter(InteractionLog.student_id == student.id).all()
        total_interactions = len(interactions)
        avg_rating = 0.0
        if total_interactions > 0:
            avg_rating = sum(i.feedback_score for i in interactions) / total_interactions

        try:
            weak_list = json.loads(student.weak_topics or "[]")
        except Exception:
            weak_list = []

        # Generate personalized practice recommendations
        recommendations = []
        if weak_list:
            for topic in weak_list:
                recommendations.append({
                    "topic": topic,
                    "priority": "High Priority Review",
                    "action": f"Review foundational flashcards and step-by-step examples for {topic}."
                })
        else:
            recommendations.append({
                "topic": "Curriculum Exploration",
                "priority": "Enrichment",
                "action": "Solid understanding demonstrated. Explore advanced challenge problems and interdisciplinary projects."
            })

        return {
            "student_id": student.student_id,
            "name": student.name,
            "grade": student.grade,
            "learning_level": student.learning_level,
            "mastery_score": student.mastery_score,
            "total_questions_asked": total_interactions,
            "average_satisfaction": round(avg_rating, 2),
            "weak_topics": weak_list,
            "recommendations": recommendations
        }
