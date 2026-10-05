import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  Award,
  BookOpen,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Student, AttendanceRecord } from '../types';

interface ReportsViewProps {
  students: Student[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ students }) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'daily_att' | 'monthly_att' | 'student_perf' | 'learning_prog' | 'interactions'
  >('daily_att');
  const [dateRange, setDateRange] = useState('Today');

  // Daily attendance mock report rows
  const dailyAttendanceData = students.map((s, idx) => ({
    id: s.id,
    student_id: s.student_id,
    name: s.name,
    grade: s.grade,
    status: idx === 3 ? 'Present' : 'Present', // all 4 present
    time: `08:4${idx * 3 + 2} AM`,
    confidence: `${(96.2 + idx * 0.8).toFixed(1)}%`,
    method: 'DeepFace Biometric Camera',
  }));

  // Student academic performance report rows
  const performanceData = students.map((s) => ({
    id: s.id,
    student_id: s.student_id,
    name: s.name,
    learning_level: s.learning_level,
    mastery_score: s.mastery_score,
    questions_asked: s.student_id === 'STU-1001' ? 8 : s.student_id === 'STU-1002' ? 6 : 4,
    top_strength: s.student_id === 'STU-1002' ? 'Deep Learning & Neural Nets' : 'Supervised ML & Classification',
    intervention_status: s.mastery_score < 70 ? 'Recommended Drills' : 'On Track',
  }));

  // Learning progress by AI & DS course modules
  const curriculumProgressData = [
    {
      unit: 'Module 1: Supervised Learning & Classification',
      completion: 92,
      questions: 42,
      avgScore: '89%',
      status: 'Mastered',
    },
    {
      unit: 'Module 2: Python & Pandas for Data Science',
      completion: 87,
      questions: 31,
      avgScore: '85%',
      status: 'Mastered',
    },
    {
      unit: 'Module 3: Gradient Descent & Optimization',
      completion: 64,
      questions: 48,
      avgScore: '62%',
      status: 'In Progress (Review Needed)',
    },
    {
      unit: 'Module 4: Probability & Bayesian Statistics',
      completion: 76,
      questions: 29,
      avgScore: '74%',
      status: 'Proficient',
    },
  ];

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `report_${activeReportTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReportTab === 'daily_att') {
      headers = ['Student ID', 'Name', 'Grade', 'Status', 'Timestamp', 'Confidence', 'Method'];
      rows = dailyAttendanceData.map((d) => [
        d.student_id,
        `"${d.name}"`,
        d.grade,
        d.status,
        d.time,
        d.confidence,
        `"${d.method}"`,
      ]);
    } else if (activeReportTab === 'student_perf') {
      headers = ['Student ID', 'Name', 'Level', 'Mastery', 'Questions Asked', 'Top Strength', 'Intervention'];
      rows = performanceData.map((p) => [
        p.student_id,
        `"${p.name}"`,
        p.learning_level,
        `${p.mastery_score}%`,
        `${p.questions_asked}`,
        `"${p.top_strength}"`,
        `"${p.intervention_status}"`,
      ]);
    } else {
      headers = ['Unit Name', 'Completion', 'Questions Logged', 'Average Score', 'Status'];
      rows = curriculumProgressData.map((c) => [
        `"${c.unit}"`,
        `${c.completion}%`,
        `${c.questions}`,
        c.avgScore,
        `"${c.status}"`,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Classroom Reports &amp; Academic Export Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official educational reporting for attendance compliance, student mastery, and RAG curriculum coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveReportTab('daily_att')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeReportTab === 'daily_att'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily Attendance Report</span>
        </button>

        <button
          onClick={() => setActiveReportTab('monthly_att')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeReportTab === 'monthly_att'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Monthly Attendance Trends</span>
        </button>

        <button
          onClick={() => setActiveReportTab('student_perf')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeReportTab === 'student_perf'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Student Performance &amp; Mastery</span>
        </button>

        <button
          onClick={() => setActiveReportTab('learning_prog')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeReportTab === 'learning_prog'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Curriculum Progress</span>
        </button>

        <button
          onClick={() => setActiveReportTab('interactions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeReportTab === 'interactions'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Voice &amp; AI Interaction Logs</span>
        </button>
      </div>

      {/* Report Context Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Cohort:</span>{' '}
            <span className="font-semibold text-slate-800">AI &amp; DS Batch A (Semester 1, 2026)</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-slate-300"></div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Supervisor:</span>{' '}
            <span className="font-semibold text-slate-800">Dr. R. Mohan (Head of AI &amp; DS Dept)</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-slate-300"></div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Generated:</span>{' '}
            <span className="font-mono text-slate-800">2026-10-03 12:50</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Period:</span>
          <select
            aria-label="Filter report period"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Today">Today (Oct 3, 2026)</option>
            <option value="Week">Current Week</option>
            <option value="Month">Month to Date (October)</option>
            <option value="Term">Term 1</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Daily Attendance Report */}
      {activeReportTab === 'daily_att' && (
        <div className="saas-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Daily Attendance Register &bull; October 3, 2026
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% Present (4 of 4)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-4">Student ID</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Grade</th>
                  <th className="py-2.5 px-4">Attendance Status</th>
                  <th className="py-2.5 px-4">Verification Time</th>
                  <th className="py-2.5 px-4">Recognition Confidence</th>
                  <th className="py-2.5 px-4">Sensor Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyAttendanceData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      {row.student_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-3 px-4 text-slate-600">{row.grade}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {row.confidence}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{row.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Attendance Trends */}
      {activeReportTab === 'monthly_att' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="saas-card p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                October Average
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">98.5%</div>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                +1.2% over previous month
              </p>
            </div>
            <div className="saas-card p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Punctuality Rate
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">96.0%</div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Zero tardiness incidents today
              </p>
            </div>
            <div className="saas-card p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Automated Facial Scans
              </span>
              <div className="text-2xl font-bold font-mono text-blue-700 mt-1">112 Scans</div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                DeepFace 0.0.101 Verification
              </p>
            </div>
          </div>

          <div className="saas-card p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Weekly Attendance Trend (Past 4 Weeks)
            </h3>
            <div className="space-y-3">
              {[
                { week: 'Week 1 (Sep 07 - Sep 11)', rate: 97.5, present: 19, absent: 1 },
                { week: 'Week 2 (Sep 14 - Sep 18)', rate: 100.0, present: 20, absent: 0 },
                { week: 'Week 3 (Sep 21 - Sep 25)', rate: 95.0, present: 19, absent: 1 },
                { week: 'Week 4 (Sep 28 - Oct 02)', rate: 100.0, present: 20, absent: 0 },
              ].map((w, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{w.week}</span>
                    <span className="font-mono font-bold text-slate-900">{w.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${w.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Student Academic Performance */}
      {activeReportTab === 'student_perf' && (
        <div className="saas-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Student Mastery &amp; Cognitive Performance Audit
            </h3>
            <span className="text-xs text-slate-500">
              Adaptive pedagogical levels active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-4">Student ID</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Adaptive Tier</th>
                  <th className="py-2.5 px-4">Mastery Score</th>
                  <th className="py-2.5 px-4">Questions Asked</th>
                  <th className="py-2.5 px-4">Top Strength</th>
                  <th className="py-2.5 px-4">Intervention Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{row.student_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.learning_level === 'Advanced'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.learning_level === 'Intermediate'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {row.learning_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {row.mastery_score}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {row.questions_asked}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {row.top_strength}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.intervention_status === 'On Track'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {row.intervention_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Curriculum Progress */}
      {activeReportTab === 'learning_prog' && (
        <div className="saas-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-bold text-slate-900">
              Curriculum Unit Coverage &amp; Grounding Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Knowledge base retrieval utilization across core curriculum modules.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-4">Curriculum Module</th>
                  <th className="py-2.5 px-4">Completion</th>
                  <th className="py-2.5 px-4">Inquiries Handled</th>
                  <th className="py-2.5 px-4">Comprehension Avg</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {curriculumProgressData.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.unit}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-800 w-8">
                          {c.completion}%
                        </span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${c.completion}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.questions}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {c.avgScore}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.status.includes('Mastered')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status.includes('Proficient')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Interaction Logs */}
      {activeReportTab === 'interactions' && (
        <div className="saas-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Voice &amp; AI Dialogue Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time transcript logs for teacher review and safety verification.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Total: 6 Dialogues</span>
          </div>

          <div className="mt-4 space-y-3">
            {[
              {
                time: '11:15 AM',
                student: 'Arjun Sharma',
                q: 'What is the difference between supervised and unsupervised learning?',
                mode: 'Voice',
                latency: '298 ms',
                grounded: 'Introduction to Machine Learning (Module 1, Page 12)',
              },
              {
                time: '10:42 AM',
                student: 'Sneha Reddy',
                q: 'What is Bayes theorem and how is it applied in machine learning?',
                mode: 'Text',
                latency: '284 ms',
                grounded: 'Probability & Statistics for AI (Module 3, Page 45)',
              },
              {
                time: '10:04 AM',
                student: 'Rohan Verma',
                q: 'What is the difference between a Pandas Series and a DataFrame?',
                mode: 'Voice',
                latency: '334 ms',
                grounded: 'Python for Data Science (Module 2, Page 22)',
              },
            ].map((log, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                  <span>
                    {log.time} &bull; <strong>{log.student}</strong>
                  </span>
                  <span>{log.latency}</span>
                </div>
                <div className="font-semibold text-slate-900">"{log.q}"</div>
                <div className="flex items-center gap-1.5 text-blue-700 text-[11px]">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>{log.grounded}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
