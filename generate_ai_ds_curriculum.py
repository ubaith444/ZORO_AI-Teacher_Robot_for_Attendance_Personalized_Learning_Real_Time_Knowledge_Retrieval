"""
AI & Data Science College Curriculum Document & PDF Generator
Engineered for ZORO Intelligent Teacher Robot

Generates comprehensive, collegiate-level textbooks and lecture notes
in PDF, Markdown, and TXT formats covering:
1. Machine Learning Foundations & Algorithms (PDF)
2. Deep Learning & Neural Network Architectures (PDF)
3. Data Science Pipeline & Statistical Inference (PDF)
4. NLP & Retrieval-Augmented Generation (PDF)
5. AI & DS Department Syllabus & Curriculum Guide (MD)
6. Applied Machine Learning Lab Manual & Exercises (TXT)

Then parses, semantically chunks, contextually enriches (Late Chunking),
and hybrid-indexes them into Qdrant vector database and BM25 store.
"""

import os
import sys
import json
import shutil
from pathlib import Path

# Ensure backend can be imported
workspace_root = Path(__file__).resolve().parent
sys.path.insert(0, str(workspace_root))

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.config import settings
from backend.database import SessionLocal, Base, engine
from backend.models import Student, DocumentRecord, DocumentChunk, EvaluationMetric, AttendanceRecord, migrate_database
from backend.rag.document_loader import EducationalDocumentLoader
from backend.rag.chunking import SemanticChunker, LateChunker
from backend.rag.vector_store import QdrantVectorStore
from backend.rag.bm25_store import BM25Store

# Custom styling for ReportLab PDFs
def get_curriculum_styles():
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )
    
    formula_style = ParagraphStyle(
        'Formula_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#0f766e'),
        backColor=colors.HexColor('#f0fdf4'),
        borderPadding=4,
        spaceBefore=4,
        spaceAfter=6
    )
    
    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        backColor=colors.HexColor('#f8fafc'),
        borderColor=colors.HexColor('#cbd5e1'),
        borderWidth=1,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    )

    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'h1': h1_style,
        'h2': h2_style,
        'body': body_style,
        'formula': formula_style,
        'callout': callout_style
    }


def create_pdf(filename: Path, title: str, subtitle: str, sections: list):
    """Generates a professional multi-page PDF document."""
    doc = SimpleDocTemplate(
        str(filename),
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    
    styles = get_curriculum_styles()
    story = []
    
    # Title & Header
    story.append(Paragraph(title, styles['title']))
    story.append(Paragraph(subtitle, styles['subtitle']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceAfter=14))
    
    for sec_idx, sec in enumerate(sections):
        story.append(Paragraph(f"Section {sec_idx+1}: {sec['heading']}", styles['h1']))
        
        for item in sec['content']:
            if item['type'] == 'sub':
                story.append(Paragraph(item['text'], styles['h2']))
            elif item['type'] == 'p':
                story.append(Paragraph(item['text'], styles['body']))
            elif item['type'] == 'formula':
                story.append(Paragraph(f"Mathematical Formulation: {item['text']}", styles['formula']))
            elif item['type'] == 'callout':
                story.append(Paragraph(f"Key Concept Note: {item['text']}", styles['callout']))
            elif item['type'] == 'table':
                t = Table(item['data'], colWidths=item.get('widths', [140, 380]))
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,-1), 8.5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                    ('TOPPADDING', (0,0), (-1,-1), 4),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ]))
                story.append(t)
                story.append(Spacer(1, 6))
        
        story.append(Spacer(1, 8))
        if sec.get('page_break', False):
            story.append(PageBreak())
            
    doc.build(story)
    print(f"Generated PDF: {filename.name} ({filename.stat().st_size} bytes)")


def generate_curriculum_materials():
    """Generates all 4 comprehensive PDFs and 2 markdown/text documents."""
    uploads_dir = settings.DATA_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    # -------------------------------------------------------------
    # 1. Machine Learning Foundations & Algorithms (PDF)
    # -------------------------------------------------------------
    ml_pdf_path = uploads_dir / "Machine_Learning_Foundations_and_Algorithms.pdf"
    ml_sections = [
        {
            "heading": "Introduction to Machine Learning Paradigms",
            "page_break": False,
            "content": [
                {"type": "p", "text": "Machine Learning (ML) is a core branch of Artificial Intelligence concerned with computational algorithms that improve automatically through empirical experience and mathematical optimization without being explicitly programmed."},
                {"type": "sub", "text": "Taxonomy of Learning Paradigms"},
                {"type": "p", "text": "Supervised Learning operates on training datasets of labeled pairs (x, y) where the algorithm learns a mapping function f: X -> Y. Unsupervised Learning discovers latent geometrical patterns, groupings, or probability density distributions from unlabeled observations x. Reinforcement Learning solves sequential decision-making tasks where an agent interacts with an environment via Markov Decision Processes to maximize cumulative scalar rewards."},
                {"type": "table", "data": [
                    ["Paradigm", "Key Objective & Mathematical Formulation"],
                    ["Supervised Learning", "Minimize empirical loss L(theta) = sum(loss(f(x_i; theta), y_i))"],
                    ["Unsupervised Learning", "Density estimation P(x) or cluster separation min sum(||x - mu_k||^2)"],
                    ["Reinforcement Learning", "Policy optimization max E[sum(gamma^t * r_t)] under Bellman optimality"]
                ]}
            ]
        },
        {
            "heading": "Supervised Regression & Gradient Descent Optimization",
            "page_break": True,
            "content": [
                {"type": "sub", "text": "Linear Regression and Mean Squared Error (MSE)"},
                {"type": "p", "text": "In multi-variable linear regression, the predicted continuous response y_hat is expressed as a linear combination of input features: y_hat = w^T * x + b, where w represents the weight vector and b is the scalar bias term."},
                {"type": "formula", "text": "MSE Loss: J(w, b) = (1 / (2 * N)) * sum_{i=1}^{N} (y_hat^{(i)} - y^{(i)})^2"},
                {"type": "sub", "text": "Gradient Descent Algorithm Mechanics"},
                {"type": "p", "text": "Gradient Descent is a first-order iterative optimization algorithm used to minimize differentiable objective functions. The algorithm computes the partial derivatives of the loss function with respect to each model parameter and adjusts the weights in the direction opposite to the gradient vector."},
                {"type": "formula", "text": "Weight Update Rule: w := w - alpha * grad_{w} J(w, b) where alpha is the learning rate"},
                {"type": "p", "text": "In Batch Gradient Descent, gradients are calculated across all N samples simultaneously. In Stochastic Gradient Descent (SGD), parameters update per single training instance, accelerating convergence in non-convex landscapes but introducing trajectory variance. Mini-batch Gradient Descent balances both paradigms by computing gradients over sub-batches of size m (typically 32, 64, or 128)."},
                {"type": "callout", "text": "Learning rate selection is critical: if alpha is excessively large, oscillations diverge; if alpha is too small, convergence requires excessive computational epochs."}
            ]
        },
        {
            "heading": "Classification, Decision Trees & Ensemble Methods",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "Logistic Regression & Cross-Entropy"},
                {"type": "p", "text": "Binary classification maps continuous linear predictions into posterior probabilities P(y=1|x) using the sigmoid activation function sigma(z) = 1 / (1 + exp(-z)). Optimization minimizes the Binary Cross-Entropy (BCE) log-loss."},
                {"type": "formula", "text": "BCE Loss: L = - (1 / N) * sum [ y_i * log(y_hat_i) + (1 - y_i) * log(1 - y_hat_i) ]"},
                {"type": "sub", "text": "Decision Tree Splitting Metrics: Gini Impurity and Information Gain"},
                {"type": "p", "text": "Decision trees recursively partition feature space into orthogonal hyper-rectangles. Splitting decisions evaluate impurity reduction. Gini Impurity measures misclassification probability: Gini = 1 - sum(p_k^2). Shannon Entropy measures information disorder: H(S) = - sum(p_k * log2(p_k)). Information Gain IG(S, A) = H(S) - sum(|S_v|/|S| * H(S_v))."},
                {"type": "sub", "text": "Ensemble Architectures: Random Forest vs Gradient Boosting"},
                {"type": "p", "text": "Random Forests apply Bagging (Bootstrap Aggregation) with random feature sub-sampling to train de-correlated decision trees in parallel, drastically reducing model variance without increasing bias. In contrast, Gradient Boosted Decision Trees (GBDT, XGBoost, LightGBM) employ sequential boosting: each consecutive shallow tree fits the pseudo-residuals (negative gradients) of the preceding ensemble."},
                {"type": "callout", "text": "XGBoost enhances classic gradient boosting with second-order Taylor expansion gradients, column sub-sampling, and explicit L1/L2 leaf weight regularization."}
            ]
        },
        {
            "heading": "Bias-Variance Tradeoff & Evaluation Metrics",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "The Bias-Variance Decomposition"},
                {"type": "p", "text": "Total expected test generalization error can be decomposed into three distinct components: Bias^2 + Variance + Irreducible Noise. Bias denotes systematic error arising from overly simplistic model assumptions (underfitting). Variance denotes sensitivity of the estimated function to training set fluctuations (overfitting)."},
                {"type": "table", "data": [
                    ["Metric", "Formula", "Clinical / Production Use Case"],
                    ["Precision", "TP / (TP + FP)", "Spam detection, search recommendations (minimize False Positives)"],
                    ["Recall (Sensitivity)", "TP / (TP + FN)", "Cancer screening, anomaly/fraud detection (minimize False Negatives)"],
                    ["F1-Score", "2 * (Precision * Recall) / (Precision + Recall)", "Harmonic mean for skewed class imbalances"],
                    ["ROC-AUC", "Integral of True Positive Rate vs False Positive Rate", "Threshold-agnostic discrimination ranking capability"]
                ]}
            ]
        }
    ]
    create_pdf(
        ml_pdf_path,
        "CS-301: Machine Learning Foundations & Algorithms",
        "Department of Artificial Intelligence & Data Science | Semester V Core Curriculum",
        ml_sections
    )

    # -------------------------------------------------------------
    # 2. Deep Learning & Neural Network Architectures (PDF)
    # -------------------------------------------------------------
    dl_pdf_path = uploads_dir / "Deep_Learning_and_Neural_Network_Architectures.pdf"
    dl_sections = [
        {
            "heading": "Neural Network Fundamentals & Backpropagation",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "Multi-Layer Perceptron (MLP) Architecture"},
                {"type": "p", "text": "An artificial neural network organizes computational units (neurons) into input, hidden, and output layers. A neuron calculates an affine transformation followed by a non-linear activation function: a = g(W * x + b). Without non-linear activation functions, arbitrarily deep networks collapse into a single trivial linear transformation."},
                {"type": "sub", "text": "Activation Function Analysis"},
                {"type": "p", "text": "Rectified Linear Unit (ReLU), f(x) = max(0, x), addresses the vanishing gradient problem inherent in Sigmoid and Tanh activations. Leaky ReLU introduces a small non-zero slope alpha * x for negative inputs to prevent 'dying ReLU' dead units. GELU (Gaussian Error Linear Unit) scales inputs by standard Gaussian cumulative distribution, widely standard in modern Transformer LLMs."},
                {"type": "formula", "text": "Chain Rule for Backpropagation: dL/dW_l = (dL/da_l) * (da_l/dz_l) * (dz_l/dW_l) = delta_l * a_{l-1}^T"},
                {"type": "p", "text": "Backpropagation executes reverse-mode automatic differentiation. In the forward pass, intermediate activations and pre-activation tensors are cached in memory. In the backward pass, error sensitivity terms (delta) propagate backwards through the computational graph from output to input."}
            ]
        },
        {
            "heading": "Convolutional Neural Networks (CNNs) & Computer Vision",
            "page_break": True,
            "content": [
                {"type": "sub", "text": "Convolution Operation, Padding, and Striding"},
                {"type": "p", "text": "Convolutional layers exploit two fundamental inductive biases: local spatial connectivity and translation equivariance. A parameterized 2D/3D filter kernel slides across input feature maps computing dot products. Stride controls filter displacement step size, while padding (valid vs same) preserves spatial spatial dimensions."},
                {"type": "formula", "text": "Output Spatial Dimension: O = floor((W - K + 2*P) / S) + 1"},
                {"type": "sub", "text": "Landmark CNN Architectures: ResNet & Residual Connections"},
                {"type": "p", "text": "Prior to Deep Residual Networks (He et al., 2015), stacking additional convolutional layers caused degradation where training accuracy saturated and plummeted. ResNet introduced identity skip connections: y = F(x, {W_i}) + x. If an identity mapping is optimal, the network easily drives residual weights F(x) toward zero, enabling stable gradient flow across 100+ layer architectures."},
                {"type": "callout", "text": "Modern face recognition pipelines (such as DeepFace ArcFace and FaceNet backends) employ deep residual networks with angular margin loss to generate 512-dimensional facial embedding vectors."}
            ]
        },
        {
            "heading": "Transformers, Self-Attention & Large Language Models",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "The Scaled Dot-Product Attention Mechanism"},
                {"type": "p", "text": "Introduced in 'Attention Is All You Need' (Vaswani et al., 2017), the Transformer eliminates recurrent recurrence constraints, processing sequence tokens concurrently in parallel. The core primitive is Scaled Dot-Product Attention projecting input representations into Query (Q), Key (K), and Value (V) matrices."},
                {"type": "formula", "text": "Attention(Q, K, V) = Softmax( (Q * K^T) / sqrt(d_k) ) * V"},
                {"type": "p", "text": "Multi-Head Attention projects Q, K, and V across h distinct representation subspaces simultaneously: MultiHead(Q,K,V) = Concat(head_1, ..., head_h) * W_O. This allows the model to jointly attend to information from different representation positions and semantic contexts."},
                {"type": "sub", "text": "LLM Inference & Fine-Tuning: LoRA and Quantization"},
                {"type": "p", "text": "Low-Rank Adaptation (LoRA) freezes base model weights W_0 in R^{d x k} and injects trainable rank decomposition matrices: W = W_0 + (B * A) * (alpha / r), where B in R^{d x r} and A in R^{r x k} with rank r << min(d, k). This reduces trainable parameter counts by 99% while matching full fine-tuning performance."}
            ]
        }
    ]
    create_pdf(
        dl_pdf_path,
        "CS-401: Deep Learning & Neural Network Architectures",
        "Department of Artificial Intelligence & Data Science | Semester VI Advanced Core",
        dl_sections
    )

    # -------------------------------------------------------------
    # 3. Data Science & Statistical Inference Handbook (PDF)
    # -------------------------------------------------------------
    ds_pdf_path = uploads_dir / "Data_Science_and_Statistical_Inference_Handbook.pdf"
    ds_sections = [
        {
            "heading": "Exploratory Data Analysis (EDA) & Data Cleansing",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "Missing Data Imputation Strategies"},
                {"type": "p", "text": "Missing data mechanisms are categorized into Missing Completely at Random (MCAR), Missing at Random (MAR), and Missing Not at Random (MNAR). Mean or median imputation introduces variance attenuation. Advanced methods include K-Nearest Neighbors (KNN) imputation and MICE (Multivariate Imputation by Chained Equations)."},
                {"type": "sub", "text": "Outlier Detection Frameworks"},
                {"type": "p", "text": "For normally distributed univariate features, the Z-score identifies observations exceeding |Z| > 3. For skewed data, Tukey's Interquartile Range (IQR) defines outlier fences: Q1 - 1.5*IQR and Q3 + 1.5*IQR. In high-dimensional multivariate spaces, Isolation Forests isolate anomalous observations via recursive random hyper-plane partitioning."},
                {"type": "formula", "text": "StandardScaler: z = (x - mu) / sigma | MinMaxScaler: x_scaled = (x - x_min) / (x_max - x_min)"}
            ]
        },
        {
            "heading": "Statistical Inference, Hypothesis Testing & Dimensionality Reduction",
            "page_break": True,
            "content": [
                {"type": "sub", "text": "Central Limit Theorem & Hypothesis Testing"},
                {"type": "p", "text": "The Central Limit Theorem (CLT) establishes that the normalized sample mean distribution approaches a Gaussian normal distribution as sample size N -> infinity, regardless of underlying population distribution. In two-tailed hypothesis testing, we formulate null hypothesis H_0 and evaluate p-value significance against predetermined alpha (typically 0.05)."},
                {"type": "sub", "text": "Principal Component Analysis (PCA)"},
                {"type": "p", "text": "PCA is an orthogonal linear transformation that maps d-dimensional feature spaces into k-dimensional subspaces (k < d) while preserving maximal variance. Mathematically, PCA computes the eigenvectors and eigenvalues of the data covariance matrix Sigma = (1/N) * X^T * X."},
                {"type": "formula", "text": "Covariance Eigendecomposition: Sigma * v_i = lambda_i * v_i where lambda_1 >= lambda_2 >= ... >= lambda_d"},
                {"type": "p", "text": "The proportion of total variance explained by the top k principal components equals sum_{i=1}^k lambda_i / sum_{j=1}^d lambda_j. t-SNE and UMAP provide complementary non-linear manifold projections prioritizing localized topological clustering."}
            ]
        }
    ]
    create_pdf(
        ds_pdf_path,
        "ADS-302: Data Science & Statistical Inference Handbook",
        "Department of Artificial Intelligence & Data Science | Semester V Core Laboratory",
        ds_sections
    )

    # -------------------------------------------------------------
    # 4. NLP & Retrieval-Augmented Generation Course (PDF)
    # -------------------------------------------------------------
    nlp_pdf_path = uploads_dir / "NLP_and_Retrieval_Augmented_Generation_Course.pdf"
    nlp_sections = [
        {
            "heading": "Text Representation, Tokenization & Vector Embeddings",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "Subword Tokenization (BPE & WordPiece)"},
                {"type": "p", "text": "Modern NLP tokenizers break raw text into subword units using Byte-Pair Encoding (BPE) or WordPiece. Frequent vocabulary pairs merge iteratively, resolving out-of-vocabulary (OOV) tokens while maintaining compact vocabulary matrices (32k to 128k tokens)."},
                {"type": "sub", "text": "Dense Semantic Embeddings"},
                {"type": "p", "text": "Dense encoders (such as sentence-transformers and all-MiniLM-L6-v2) project arbitrary variable-length sentences into fixed-dimension normed vectors R^{384} or R^{768}. Semantic proximity is measured via Cosine Similarity."},
                {"type": "formula", "text": "Cosine Similarity: S_C(u, v) = (u . v) / (||u||_2 * ||v||_2)"}
            ]
        },
        {
            "heading": "Hybrid Retrieval: Dense Vector + Sparse BM25 + RRF Fusion",
            "page_break": True,
            "content": [
                {"type": "sub", "text": "BM25 Sparse Lexical Information Retrieval"},
                {"type": "p", "text": "BM25 scores relevance based on term frequency (TF) and inverse document frequency (IDF) with document length normalization parameters k1 (saturation) and b (length penalty). It provides exact keyword matching indispensable for technical terminology and acronyms."},
                {"type": "sub", "text": "Reciprocal Rank Fusion (RRF)"},
                {"type": "p", "text": "Dense vector search excels at conceptual and semantic abstraction, while BM25 excels at specific nomenclature. Reciprocal Rank Fusion harmonizes both ranked candidate lists without requiring cross-system score calibration."},
                {"type": "formula", "text": "RRF Score: RRF(d) = sum_{m in {Dense, BM25}} (1 / (k + rank_m(d))) where constant k = 60"},
                {"type": "sub", "text": "Late Chunking Context Preservation"},
                {"type": "p", "text": "Traditional naive chunking fragments long educational text across sentence boundaries, losing global context. Late Chunking embeds the entire document first through a long-context transformer, pooling localized chunk vectors afterward. Every resulting chunk retains the overarching document contextual envelope."}
            ]
        },
        {
            "heading": "RAG Evaluation Metrics (Ragas Framework Alignment)",
            "page_break": False,
            "content": [
                {"type": "sub", "text": "Core Automated Evaluation Dimensions"},
                {"type": "table", "data": [
                    ["Evaluation Dimension", "Definition & Measurement Criterion"],
                    ["Faithfulness", "Measures whether factual claims in the generated answer are grounded in retrieved context (hallucination prevention)."],
                    ["Context Relevance", "Measures the signal-to-noise ratio and pertinence of retrieved passages relative to the student question."],
                    ["Answer Relevance", "Measures how directly and completely the generated pedagogical response addresses the student's question."]
                ]}
            ]
        }
    ]
    create_pdf(
        nlp_pdf_path,
        "ADS-501: NLP & Retrieval-Augmented Generation (RAG) Architecture",
        "Department of Artificial Intelligence & Data Science | Semester VII Specialization",
        nlp_sections
    )

    # -------------------------------------------------------------
    # 5. AI & DS Syllabus & Curriculum Guide (Markdown)
    # -------------------------------------------------------------
    syllabus_md_path = uploads_dir / "AI_DS_Curriculum_Syllabus_2026.md"
    syllabus_content = """# Artificial Intelligence & Data Science Undergraduate Curriculum
**Department of AI & Data Science | Academic Year 2026-2027**
**Institution**: College of Engineering & Technology
**Autonomous AI Robot Instructor**: ZORO

## Program Educational Objectives (PEOs)
The B.Tech program in Artificial Intelligence and Data Science prepares students to:
1. Formulate, mathematically analyze, and implement robust machine learning models for real-world decision problems.
2. Design and deploy deep neural architectures for computer vision, natural language processing, and speech recognition.
3. Manage end-to-end data science lifecycles including data extraction, statistical inference, feature engineering, and distributed big data pipelines.
4. Deploy autonomous edge AI systems integrating computer vision, vector database RAG retrieval, and real-time LLM reasoning.

## Course Structure by Semester

### Semester V Core Courses
- **ADS301: Machine Learning Foundations & Algorithms**
  - Unit 1: Empirical Risk Minimization, Convex Optimization, Loss Surfaces.
  - Unit 2: Linear & Logistic Regression, Batch & Stochastic Gradient Descent.
  - Unit 3: Decision Trees, Information Gain, Gini Impurity, Random Forests, XGBoost.
  - Unit 4: Support Vector Machines, Maximum Margin Hyperplanes, Kernel Trick (RBF, Polynomial).
  - Unit 5: Bias-Variance Decomposition, Regularization (L1 Lasso, L2 Ridge, ElasticNet), Model Evaluation Metrics.

- **ADS302: Data Science & Statistical Inference**
  - Unit 1: Exploratory Data Analysis (EDA), Missing Value Imputation, Outlier Detection.
  - Unit 2: Probability Distributions, Central Limit Theorem, Hypothesis Testing (t-tests, ANOVA, Chi-Square).
  - Unit 3: Dimensionality Reduction: PCA, SVD, t-SNE, UMAP.
  - Unit 4: Distributed Computing with Apache Spark & PySpark DataFrames.

### Semester VI Core Courses
- **ADS401: Deep Learning & Neural Network Architectures**
  - Unit 1: Perceptrons, Multi-Layer Perceptrons, Non-linear Activations (ReLU, Leaky ReLU, GELU, Softmax).
  - Unit 2: Backpropagation Computational Graph, Optimizers (Adam, AdamW, RMSProp).
  - Unit 3: Convolutional Neural Networks (CNN): Kernels, Pooling, ResNet Skip Connections.
  - Unit 4: Sequence Models: RNN, LSTM, GRU, Vanishing Gradient Resolution.
  - Unit 5: Transformers: Multi-Head Self-Attention, Positional Encoding, Pre-training (BERT, GPT), Parameter Efficient Fine-Tuning (LoRA, QLoRA).

### Semester VII Electives & Specializations
- **ADS501: Natural Language Processing & Vector RAG Systems**
  - Unit 1: BPE/WordPiece Tokenization, Dense Vector Sentence Embeddings.
  - Unit 2: Approximate Nearest Neighbors (ANN), HNSW Indexing, Qdrant Vector Database.
  - Unit 3: BM25 Lexical Ranking, Reciprocal Rank Fusion (RRF) Hybrid Search.
  - Unit 4: Late Chunking & Semantic Context Preservation.
  - Unit 5: RAG Quality Evaluation: Faithfulness, Context Precision, Answer Relevance.
"""
    with open(syllabus_md_path, "w", encoding="utf-8") as f:
        f.write(syllabus_content)
    print(f"Generated Markdown: {syllabus_md_path.name} ({len(syllabus_content)} chars)")

    # -------------------------------------------------------------
    # 6. Applied Machine Learning Lab Manual (TXT)
    # -------------------------------------------------------------
    lab_txt_path = uploads_dir / "Applied_Machine_Learning_Lab_Manual.txt"
    lab_content = """DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE
APPLIED MACHINE LEARNING LABORATORY MANUAL (COURSE CODE: ADS301L)
ACADEMIC YEAR: 2026-2027

EXPERIMENT 1: GRADIENT DESCENT OPTIMIZATION FROM SCRATCH IN NUMPY
Objective: Implement batch, stochastic, and mini-batch gradient descent for multivariate linear regression without high-level ML libraries.
Algorithm Steps:
1. Initialize weight vector W with standard normal random values and scalar bias b = 0.
2. In each training epoch:
   a. Compute model predictions: y_hat = np.dot(X, W) + b
   b. Calculate Mean Squared Error loss: loss = np.mean((y_hat - y)**2)
   c. Compute analytical partial derivatives:
      dW = (2 / N) * np.dot(X.T, (y_hat - y))
      db = (2 / N) * np.sum(y_hat - y)
   d. Update parameters: W = W - alpha * dW; b = b - alpha * db
3. Convergence Criteria: Stop when gradient norm ||[dW, db]|| < 1e-5 or epochs exceed maximum threshold.

EXPERIMENT 2: EVALUATING BIAS-VARIANCE TRADEOFF WITH POLYNOMIAL REGRESSION
Objective: Demonstrate underfitting and overfitting by fitting polynomial degrees 1 through 15 on noisy sinusoidal datasets.
Analysis:
- Degree 1 (Linear): High Bias, Low Variance (Underfitting, high training and test error).
- Degree 3 to 4: Optimal Generalization, minimal validation test loss.
- Degree 15: Low Bias, High Variance (Overfitting, near-zero training error, astronomical test error).
Remedy: Apply L2 Tikhonov Regularization (Ridge Regression) with penalty term lambda * ||W||_2^2.

EXPERIMENT 3: CONVOLUTIONAL FEATURE EXTRACTION & RESNET CLASSIFICATION
Objective: Build a Convolutional Neural Network with residual bottleneck blocks for image classification.
Architecture:
- Input: (3, 224, 224)
- Conv1: 7x7 filter, stride 2, 64 channels, Batch Normalization, ReLU, MaxPool 3x3.
- ResBlock: Identity shortcut addition: Output = ReLU(F(X) + X).
- Global Average Pooling (GAP) -> Dense Linear Layer -> Softmax output.

EXPERIMENT 4: VECTOR EMBEDDING RETRIEVAL WITH COSINE SIMILARITY
Objective: Generate 384-dimensional sentence embeddings using sentence-transformers, index into Qdrant, and perform top-k similarity search.
"""
    with open(lab_txt_path, "w", encoding="utf-8") as f:
        f.write(lab_content)
    print(f"Generated TXT: {lab_txt_path.name} ({len(lab_content)} chars)")

    return [
        (ml_pdf_path, "CS-301: Machine Learning Foundations & Algorithms", "Artificial Intelligence & Data Science", "Machine Learning", "Module 1", "Intermediate"),
        (dl_pdf_path, "CS-401: Deep Learning & Neural Network Architectures", "Artificial Intelligence & Data Science", "Deep Learning", "Module 2", "Advanced"),
        (ds_pdf_path, "ADS-302: Data Science & Statistical Inference Handbook", "Artificial Intelligence & Data Science", "Data Science", "Module 3", "Intermediate"),
        (nlp_pdf_path, "ADS-501: NLP & Retrieval-Augmented Generation Course", "Artificial Intelligence & Data Science", "Natural Language Processing", "Module 4", "Advanced"),
        (syllabus_md_path, "AI & DS Department Syllabus & Curriculum Guide", "Artificial Intelligence & Data Science", "Curriculum Overview", "Syllabus", "Beginner"),
        (lab_txt_path, "Applied Machine Learning Laboratory Manual", "Artificial Intelligence & Data Science", "ML Lab Experiments", "Lab Manual", "Intermediate")
    ]


def ingest_and_reindex_all(doc_specs: list):
    """
    Cleans out old school documents and indexes the new AI & Data Science
    materials into SQLite, Qdrant Vector Store, and BM25 Store.
    """
    print("\n--- Starting Ingestion & Re-indexing Pipeline ---")
    migrate_database()
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Update/Clean Students in SQLite
        print("Updating student rosters to AI & DS College degree batches...")
        ai_students = [
            {
                "student_id": "STU-1001",
                "name": "Arjun Sharma",
                "grade": "AI & DS - Batch A",
                "learning_level": "Intermediate",
                "mastery_score": 76.5,
                "weak_topics": json.dumps(["Backpropagation & Loss Optimization", "Transformer Attention Mechanisms"])
            },
            {
                "student_id": "STU-1002",
                "name": "Priya Patel",
                "grade": "AI & DS - Batch A",
                "learning_level": "Advanced",
                "mastery_score": 94.0,
                "weak_topics": json.dumps([])
            },
            {
                "student_id": "STU-1003",
                "name": "Rohan Verma",
                "grade": "AI & DS - Batch B",
                "learning_level": "Beginner",
                "mastery_score": 48.0,
                "weak_topics": json.dumps(["Linear Algebra & Matrix Decompositions", "Convolutional Neural Networks"])
            },
            {
                "student_id": "STU-1004",
                "name": "Sneha Reddy",
                "grade": "AI & DS - Batch B",
                "learning_level": "Intermediate",
                "mastery_score": 72.0,
                "weak_topics": json.dumps(["Bias-Variance Tradeoff & Regularization"])
            },
            {
                "student_id": "stu-2020",
                "name": "Ubaith",
                "grade": "AI & DS - Batch A",
                "learning_level": "Intermediate",
                "mastery_score": 82.0,
                "weak_topics": json.dumps(["Vector Search & RAG Architecture"])
            }
        ]

        for s_data in ai_students:
            existing = db.query(Student).filter(Student.student_id == s_data["student_id"]).first()
            if existing:
                existing.grade = s_data["grade"]
                existing.learning_level = s_data["learning_level"]
                existing.mastery_score = s_data["mastery_score"]
                existing.weak_topics = s_data["weak_topics"]
            else:
                db.add(Student(**s_data))
        db.commit()

        # Also update any other student in the database that has 'Grade 8'
        for s in db.query(Student).all():
            if "8" in str(s.grade) or "Grade" in str(s.grade):
                s.grade = "AI & DS - Batch A"
        db.commit()
        print("Student records updated successfully.")

        # 2. Reset Old Document Records and Evaluations in SQLite
        print("Purging old non-curriculum documents and school evaluations...")
        db.query(DocumentChunk).delete()
        db.query(DocumentRecord).delete()
        db.query(EvaluationMetric).delete()
        db.commit()

        # Seed realistic AI & DS RAG Evaluation Metrics
        sample_evals = [
            EvaluationMetric(
                run_id="eval_aids_01",
                query="What is gradient descent and how does it minimize the loss function?",
                ground_truth="Gradient descent is an iterative first-order optimization algorithm that updates parameters in the direction of the negative gradient of the loss function, scaled by the learning rate.",
                retrieved_context="Gradient Descent is a first-order iterative optimization algorithm used to minimize differentiable objective functions. The algorithm computes partial derivatives of the loss function with respect to model parameters and adjusts weights: w := w - alpha * grad_w J(w, b).",
                generated_answer="According to CS-301: Machine Learning Foundations & Algorithms (Module 1, Page 2), gradient descent is a first-order iterative optimization algorithm that minimizes the loss function by computing the partial derivatives with respect to model parameters and updating weights in the opposite direction of the gradient, scaled by learning rate alpha.",
                faithfulness_score=0.98,
                context_relevance_score=0.95,
                answer_relevance_score=0.97,
                overall_score=0.967,
                latency_ms=185.4
            ),
            EvaluationMetric(
                run_id="eval_aids_02",
                query="Explain the difference between CNN and RNN neural network architectures.",
                ground_truth="CNNs use spatial convolution kernels and pooling suited for grid images, while RNNs use recurrent loops to model temporal dependencies in sequential data.",
                retrieved_context="Convolutional layers exploit two fundamental inductive biases: local spatial connectivity and translation equivariance... Sequence Models: RNN, LSTM, GRU resolve temporal sequential dependencies.",
                generated_answer="As detailed in CS-401: Deep Learning & Neural Network Architectures, CNNs utilize sliding convolutional filter kernels to capture spatial features and translation equivariance in image data, whereas RNNs and LSTMs employ hidden state recurrence loops to process sequential, temporal data like text and time-series.",
                faithfulness_score=0.96,
                context_relevance_score=0.93,
                answer_relevance_score=0.96,
                overall_score=0.950,
                latency_ms=210.8
            ),
            EvaluationMetric(
                run_id="eval_aids_03",
                query="What is the bias-variance tradeoff in machine learning?",
                ground_truth="Bias is error from erroneous assumptions causing underfitting. Variance is error from sensitivity to small fluctuations in training data causing overfitting.",
                retrieved_context="Total expected test generalization error can be decomposed into Bias^2 + Variance + Irreducible Noise. Bias denotes systematic error arising from overly simplistic model assumptions (underfitting). Variance denotes sensitivity of the estimated function to training set fluctuations (overfitting).",
                generated_answer="Based on CS-301: Machine Learning Foundations & Algorithms (Section 4), the bias-variance tradeoff decomposes total generalization error into Bias^2 + Variance + Irreducible Noise. High bias leads to underfitting due to oversimplified assumptions, while high variance leads to overfitting due to sensitivity to training fluctuations. Optimal models find the sweet spot minimizing expected test error.",
                faithfulness_score=0.99,
                context_relevance_score=0.96,
                answer_relevance_score=0.98,
                overall_score=0.977,
                latency_ms=195.2
            )
        ]
        db.add_all(sample_evals)
        db.commit()
        print("Seeded AI & DS evaluation metrics.")

        # 3. Initialize fresh Vector Store and BM25 Store
        vector_store = QdrantVectorStore()
        bm25_store = BM25Store()

        # Clear vector collection
        try:
            vector_store.client.delete_collection(vector_store.collection_name)
            vector_store._ensure_collection()
            print("Reset Qdrant vector collection.")
        except Exception as e:
            print(f"Notice on Qdrant reset: {e}")

        # Clear BM25 in-memory chunks
        bm25_store.chunks = []
        bm25_store.corpus = []
        bm25_store.bm25 = None

        semantic_chunker = SemanticChunker(target_chunk_size=700, overlap_size=80)
        late_chunker = LateChunker()

        # 4. Ingest and Index each document
        for file_path, doc_title, subject, topic, chapter, diff in doc_specs:
            print(f"\nProcessing: {file_path.name}...")
            parsed_doc = EducationalDocumentLoader.load_document(str(file_path))
            
            # Create DocumentRecord
            doc_rec = DocumentRecord(
                title=doc_title,
                filename=file_path.name,
                file_path=str(file_path),
                file_size_bytes=file_path.stat().st_size,
                total_pages=parsed_doc.get("total_pages", 1),
                chunk_count=0,
                status="processing",
                processing_stage="chunking",
                subject=subject,
                class_grade="AI & DS - Semester V",
                topic=topic,
                chapter=chapter,
                difficulty_level=diff,
                academic_year="2026-2027",
                teacher="ZORO Teacher Robot",
                source_type=parsed_doc.get("source_type", "document")
            )
            db.add(doc_rec)
            db.commit()
            db.refresh(doc_rec)

            # Chunk document pages
            raw_chunks = []
            for p in parsed_doc.get("pages", []):
                p_text = p.get("text", "")
                p_num = p.get("page_number", 1)
                page_chunks = semantic_chunker.chunk_text(
                    p_text,
                    page_number=p_num,
                    doc_title=doc_title,
                    metadata={
                        "subject": subject,
                        "class_grade": "AI & DS - Semester V",
                        "topic": topic,
                        "chapter": chapter
                    }
                )
                raw_chunks.extend(page_chunks)

            # Late Chunking
            enhanced_chunks = late_chunker.apply_late_chunking(
                parsed_doc.get("full_text", ""),
                raw_chunks,
                doc_title,
                metadata={
                    "subject": subject,
                    "class_grade": "AI & DS - Semester V",
                    "topic": topic,
                    "chapter": chapter,
                    "version": 1,
                    "source_type": "document"
                }
            )

            # Assign document_id to metadata
            for c in enhanced_chunks:
                if "metadata" not in c:
                    c["metadata"] = {}
                c["metadata"]["document_id"] = doc_rec.id
                c["metadata"]["doc_title"] = doc_title
                c["metadata"]["subject"] = subject
                c["metadata"]["class_grade"] = "AI & DS - Semester V"
                c["metadata"]["topic"] = topic
                c["metadata"]["chapter"] = chapter

            # Index to Qdrant & BM25
            point_ids = vector_store.add_chunks(enhanced_chunks, document_id=doc_rec.id)
            bm25_store.add_chunks(enhanced_chunks)

            # Store in DB
            for idx, ec in enumerate(enhanced_chunks):
                chunk_obj = DocumentChunk(
                    document_id=doc_rec.id,
                    chunk_index=idx + 1,
                    page_number=ec.get("page_number", 1),
                    content=ec["content"],
                    token_count=ec.get("token_count", 0),
                    embedding_id=point_ids[idx] if idx < len(point_ids) else None,
                    late_chunk_context=ec.get("late_chunk_context", ""),
                    metadata_json=json.dumps(ec.get("metadata", {}))
                )
                db.add(chunk_obj)

            doc_rec.chunk_count = len(enhanced_chunks)
            doc_rec.status = "indexed"
            doc_rec.processing_stage = "indexed"
            db.commit()
            print(f"Indexed {doc_rec.title}: {len(enhanced_chunks)} chunks into Qdrant & BM25.")

        print("\nAll AI & Data Science college documents & PDFs successfully generated and indexed!")
        print(f"Total documents in database: {db.query(DocumentRecord).count()}")
        print(f"Total chunks in database: {db.query(DocumentChunk).count()}")
        print(f"Total BM25 indexed chunks: {len(bm25_store.chunks)}")

    finally:
        db.close()


if __name__ == "__main__":
    generated_specs = generate_curriculum_materials()
    ingest_and_reindex_all(generated_specs)
