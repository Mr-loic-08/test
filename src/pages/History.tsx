import { useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, CalendarClock, Eye, FileClock, Filter, LockKeyhole, Pencil, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/store';
import type { AuditAction, AuditEntry } from '../types';
import { auditCutoff } from '../utils/audit';
import { downloadFile, formatDate, formatDateTime, toCSV } from '../utils/helpers';
import { Btn, Card, CardHeader, EmptyState, Field, inputCls, Modal, Pill } from '../components/ui';

const ACTIONS: Record<AuditAction, string> = {
  creation: 'Création', modification: 'Modification', suppression: 'Suppression d’une donnée',
  enregistrement: 'Enregistrement', sauvegarde: 'Sauvegarde', export: 'Exportation',
  restauration: 'Restauration', consultation: 'Consultation',
};
const TONES: Record<AuditAction, 'blue' | 'amber' | 'red' | 'green' | 'teal' | 'violet' | 'slate'> = {
  creation: 'blue', modification: 'amber', suppression: 'red', enregistrement: 'green',
  sauvegarde: 'teal', export: 'violet', restauration: 'teal', consultation: 'slate',
};

export default function History({ search = '' }: { search?: string }) {
  const { state, logAction } = useStore();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(30);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const modules = [...new Set(state.auditLog.map(entry => entry.module))].sort((a, b) => a.localeCompare(b, 'fr'));
  const filtered = useMemo(() => state.auditLog.filter(entry => {
    const words = `${query} ${search}`.toLocaleLowerCase('fr').trim().split(/\s+/).filter(Boolean);
    const content = `${entry.module} ${entry.target} ${entry.details} ${entry.actor} ${ACTIONS[entry.action]} ${entry.changes?.map(c => c.field).join(' ') || ''}`.toLocaleLowerCase('fr');
    return words.every(word => content.includes(word)) && (moduleFilter === 'all' || entry.module === moduleFilter)
      && (actionFilter === 'all' || entry.action === actionFilter)
      && (!from || entry.timestamp.slice(0, 10) >= from) && (!to || entry.timestamp.slice(0, 10) <= to);
  }), [state.auditLog, search, query, moduleFilter, actionFilter, from, to]);

  const exportHistory = () => {
    const rows = filtered.map(entry => ({
      Date_heure: formatDateTime(entry.timestamp), Action: ACTIONS[entry.action], Module: entry.module,
      Element: entry.target, Details: entry.details, Bailleur: entry.actor,
      Modifications: entry.changes?.map(c => `${c.field}: ${c.before} -> ${c.after}`).join(' | ') || '',
    }));
    downloadFile(`historique-actions-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv');
    logAction({ action: 'export', module: 'Historique', target: 'Journal d’activité (CSV)', details: `${rows.length} action(s) exportée(s) en CSV.` });
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><Activity size={21} /></div>
            <div><h2 className="text-[18px] font-extrabold">Historique des actions</h2><p className="mt-1 max-w-[680px] text-[12.5px] text-blue-100">Chaque création, modification, enregistrement, paiement, sauvegarde et restauration est tracé. Les changements de valeurs sont consultables dans le détail.</p></div>
          </div>
          <Btn variant="secondary" onClick={exportHistory} disabled={!filtered.length}><ArrowDownToLine size={15} /> Exporter le journal (CSV)</Btn>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-bold">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><LockKeyhole size={13} /> Aucune suppression manuelle</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><CalendarClock size={13} /> Effacement automatique après 3 mois</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><ShieldCheck size={13} /> {state.auditLog.length} action(s) conservée(s)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Actions conservées</p><p className="mt-1 text-[24px] font-extrabold text-blue-700">{state.auditLog.length}</p></div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Modifications</p><p className="mt-1 text-[24px] font-extrabold text-amber-700">{state.auditLog.filter(e => e.action === 'modification').length}</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Enregistrements</p><p className="mt-1 text-[24px] font-extrabold text-emerald-700">{state.auditLog.filter(e => e.action === 'creation' || e.action === 'enregistrement').length}</p></div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Conservation depuis le</p><p className="mt-2 text-[17px] font-extrabold text-violet-700">{formatDate(auditCutoff().toISOString())}</p></div>
      </div>

      <Card>
        <CardHeader theme="slate" title="Journal chronologique" subtitle="Lecture seule. Les actions antérieures à l’installation du journal ne peuvent pas être reconstituées." action={<span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500"><FileClock size={14} /> {filtered.length} résultat(s)</span>} />
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Rechercher" className="md:col-span-2"><input className={inputCls} value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} placeholder="Bien, locataire, champ modifié…" /></Field>
          <Field label="Module"><select className={inputCls} value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setLimit(30); }}><option value="all">Tous les modules</option>{modules.map(module => <option key={module} value={module}>{module}</option>)}</select></Field>
          <Field label="Action"><select className={inputCls} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setLimit(30); }}><option value="all">Toutes les actions</option>{(Object.keys(ACTIONS) as AuditAction[]).map(key => <option key={key} value={key}>{ACTIONS[key]}</option>)}</select></Field>
          <Field label="Du"><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></Field>
          <Field label="Au"><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[790px] text-left">
            <thead><tr className="bg-gradient-to-r from-slate-700 to-blue-800 text-[11px] font-bold uppercase tracking-wide text-white"><th className="px-5 py-3.5">Date et heure</th><th className="px-4 py-3.5">Action</th><th className="px-4 py-3.5">Module</th><th className="px-4 py-3.5">Élément</th><th className="px-4 py-3.5">Détails</th><th className="px-5 py-3.5 text-right">Voir</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, limit).map((entry, index) => (
                <tr key={entry.id} className={`${index % 2 ? 'bg-slate-50/80' : 'bg-white'} hover:bg-blue-50/60`}>
                  <td className="whitespace-nowrap px-5 py-3 text-[12.5px] font-semibold text-slate-700">{formatDateTime(entry.timestamp)}</td>
                  <td className="px-4 py-3"><Pill color={TONES[entry.action]}>{ACTIONS[entry.action]}</Pill></td>
                  <td className="px-4 py-3 text-[12.5px] font-bold text-slate-700">{entry.module}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[12.5px] font-bold text-slate-900" title={entry.target}>{entry.target}</td>
                  <td className="max-w-[270px] truncate px-4 py-3 text-[12px] text-slate-500" title={entry.details}>{entry.details}</td>
                  <td className="px-5 py-3 text-right"><Btn size="sm" variant="secondary" onClick={() => setSelected(entry)}><Eye size={13} /> Détails</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="Aucune action trouvée" subtitle={state.auditLog.length ? 'Modifiez vos filtres pour voir d’autres événements.' : 'Les prochaines opérations effectuées dans l’application apparaîtront ici.'} />}
        </div>
        {filtered.length > limit && <div className="border-t border-slate-100 py-3 text-center"><Btn variant="secondary" size="sm" onClick={() => setLimit(prev => prev + 30)}><Filter size={14} /> Afficher 30 actions supplémentaires ({filtered.length - limit} restantes)</Btn></div>}
        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11.5px] text-slate-500"><LockKeyhole className="mt-0.5 shrink-0" size={14} /><span>Aucun bouton de suppression : le journal est nettoyé automatiquement après trois mois, même sans nouvel enregistrement. Les copies CSV et sauvegardes téléchargées ne sont pas effacées par l'application.</span></div>
      </Card>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${ACTIONS[selected.action]} · ${selected.target}` : 'Détail de l’action'} subtitle={selected ? `${selected.module} · ${formatDateTime(selected.timestamp)}` : ''} width="max-w-xl">
        {selected && <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3"><Pill color={TONES[selected.action]}>{ACTIONS[selected.action]}</Pill><span className="text-[12.5px] text-slate-500">Effectué par <b className="text-slate-800">{selected.actor}</b></span></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Élément concerné</p><p className="mt-1 text-[14px] font-bold text-slate-900">{selected.target}</p><p className="mt-2 text-[12.5px] text-slate-700">{selected.details}</p></div>
          {selected.changes && selected.changes.length > 0 && <div><p className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-slate-700"><Pencil size={14} /> Valeurs modifiées</p><div className="space-y-2">{selected.changes.map((change, i) => <div key={i} className="rounded-xl border border-slate-200 p-3"><p className="text-[12px] font-bold text-slate-900">{change.field}</p><div className="mt-2 grid grid-cols-2 gap-2 text-[12px]"><div className="rounded-lg bg-rose-50 p-2"><p className="font-bold text-rose-700">Avant</p><p className="mt-1 break-words text-slate-700">{change.before}</p></div><div className="rounded-lg bg-emerald-50 p-2"><p className="font-bold text-emerald-700">Après</p><p className="mt-1 break-words text-slate-700">{change.after}</p></div></div></div>)}</div></div>}
          <div className="flex justify-end"><Btn onClick={() => setSelected(null)}>Fermer</Btn></div>
        </div>}
      </Modal>
    </div>
  );
}