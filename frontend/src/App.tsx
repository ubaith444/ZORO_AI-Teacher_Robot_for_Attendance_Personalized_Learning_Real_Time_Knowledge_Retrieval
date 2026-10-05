import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { AITutorView } from './components/AITutorView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { LearningAnalyticsView } from './components/LearningAnalyticsView';
import { QuestionHistoryView } from './components/QuestionHistoryView';
import { ReportsView } from './components/ReportsView';
import { SystemStatusView } from './components/SystemStatusView';
import { StudentProfileView } from './components/StudentProfileView';
import {
  Student,
  SystemOverview,
  HardwareTelemetry,
  AttendanceStats,
  RobotState,
} from './types';
import { api } from './api';

export function App() {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [robotState, setRobotState] = useState<RobotState>('Idle');
  const [students, setStudents] = useState<Student[]>([]);
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('STU-1001');
  const [recentInteractions, setRecentInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAllData();

    // WebSocket for real-time telemetry and state events
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/robot`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        // Connected
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'telemetry') {
            setTelemetry(payload.data);
          } else if (payload.type === 'state_change') {
            setRobotState(payload.state as RobotState);
          }
        } catch (e) {
          // ignore parsing error
        }
      };
      socket.onerror = () => {
        // Fallback polling active
      };
    } catch (e) {
      console.warn('WebSocket connection not supported in current environment');
    }

    // Polling fallback
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 4000);

    return () => {
      if (socket) socket.close();
      clearInterval(interval);
    };
  }, []);

  const loadAllData = async () => {
    try {
      const [stu, ov, st, tel, interactions] = await Promise.all([
        api.getStudents(),
        api.getOverview().catch(() => null),
        api.getAttendanceStats().catch(() => null),
        api.getHardwareTelemetry().catch(() => null),
        api.getInteractionHistory().catch(() => []),
      ]);
      setStudents(stu || []);
      if (ov) setOverview(ov);
      if (st) setAttendanceStats(st);
      if (tel) setTelemetry(tel);
      if (interactions) setRecentInteractions(interactions);
      if (stu && stu.length > 0 && !selectedStudentId) {
        setSelectedStudentId(stu[0].student_id);
      }
    } catch (err) {
      console.error('Error loading initial classroom data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const tel = await api.getHardwareTelemetry();
      setTelemetry(tel);
    } catch (err) {
      // ignore
    }
  };

  const handleRefresh = async () => {
    await loadAllData();
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActivePage('profile');
  };

  const handleLaunchTutorForStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActivePage('tutor');
  };

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard':
        return 'Faculty Operations & System Dashboard';
      case 'students':
        return 'Student Directory & Biometric Profiles';
      case 'attendance':
        return 'Automated Biometric Attendance';
      case 'tutor':
        return 'ZORO AI Tutor & Interactive Voice Learning';
      case 'knowledge':
        return 'Course Knowledge Base & RAG Index';
      case 'analytics':
        return 'Adaptive Learning & Cognitive Analytics';
      case 'questions':
        return 'Inquiry History & Pipeline Grounding';
      case 'reports':
        return 'Academic Reports & Export Center';
      case 'system':
        return 'Robot Peripherals & Hardware Diagnostics';
      case 'profile':
        return 'Personalized Student Profile & Remediation';
      default:
        return 'ZORO AI Platform';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        telemetry={telemetry}
        robotState={robotState}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <TopBar
          pageTitle={getPageTitle(activePage)}
          robotState={robotState}
          onRefresh={handleRefresh}
          onTriggerAttendance={() => setActivePage('attendance')}
          onTriggerTutor={() => setActivePage('tutor')}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {activePage === 'dashboard' && (
            <DashboardView
              overview={overview}
              attendanceStats={attendanceStats}
              telemetry={telemetry}
              students={students}
              recentInteractions={recentInteractions}
              onNavigate={setActivePage}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {activePage === 'students' && (
            <StudentsView
              students={students}
              onRefresh={loadAllData}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {activePage === 'attendance' && (
            <AttendanceView
              students={students}
              onAttendanceMarked={loadAllData}
            />
          )}

          {activePage === 'tutor' && (
            <AITutorView
              students={students}
              robotState={robotState}
              setRobotState={setRobotState}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {activePage === 'knowledge' && <KnowledgeBaseView />}

          {activePage === 'analytics' && (
            <LearningAnalyticsView
              students={students}
              overview={overview}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {activePage === 'questions' && (
            <QuestionHistoryView
              students={students}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {activePage === 'reports' && <ReportsView students={students} />}

          {activePage === 'system' && (
            <SystemStatusView
              telemetry={telemetry}
              robotState={robotState}
              onRefreshTelemetry={fetchTelemetry}
            />
          )}

          {activePage === 'profile' && (
            <StudentProfileView
              students={students}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              onLaunchTutorForStudent={handleLaunchTutorForStudent}
            />
          )}
        </main>

        {/* Professional Enterprise Footer */}
        <footer className="border-t border-slate-200 bg-white py-3.5 px-6 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              ZORO AI TEACHER ROBOT &bull; AI &amp; DATA SCIENCE DEPT &bull; RASPBERRY PI 5 EMBEDDED
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Vision: DeepFace 0.0.101</span>
            <span>Voice: Deepgram Nova-2/Aura</span>
            <span>LLM: Ollama API</span>
            <span>RAG: Qdrant + BM25Okapi</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
