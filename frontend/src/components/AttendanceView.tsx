import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStats } from '../types';
import { api } from '../api';

interface AttendanceViewProps {
  students: Student[];
  onAttendanceMarked: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  onAttendanceMarked,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [cameraSnap, setCameraSnap] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    loadAttendance();
    fetchCameraSnapshot();
  }, []);

  const loadAttendance = async () => {
    try {
      const [recs, st] = await Promise.all([
        api.getAttendanceRecords(),
        api.getAttendanceStats(),
      ]);
      setRecords(recs);
      setStats(st);
    } catch (e) {
      console.error('Failed to load attendance:', e);
    }
  };

  const fetchCameraSnapshot = async () => {
    try {
      const snap = await api.getCameraSnapshot();
      if (snap.image) setCameraSnap(snap.image);
    } catch (e) {
      console.error('Snapshot error:', e);
    }
  };

  const handleScanAttendance = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.scanAttendance();
      setScanResult(res);
      if (res.identification?.annotated_image) {
        setCameraSnap(res.identification.annotated_image);
      }
      await loadAttendance();
      onAttendanceMarked();
    } catch (err: any) {
      alert(`Scanning error: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'All') return true;
    return r.status === selectedFilter;
  });

  const handleExportCSV = () => {
    const headers = 'ID,Student Name,Date,Time,Status,Confidence\n';
    const rows = records
      .map(
        (r) =>
          `${r.id},"${r.student_name}",${r.date},${new Date(
            r.timestamp
          ).toLocaleTimeString()},${r.status},${Math.round(r.confidence_score * 100)}%`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Automated Attendance Monitoring
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Face detection via DeepFace with real-time biometric verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium">
            {(['Daily', 'Weekly', 'Monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Row 1: Attendance Counts & Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="saas-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Attendance Rate
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono mt-1">
            {stats?.attendance_rate_percent || 100}%
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Daily target: &gt;90%
          </div>
        </div>

        <div className="saas-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Present Students
          </div>
          <div className="text-3xl font-bold text-emerald-700 font-mono mt-1">
            {stats?.present_count || students.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Verified in classroom
          </div>
        </div>

        <div className="saas-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Late Arrivals
          </div>
          <div className="text-3xl font-bold text-amber-700 font-mono mt-1">
            {stats?.late_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            After 08:30 AM
          </div>
        </div>

        <div className="saas-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Absent Students
          </div>
          <div className="text-3xl font-bold text-rose-700 font-mono mt-1">
            {stats?.absent_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Unrecorded presence
          </div>
        </div>
      </div>

      {/* Row 2: Live Camera Recognition & Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed Card */}
        <div className="lg:col-span-1 saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                Robot Camera Scanner
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                1080p CSI
              </span>
            </div>

            {/* Video Canvas Preview */}
            <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {cameraSnap ? (
                <img
                  src={cameraSnap}
                  alt="Live Face Recognition Frame"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 text-slate-400">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-pulse" />
                  <p className="text-xs">Initializing camera feed...</p>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-blue-700">
                  <RefreshCw className="w-7 h-7 animate-spin mb-2" />
                  <span className="text-xs font-semibold font-mono">
                    Matching Facial Biometrics...
                  </span>
                </div>
              )}
            </div>

            {/* Scan Diagnostic Result Banner */}
            {scanResult && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                {scanResult.identification?.identified ? (
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      Identified: <strong>{scanResult.identification.student_name}</strong> (
                      {Math.round(scanResult.identification.confidence * 100)}% confidence)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{scanResult.identification?.message || 'Face unverified'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
            <button
              onClick={handleScanAttendance}
              disabled={scanning}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>{scanning ? 'Scanning...' : 'Scan Face & Mark Attendance'}</span>
            </button>
            <div className="text-center text-[10px] text-slate-400 font-mono">
              Model: DeepFace VGG-Face &bull; Euclidean Threshold 0.40
            </div>
          </div>
        </div>

        {/* Live Attendance Table */}
        <div className="lg:col-span-2 saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Attendance Records ({filteredRecords.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automated biometric records with confidence scoring
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {['All', 'Present', 'Late', 'Absent'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedFilter === f
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left saas-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Confidence</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="font-sans font-semibold text-slate-900">
                          {rec.student_name}
                        </td>
                        <td>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="text-slate-500">
                          {new Date(rec.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="text-slate-800 font-bold">
                          {Math.round(rec.confidence_score * 100)}%
                        </td>
                        <td className="text-[11px] text-slate-500">DeepFace Live</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                        No records found for filter "{selectedFilter}". Click "Scan Face" to record attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Daily Log &bull; Stored in SQLite AttendanceRecord</span>
            <button
              onClick={loadAttendance}
              className="text-blue-600 hover:text-blue-700 font-sans font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
