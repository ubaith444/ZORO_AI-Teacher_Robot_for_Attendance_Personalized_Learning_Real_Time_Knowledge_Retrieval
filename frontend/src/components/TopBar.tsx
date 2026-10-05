import React from 'react';
import {
  Bell,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { RobotState } from '../types';

interface TopBarProps {
  pageTitle: string;
  robotState: RobotState;
  onRefresh: () => void;
  onTriggerAttendance: () => void;
  onTriggerTutor: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  pageTitle,
  robotState,
  onRefresh,
  onTriggerAttendance,
  onTriggerTutor,
}) => {
  const getStatusBadge = (state: RobotState) => {
    switch (state) {
      case 'Listening':
      case 'Speaking':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Processing':
      case 'Retrieving Knowledge':
      case 'Generating Answer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Face Detected':
      case 'Student Identified':
      case 'Attendance Marked':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Robot Offline':
      case 'Service Error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Idle':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>AI &amp; DS Department</span>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{pageTitle}</span>
        </div>
        <h1 className="text-base font-bold text-slate-900 leading-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right Controls: Real-time State & Actions */}
      <div className="flex items-center gap-3">
        {/* Real-Time Robot State Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium font-mono transition-colors ${getStatusBadge(
            robotState
          )}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          <span>Robot: {robotState}</span>
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayDate}</span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Quick Launch Action */}
        <button
          onClick={onTriggerAttendance}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Scan Attendance</span>
        </button>
      </div>
    </header>
  );
};
