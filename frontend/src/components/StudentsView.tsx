import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  X
} from 'lucide-react';
import { Student } from '../types';
import { api } from '../api';

interface StudentsViewProps {
  students: Student[];
  onRefresh: () => void;
  onSelectStudent: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onRefresh,
  onSelectStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regGrade, setRegGrade] = useState('AI & DS - Batch A');
  const [regLevel, setRegLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
    const matchesLevel = levelFilter === 'All' || s.learning_level === levelFilter;
    return matchesSearch && matchesGrade && matchesLevel;
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    try {
      const formData = new FormData();
      formData.append('student_id', regId);
      formData.append('name', regName);
      formData.append('grade', regGrade);
      formData.append('learning_level', regLevel);

      await api.registerStudent(formData);
      setRegSuccess(`Student ${regName} registered successfully!`);
      onRefresh();
      setTimeout(() => {
        setShowAddModal(false);
        setRegId('');
        setRegName('');
        setRegSuccess(null);
      }, 1200);
    } catch (err: any) {
      setRegError(err.message || 'Failed to register student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Student Management Directory ({students.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student enrollment, facial biometric profiles, and individual learning tiers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="saas-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Grade Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Grade:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            >
              <option value="All">All Grades</option>
              <option value="AI &amp; DS - Batch A">AI &amp; DS Batch A</option>
              <option value="AI &amp; DS - Batch B">AI &amp; DS Batch B</option>
              <option value="AI &amp; DS - Batch C">AI &amp; DS Batch C</option>
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Learning Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            >
              <option value="All">All Tiers</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left saas-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th>Learning Level</th>
                <th>Mastery Score</th>
                <th>Biometrics</th>
                <th>Weak Topics</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{s.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-medium text-slate-700">{s.grade}</td>
                    <td>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          s.learning_level === 'Beginner'
                            ? 'bg-amber-100 text-amber-800'
                            : s.learning_level === 'Advanced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {s.learning_level}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${s.mastery_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {s.mastery_score}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        DeepFace Linked
                      </span>
                    </td>
                    <td>
                      {s.weak_topics && s.weak_topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.weak_topics.map((t, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">None flagged</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => onSelectStudent(s.student_id)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No students found matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Enroll Student &amp; Face Biometrics
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter student credentials. Facial representation will be indexed from robot camera.
            </p>

            {regError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {regError}
              </div>
            )}
            {regSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {regSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-1005"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grade</label>
                  <input
                    type="text"
                    required
                    value={regGrade}
                    onChange={(e) => setRegGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Level</label>
                  <select
                    value={regLevel}
                    onChange={(e) => setRegLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-900"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                Face image embedding will be generated automatically using DeepFace (VGG-Face) from the robot's HD camera.
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Save &amp; Enroll Biometrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
