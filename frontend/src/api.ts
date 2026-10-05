import {
  Student,
  AttendanceRecord,
  AttendanceStats,
  ChatResponse,
  DocumentRecord,
  DocumentChunk,
  EvaluationMetric,
  EvaluationSummary,
  HardwareTelemetry,
  SystemOverview,
  RetrievedContextItem
} from './types';

const API_BASE = '/api';

export const api = {
  // Overview Analytics
  async getOverview(): Promise<SystemOverview> {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  async getStudentDeepDive(studentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/student/${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch student details');
    return res.json();
  },

  // Attendance
  async getStudents(): Promise<Student[]> {
    const res = await fetch(`${API_BASE}/attendance/students`);
    if (!res.ok) throw new Error('Failed to fetch students list');
    return res.json();
  },

  async registerStudent(formData: FormData): Promise<Student> {
    const res = await fetch(`${API_BASE}/attendance/register`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to register student');
    }
    return res.json();
  },

  async scanAttendance(imageBase64?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, auto_mark: true }),
    });
    if (!res.ok) throw new Error('Failed to perform face scan');
    return res.json();
  },

  async getAttendanceRecords(date?: string): Promise<AttendanceRecord[]> {
    const url = date ? `${API_BASE}/attendance/records?date=${date}` : `${API_BASE}/attendance/records`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch attendance records');
    return res.json();
  },

  async getAttendanceStats(): Promise<AttendanceStats> {
    const res = await fetch(`${API_BASE}/attendance/stats`);
    if (!res.ok) throw new Error('Failed to fetch attendance statistics');
    return res.json();
  },

  // Interaction & RAG Chat
  async sendChat(
    question: string,
    studentId?: string,
    mode: 'Text' | 'Voice' = 'Text',
    useRag: boolean = true,
    adaptLevel: boolean = true
  ): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/interaction/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        student_id: studentId,
        mode,
        use_rag: useRag,
        adapt_learning_level: adaptLevel,
      }),
    });
    if (!res.ok) throw new Error('Failed to send question');
    return res.json();
  },

  async transcribeAudio(audioBase64: string): Promise<{ transcript: string; confidence: number; duration_sec: number }> {
    const res = await fetch(`${API_BASE}/interaction/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64 }),
    });
    if (!res.ok) throw new Error('Failed to transcribe audio');
    return res.json();
  },

  async synthesizeSpeech(text: string): Promise<{ audio_base64: string }> {
    const res = await fetch(`${API_BASE}/interaction/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to synthesize speech');
    return res.json();
  },

  async getInteractionHistory(studentId?: string): Promise<any[]> {
    const url = studentId ? `${API_BASE}/interaction/history?student_id=${studentId}` : `${API_BASE}/interaction/history`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch interaction history');
    return res.json();
  },

  // Knowledge & Documents
  async uploadDocument(file: File): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload document');
    }
    return res.json();
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    const res = await fetch(`${API_BASE}/knowledge/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocumentChunks(docId: number): Promise<DocumentChunk[]> {
    const res = await fetch(`${API_BASE}/knowledge/documents/${docId}/chunks`);
    if (!res.ok) throw new Error('Failed to fetch document chunks');
    return res.json();
  },

  async testHybridSearch(
    query: string,
    topK: number = 4,
    denseWeight: number = 0.6,
    bm25Weight: number = 0.4
  ): Promise<{ query: string; results: RetrievedContextItem[]; total_found: number }> {
    const res = await fetch(`${API_BASE}/knowledge/hybrid-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        top_k: topK,
        dense_weight: denseWeight,
        bm25_weight: bm25Weight,
      }),
    });
    if (!res.ok) throw new Error('Failed to execute hybrid search');
    return res.json();
  },

  async deleteDocument(docId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/knowledge/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  // Evaluation
  async runEvaluation(query: string, groundTruth?: string): Promise<EvaluationMetric> {
    const res = await fetch(`${API_BASE}/evaluation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ground_truth: groundTruth || '' }),
    });
    if (!res.ok) throw new Error('Failed to run evaluation');
    return res.json();
  },

  async runBatchBenchmark(): Promise<any> {
    const res = await fetch(`${API_BASE}/evaluation/batch-benchmark`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to run batch benchmark');
    return res.json();
  },

  async getEvaluationMetrics(): Promise<EvaluationMetric[]> {
    const res = await fetch(`${API_BASE}/evaluation/metrics`);
    if (!res.ok) throw new Error('Failed to fetch evaluation metrics');
    return res.json();
  },

  async getEvaluationSummary(): Promise<EvaluationSummary> {
    const res = await fetch(`${API_BASE}/evaluation/summary`);
    if (!res.ok) throw new Error('Failed to fetch evaluation summary');
    return res.json();
  },

  // Hardware & Raspberry Pi 5
  async getHardwareTelemetry(): Promise<HardwareTelemetry> {
    const res = await fetch(`${API_BASE}/hardware/telemetry`);
    if (!res.ok) throw new Error('Failed to fetch telemetry');
    return res.json();
  },

  async sendHardwareCommand(action: string, speed: number = 100, panAngle?: number, tiltAngle?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/hardware/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        speed,
        pan_angle: panAngle,
        tilt_angle: tiltAngle,
      }),
    });
    if (!res.ok) throw new Error('Failed to send hardware command');
    return res.json();
  },

  async getCameraSnapshot(): Promise<{ image: string; face_count: number; boxes: any[] }> {
    const res = await fetch(`${API_BASE}/hardware/camera/snapshot`);
    if (!res.ok) throw new Error('Failed to capture snapshot');
    return res.json();
  },
};
