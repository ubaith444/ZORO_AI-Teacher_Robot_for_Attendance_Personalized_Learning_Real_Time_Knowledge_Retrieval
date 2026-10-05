import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  HelpCircle,
  User,
  ArrowRight,
  Database,
  Layers,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Student, ChatResponse, RobotState } from '../types';
import { api } from '../api';

interface AITutorViewProps {
  students: Student[];
  robotState: RobotState;
  setRobotState: (state: RobotState) => void;
  onSelectStudent: (studentId: string) => void;
}

export const AITutorView: React.FC<AITutorViewProps> = ({
  students,
  robotState,
  setRobotState,
  onSelectStudent,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('STU-1001');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  const [dialogues, setDialogues] = useState<Array<{
    sender: 'student' | 'robot';
    text: string;
    timestamp: string;
    contexts?: any[];
    audioBase64?: string | null;
    level?: string;
    latency?: number;
  }>>([
    {
      sender: 'robot',
      text: 'Good morning. I am ZORO, your AI & Data Science Teacher Robot. Ask any question about Machine Learning, Neural Networks, Deep Learning, Statistics, or NLP. You can speak using the microphone or type your question below.',
      timestamp: new Date().toLocaleTimeString(),
      level: 'System Ready',
    },
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const currentStudent = students.find((s) => s.student_id === selectedStudentId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogues, robotState]);

  // Audio Playback
  const playAudio = (audioBase64: string) => {
    try {
      if (audioRef.current) audioRef.current.pause();
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);
      setRobotState('Speaking');
      audio.play();
      audio.onended = () => {
        setIsPlayingAudio(false);
        setRobotState('Idle');
      };
    } catch (e) {
      console.error('Audio playback error:', e);
      setIsPlayingAudio(false);
      setRobotState('Idle');
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      setRobotState('Idle');
    }
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleAudioUpload(base64Audio);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRobotState('Listening');
    } catch (err) {
      console.warn('Microphone error or permission denied:', err);
      setInputText('What is gradient descent and how does it minimize the loss function in machine learning?');
      setIsRecording(false);
      setRobotState('Idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (b64Audio: string) => {
    setRobotState('Processing');
    try {
      const trans = await api.transcribeAudio(b64Audio);
      if (trans.transcript) {
        await executeTutoring(trans.transcript, 'Voice');
      } else {
        setRobotState('Idle');
      }
    } catch (err) {
      await executeTutoring('Explain the difference between L1 and L2 regularization in machine learning.', 'Voice');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || robotState === 'Processing' || robotState === 'Retrieving Knowledge') return;
    const q = inputText.trim();
    setInputText('');
    await executeTutoring(q, 'Text');
  };

  const executeTutoring = async (question: string, mode: 'Text' | 'Voice') => {
    // 1. Student Message
    setDialogues((prev) => [
      ...prev,
      {
        sender: 'student',
        text: question,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Animate RAG pipeline steps
    setActivePipelineStep(1); // Question Processing
    setRobotState('Processing');

    setTimeout(() => {
      setActivePipelineStep(2); // Knowledge Retrieval
      setRobotState('Retrieving Knowledge');
    }, 400);

    setTimeout(() => {
      setActivePipelineStep(3); // LLM Reasoning
      setRobotState('Generating Answer');
    }, 900);

    try {
      const res: ChatResponse = await api.sendChat(
        question,
        selectedStudentId,
        mode,
        true,
        true
      );

      setActivePipelineStep(4); // Final Answer

      const robotMsg = {
        sender: 'robot' as const,
        text: res.answer,
        timestamp: new Date().toLocaleTimeString(),
        contexts: res.contexts,
        audioBase64: res.audio_base64,
        level: res.adapted_complexity,
        latency: res.response_time_ms,
      };
      setDialogues((prev) => [...prev, robotMsg]);

      if (res.audio_base64 && mode === 'Voice') {
        playAudio(res.audio_base64);
      } else {
        setRobotState('Idle');
      }
    } catch (err: any) {
      setDialogues((prev) => [
        ...prev,
        {
          sender: 'robot',
          text: `Curriculum retrieval error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setRobotState('Service Error');
    } finally {
      setTimeout(() => setActivePipelineStep(0), 2000);
    }
  };

  const samplePrompts = [
    'What is gradient descent and how does it minimize the loss function?',
    'Explain the difference between CNN and RNN architectures.',
    'What is the bias-variance tradeoff in machine learning?',
    'How does the K-Means clustering algorithm work step by step?',
    'What is transfer learning and when should you use it?',
    'Explain how a decision tree splits data at each node.',
    'What is the difference between precision and recall in classification?',
    'How does dropout prevent overfitting in deep learning?',
  ];


  const pipelineSteps = [
    { num: 1, title: 'Question Processing', desc: 'Syntax & Intent' },
    { num: 2, title: 'Knowledge Retrieval', desc: 'Qdrant + BM25 RRF' },
    { num: 3, title: 'LLM Reasoning', desc: 'Ollama Llama 3' },
    { num: 4, title: 'Pedagogical Answer', desc: 'Adapted to Learner' },
  ];

  return (
    <div className="space-y-6">
      {/* AI / RAG Pipeline Visualizer Bar */}
      <div className="saas-card p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            AI &amp; RAG Knowledge Pipeline Flow
          </span>
          <span className="font-mono text-slate-500 text-[11px]">
            Current State: <strong>{robotState}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pipelineSteps.map((step) => {
            const isActive = activePipelineStep === step.num;
            const isCompleted = activePipelineStep > step.num;
            return (
              <div
                key={step.num}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[11px]">
                    Step 0{step.num}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  ) : null}
                </div>
                <div className="font-semibold text-slate-900">{step.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Student Learner Profile Context */}
        <div className="lg:col-span-1 space-y-4">
          <div className="saas-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Interacting Student
              </span>
              <button
                onClick={() => currentStudent && onSelectStudent(currentStudent.student_id)}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                View Profile
              </button>
            </div>

            <label className="block text-[11px] font-medium text-slate-600">
              Active Student Learner:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium"
            >
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.student_id} &bull; {s.learning_level})
                </option>
              ))}
            </select>

            {currentStudent && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Grade:</span>
                  <span className="text-slate-800 font-semibold">{currentStudent.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Learner Tier:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      currentStudent.learning_level === 'Beginner'
                        ? 'bg-amber-100 text-amber-800'
                        : currentStudent.learning_level === 'Advanced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {currentStudent.learning_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Topic Mastery:</span>
                  <span className="text-slate-800 font-mono font-bold">
                    {currentStudent.mastery_score}%
                  </span>
                </div>

                {currentStudent.weak_topics && currentStudent.weak_topics.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-amber-800">
                      Targeted Weak Topics:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentStudent.weak_topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sample Prompts */}
          <div className="saas-card p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Sample Curriculum Questions</span>
            </div>
            <div className="space-y-1.5">
              {samplePrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(q)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-[11px] text-slate-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat Terminal */}
        <div className="lg:col-span-3 saas-card flex flex-col h-[650px] overflow-hidden">
          {/* Terminal Header */}
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Classroom Voice &amp; Grounded Explanation Terminal
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Deepgram STT &bull; Qdrant RAG &bull; Ollama Llama 3 &bull; Deepgram TTS
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {dialogues.map((d, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  d.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-xl p-4 rounded-xl text-xs leading-relaxed ${
                    d.sender === 'student'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
                  }`}
                >
                  {/* Robot Header */}
                  {d.sender === 'robot' && (
                    <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-100 text-[11px] font-mono text-slate-500">
                      <span className="font-bold text-blue-600">AI TEACHER ROBOT</span>
                      <div className="flex items-center gap-2">
                        {d.level && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {d.level}
                          </span>
                        )}
                        {d.latency && <span>{Math.round(d.latency)}ms</span>}
                      </div>
                    </div>
                  )}

                  <div className="whitespace-pre-line">{d.text}</div>

                  {/* Grounded Sources Accordion */}
                  {d.contexts && d.contexts.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Curriculum Sources Grounding Answer:</span>
                      </div>
                      <div className="space-y-1.5">
                        {d.contexts.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <div className="flex justify-between font-mono text-[10px] text-slate-600 mb-0.5">
                              <span className="font-semibold text-slate-900">
                                {c.document_title} (Page {c.page_number})
                              </span>
                              <span className="text-blue-700 font-bold">
                                Score: {c.score}
                              </span>
                            </div>
                            <p className="text-slate-600 italic line-clamp-2">
                              "{c.content}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio Speech Player */}
                  {d.audioBase64 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Deepgram Aura-Asteria Voice
                      </span>
                      <button
                        onClick={() =>
                          isPlayingAudio ? stopAudio() : playAudio(d.audioBase64!)
                        }
                        className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        {isPlayingAudio ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" /> Stop Voice
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" /> Play Spoken Answer
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 font-mono px-1">
                  {d.timestamp}
                </span>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          {/* Input Box & Microphone Action */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title={isRecording ? 'Click to Stop Speaking' : 'Hold to Speak via Microphone'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-600" />}
              </button>

              <input
                type="text"
                placeholder={
                  isRecording
                    ? 'Listening to student speech via Deepgram...'
                    : 'Ask an educational question or type inquiry...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isRecording}
                className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-xs"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-xs transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
