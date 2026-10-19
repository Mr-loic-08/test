import React from 'react';
import type { PaymentStatus } from '../types';
import { statusLabel } from '../utils/helpers';
import { X } from 'lucide-react';
import { playClick } from '../utils/sound';

export type TableTheme = 'blue' | 'teal' | 'violet' | 'amber' | 'slate' | 'rose' | 'emerald';
export const TABLE_THEMES: Record<TableTheme, { head: string; accent: string; stripe: string; hover: string }> = {
  blue: { head: 'bg-blue-600 text-white', accent: 'text-blue-700', stripe: 'even:bg-blue-50/40', hover: 'hover:bg-blue-50' },
  teal: { head: 'bg-cyan-600 text-white', accent: 'text-cyan-700', stripe: 'even:bg-cyan-50/40', hover: 'hover:bg-cyan-50' },
  violet: { head: 'bg-violet-600 text-white', accent: 'text-violet-700', stripe: 'even:bg-violet-50/40', hover: 'hover:bg-violet-50' },
  amber: { head: 'bg-amber-500 text-white', accent: 'text-amber-700', stripe: 'even:bg-amber-50/50', hover: 'hover:bg-amber-50' },
  slate: { head: 'bg-slate-700 text-white', accent: 'text-slate-700', stripe: 'even:bg-slate-50', hover: 'hover:bg-slate-50' },
  rose: { head: 'bg-rose-600 text-white', accent: 'text-rose-700', stripe: 'even:bg-rose-50/40', hover: 'hover:bg-rose-50' },
  emerald: { head: 'bg-emerald-600 text-white', accent: 'text-emerald-700', stripe: 'even:bg-emerald-50/40', hover: 'hover:bg-emerald-50' },
};

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-uniform overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_10px_rgba(15,35,70,0.06)] ${className}`}>{children}</div>;
}
export function CardHeader({ title, subtitle, action, theme = 'blue' }: { title: string; subtitle?: string; action?: React.ReactNode; theme?: TableTheme }) {
  const bar: Record<TableTheme, string> = { blue: 'bg-blue-600', teal: 'bg-cyan-500', violet: 'bg-violet-500', amber: 'bg-amber-500', slate: 'bg-slate-500', rose: 'bg-rose-500', emerald: 'bg-emerald-500' };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3"><span className={`mt-1 h-9 w-1.5 shrink-0 rounded-full ${bar[theme]}`} /><div><h3 className="text-[15px] font-extrabold tracking-tight text-slate-900">{title}</h3>{subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}</div></div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent = 'blue' }: { label: string; value: string; sub?: string; icon?: React.ReactNode; accent?: 'blue' | 'green' | 'red' | 'amber' | 'teal' | 'violet' }) {
  const accents: Record<string, string> = { blue: 'from-blue-500 to-blue-700 shadow-blue-200', green: 'from-emerald-500 to-emerald-700 shadow-emerald-200', red: 'from-rose-500 to-rose-700 shadow-rose-200', amber: 'from-amber-500 to-amber-600 shadow-amber-200', teal: 'from-cyan-500 to-teal-600 shadow-cyan-200', violet: 'from-violet-500 to-violet-700 shadow-violet-200' };
  const top: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-emerald-500', red: 'bg-rose-500', amber: 'bg-amber-500', teal: 'bg-cyan-500', violet: 'bg-violet-500' };
  return (
    <div className="card-uniform group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_10px_rgba(15,35,70,0.06)]">
      <span className={`absolute inset-x-0 top-0 h-1 ${top[accent]}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1.5 truncate text-[21px] font-extrabold tracking-tight text-slate-900">{value}</p>{sub && <p className="mt-1 text-[12px] leading-snug text-slate-500">{sub}</p>}</div>
        {icon && <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${accents[accent]}`}>{icon}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  const styles: Record<PaymentStatus, string> = { PAYE: 'bg-emerald-50 text-emerald-700 border-emerald-300', INCOMPLET: 'bg-amber-50 text-amber-700 border-amber-300', NON_PAYE: 'bg-rose-50 text-rose-700 border-rose-300' };
  const dot: Record<PaymentStatus, string> = { PAYE: 'bg-emerald-500', INCOMPLET: 'bg-amber-500 animate-pulse', NON_PAYE: 'bg-rose-500 animate-pulse' };
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-extrabold shadow-sm ${pad} ${styles[status]}`}><span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />{statusLabel(status)}</span>;
}

export function Pill({ children, color = 'slate' }: { children: React.ReactNode; color?: 'slate' | 'blue' | 'green' | 'red' | 'amber' | 'violet' | 'teal' }) {
  const map: Record<string, string> = { slate: 'bg-slate-100 text-slate-700 border-slate-200', blue: 'bg-blue-50 text-blue-700 border-blue-200', green: 'bg-emerald-50 text-emerald-700 border-emerald-200', red: 'bg-rose-50 text-rose-700 border-rose-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', violet: 'bg-violet-50 text-violet-700 border-violet-200', teal: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold ${map[color]}`}>{children}</span>;
}

/** Bouton UNIFORMISÉ — même rayon, ombre, hover (soulèvement + brillance), active, focus partout */
export function Btn({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, type = 'button', sound = true }: { children: React.ReactNode; onClick?: (e?: React.MouseEvent) => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'teal' | 'dark'; size?: 'sm' | 'md' | 'lg'; className?: string; disabled?: boolean; type?: 'button' | 'submit'; sound?: boolean }) {
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:from-blue-600 hover:to-blue-800 focus:ring-blue-400 border border-blue-700/40',
    secondary: 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:border-blue-300 hover:text-blue-700 focus:ring-blue-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300 border border-transparent',
    danger: 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_4px_14px_rgba(225,29,72,0.32)] hover:from-rose-600 hover:to-rose-800 focus:ring-rose-400 border border-rose-700/40',
    success: 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_4px_14px_rgba(5,150,105,0.32)] hover:from-emerald-600 hover:to-emerald-800 focus:ring-emerald-400 border border-emerald-700/40',
    teal: 'bg-gradient-to-b from-cyan-500 to-teal-600 text-white shadow-[0_4px_14px_rgba(8,145,178,0.32)] hover:from-cyan-600 hover:to-teal-700 focus:ring-cyan-400 border border-teal-700/40',
    dark: 'bg-gradient-to-b from-slate-700 to-slate-900 text-white shadow-md hover:from-slate-800 hover:to-black focus:ring-slate-400 border border-slate-900/50',
  };
  const sizes: Record<string, string> = { sm: 'px-3.5 py-2 text-[12.5px]', md: 'px-4.5 py-2.5 text-[13.5px]', lg: 'px-5 py-3 text-[14px]' };
  return (
    <button type={type} disabled={disabled} onClick={(e) => { if (sound) playClick(); onClick?.(e); }} className={`btn-uniform inline-flex items-center justify-center gap-2 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}>{children}</button>
  );
}

/** Bouton icône uniformisé (actions tableaux) */
export function IconBtn({ children, onClick, title, tone = 'slate' }: { children: React.ReactNode; onClick?: () => void; title?: string; tone?: 'blue' | 'rose' | 'emerald' | 'slate' | 'amber' }) {
  const tones: Record<string, string> = { blue: 'hover:bg-blue-600 hover:border-blue-600', rose: 'hover:bg-rose-600 hover:border-rose-600', emerald: 'hover:bg-emerald-600 hover:border-emerald-600', slate: 'hover:bg-slate-700 hover:border-slate-700', amber: 'hover:bg-amber-500 hover:border-amber-500' };
  return <button type="button" title={title} onClick={() => { playClick(); onClick?.(); }} className={`btn-uniform btn-icon inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-white ${tones[tone]}`}>{children}</button>;
}

/** Bouton filtre / onglet uniformisé */
export function FilterBtn({ active, children, onClick, color = 'blue' }: { active: boolean; children: React.ReactNode; onClick: () => void; color?: 'blue' | 'teal' | 'violet' | 'slate' }) {
  const activeCls: Record<string, string> = { blue: 'bg-blue-600 border-blue-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]', teal: 'bg-cyan-600 border-cyan-700 text-white shadow-[0_4px_12px_rgba(8,145,178,0.35)]', violet: 'bg-violet-600 border-violet-700 text-white shadow-[0_4px_12px_rgba(124,58,237,0.35)]', slate: 'bg-slate-800 border-slate-900 text-white shadow-md' };
  return <button type="button" onClick={() => { playClick(); onClick(); }} className={`btn-uniform rounded-full border px-4 py-2 text-[12.5px] font-bold ${active ? activeCls[color] : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700'}`}>{children}</button>;
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[12.5px] font-bold text-slate-700">{label}</span>{children}</label>;
}
export const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 shadow-sm placeholder:text-slate-400 transition-all hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100';
export const selectCls = inputCls;

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-2xl' }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" onClick={onClose} />
      <div className={`modal-in relative max-h-[92vh] w-full ${width} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div><h2 className="text-[16px] font-extrabold tracking-tight text-slate-900">{title}</h2>{subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}</div>
          <button type="button" onClick={onClose} className="btn-uniform btn-icon rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-sm hover:bg-rose-600 hover:text-white"><X size={17} /></button>
        </div>
        <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg></div>
      <p className="mt-3 text-[14px] font-extrabold text-slate-800">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-[12.5px] text-slate-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: 'blue' | 'green' | 'amber' | 'red' | 'teal' }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const colors: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', teal: 'bg-cyan-500' };
  return <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner"><div className={`h-full rounded-full transition-all duration-700 ${colors[color]}`} style={{ width: `${pct}%` }} /></div>;
}
export function SectionTitle({ children }: { children: React.ReactNode }) { return <h4 className="mb-3 text-[12px] font-extrabold uppercase tracking-wider text-slate-500">{children}</h4>; }

/** Tableau harmonisé : en-tête coloré par module, lignes zébrées, hover, pied de tableau */
export function DataTable({ theme = 'blue', columns, children, footer, minWidth = '900px' }: { theme?: TableTheme; columns: string[]; children: React.ReactNode; footer?: React.ReactNode; minWidth?: string }) {
  const t = TABLE_THEMES[theme];
  return (
    <div className="overflow-x-auto">
      <table className="app-table w-full text-left" style={{ minWidth }}>
        <thead><tr className={`${t.head} text-[11px] font-extrabold uppercase tracking-wider shadow-sm`}>{columns.map((c, i) => <th key={i} className={`px-4 py-3.5 ${i === 0 ? 'pl-5 rounded-tl-none' : ''} whitespace-nowrap`}>{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {footer}
    </div>
  );
}
export function Tr({ theme = 'blue', overdue, children }: { theme?: TableTheme; overdue?: boolean; children: React.ReactNode }) {
  const t = TABLE_THEMES[theme];
  return <tr className={`${overdue ? 'bg-rose-50/80 hover:bg-rose-100/70' : `${t.stripe} ${t.hover}`} transition-colors duration-150`}>{children}</tr>;
}
export function Td({ children, className = '', strong }: { children: React.ReactNode; className?: string; strong?: boolean }) {
  return <td className={`px-4 py-3 text-[13px] ${strong ? 'font-bold text-slate-900' : 'text-slate-600'} ${className}`}>{children}</td>;
}
