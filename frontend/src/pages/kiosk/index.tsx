import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { Scan, Loader2, LogIn, LogOut, UserX, Monitor, Settings, X, Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type ScanResult = {
  uid: number;
  type: 'student' | 'personnel';
  name: string;
  detail: string;
  photo: string | null;
  direction: 'in' | 'out';
  log_time: string;
  date: string;
  kiosk_code?: string | null;
};

type SchoolInfo = {
  schoolName: string | null;
  logo: string | null;
  activeSchoolYear: string | null;
  activeSemester: string | null;
};

type KioskSlide = {
  id: number;
  title: string | null;
  subtitle: string | null;
  bg_color: string;
  image_url: string | null;
};

type KioskSettings = {
  id?: number;       // kiosks.id from DB (set after first registration)
  code: string;      // 8-char alphanumeric identifier (kiosk_code)
  name: string;      // human-readable kiosk name
  gate_label: string;
  direction_mode: 'auto' | 'force_in' | 'force_out';
  is_active: boolean;
  configuredAt: string;
};

type ScanStatus = 'idle' | 'processing' | 'error';

type DisplayLog = ScanResult & { addedAt: number };

function isSameCalendarDay(dateString: string, reference: Date) {
  const parsed = new Date(dateString);
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === reference.getFullYear()
    && parsed.getMonth() === reference.getMonth()
    && parsed.getDate() === reference.getDate();
}

// ── Small hooks ────────────────────────────────────────────────────────────────

// Generate a random 8-character alphanumeric kiosk code
function generateKioskCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const SETTINGS_KEY = 'kiosk_settings';

function loadKioskSettings(): KioskSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveKioskSettings(settings: KioskSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useSchoolInfo() {
  const [info, setInfo] = useState<SchoolInfo | null>(null);
  useEffect(() => {
    axios.get(`${API_BASE}/school-info`)
      .then(r => setInfo(r.data?.data ?? null))
      .catch(() => {});
  }, []);
  return info;
}

function useKioskSlides() {
  const [slides, setSlides] = useState<KioskSlide[]>([]);
  useEffect(() => {
    axios.get(`${API_BASE}/kiosk/slides`)
      .then(r => setSlides(r.data ?? []))
      .catch(() => {});
  }, []);
  return slides;
}

// ── Slideshow ──────────────────────────────────────────────────────────────────

function KioskSlideshow({ slides }: { slides: KioskSlide[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[idx] ?? { bg_color: '#0f172a', title: null, subtitle: null, image_url: null };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: slide.bg_color,
        backgroundImage: slide.image_url ? `url(${slide.image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center px-12 max-w-3xl">
        {slide.title && (
          <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">{slide.title}</h2>
        )}
        {slide.subtitle && (
          <p className="mt-4 text-xl text-white/80 drop-shadow">{slide.subtitle}</p>
        )}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`block h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      )}
      <p className="absolute top-4 right-6 text-xs text-white/40">Tap or scan to dismiss</p>
    </div>
  );
}

// ── Kiosk Settings Dialog ──────────────────────────────────────────────────────

const DIRECTION_OPTIONS = [
  { value: 'auto',       label: 'Auto (toggle based on last log)' },
  { value: 'force_in',   label: 'Force Time-In (always logs IN)' },
  { value: 'force_out',  label: 'Force Time-Out (always logs OUT)' },
] as const;

function KioskSettingsDialog({
  current,
  onSave,
  onClose,
}: {
  current: KioskSettings | null;
  onSave: (s: KioskSettings) => void;
  onClose: () => void;
}) {
  const [step, setStep]               = useState<'auth' | 'settings'>('auth');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [authErr, setAuthErr]         = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [adminToken, setAdminToken]   = useState('');

  const [code, setCode]             = useState(current?.code          ?? generateKioskCode());
  const [name, setName]             = useState(current?.name          ?? '');
  const [gateLabel, setGateLabel]   = useState(current?.gate_label    ?? 'Main Entrance');
  const [dirMode, setDirMode]       = useState<KioskSettings['direction_mode']>(current?.direction_mode ?? 'auto');
  const [isActive, setIsActive]     = useState<boolean>(current?.is_active ?? true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [saved, setSaved]           = useState(false);

  const verify = async () => {
    if (!username.trim() || !password.trim()) {
      setAuthErr('Enter admin username and password.');
      return;
    }
    setAuthLoading(true);
    setAuthErr('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, { username, password });
      if (data.user?.access !== 'Administrator') {
        setAuthErr('Only Administrators can configure this kiosk.');
        return;
      }
      setAdminToken(data.token);
      setStep('settings');
    } catch {
      setAuthErr('Invalid credentials. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = async () => {
    if (code.length < 6) return;
    setSaveLoading(true);
    setSaveErr('');
    try {
      const payload = {
        kiosk_code:     code.toUpperCase().slice(0, 8),
        name:           name.trim() || 'Kiosk',
        gate_label:     gateLabel.trim() || 'Main Entrance',
        direction_mode: dirMode,
        is_active:      isActive,
      };
      const { data } = await axios.post(
        `${API_BASE}/admin/kiosk-management/device-register`,
        payload,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      const settings: KioskSettings = {
        id:             data.id,
        code:           data.kiosk_code,
        name:           data.name,
        gate_label:     data.gate_label,
        direction_mode: data.direction_mode,
        is_active:      data.is_active,
        configuredAt:   new Date().toISOString(),
      };
      saveKioskSettings(settings);
      onSave(settings);
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Failed to save settings.')
        : 'Network error.';
      setSaveErr(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl p-6" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Kiosk Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'auth' ? (
          /* Admin auth gate */
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Enter Administrator credentials to configure this kiosk.</p>
            <div className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Admin username"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && verify()}
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Admin password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                  onKeyDown={e => e.key === 'Enter' && verify()}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {authErr && <p className="text-xs text-red-400">{authErr}</p>}
            <button onClick={verify} disabled={authLoading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {authLoading ? 'Verifying…' : 'Unlock Settings'}
            </button>
          </div>
        ) : saved ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <p className="text-sm text-gray-300 font-medium">Settings saved successfully.</p>
          </div>
        ) : (
          /* Settings form — mirrors the admin "New Kiosk" form */
          <div className="space-y-4">
            {/* Kiosk Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Kiosk Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Main Gate Kiosk"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Gate Label */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Gate Label</label>
              <input
                type="text"
                value={gateLabel}
                onChange={e => setGateLabel(e.target.value)}
                placeholder="e.g. Main Entrance"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Direction Mode */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Direction Mode</label>
              <select
                value={dirMode}
                onChange={e => setDirMode(e.target.value as KioskSettings['direction_mode'])}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DIRECTION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Active</p>
                <p className="text-xs text-gray-500">Inactive kiosks ignore direction_mode settings</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {/* Kiosk ID (generated) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Kiosk ID (auto-generated)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase tracking-widest"
                  maxLength={8}
                  placeholder="8 characters"
                />
                <button type="button" onClick={() => setCode(generateKioskCode())} title="Regenerate"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">Used to trace attendance log origin. Stored in the database.</p>
            </div>
            {current?.configuredAt && (
              <p className="text-xs text-gray-600">Last configured: {new Date(current.configuredAt).toLocaleString()}</p>
            )}
            {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={code.length < 6 || saveLoading}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {saveLoading ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Log entry card ─────────────────────────────────────────────────────────────

function LogEntry({ log, fresh }: { log: ScanResult; fresh?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors duration-500 ${
      fresh
        ? log.direction === 'in' ? 'border-green-700 bg-green-950/60' : 'border-blue-700 bg-blue-950/60'
        : 'border-gray-700 bg-gray-900'
    }`}>
      <div className="flex-shrink-0">
        {log.photo ? (
          <img src={log.photo} alt="" className="h-11 w-11 rounded-full object-cover border-2 border-gray-600" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300 border-2 border-gray-600">
            {log.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate leading-tight">{log.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{log.detail}</p>
        <p className="text-xs text-gray-500 mt-0.5">{log.date} · {log.log_time}</p>
      </div>
      <div className="flex-shrink-0">
        {log.direction === 'in' ? (
          <span className="flex items-center gap-1 rounded-full bg-green-900/80 px-2 py-1 text-xs font-bold text-green-400">
            <LogIn className="h-3 w-3" /> IN
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-blue-900/80 px-2 py-1 text-xs font-bold text-blue-400">
            <LogOut className="h-3 w-3" /> OUT
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

let uidCounter = 0;

export default function KioskPage() {
  const [searchParams] = useSearchParams();
  const kioskCodeParam = searchParams.get('kiosk_code') ?? undefined;

  const [scanStatus, setScanStatus]       = useState<ScanStatus>('idle');
  const [errorMsg, setErrorMsg]           = useState('');
  const [recentLogs, setRecentLogs]       = useState<DisplayLog[]>([]);
  const [freshUid, setFreshUid]           = useState<number | null>(null);
  const [bufferInput, setBufferInput]     = useState('');
  const [manualId, setManualId]           = useState('');
  const [isIdle, setIsIdle]               = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [kioskSettings, setKioskSettings] = useState<KioskSettings | null>(() => loadKioskSettings());

  const inputRef       = useRef<HTMLInputElement>(null);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now    = useCurrentTime();
  const school = useSchoolInfo();
  const slides = useKioskSlides();

  // The effective kiosk_code: prefer URL param, fall back to saved settings
  const effectiveKioskCode = kioskCodeParam ?? kioskSettings?.code ?? undefined;

  // Fetch initial recent logs on mount — only logs from this kiosk
  useEffect(() => {
    const params = effectiveKioskCode ? `?limit=5&kiosk_code=${effectiveKioskCode}` : '?limit=5';
    axios.get(`${API_BASE}/kiosk/recent-logs${params}`)
      .then(r => {
        const today = new Date();
        const logs = (r.data ?? [])
          .map((l: Omit<ScanResult, 'uid'>): DisplayLog => ({ ...l, uid: ++uidCounter, addedAt: Date.now() }))
          .filter((log: DisplayLog) => isSameCalendarDay(log.date, today));
        setRecentLogs(logs);
      })
      .catch(() => {});
  }, [effectiveKioskCode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRecentLogs(current => current.filter(log => Date.now() - log.addedAt < 30_000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Idle timer — reset on any user activity
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 10_000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'] as const;
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Auto-focus hidden barcode input when not idle
  useEffect(() => {
    if (!isIdle) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isIdle]);

  // Scan submit
  const submitCode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    resetIdleTimer();
    const spinnerTimer = setTimeout(() => setScanStatus('processing'), 120);

    try {
      const payload: Record<string, unknown> = { code: trimmed };
      if (kioskCodeParam) payload.kiosk_code = kioskCodeParam;
      const currentSettings = loadKioskSettings();
      if (currentSettings?.code && !payload.kiosk_code) payload.kiosk_code = currentSettings.code;

      const { data } = await axios.post(`${API_BASE}/kiosk/scan`, payload);
      clearTimeout(spinnerTimer);
      setScanStatus('idle');

      const uid = ++uidCounter;
      const entry: DisplayLog = { ...data, uid, addedAt: Date.now() };
      setFreshUid(uid);
      setRecentLogs(prev => [entry, ...prev]
        .filter(log => isSameCalendarDay(log.date, new Date()))
        .slice(0, 5));
      setTimeout(() => setFreshUid(null), 4000);
    } catch (err: unknown) {
      clearTimeout(spinnerTimer);
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'ID not recognized.')
        : 'Network error.';
      setErrorMsg(msg);
      setScanStatus('error');
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setScanStatus('idle');
        setErrorMsg('');
      }, 3500);
    }
  }, [kioskCodeParam, resetIdleTimer]);

  // Barcode scanner keyboard wedge
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    resetIdleTimer();
    if (e.key === 'Enter') {
      const code = bufferInput.trim();
      setBufferInput('');
      if (code) submitCode(code);
      return;
    }
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    bufferTimerRef.current = setTimeout(() => setBufferInput(''), 500);
  }, [bufferInput, submitCode, resetIdleTimer]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden select-none">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-gray-950 z-20">
        <div className="flex items-center gap-3">
          {school?.logo && (
            <img src={school.logo} alt="School logo"
              className="h-12 w-12 rounded-full object-contain bg-white p-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-base font-semibold text-gray-200 leading-tight">
              {school?.schoolName ?? 'Attendance Kiosk'}
            </p>
            {(school?.activeSchoolYear || school?.activeSemester) && (
              <p className="text-xs text-gray-500">
                {[school.activeSemester, school.activeSchoolYear ? `S.Y. ${school.activeSchoolYear}` : null]
                  .filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-4xl font-mono font-bold tabular-nums leading-none">
              {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl border border-gray-700 bg-gray-800 p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Kiosk Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Idle slideshow overlay */}
        {isIdle && slides.length > 0 && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={resetIdleTimer}>
            <KioskSlideshow slides={slides} />
          </div>
        )}

        {/* 2/3 — Scan panel */}
        <div className="flex-[2] flex flex-col items-center justify-center p-10 border-r border-gray-800">

          {/* Hidden barcode buffer input */}
          <input
            ref={inputRef}
            type="text"
            value={bufferInput}
            onChange={e => setBufferInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            aria-hidden="true"
            autoFocus
            autoComplete="off"
          />

          {/* Scan icon area */}
          <div className="flex flex-col items-center gap-5 text-center">
            <div className={`rounded-full p-10 transition-all duration-300 ${
              scanStatus === 'processing' ? 'bg-blue-900/50 ring-4 ring-blue-500/40 animate-pulse' :
              scanStatus === 'error'      ? 'bg-red-900/50 ring-4 ring-red-500/40' :
                                           'bg-gray-800'
            }`}>
              {scanStatus === 'processing' ? (
                <Loader2 className="h-24 w-24 text-blue-400 animate-spin" />
              ) : scanStatus === 'error' ? (
                <UserX className="h-24 w-24 text-red-400" />
              ) : (
                <Scan className="h-24 w-24 text-gray-400" />
              )}
            </div>

            {scanStatus === 'error' ? (
              <div className="space-y-1">
                <p className="text-xl font-semibold text-red-400">Scan Failed</p>
                <p className="text-sm text-gray-400 max-w-xs">{errorMsg}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-gray-300">
                  {scanStatus === 'processing' ? 'Verifying…' : 'Scan Your ID'}
                </p>
                <p className="text-sm text-gray-500">Place your ID card in front of the scanner</p>
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="mt-8 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <p className="mb-2 text-center text-xs uppercase tracking-wider text-gray-600">Manual Entry</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualId}
                onChange={e => { setManualId(e.target.value); resetIdleTimer(); }}
                onKeyDown={e => {
                  resetIdleTimer();
                  if (e.key === 'Enter' && manualId.trim()) {
                    submitCode(manualId.trim());
                    setManualId('');
                  }
                }}
                placeholder="Enter ID number…"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => { if (manualId.trim()) { submitCode(manualId.trim()); setManualId(''); } }}
                disabled={!manualId.trim()}
                className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Log
              </button>
            </div>
          </div>
        </div>

        {/* 1/3 — Recent logs panel */}
        <div className="w-1/3 flex flex-col p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Monitor className="h-4 w-4 text-gray-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Logs</h2>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-600">
                <Scan className="h-8 w-8 opacity-30" />
                <p className="text-xs">No logs yet today.<br />Scan an ID to get started.</p>
              </div>
            ) : (
              recentLogs.map(log => (
                <LogEntry key={log.uid} log={log} fresh={log.uid === freshUid} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-gray-800 py-2.5 text-center text-xs text-gray-600 z-20">
        USB Barcode / QR Code Scanner supported &nbsp;·&nbsp; Type ID + Enter for manual entry
        {kioskSettings ? (
          <span className="ml-3 text-gray-500 font-mono">{kioskSettings.code}{kioskSettings.name ? ` · ${kioskSettings.name}` : ''}</span>
        ) : kioskCodeParam ? (
          <span className="ml-3 text-gray-700 font-mono">{kioskCodeParam}</span>
        ) : (
          <span className="ml-3 text-gray-700 italic">Not configured — click ⚙ to set up</span>
        )}
      </footer>

      {/* ── SETTINGS DIALOG ─────────────────────────────────────────────────── */}
      {showSettings && (
        <KioskSettingsDialog
          current={kioskSettings}
          onSave={s => setKioskSettings(s)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

