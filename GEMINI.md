# AI-ENABLED INTELLIGENT TEACHER ROBOT

## 1. Project Overview
This repository implements an autonomous, AI-enabled intelligent teacher robot engineered for real-world classroom deployment. The system combines:
1. Automated facial recognition attendance using DeepFace.
2. Voice-based student interaction using Deepgram for Speech-to-Text (STT) and Text-to-Speech (TTS).
3. Local large language model reasoning via Ollama API.
4. Real-time multimodal Knowledge Retrieval / Retrieval-Augmented Generation (RAG) using semantic chunking, late chunking, Qdrant vector database, and BM25 hybrid search with Reciprocal Rank Fusion (RRF).
5. Personalized student learning adaptation tracking individual mastery, learning level, and weakness profiles.
6. RAG evaluation pipeline measuring retrieval faithfulness, context precision, and answer relevance.
7. Hardware control interface for Raspberry Pi 5 camera, microphone, speaker, display, and motor movement.
8. Interactive web dashboard built with React, TypeScript, and Tailwind CSS.

---

## 2. Tech Stack Architecture

The following structured breakdown details the technology stack, purpose, and architectural rationale for each selected component.

| Category | Technology | Version | Purpose (What) | Architectural Rationale (Why) |
| :--- | :--- | :--- | :--- | :--- |
| Backend Runtime | Python | 3.11.x | Core execution environment for backend services, machine learning models, and system automation. | High ecosystem maturity for computer vision, vector search, LLM integrations, and hardware GPIO control on edge devices. |
| API Framework | FastAPI | 0.142.x | Asynchronous RESTful API server and WebSocket event orchestrator. | High throughput ASGI performance, native OpenAPI documentation, type validation with Pydantic v2, and low latency WebSocket support. |
| Server Gateway | Uvicorn | 0.54.x | High-performance ASGI web server hosting FastAPI application. | Lightweight, fast event loop based on uvloop/asyncio, well-suited for edge devices like Raspberry Pi 5. |
| Computer Vision & Face Recognition | DeepFace & OpenCV | DeepFace 0.0.101+ / OpenCV 5.0.x | Face detection, student facial representation extraction, and automated attendance matching. | DeepFace bundles state-of-the-art face recognition backends (VGG-Face, Facenet, ArcFace) with high accuracy; OpenCV provides low-overhead frame capture and preprocessing. |
| Speech-to-Text | Deepgram SDK | 7.12.x | Real-time speech transcription from robot microphone. | Superior accuracy, fast streaming transcription latency, and robust domain handling for classroom voice input. |
| Text-to-Speech | Deepgram TTS | API / SDK | Natural sounding voice output for robot spoken responses. | Low latency time-to-first-audio, natural intonation, and high intelligibility in classroom environments. |
| Local LLM Engine | Ollama API | Local daemon | Edge-based and local server inference for educational tutoring and explanation generation. | Privacy-preserving local execution, zero per-token cloud costs, and compatibility with leading open-source models (e.g. Llama 3, Mistral, Phi-3). |
| Vector Database | Qdrant Client | 1.19.x | Dense vector search and document embedding indexer. | Embedded mode support without Docker requirement, hybrid filtering capabilities, and high precision nearest-neighbor search. |
| Keyword Search | BM25 (rank-bm25) | 0.2.x | Sparse lexical information retrieval across educational documents. | Complementary exact keyword and technical term matching that compensates for dense vector semantic drift. |
| Hybrid Retrieval | Reciprocal Rank Fusion (RRF) | Custom Engine | Merging dense vector scores and sparse BM25 ranks into a unified relevance score. | Superior retrieval quality over single-method search by balancing semantic comprehension and precise vocabulary matches. |
| Chunking Engine | Semantic Chunking + Late Chunking | Custom Module | Educational document segmentation preserving contextual boundaries and cross-boundary token representations. | Prevents semantic fragmentation across headings and equations; preserves document-level contextual embeddings before localized chunk pooling. |
| Document Ingestion | PyPDF | 6.19.x | Text and structural extraction from educational curriculum PDFs. | Fast, pure-Python PDF parser with zero external system library dependencies. |
| Relational Database | SQLite & SQLAlchemy | SQLite 3 / SQLAlchemy 2.1.x | Persistent relational storage for student profiles, attendance history, conversation logs, and evaluation metrics. | Zero-configuration single-file database ideal for Raspberry Pi edge devices; SQLAlchemy 2.0 provides strict type safety and migration agility. |
| RAG Evaluation | Evaluation Engine | Custom Ragas-aligned | Metric evaluation for Faithfulness, Context Relevance, Answer Relevance, and Retrieval Recall. | Automated quality assurance ensuring educational explanations remain grounded in curriculum text and do not hallucinate. |
| Frontend Framework | React | 19.x | Component-based interactive dashboard for teachers and operators. | Modern reactive state management, high performance virtual DOM, and widespread ecosystem compatibility. |
| Language | TypeScript | 6.0.x | Static typing for dashboard client code. | Compile-time safety, strict contract enforcement with backend APIs, and enhanced developer ergonomics. |
| Build Tool | Vite | 8.3.x | Frontend build tool and development server. | Instant hot module replacement (HMR), optimized Rollup production bundling, and fast compilation. |
| Styling | Tailwind CSS | 4.3.x | Utility-first responsive CSS styling for dashboard interfaces. | Rapid UI development, minimal stylesheet footprint via just-in-time compilation, and maintainable design tokens. |
| Icons | Lucide React | 1.51.x | Clean, consistent icons for UI status and navigation. | SVG-based vector icons without bloated dependencies or decorative emojis. |
| Target Edge Platform | Raspberry Pi 5 | Bookworm OS | Hardware host for robotics, camera, display, and microphone peripherals. | High quad-core ARM Cortex-A76 performance, PCIe support, dual 4K HDMI display support, and 40-pin GPIO header. |

---

## 3. High-Level System Architecture

```
[ Raspberry Pi 5 Hardware Layer ]
- USB / CSI Camera
- USB Microphone
- Audio Speaker
- HDMI Touchscreen Display
- Motor Driver & GPIO Interface
              |
              v
[ FastAPI Asynchronous Backend ]
  |-- Face Recognition Module (DeepFace + OpenCV)
  |-- Speech Pipeline (Deepgram STT & Deepgram TTS)
  |-- Local LLM Service (Ollama API)
  |-- RAG Pipeline:
  |     |-- PDF Ingestion (PyPDF)
  |     |-- Semantic Chunking & Late Chunking
  |     |-- Dense Vector Index (Qdrant)
  |     |-- Sparse Keyword Index (BM25)
  |     |-- Hybrid RRF Fusion Search
  |-- Personalized Learning Engine (Mastery, History, Adaptation)
  |-- Evaluation Engine (Faithfulness, Relevance Metrics)
  |-- Hardware Controller (Pan/Tilt, Motors, Telemetry)
  |-- WebSocket Hub (Real-time Video, Audio, Events)
              |
              v
[ Persistent Data Storage ]
  |-- SQLite: Students, Attendance, Dialogues, Metrics
  |-- Qdrant: Dense Vector Embeddings
              |
              v
[ React + TypeScript + Tailwind Dashboard ]
  |-- Real-Time Attendance Monitor
  |-- Student Profile & Adaptive Learning Center
  |-- Voice & Text Interactive Tutoring Panel
  |-- Knowledge Base Management & Hybrid Search Inspector
  |-- RAG Quality Evaluation & Analytics
  |-- Robot Hardware & Telemetry Control
```

---

## 4. Coding & Architecture Guidelines
1. Enterprise formatting: No emojis or decorative symbols in source code, documentation, or user interfaces.
2. Graceful degradation: Hardware interfaces (GPIO, Camera, Microphone) must operate in simulation/mock mode when running on non-Pi platforms.
3. Strict API schemas: All backend request and response payloads must use Pydantic v2 models.
4. RAG traceability: Every grounded response must include source references, page numbers, and similarity metrics.
5. Verification requirement: Every module must be verified through automated tests or execution checks before declaring completion.
