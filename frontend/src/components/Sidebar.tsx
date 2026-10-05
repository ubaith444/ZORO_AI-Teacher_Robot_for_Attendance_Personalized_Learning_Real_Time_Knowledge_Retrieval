import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MessageSquareQuote,
  BookOpen,
  LineChart,
  History,
  FileSpreadsheet,
  Cpu,
  UserCircle,
  Battery,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { HardwareTelemetry, RobotState } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  telemetry: HardwareTelemetry | null;
  robotState: RobotState;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  telemetry,
  robotState,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'tutor', label: 'AI Tutor & Voice', icon: MessageSquareQuote },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: 'Learning Analytics', icon: LineChart },
    { id: 'questions', label: 'Question History', icon: History },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'system', label: 'Robot & System Status', icon: Cpu },
    { id: 'profile', label: 'Student Profile', icon: UserCircle },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-200 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            ZR
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none">
              ZORO AI
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              AI &amp; DS Dept &bull; RPi 5
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          AI &amp; DS Platform
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Robot Status Card at Bottom */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              Robot State
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              {robotState}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
            <div className="flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-emerald-600" />
              <span>{telemetry ? `${telemetry.battery_level}%` : '94.5%'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>{telemetry ? `${telemetry.cpu_temp_celsius} C` : '42.8 C'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              DeepFace Active
            </span>
            <span className="font-mono text-slate-400">ZORO v2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
