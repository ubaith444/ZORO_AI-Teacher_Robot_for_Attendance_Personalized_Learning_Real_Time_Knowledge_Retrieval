export type RobotState =
  | 'Idle'
  | 'Listening'
  | 'Processing'
  | 'Retrieving Knowledge'
  | 'Generating Answer'
  | 'Speaking'
  | 'Face Detected'
  | 'Student Identified'
  | 'Attendance Marked'
  | 'Robot Offline'
  | 'Service Error';

export interface Student {
  id: number;
  student_id: string;
  name: string;
  grade: string;
  learning_level: 'Beginner' | 'Intermediate' | 'Advanced';
  mastery_score: number;
  weak_topics: string[];
  face_image_path?: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id?: number | null;
  student_name: string;
  date: string;
  timestamp: string;
  status: 'Present' | 'Late' | 'Absent';
  confidence_score: number;
  snapshot_path?: string | null;
}

export interface AttendanceStats {
  date: string;
  total_students: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_rate_percent: number;
}

export interface RetrievedContextItem {
  document_title: string;
  page_number: number;
  content: string;
  score: number;
  retrieval_method: string;
}

export interface ChatResponse {
  question: string;
  answer: string;
  student_id?: string | null;
  student_name?: string | null;
  student_level?: string | null;
  adapted_complexity: string;
  contexts: RetrievedContextItem[];
  audio_base64?: string | null;
  response_time_ms: number;
  confidence_score: number;
}

export interface DocumentRecord {
  id: number;
  title: string;
  filename: string;
  file_size_bytes: number;
  total_pages: number;
  chunk_count: number;
  status: string;
  uploaded_at: string;
}

export interface DocumentChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  page_number: number;
  content: string;
  token_count: number;
  late_chunk_context?: string | null;
}

export interface EvaluationMetric {
  id: number;
  run_id: string;
  timestamp: string;
  query: string;
  ground_truth: string;
  retrieved_context: string;
  generated_answer: string;
  faithfulness_score: number;
  context_relevance_score: number;
  answer_relevance_score: number;
  overall_score: number;
  latency_ms: number;
}

export interface EvaluationSummary {
  total_runs: number;
  mean_faithfulness: number;
  mean_context_relevance: number;
  mean_answer_relevance: number;
  overall_score: number;
  avg_latency_ms: number;
}

export interface HardwareTelemetry {
  battery_level: number;
  cpu_temp_celsius: number;
  left_motor_speed: number;
  right_motor_speed: number;
  pan_angle: number;
  tilt_angle: number;
  camera_active: boolean;
  mic_active: boolean;
  speaker_active: boolean;
  last_action: string;
  timestamp: string;
}

export interface SystemOverview {
  summary: {
    total_students: number;
    today_attendance_rate: number;
    present_today: number;
    total_documents: number;
    total_chunks: number;
    total_interactions: number;
    average_mastery: number;
  };
  learning_levels: {
    Beginner: number;
    Intermediate: number;
    Advanced: number;
  };
  weak_topics_frequency: Array<{
    topic: string;
    student_count: number;
  }>;
  rag_evaluation: {
    faithfulness: number;
    context_relevance: number;
    answer_relevance: number;
    overall_score: number;
  };
}

export interface InteractionItem {
  id: number;
  student_id: number | null;
  student_name?: string;
  mode: string;
  question: string;
  response: string;
  context_retrieved?: string;
  response_time_ms: number;
  feedback_score: number;
  timestamp: string;
}
