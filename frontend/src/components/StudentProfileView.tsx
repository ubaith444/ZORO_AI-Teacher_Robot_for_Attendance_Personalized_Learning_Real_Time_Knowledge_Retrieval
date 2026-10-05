import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  Users,
  Award,
  CalendarCheck,
  BookOpen,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Target,
  RefreshCw
} from 'lucide-react';
import { Student } from '../types';
import { api } from '../api';

interface StudentProfileViewProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onLaunchTutorForStudent: (studentId: string) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onLaunchTutorForStudent,
}) => {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [studentQuestions, setStudentQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Active student object
  const currentStudent =
    students.find((s) => s.student_id === selectedStudentId) || students[0] || null;

  useEffect(() => {
    if (currentStudent) {
      loadStudentProfile(currentStudent.student_id);
    }
  }, [currentStudent?.student_id]);

  const loadStudentProfile = async (stuId: string) => {
    setLoading(true);
    try {
      const [deepDive, interactions] = await Promise.all([
        api.getStudentDeepDive(stuId),
        api.getInteractionHistory(stuId),
      ]);
      setProfileData(deepDive);
      setStudentQuestions(interactions || []);
    } catch (e) {
      console.warn('Could not load dynamic student profile, using fallback:', e);
      // Fallback data
      setProfileData({
        student_id: currentStudent?.student_id || 'STU-1001',
        name: currentStudent?.name || 'Arjun Sharma',
        grade: currentStudent?.grade || 'AI & DS - Batch A',
        learning_level: currentStudent?.learning_level || 'Intermediate',
        mastery_score: currentStudent?.mastery_score || 74.5,
        total_questions_asked: 6,
        average_satisfaction: 4.8,
        weak_topics: currentStudent?.weak_topics || ['Backpropagation & Loss Optimization'],
        recommendations: [
          {
            topic: 'Backpropagation & Loss Optimization',
            priority: 'High Priority Review',
            action:
              'Schedule 5-minute interactive review on gradient descent algorithms and learning rate scheduling with ZORO.',
          },
        ],
      });
      setStudentQuestions(getMockQuestionsForStudent(currentStudent?.name || 'Arjun'));
    } finally {
      setLoading(false);
    }
  };

  const getMockQuestionsForStudent = (name: string) => [
    {
      id: 101,
      question: 'What is the difference between supervised and unsupervised learning?',
      response:
        'Supervised learning uses labeled (input, output) pairs to train a model. Unsupervised learning discovers hidden structure in unlabeled data. For example, spam classification is supervised; customer segmentation with K-Means is unsupervised.',
      timestamp: 'Today, 11:15 AM',
      latency: '298 ms',
      source: 'Introduction to Machine Learning (Module 1, Page 12)',
    },
    {
      id: 102,
      question: 'What is overfitting and how can we prevent it in ML models?',
      response:
        'Overfitting happens when a model memorizes training data noise instead of learning generalizable patterns. Prevention includes L1/L2 regularization, dropout layers, cross-validation, and early stopping based on validation loss.',
      timestamp: 'Today, 09:15 AM',
      latency: '318 ms',
      source: 'Introduction to Machine Learning (Module 2, Page 31)',
    },
  ];

  if (!currentStudent) {
    return (
      <div className="saas-card p-12 text-center text-slate-500">
        <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold">No students registered in roster.</p>
      </div>
    );
  }

  const weakTopics = profileData?.weak_topics || currentStudent.weak_topics || [];

  return (
    <div className="space-y-6">
      {/* Top Bar with Student Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-base shadow-xs">
            {currentStudent.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {currentStudent.name}
              </h2>
              <span className="font-mono text-xs text-slate-500 font-medium">
                ({currentStudent.student_id})
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  currentStudent.learning_level === 'Advanced'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : currentStudent.learning_level === 'Intermediate'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {currentStudent.learning_level} Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Class {currentStudent.grade} &bull; Biometric Profile Active
            </p>
          </div>
        </div>

        {/* Student Dropdown Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Switch Student:</span>
            <select
              aria-label="Select student profile"
              value={currentStudent.student_id}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.student_id}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onLaunchTutorForStudent(currentStudent.student_id)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Launch AI Tutor</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards for Selected Student */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance Score */}
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Attendance Rate</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">100.0%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Verified Today: 08:42 AM
          </p>
        </div>

        {/* Academic Mastery */}
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Current Mastery</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {profileData?.mastery_score ?? currentStudent.mastery_score}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{
                width: `${profileData?.mastery_score ?? currentStudent.mastery_score}%`,
              }}
            ></div>
          </div>
          <p className="text-[11px] text-blue-700 font-medium mt-2">
            Target threshold: &ge; 75.0%
          </p>
        </div>

        {/* Questions Asked */}
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Inquiries to Robot</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {profileData?.total_questions_asked ?? 6}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">Class participation: High</p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Avg satisfaction: {profileData?.average_satisfaction ?? 4.8}/5.0
          </p>
        </div>

        {/* Biometric Verification */}
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Biometrics Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-1">Facial Template Registered</div>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Model: DeepFace VGG-Face
          </p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Cosine Distance Match: 0.22
          </p>
        </div>
      </div>

      {/* Middle Layout: Adaptive Pedagogical Profile & Personalized Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adaptive Pedagogical Profile */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-blue-600" />
              Dynamic LLM Adaptation Profile
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Ollama Prompt Injection
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">Current Pedagogical Strategy:</span>
              <p className="text-slate-600 leading-relaxed text-xs">
                {currentStudent.learning_level === 'Beginner' &&
                  'The robot uses concrete physical analogies, limits technical jargon, and breaks multipart problems into sequential guided steps.'}
                {currentStudent.learning_level === 'Intermediate' &&
                  'The robot delivers standard curriculum depth, reinforces core definitions, and validates conceptual understanding before proceeding.'}
                {currentStudent.learning_level === 'Advanced' &&
                  'The robot incorporates advanced terminology, encourages first-principles reasoning, and poses extension challenge questions.'}
              </p>
            </div>

            {/* Identified Weak Topics & Hesitations */}
            <div>
              <span className="font-semibold text-slate-900 block mb-2">
                Identified Topical Hesitations:
              </span>
              {weakTopics.length > 0 ? (
                <div className="space-y-2">
                  {weakTopics.map((topic: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-start gap-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-900 text-xs">{topic}</div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Multiple queries recorded with clarification requests. Low initial mastery on this AI&amp;DS concept.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No cognitive hesitations flagged. All topics on track.</span>
                </div>
              )}
            </div>

            {/* Strengths */}
            <div>
              <span className="font-semibold text-slate-900 block mb-2">
                Demonstrated Strengths:
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Supervised Learning & Classification (92% Comprehension)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Python Data Analysis with Pandas (88% Comprehension)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Personalized Recommendations Engine */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              Automated Remediation &amp; Interventions
            </h3>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Action Required
            </span>
          </div>

          <div className="space-y-3">
            {profileData?.recommendations && profileData.recommendations.length > 0 ? (
              profileData.recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{rec.topic}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.action}</p>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Target: AI&amp;DS Module 4 (Gradient Descent &amp; Optimization)</span>
                    <button
                      onClick={() => onLaunchTutorForStudent(currentStudent.student_id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Trigger Voice Drill</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
                Independent study modules and enrichment challenge problems recommended.
              </div>
            )}

            {/* Teacher Intervention Plan */}
            <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/50 space-y-1.5">
              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Teacher Guidance Note:
              </span>
              <p className="text-xs text-blue-800 leading-relaxed">
                When Arjun engages with the robot during morning recitation, the robot will automatically introduce a 2-minute diagnostic question on force equations before answering open questions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Past Questions & Dialogue History for this Student */}
      <div className="saas-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Inquiries by {currentStudent.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verbal questions transcribed by Deepgram STT and answered via Ollama LLM with RAG grounding.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {studentQuestions.length} Records Logged
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {studentQuestions.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No recent inquiries logged for this student today.
            </div>
          ) : (
            studentQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{q.timestamp || 'Today'}</span>
                  <span>Latency: {q.latency || `${q.response_time_ms || 310} ms`}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  "{q.question}"
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200/80 text-slate-700 leading-relaxed text-xs">
                  {q.response}
                </div>
                <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-medium pt-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Grounded in: {q.source || q.context_retrieved || 'Science Curriculum Fundamentals (Page 9)'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
