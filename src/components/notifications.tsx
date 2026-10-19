import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Droplets, X, Clock3, Volume2 } from 'lucide-react';
import { playBySeverity } from '../utils/sound';
import type { AppAlert } from '../utils/alerts';

export interface Toast { id: string; title: string; message?: string; severity: 'success' | 'info' | 'warning' | 'danger' | 'water'; }
interface ToastCtx { push: (t: Omit<Toast, 'id'>, opts?: { sound?: boolean }) => void; }
const Ctx = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children, soundEnabled }: { children: React.ReactNode; soundEnabled: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const push = useCallback((t: Omit<Toast, 'id'>, opts?: { sound?: boolean }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-4), { ...t, id }]);
    if (soundEnabled && opts?.sound !== false) playBySeverity(t.severity);
    const timer = setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6500);
    timers.current.set(id, timer);
  }, [soundEnabled]);

  const close = (id: string) => { setToasts(prev => prev.filter(x => x.id !== id)); const tm = timers.current.get(id); if (tm) clearTimeout(tm); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const style: Record<Toast['severity'], string> = {
    success: 'border-emerald-300 bg-emerald-600',
    info: 'border-blue-300 bg-blue-600',
    warning: 'border-amber-300 bg-amber-500',
    danger: 'border-rose-300 bg-rose-600',
    water: 'border-cyan-300 bg-cyan-600',
  };
  const icon: Record<Toast['severity'], React.ReactNode> = {
    success: <CheckCircle2 size={19} />, info: <Bell size={19} />, warning: <AlertTriangle size={19} />, danger: <AlertTriangle size={19} />, water: <Droplets size={19} />,
  };

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-5 top-[74px] z-[100] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-2.5">
        {toasts.map(t => (
          <div key={t.id} className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 text-white shadow-2xl ${style[t.severity]}`}>
            <span className="mt-0.5 shrink-0">{icon[t.severity]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold leading-snug">{t.title}</p>
              {t.message && <p className="mt-0.5 text-[12px] leading-snug text-white/85">{t.message}</p>}
            </div>
            <button type="button" onClick={() => close(t.id)} className="btn-icon shrink-0 rounded-lg p-1 text-white/70 hover:bg-white/20 hover:text-white"><X size={15} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function NotificationBell({ alerts, go, autoBackupLabel }: { alerts: AppAlert[]; go: (p: string) => void; autoBackupLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const danger = alerts.filter(a => a.severity === 'danger').length;
  const sevCls: Record<AppAlert['severity'], string> = {
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    water: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const sevIcon: Record<AppAlert['severity'], React.ReactNode> = {
    danger: <AlertTriangle size={16} />, warning: <Clock3 size={16} />, water: <Droplets size={16} />, info: <Bell size={16} />,
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} className="btn-uniform relative !rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm" title="Notifications et alertes">
        <Bell size={17} />
        {alerts.length > 0 && <span className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white shadow ${danger > 0 ? 'animate-pulse bg-rose-500' : 'bg-amber-500'}`}>{alerts.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div><p className="text-[13.5px] font-extrabold">Centre d'alertes</p><p className="text-[11.5px] text-slate-300">{alerts.length} signalement{alerts.length > 1 ? 's' : ''} • {danger} retard{danger > 1 ? 's' : ''} urgent{danger > 1 ? 's' : ''}</p></div>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold"><Volume2 size={12} /> Son activé</span>
          </div>
          <div className="max-h-[380px] overflow-y-auto p-2.5">
            {alerts.length === 0 && <div className="px-3 py-8 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={30} /><p className="mt-2 text-[13px] font-bold text-slate-800">Tout est à jour</p><p className="text-[12px] text-slate-500">Aucun retard, aucun relevé en attente.</p></div>}
            {alerts.map(a => (
              <button type="button" key={a.id} onClick={() => { go(a.page); setOpen(false); }} className="btn-uniform mb-1.5 flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${sevCls[a.severity]}`}>{sevIcon[a.severity]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-[12.5px] font-extrabold text-slate-900">{a.title}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-extrabold ${sevCls[a.severity]}`}>{a.dateLabel}</span></span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{a.message}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11.5px] font-semibold text-slate-500">💾 {autoBackupLabel}</div>
        </div>
      )}
    </div>
  );
}
