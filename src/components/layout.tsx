import React from 'react';
import { LayoutDashboard, Building2, Users, FileText, Banknote, Droplets, CreditCard, Wrench, FolderOpen, BarChart3, Save, Settings, Search, WifiOff, Database, ShieldCheck, Home, History } from 'lucide-react';
import { NotificationBell } from './notifications';
import type { AppAlert } from '../utils/alerts';
import { playClick } from '../utils/sound';

export type PageKey = 'dashboard' | 'properties' | 'tenants' | 'contracts' | 'rents' | 'water' | 'payments' | 'maintenance' | 'documents' | 'reports' | 'backup' | 'settings' | 'history';

export const HOUSING_IMG = './images/residence.jpg';
export const HOUSING_IMG_SIDEBAR = './images/residence-sidebar.jpg';

const NAV: { key: PageKey; label: string; icon: React.ReactNode; group: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={17} />, group: 'Pilotage' },
  { key: 'properties', label: 'Biens', icon: <Building2 size={17} />, group: 'Patrimoine' },
  { key: 'tenants', label: 'Locataires', icon: <Users size={17} />, group: 'Patrimoine' },
  { key: 'contracts', label: 'Contrats', icon: <FileText size={17} />, group: 'Patrimoine' },
  { key: 'rents', label: 'Loyers', icon: <Banknote size={17} />, group: 'Finances' },
  { key: 'water', label: 'Eau / Compteurs', icon: <Droplets size={17} />, group: 'Finances' },
  { key: 'payments', label: 'Paiements', icon: <CreditCard size={17} />, group: 'Finances' },
  { key: 'maintenance', label: 'Maintenance', icon: <Wrench size={17} />, group: 'Suivi' },
  { key: 'documents', label: 'Documents', icon: <FolderOpen size={17} />, group: 'Suivi' },
  { key: 'reports', label: 'Rapports', icon: <BarChart3 size={17} />, group: 'Suivi' },
  { key: 'backup', label: 'Sauvegarde', icon: <Save size={17} />, group: 'Système' },
  { key: 'history', label: 'Historique', icon: <History size={17} />, group: 'Système' },
  { key: 'settings', label: 'Paramètres', icon: <Settings size={17} />, group: 'Système' },
];

export function Sidebar({ page, setPage, counts, autoBackupLabel, occupiedLabel }: { page: PageKey; setPage: (p: PageKey) => void; counts: Record<string, number>; autoBackupLabel: string; occupiedLabel: string }) {
  let lastGroup = '';
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col overflow-hidden text-slate-200 shadow-2xl">
      {/* Image de logement en fond du panneau */}
      <div className="absolute inset-0">
        <img src={HOUSING_IMG_SIDEBAR} alt="Résidence — logements gérés" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1730]/92 via-[#102344]/94 to-[#0a1428]/97" />
        <div className="absolute inset-0 bg-[radial-gradient(600px_240px_at_20%_0%,rgba(59,130,246,0.28),transparent_65%)]" />
      </div>

      <div className="relative flex items-center gap-3 px-5 pb-4 pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-lg shadow-blue-950/50 ring-1 ring-white/25">
          <Home size={21} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-extrabold leading-tight tracking-tight text-white drop-shadow">Gestion Locative</p>
          <p className="text-[11px] font-medium text-blue-200/90">Bailleur • Desktop hors-ligne</p>
        </div>
      </div>

      {/* Bandeau photo résidence */}
      <div className="relative mx-4 mb-3 overflow-hidden rounded-2xl ring-1 ring-white/20">
        <img src={HOUSING_IMG} alt="Immeuble résidentiel moderne" className="h-[86px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
          <div><p className="text-[12px] font-extrabold text-white drop-shadow">Résidence Les Palmiers</p><p className="text-[10.5px] text-blue-100">{occupiedLabel}</p></div>
          <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">EN GESTION</span>
        </div>
      </div>

      <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {NAV.map(item => {
          const active = page === item.key;
          const badge = counts[item.key];
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <React.Fragment key={item.key}>
              {header && <p className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-200/60">{header}</p>}
              <button type="button" onClick={() => { playClick(); setPage(item.key); }} className={`btn-uniform group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold ${active ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/50 ring-1 ring-white/20' : 'text-slate-200/90 hover:bg-white/10 hover:text-white'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all group-hover:scale-110 ${active ? 'bg-white/20 text-white' : 'bg-white/8 text-blue-200'}`}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {badge !== undefined && badge > 0 && <span className={`pulse-danger rounded-full px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow ${item.key === 'water' ? 'bg-cyan-500' : 'bg-rose-500'}`}>{badge}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="relative border-t border-white/12 p-3.5">
        <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11.5px] font-bold text-emerald-300"><WifiOff size={13} /> Hors ligne • <span className="flex items-center gap-1 text-slate-200"><Database size={12} /> Stockage local</span></div>
          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-blue-100/85"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300" /><span>{autoBackupLabel}</span></div>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, subtitle, search, setSearch, landlordName, alerts, go, autoBackupLabel, lastSavedLabel }: { title: string; subtitle: string; search: string; setSearch: (s: string) => void; landlordName: string; alerts: AppAlert[]; go: (p: PageKey) => void; autoBackupLabel: string; lastSavedLabel: string }) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 shadow-[0_2px_14px_rgba(15,35,70,0.05)] backdrop-blur-md">
      <div className="flex items-center gap-3.5 px-6 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="truncate text-[12px] capitalize text-slate-500">{subtitle} • {today} • <span className="font-semibold normal-case text-emerald-600">● {lastSavedLabel}</span></p>
        </div>
        <div className="relative hidden w-[300px] lg:block">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un locataire, un bien, un contrat…" className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-[13px] shadow-inner outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
        </div>
        <NotificationBell alerts={alerts} go={(p) => go(p as PageKey)} autoBackupLabel={autoBackupLabel} />
        <div className="btn-uniform flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-950 text-[12px] font-extrabold text-white">{landlordName.charAt(0)}</div>
          <div className="leading-tight"><p className="max-w-[130px] truncate text-[12.5px] font-extrabold text-slate-800">{landlordName}</p><p className="text-[11px] text-slate-500">Bailleur</p></div>
        </div>
      </div>
    </header>
  );
}
