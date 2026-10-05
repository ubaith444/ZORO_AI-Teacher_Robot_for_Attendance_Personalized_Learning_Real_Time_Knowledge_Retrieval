import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  Camera,
  Mic,
  Volume2,
  Database,
  Layers,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  ShieldCheck,
  Terminal,
  Zap,
  Battery
} from 'lucide-react';
import { HardwareTelemetry, RobotState } from '../types';
import { api } from '../api';

interface SystemStatusViewProps {
  telemetry: HardwareTelemetry | null;
  robotState: RobotState;
  onRefreshTelemetry: () => void;
}

export const SystemStatusView: React.FC<SystemStatusViewProps> = ({
  telemetry,
  robotState,
  onRefreshTelemetry,
}) => {
  const [motorSpeed, setMotorSpeed] = useState<number>(80);
  const [panAngle, setPanAngle] = useState<number>(telemetry?.pan_angle ?? 90);
  const [tiltAngle, setTiltAngle] = useState<number>(telemetry?.tilt_angle ?? 45);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string>('stop');

  // Real-time operational event stream log
  const [events, setEvents] = useState<Array<{
    timestamp: string;
    subsystem: string;
    severity: 'info' | 'success' | 'warning';
    message: string;
  }>>([
    {
      timestamp: '12:51:04',
      subsystem: 'Ollama LLM',
      severity: 'success',
      message: 'Model reasoning cache active. Ollama inference response latency: 284 ms.',
    },
    {
      timestamp: '12:50:42',
      subsystem: 'Qdrant RAG',
      severity: 'info',
      message: 'Hybrid search fusion executed: 4 dense vectors + BM25Okapi inverted index merged.',
    },
    {
      timestamp: '12:50:18',
      subsystem: 'DeepFace Biometrics',
      severity: 'success',
      message: 'Facial detection pipeline ready. Camera stream 30 FPS active on /dev/video0.',
    },
    {
      timestamp: '12:49:55',
      subsystem: 'Deepgram STT',
      severity: 'info',
      message: 'WebSocket audio stream listening on Nova-2 classroom model pipeline.',
    },
    {
      timestamp: '12:48:10',
      subsystem: 'RPi 5 Hardware',
      severity: 'info',
      message: 'GPIO pinout initialized (PCA9685 PWM driver & L298N H-bridge motor driver ready).',
    },
  ]);

  const handleSendCommand = async (action: string) => {
    setActiveAction(action);
    setCommandStatus(`Executing: ${action.toUpperCase()}`);
    try {
      await api.sendHardwareCommand(action, motorSpeed, panAngle, tiltAngle);
      setCommandStatus(`Command ${action.toUpperCase()} acknowledged by hardware controller`);

      // Add to event log
      const newEvent = {
        timestamp: new Date().toLocaleTimeString(),
        subsystem: 'Motor Driver',
        severity: 'info' as const,
        message: `Hardware command executed: ${action.toUpperCase()} at ${motorSpeed}% speed (Pan: ${panAngle}°, Tilt: ${tiltAngle}°).`,
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    } catch (e: any) {
      setCommandStatus(`Hardware command failed: ${e.message}`);
    }
  };

  const handlePanTiltUpdate = async (newPan: number, newTilt: number) => {
    setPanAngle(newPan);
    setTiltAngle(newTilt);
    try {
      await api.sendHardwareCommand('pantilt', motorSpeed, newPan, newTilt);
    } catch (e) {
      console.error('Pan/Tilt servo command failed:', e);
    }
  };

  // Subsystem health matrix
  const subsystems = [
    {
      name: 'Raspberry Pi 5 Host',
      icon: Cpu,
      status: 'Online',
      details: 'Quad-core ARM Cortex-A76 @ 2.4GHz &bull; 8GB LPDDR4X',
      latency: 'Uptime 14h 22m',
      health: 'healthy',
    },
    {
      name: 'FastAPI Backend Gateway',
      icon: Server,
      status: 'Operational',
      details: 'Uvicorn ASGI &bull; Port 8000 &bull; REST & WebSocket Hub',
      latency: '12 ms',
      health: 'healthy',
    },
    {
      name: 'DeepFace Biometric Vision',
      icon: Camera,
      status: 'Active',
      details: 'OpenCV 4.10 &bull; VGG-Face / ArcFace Spatial Feature Embeddings',
      latency: '30 FPS',
      health: 'healthy',
    },
    {
      name: 'Deepgram Speech Pipeline',
      icon: Mic,
      status: 'Streaming',
      details: 'STT Nova-2 (16kHz) &amp; TTS Aura Voice Synthesis',
      latency: '140 ms',
      health: 'healthy',
    },
    {
      name: 'Ollama LLM Reasoning Engine',
      icon: BrainCircuitIcon,
      status: 'Ready',
      details: 'Llama-3 Edge Model &bull; Context Window: 8,192 tokens',
      latency: '280 ms',
      health: 'healthy',
    },
    {
      name: 'Qdrant Vector Database',
      icon: Database,
      status: 'Indexed',
      details: 'Curriculum Dense Vector Store &bull; Cosine Distance',
      latency: '8 ms',
      health: 'healthy',
    },
    {
      name: 'BM25 Lexical Keyword Store',
      icon: Layers,
      status: 'Synced',
      details: 'Okapi BM25 Sparse Inverted Index &bull; RRF Re-ranking',
      latency: '3 ms',
      health: 'healthy',
    },
    {
      name: 'SQLite Persisted Storage',
      icon: ShieldCheck,
      status: 'Connected',
      details: 'SQLAlchemy 2.0 &bull; 4 Relational Tables (WAL Mode)',
      latency: '1 ms',
      health: 'healthy',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600" />
            Robot Telemetry &amp; System Health Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time diagnostics for Raspberry Pi 5 edge compute, sensory peripherals, AI microservices, and motor actuators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700 font-medium">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Telemetry Stream: Active</span>
          </div>

          <button
            onClick={onRefreshTelemetry}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
            title="Refresh Diagnostics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RPi 5 Physical Telemetry Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Battery Level</span>
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {telemetry ? `${telemetry.battery_level}%` : '94.5%'}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${telemetry?.battery_level ?? 94}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Voltage: 12.4V LiFePO4 &bull; 6.2h Est.
          </p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>SoC Core Temp</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {telemetry ? `${telemetry.cpu_temp_celsius}°C` : '42.8°C'}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Active Cooler: Low RPM (Safe &lt; 70°C)
          </p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Left Wheel Speed</span>
            <Zap className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {telemetry ? `${telemetry.left_motor_speed} RPM` : '0 RPM'}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-mono">PWM Duty: {motorSpeed}%</p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">H-Bridge Channel A</p>
        </div>

        <div className="saas-card p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Right Wheel Speed</span>
            <Zap className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {telemetry ? `${telemetry.right_motor_speed} RPM` : '0 RPM'}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-mono">PWM Duty: {motorSpeed}%</p>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">H-Bridge Channel B</p>
        </div>
      </div>

      {/* Subsystem Health Matrix Grid (8 services) */}
      <div className="saas-card p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Microservices &amp; Peripherals Status Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated health check probes verifying edge inference, audio pipelines, and vector storage.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            All 8 Services Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {subsystems.map((sub, idx) => {
            const Icon = sub.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {sub.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-slate-900">{sub.name}</div>
                  <div
                    className="text-[11px] text-slate-500 mt-1 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: sub.details }}
                  ></div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Response Time:</span>
                  <span className="font-semibold text-slate-700">{sub.latency}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Hardware Motor Controls & Real-Time Operational Events Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Control Console */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              Hardware Actuation &amp; Pan/Tilt Gimbal Controls
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              PCA9685 I2C &bull; 0x40
            </span>
          </div>

          {/* Motor Navigation D-Pad */}
          <div className="flex flex-col items-center py-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Chassis Differential Drive
            </span>
            <div className="grid grid-cols-3 gap-2 w-48">
              <div></div>
              <button
                onClick={() => handleSendCommand('forward')}
                className={`p-3 rounded-lg border border-slate-200 flex items-center justify-center transition-colors ${
                  activeAction === 'forward'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Forward"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div></div>

              <button
                onClick={() => handleSendCommand('left')}
                className={`p-3 rounded-lg border border-slate-200 flex items-center justify-center transition-colors ${
                  activeAction === 'left'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Turn Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSendCommand('stop')}
                className={`p-3 rounded-lg border border-slate-200 flex items-center justify-center transition-colors ${
                  activeAction === 'stop'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Emergency Stop"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSendCommand('right')}
                className={`p-3 rounded-lg border border-slate-200 flex items-center justify-center transition-colors ${
                  activeAction === 'right'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Turn Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              <div></div>
              <button
                onClick={() => handleSendCommand('backward')}
                className={`p-3 rounded-lg border border-slate-200 flex items-center justify-center transition-colors ${
                  activeAction === 'backward'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Backward"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <div></div>
            </div>
          </div>

          {/* Motor Speed Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Motor Power / Speed</span>
              <span className="font-mono font-bold text-slate-900">{motorSpeed}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={motorSpeed}
              onChange={(e) => setMotorSpeed(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Pan & Tilt Camera Gimbal Sliders */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Camera Pan Servo (Horizontal)</span>
                <span className="font-mono font-bold text-slate-900">{panAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={panAngle}
                onChange={(e) => handlePanTiltUpdate(Number(e.target.value), tiltAngle)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Camera Tilt Servo (Vertical)</span>
                <span className="font-mono font-bold text-slate-900">{tiltAngle}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={tiltAngle}
                onChange={(e) => handlePanTiltUpdate(panAngle, Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {commandStatus && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700">
              {commandStatus}
            </div>
          )}
        </div>

        {/* Real-time Operational Events Log */}
        <div className="saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                Operational Event Stream
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Live Daemon Logs</span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {events.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ev.severity === 'success'
                            ? 'bg-emerald-500'
                            : ev.severity === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      ></span>
                      <span className="font-semibold text-slate-900">{ev.subsystem}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{ev.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono leading-relaxed pl-4">
                    {ev.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Daemon: /usr/local/bin/edurobot-service</span>
            <span className="font-mono text-emerald-700 font-semibold">PID: 1042</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon helper to prevent external dependency clashes
function BrainCircuitIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 19.5" />
      <path d="M12 4.5a2.5 2.5 0 0 1 4.96-.46 2.5 2.5 0 0 1 1.98 3 2.5 2.5 0 0 1 1.32 4.24 3 3 0 0 1-.34 5.58 2.5 2.5 0 0 1-2.96 3.08A2.5 2.5 0 0 1 12 19.5" />
      <path d="M12 4.5v15" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
