import React, { useState, useEffect } from 'react';
import {
  LineChart,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Users,
  BrainCircuit,
  Layers,
  ArrowRight,
  Filter,
  BarChart3,
  Lightbulb,
  Target
} from 'lucide-react';
import { Student, SystemOverview } from '../types';
import { api } from '../api';

interface LearningAnalyticsViewProps {
  students: Student[];
  overview: SystemOverview | null;
  onSelectStudent: (studentId: string) => void;
}

export const LearningAnalyticsView: React.FC<LearningAnalyticsViewProps> = ({
  students,
  overview,
  onSelectStudent,
}) => {
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');

  // Topic mastery benchmark data - AI & DS College Course
  const topicsData = [
    {
      topic: 'Supervised Learning & Classification Algorithms',
      subject: 'Machine Learning',
      mastery: 88,
      status: 'Mastered',
      studentsNeedingHelp: 0,
      questionsCount: 19,
    },
    {
      topic: 'Gradient Descent & Backpropagation',
      subject: 'Deep Learning',
      mastery: 62,
      status: 'Needs Review',
      studentsNeedingHelp: 2,
      questionsCount: 28,
    },
    {
      topic: 'Python for Data Analysis (NumPy & Pandas)',
      subject: 'Programming',
      mastery: 85,
      status: 'Proficient',
      studentsNeedingHelp: 0,
      questionsCount: 15,
    },
    {
      topic: 'Probability & Bayesian Statistics',
      subject: 'Statistics',
      mastery: 54,
      status: 'Attention Required',
      studentsNeedingHelp: 2,
      questionsCount: 24,
    },
    {
      topic: 'Data Visualization with Matplotlib & Seaborn',
      subject: 'Data Science',
      mastery: 78,
      status: 'Proficient',
      studentsNeedingHelp: 1,
      questionsCount: 17,
    },
    {
      topic: 'Neural Network Architectures (CNN, RNN)',
      subject: 'Deep Learning',
      mastery: 67,
      status: 'Developing',
      studentsNeedingHelp: 1,
      questionsCount: 12,
    },
  ];

  // Cognitive question patterns for AI & DS course
  const questionPatterns = [
    { type: 'Conceptual Understanding ("How does X work?")', count: 48, percentage: 49 },
    { type: 'Code Debugging & Implementation Doubts', count: 31, percentage: 32 },
    { type: 'Mathematical Derivations & Proofs', count: 12, percentage: 12 },
    { type: 'Exam Preparation & Past Questions', count: 7, percentage: 7 },
  ];

  const filteredTopics = topicsData.filter((t) => {
    return selectedSubject === 'All' || t.subject === selectedSubject;
  });

  const filteredStudents = students.filter((s) => {
    return selectedTier === 'All' || s.learning_level === selectedTier;
  });

  const avgMastery =
    students.length > 0
      ? Math.round(
          students.reduce((acc, curr) => acc + curr.mastery_score, 0) /
            students.length
        )
      : 72;

  const levelCounts = students.reduce(
    (acc, curr) => {
      acc[curr.learning_level] = (acc[curr.learning_level] || 0) + 1;
      return acc;
    },
    { Beginner: 0, Intermediate: 0, Advanced: 0 } as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-600" />
            Adaptive Learning & Cognitive Performance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of class-wide mastery, cognitive question patterns, and personalized pedagogical interventions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium">
            <Users className="w-4 h-4 text-slate-500" />
            <span>AI &amp; DS Batch ({students.length} Students)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-700 font-semibold font-mono">
            <span>Avg Class Mastery: {avgMastery}%</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Overall Class Mastery</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{avgMastery}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${avgMastery}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Target threshold: &ge; 75.0%
          </p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pedagogical Tiers</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-emerald-700">
                {levelCounts.Advanced}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Advanced</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-blue-700">
                {levelCounts.Intermediate}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Intermediate</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-amber-700">
                {levelCounts.Beginner}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Beginner</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 font-medium">
            Dynamic LLM prompt complexity adapted automatically
          </p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Critical Weak Topics</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">2 Topics</div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Gradient Descent, Bayesian Statistics
          </p>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            CNN Kernels, Attention Weights
          </p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Hesitation score &gt; 40%
          </p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Interventions</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">3 Active</div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Personalized concept drills queued
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-2">
            Automatic robot voice prompts ready
          </p>
        </div>
      </div>

      {/* Middle Grid: Topic Proficiency Matrix & Cognitive Question Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic Mastery Matrix (2 cols) */}
        <div className="lg:col-span-2 saas-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                AI &amp; DS Course Topic Proficiency Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated from student Q&amp;A accuracy, code exercises, and ZORO voice interaction queries.
              </p>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="All">All Subjects</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Deep Learning">Deep Learning</option>
                <option value="Statistics">Statistics</option>
                <option value="Programming">Programming</option>
                <option value="Data Science">Data Science</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {filteredTopics.map((topic, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>{topic.topic}</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {topic.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        topic.status === 'Mastered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : topic.status === 'Proficient'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : topic.status === 'Developing'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {topic.status}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {topic.mastery}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      topic.mastery >= 80
                        ? 'bg-emerald-500'
                        : topic.mastery >= 70
                        ? 'bg-blue-500'
                        : topic.mastery >= 60
                        ? 'bg-slate-400'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${topic.mastery}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{topic.questionsCount} questions asked to robot</span>
                  {topic.studentsNeedingHelp > 0 ? (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {topic.studentsNeedingHelp} students require conceptual review
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Full class comprehension achieved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive Question Patterns */}
        <div className="saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Question Distribution Patterns
              </h3>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Classification of voice queries received by robot speech recognition.
            </p>

            <div className="space-y-4">
              {questionPatterns.map((pat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[200px]">
                      {pat.type}
                    </span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {pat.percentage}% ({pat.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${pat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Insight Box */}
            <div className="mt-6 p-3.5 rounded-lg bg-blue-50/70 border border-blue-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-1">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                Pedagogical Recommendation
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                49% of questions are deep conceptual inquiries about ML algorithms and neural network internals. Ensure all lecture PDFs for Module 3 ("Gradient Descent &amp; Optimization") are indexed in the ZORO Knowledge Base.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Performance Breakdown Table */}
      <div className="saas-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Individual Student Mastery &amp; Weak Topic Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized ZORO AI learning profiles configured for real-time LLM prompt adaptation during voice dialogues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Tier:</span>
            <select
              aria-label="Filter by learning tier"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="All">All Tiers</option>
              <option value="Advanced">Advanced</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Beginner">Beginner</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Learning Level</th>
                <th className="py-2.5 px-3">Mastery Score</th>
                <th className="py-2.5 px-3">Weak Topics Identified</th>
                <th className="py-2.5 px-3">Adaptive Pedagogical Action</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.map((student) => {
                const weakTopics = student.weak_topics || [];
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {student.student_id}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          student.learning_level === 'Advanced'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : student.learning_level === 'Intermediate'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {student.learning_level}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 w-8">
                          {student.mastery_score}%
                        </span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              student.mastery_score >= 80
                                ? 'bg-emerald-500'
                                : student.mastery_score >= 60
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${student.mastery_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {weakTopics.length > 0 ? (
                          weakTopics.map((topic, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-medium"
                            >
                              {topic}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            None identified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {student.learning_level === 'Beginner' && (
                        <span>Simplified ML analogies, step-by-step code walkthroughs</span>
                      )}
                      {student.learning_level === 'Intermediate' && (
                        <span>Standard course depth, implementation exercises, formative checks</span>
                      )}
                      {student.learning_level === 'Advanced' && (
                        <span>Research-level reasoning, model comparison, optimization deep-dives</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectStudent(student.student_id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <span>Deep Dive</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
