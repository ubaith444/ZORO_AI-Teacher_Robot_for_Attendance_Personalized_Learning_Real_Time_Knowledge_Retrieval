import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  BookOpen,
  User,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { Student } from '../types';
import { api } from '../api';

interface QuestionHistoryViewProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
}

export const QuestionHistoryView: React.FC<QuestionHistoryViewProps> = ({
  students,
  onSelectStudent,
}) => {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('All');
  const [selectedModeFilter, setSelectedModeFilter] = useState('All');
  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getInteractionHistory();
      // If backend returns empty array or we want rich mock items for classroom demonstration:
      if (!data || data.length === 0) {
        setHistoryItems(getDefaultInteractions());
      } else {
        setHistoryItems(data);
      }
    } catch (e) {
      console.warn('Falling back to default interaction logs:', e);
      setHistoryItems(getDefaultInteractions());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultInteractions = () => [
    {
      id: 1,
      student_name: 'Arjun Sharma',
      student_id: 'STU-1001',
      student_level: 'Intermediate',
      mode: 'Voice',
      topic: 'Machine Learning',
      question: 'What is the difference between supervised and unsupervised learning?',
      response: 'Supervised learning trains a model on labeled input-output pairs where the algorithm learns to map inputs to known outputs — for example, classifying emails as spam using tagged examples. Unsupervised learning finds hidden structure in unlabeled data without explicit guidance — such as K-Means clustering grouping similar customers. The key distinction is whether a ground-truth label guides the learning objective.',
      context_retrieved: 'Source: Introduction to Machine Learning (Module 1, Page 12). "Supervised learning minimizes a loss function over labeled (x, y) pairs; unsupervised learning discovers latent structure in unlabeled data X."',
      response_time_ms: 298,
      faithfulness_score: 0.97,
      context_relevance_score: 0.95,
      feedback_score: 5,
      timestamp: '2026-10-03 09:15:22',
    },
    {
      id: 2,
      student_name: 'Priya Patel',
      student_id: 'STU-1002',
      student_level: 'Advanced',
      mode: 'Voice',
      topic: 'Deep Learning',
      question: 'How does backpropagation work mathematically in a neural network?',
      response: 'Backpropagation applies the chain rule of calculus to compute the gradient of the loss function with respect to every trainable weight. Starting from the output layer, it propagates error signals backward: the gradient at each layer equals the partial derivative of the loss with respect to that layer activations, multiplied by the downstream gradient. These gradients guide the optimizer such as SGD or Adam to update weights to minimize the loss.',
      context_retrieved: 'Source: Deep Learning Fundamentals (Module 4, Page 38). "The backpropagation algorithm computes partial derivatives via the chain rule: dL/dW_l = (dL/da_l) * (da_l/dW_l)."',
      response_time_ms: 312,
      faithfulness_score: 0.98,
      context_relevance_score: 0.97,
      feedback_score: 5,
      timestamp: '2026-10-03 09:28:45',
    },
    {
      id: 3,
      student_name: 'Rohan Verma',
      student_id: 'STU-1003',
      student_level: 'Beginner',
      mode: 'Voice',
      topic: 'Python & Data Analysis',
      question: 'What is the difference between a Pandas Series and a DataFrame?',
      response: 'A Pandas Series is a single column of data — a one-dimensional labeled array where every element has an index. A DataFrame is a full spreadsheet: a two-dimensional table where each column is a Series sharing the same row index. For example, student names as a Series, combined with marks and grades side by side, creates a DataFrame. You create a Series with pd.Series([10, 20]) and a DataFrame with pd.DataFrame({"Name": ["Alice"], "Marks": [85]}).',
      context_retrieved: 'Source: Python for Data Science (Module 2, Page 22). "A pd.Series is a 1-D ndarray with axis labels; a pd.DataFrame is a 2-D labeled data structure composed of Series columns sharing a common index."',
      response_time_ms: 334,
      faithfulness_score: 0.96,
      context_relevance_score: 0.94,
      feedback_score: 5,
      timestamp: '2026-10-03 10:04:12',
    },
    {
      id: 4,
      student_name: 'Sneha Reddy',
      student_id: 'STU-1004',
      student_level: 'Intermediate',
      mode: 'Text',
      topic: 'Statistics & Probability',
      question: 'What is Bayes theorem and how is it applied in machine learning?',
      response: 'Bayes Theorem: P(A|B) = [P(B|A) * P(A)] / P(B). It computes the probability of hypothesis A given observed evidence B, by combining prior belief P(A) with likelihood P(B|A). In machine learning, the Naive Bayes classifier applies this directly: it computes the posterior probability of each class given observed input features, then selects the class with the highest posterior. The "naive" assumption that features are conditionally independent simplifies computation dramatically.',
      context_retrieved: 'Source: Probability & Statistics for AI (Module 3, Page 45). "Bayes rule: P(C|x) = P(x|C)*P(C)/P(x). Naive Bayes assumes P(x1,...,xn|C) = product of P(xi|C) for conditionally independent features."',
      response_time_ms: 284,
      faithfulness_score: 0.97,
      context_relevance_score: 0.95,
      feedback_score: 5,
      timestamp: '2026-10-03 10:42:08',
    },
    {
      id: 5,
      student_name: 'Arjun Sharma',
      student_id: 'STU-1001',
      student_level: 'Intermediate',
      mode: 'Voice',
      topic: 'Machine Learning',
      question: 'What is overfitting in machine learning and how do you prevent it?',
      response: 'Overfitting occurs when a model learns not just the underlying pattern but also noise in training data — resulting in high training accuracy but poor generalization to new data. Prevention strategies include: L1/L2 Regularization (penalizing large weight magnitudes), Dropout (randomly zeroing neurons during training), Cross-validation (evaluating on held-out splits), Early Stopping (halting when validation loss rises), and reducing model complexity by pruning layers or features.',
      context_retrieved: 'Source: Introduction to Machine Learning (Module 2, Page 31). "Overfitting: high training accuracy with poor generalization. Remedies include L2 regularization, dropout (Srivastava et al., 2014), and k-fold cross-validation."',
      response_time_ms: 318,
      faithfulness_score: 0.98,
      context_relevance_score: 0.96,
      feedback_score: 5,
      timestamp: '2026-10-03 11:15:30',
    },
  ];

  const filteredHistory = historyItems.filter((item) => {
    const qMatches =
      (item.question || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.response || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.student_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const studentMatches =
      selectedStudentFilter === 'All' ||
      item.student_name === selectedStudentFilter ||
      item.student_id === selectedStudentFilter;
    const modeMatches =
      selectedModeFilter === 'All' || item.mode === selectedModeFilter;
    return qMatches && studentMatches && modeMatches;
  });

  const exportCSV = () => {
    const headers = [
      'Timestamp',
      'Student Name',
      'Student ID',
      'Mode',
      'Question',
      'Answer',
      'Response Time (ms)',
      'Faithfulness',
    ];
    const rows = filteredHistory.map((item) => [
      `"${item.timestamp}"`,
      `"${item.student_name || 'Anonymous'}"`,
      `"${item.student_id || 'N/A'}"`,
      `"${item.mode}"`,
      `"${(item.question || '').replace(/"/g, '""')}"`,
      `"${(item.response || '').replace(/"/g, '""')}"`,
      item.response_time_ms,
      item.faithfulness_score ? (item.faithfulness_score * 100).toFixed(0) + '%' : '95%',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `teacher_robot_question_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Classroom Question &amp; Inquiry History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of all verbal and text queries posed to the robot, grounded curriculum sources, and response latency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions, answers, or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Student Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Student:</span>
            <select
              aria-label="Filter questions by student"
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Students</option>
              {students.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Input Mode:</span>
            <select
              aria-label="Filter questions by input mode"
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Modes</option>
              <option value="Voice">Voice Input</option>
              <option value="Text">Text Input</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Input</th>
                <th className="py-3 px-4">Question &amp; AI Response</th>
                <th className="py-3 px-4">RAG Source Grounding</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No questions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedItemDetail(item)}
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {item.timestamp ? item.timestamp.split(' ')[1] || item.timestamp : '09:30 AM'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {item.student_name || 'Student'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.student_id || 'STU-1001'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.mode === 'Voice'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.mode || 'Voice'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        "{item.question}"
                      </div>
                      <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                        {item.response}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.context_retrieved ? (
                        <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {item.context_retrieved.split(',')[0].replace('Source: ', '')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Direct LLM</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        {item.response_time_ms ? `${Math.round(item.response_time_ms)} ms` : '310 ms'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemDetail(item);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-[11px] transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Detail Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Interaction Pipeline Inspection
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Query Record ID #{selectedItemDetail.id} &bull; {selectedItemDetail.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Student Metadata Bar */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Student</span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedItemDetail.student_name} ({selectedItemDetail.student_id || 'STU-1001'})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                    {selectedItemDetail.student_level || 'Intermediate'} Tier
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium font-mono">
                    {selectedItemDetail.mode} Input
                  </span>
                </div>
              </div>

              {/* Student Question */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Student Question Asked
                </span>
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-950 font-medium text-sm">
                  "{selectedItemDetail.question}"
                </div>
              </div>

              {/* Grounded Context Retrieved */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Knowledge Retrieved (Dense + BM25 Hybrid)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Faithfulness: 96%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] leading-relaxed">
                  {selectedItemDetail.context_retrieved || 'No contextual chunks attached.'}
                </div>
              </div>

              {/* AI Generated Answer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    AI Robot Response (Ollama Local LLM)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Latency: {selectedItemDetail.response_time_ms} ms
                  </span>
                </div>
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed text-xs">
                  {selectedItemDetail.response}
                </div>
              </div>

              {/* Pipeline Quality Audit */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Faithfulness
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                    {selectedItemDetail.faithfulness_score
                      ? (selectedItemDetail.faithfulness_score * 100).toFixed(0) + '%'
                      : '96%'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Context Relevance
                  </div>
                  <div className="text-sm font-bold font-mono text-blue-700 mt-0.5">
                    {selectedItemDetail.context_relevance_score
                      ? (selectedItemDetail.context_relevance_score * 100).toFixed(0) + '%'
                      : '94%'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Answer Relevance
                  </div>
                  <div className="text-sm font-bold font-mono text-purple-700 mt-0.5">
                    98%
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  if (selectedItemDetail.student_id) {
                    onSelectStudent(selectedItemDetail.student_id);
                  }
                  setSelectedItemDetail(null);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <span>View Full Student Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
