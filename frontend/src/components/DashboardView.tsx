import React from 'react';
import {
  Users,
  CheckCircle2,
  CalendarCheck,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Cpu,
  Clock,
  Radio,
  FileText,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { SystemOverview, HardwareTelemetry, Student, AttendanceStats } from '../types';

interface DashboardViewProps {
  overview: SystemOverview | null;
  attendanceStats: AttendanceStats | null;
  telemetry: HardwareTelemetry | null;
  students: Student[];
  recentInteractions: any[];
  onNavigate: (page: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  attendanceStats,
  telemetry,
  students,
  recentInteractions,
  onNavigate,
  onSelectStudent,
}) => {
  const summary = overview?.summary || {
    total_students: students.length || 4,
    today_attendance_rate: attendanceStats?.attendance_rate_percent || 100.0,
    present_today: attendanceStats?.present_count || students.length,
    total_documents: 1,
    total_chunks: 7,
    total_interactions: recentInteractions.length || 6,
    average_mastery: 71.6,
  };

  const levels = overview?.learning_levels || {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 1,
  };
  const totalLearners = Math.max(
    levels.Beginner + levels.Intermediate + levels.Advanced,
    1
  );

  return (
    <div className="space-y-6">
      {/* System Notifications / Alerts Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-amber-900">
            ZORO Adaptive Learning Alert:
          </span>{' '}
          <span className="text-amber-800">
            2 students showed repeated hesitation on <strong>Machine Learning / Gradient Descent</strong> during
            voice queries today. ZORO has queued targeted conceptual review drills for backpropagation.
          </span>
        </div>
        <button
          onClick={() => onNavigate('analytics')}
          className="text-amber-900 font-semibold underline hover:text-amber-700 whitespace-nowrap"
        >
          View Analytics
        </button>
      </div>

      {/* Key Metric Tiles (Restrained Light Palette, 5 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Attendance */}
        <div className="saas-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {summary.today_attendance_rate}%
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-0.5">
              {summary.present_today} of {summary.total_students} Present Today
            </div>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Live Attendance <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Active Students */}
        <div className="saas-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {summary.total_students}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              AI &amp; DS Batch Enrolled
            </div>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Student Roster <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Questions Asked */}
        <div className="saas-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Questions</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {summary.total_interactions}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Tutoring Dialogues Logged
            </div>
          </div>
          <button
            onClick={() => onNavigate('questions')}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Question Logs <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Learning Mastery */}
        <div className="saas-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Curriculum Mastery</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {summary.average_mastery}%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Class Proficiency Score
            </div>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Proficiency Matrix <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Robot Status */}
        <div className="saas-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Robot Hardware</span>
            <Cpu className="w-4 h-4 text-slate-600" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold text-emerald-700 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online (RPi 5)
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Battery {telemetry?.battery_level || 94.5}% &bull; {telemetry?.cpu_temp_celsius || 42.8}&deg;C
            </div>
          </div>
          <button
            onClick={() => onNavigate('system')}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Telemetry &amp; Controls <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Active Student Profiles & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Students & Learning Level Distribution */}
        <div className="lg:col-span-2 saas-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ZORO Student Directory &amp; Mastery Profiles
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enrolled AI &amp; DS students with adaptive LLM learning tiers
              </p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All Students <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {students.map((student) => (
              <div
                key={student.student_id}
                onClick={() => {
                  onSelectStudent(student.student_id);
                  onNavigate('profile');
                }}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {student.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {student.student_id} &bull; {student.grade}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      student.learning_level === 'Beginner'
                        ? 'bg-amber-100 text-amber-800'
                        : student.learning_level === 'Advanced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {student.learning_level}
                  </span>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                    {student.mastery_score}% Mastery
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Learning Level Distribution Progress Meter */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
              <span>Learning Level Breakdown:</span>
              <span className="font-mono text-slate-500">
                Beginner {levels.Beginner} &bull; Intermediate {levels.Intermediate} &bull; Advanced{' '}
                {levels.Advanced}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(levels.Beginner / totalLearners) * 100}%` }}
                title="Beginner"
              />
              <div
                className="bg-blue-600 h-full"
                style={{ width: `${(levels.Intermediate / totalLearners) * 100}%` }}
                title="Intermediate"
              />
              <div
                className="bg-emerald-600 h-full"
                style={{ width: `${(levels.Advanced / totalLearners) * 100}%` }}
                title="Advanced"
              />
            </div>
          </div>
        </div>

        {/* Quick Classroom Actions */}
        <div className="saas-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Teacher Quick Actions
            </h2>
            <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">
              Launch common course actions directly via the ZORO robot platform:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('attendance')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Trigger Face Attendance Scan</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Scan webcam and log student presence
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('tutor')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Start AI Voice Tutoring</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Deepgram speech &bull; Ollama grounded Q&amp;A
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('knowledge')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Upload Course Material PDF</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Apply Semantic &amp; Late Chunking for AI&amp;DS RAG
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Generate Attendance Report</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Export daily &amp; monthly logs
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>ZORO AI Platform v2.0</span>
            <span className="text-emerald-700 font-semibold">Ready</span>
          </div>
        </div>
      </div>

      {/* Row 3: Recent AI Tutoring Interactions Stream */}
      <div className="saas-card p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recent Tutoring Interactions &amp; Explanations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Q&amp;A dialogue stream between AI&amp;DS students and ZORO robot
            </p>
          </div>
          <button
            onClick={() => onNavigate('questions')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Full Dialogue History <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {recentInteractions && recentInteractions.length > 0 ? (
            recentInteractions.slice(0, 3).map((item) => (
              <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                <div className="w-32 shrink-0 text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{item.student_name || 'Student'} asked:</span>
                    <span className="font-normal text-slate-700">"{item.question}"</span>
                  </div>
                  <div className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {item.response}
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px] text-slate-400">
                  {Math.round(item.response_time_ms)}ms latency
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400 font-medium">
              No recent dialogues recorded today. Ask a question in the AI Tutor tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
