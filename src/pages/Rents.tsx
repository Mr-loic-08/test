import { useMemo, useState } from 'react';
import { CalendarPlus, Filter } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, StatusBadge, Modal, Field, inputCls, EmptyState, StatCard, Pill } from '../components/ui';
import { BellRing } from 'lucide-react';
import { playLateAlert } from '../utils/sound';
import { useToast } from '../components/notifications';
import { formatMoney, periodLabel, periodShort, MONTHS_FR, uid } from '../utils/helpers';

export default function Rents({ search }: { search: string }) {
  const { state, update, rents } = useStore();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState<number | 'all'>(10);
  const [statusF, setStatusF] = useState('all');
  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ contractId: '', fromMonth: 1, fromYear: 2026, count: 12 });
  const currency = state.settings.currency;
  const { push } = useToast();
  const today = new Date(); const todayD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueInfo = (r: typeof rents[number]) => { const c = state.contracts.find(c=>c.id===r.contractId); const due = new Date(r.year, r.month-1, Math.min(c?.dueDay||5,28)); const late = Math.floor((todayD.getTime()-due.getTime())/86400000); return { due, late, isLate: r.status!=='PAYE' && late>0, soon: r.status!=='PAYE' && late<=0 && late>=-3 }; };
  const lateCount = rents.filter(r=>dueInfo(r).isLate).length;

  const filtered = useMemo(() => rents.filter(r => {
    if (r.year !== year) return false;
    if (month !== 'all' && r.month !== month) return false;
    if (statusF !== 'all' && r.status !== statusF) return false;
    if (search) {
      const c = state.contracts.find(c => c.id === r.contractId);
      const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
      const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
      const q = search.toLowerCase();
      if (!(`${t?.firstName} ${t?.lastName} ${p?.reference} ${c?.reference}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }).sort((a, b) => a.month - b.month), [rents, year, month, statusF, search, state.contracts, state.tenants, state.properties]);

  const totDue = filtered.reduce((s, r) => s + r.amountDue, 0);
  const totPaid = filtered.reduce((s, r) => s + r.paid, 0);
  const totRest = filtered.reduce((s, r) => s + r.rest, 0);

  const generate = () => {
    if (!gen.contractId) { alert('Choisissez un contrat.'); return; }
    const contract = state.contracts.find(c => c.id === gen.contractId);
    if (!contract) return;
    update(s => {
      let m = gen.fromMonth, y = gen.fromYear;
      for (let i = 0; i < gen.count; i++) {
        const exists = s.rentSchedules.some(r => r.contractId === contract.id && r.month === m && r.year === y);
        if (!exists) s.rentSchedules.push({ id: uid('rs'), contractId: contract.id, month: m, year: y, amountDue: contract.monthlyRent, createdAt: new Date().toISOString() });
        m++; if (m > 12) { m = 1; y++; }
      }
      return s;
    });
    setGenOpen(false);
  };

  const years = [...new Set(rents.map(r => r.year))].sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label={month === 'all' ? `Loyers attendus ${year}` : `Loyers attendus — ${periodLabel(month as number, year)}`} value={formatMoney(totDue, currency)} sub={`${filtered.length} échéance(s)`} accent="blue" />
        <StatCard label="Encaissés" value={formatMoney(totPaid, currency)} sub={totDue ? `${Math.round((totPaid / totDue) * 100)}% recouvré` : '—'} accent="green" />
        <StatCard label="Reste à recevoir" value={formatMoney(totRest, currency)} sub={`${filtered.filter(r => r.status !== 'PAYE').length} échéance(s) non soldée(s)`} accent="red" />
      </div>

      {lateCount>0 && (
        <button type="button" onClick={()=>{playLateAlert(); push({severity:'danger', title:`${lateCount} retard(s) de paiement`, message:'Échéances dépassées non soldées — voir lignes rouges ci-dessous.'});}} className="btn-uniform pulse-danger flex w-full items-center gap-3 rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-600 to-rose-700 p-4 text-left text-white shadow-lg">
          <BellRing size={20}/><span className="flex-1"><b>{lateCount} retard{lateCount>1?'s':''} de paiement signalé{lateCount>1?'s':''}</b><span className="block text-[12px] text-rose-100">Lignes en rouge = échéance dépassée • Jour d’échéance du contrat dépassé • Cliquez pour jouer l’alerte sonore</span></span><Pill color="red">EN RETARD</Pill>
        </button>
      )}
      <Card>
        <CardHeader theme="rose" title="Échéances de loyers"  subtitle="États calculés automatiquement : PAYÉ • INCOMPLET • NON PAYÉ" action={<Btn onClick={() => setGenOpen(true)}><CalendarPlus size={15} /> Générer échéances</Btn>} />
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-600"><Filter size={14} /> Filtres :</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="btn-uniform rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold shadow-sm hover:border-blue-300">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={String(month)} onChange={e => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="btn-uniform rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold shadow-sm hover:border-blue-300">
            <option value="all">Toute l'année</option>
            {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} className="btn-uniform rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold shadow-sm hover:border-blue-300">
            <option value="all">Tous états</option>
            <option value="PAYE">Payés</option>
            <option value="INCOMPLET">Incomplets</option>
            <option value="NON_PAYE">Non payés</option>
          </select>
          <span className="ml-auto text-[12.5px] text-slate-500">Montant restant = attendu − payé affecté (jamais négatif)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[1080px] text-left">
            <thead><tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-[11px] uppercase tracking-wider text-white shadow"><th className="px-5 py-3.5">Période</th><th className="px-4 py-3.5">Contrat</th><th className="px-4 py-3.5">Locataire</th><th className="px-4 py-3.5">Logement</th><th className="px-4 py-3.5">Échéance</th><th className="px-4 py-3.5 text-right">Attendu</th><th className="px-4 py-3.5 text-right">Payé</th><th className="px-4 py-3.5 text-right">Reste</th><th className="px-4 py-3.5">État</th><th className="px-4 py-3.5">Signalement</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, idx) => {
                const c = state.contracts.find(c => c.id === r.contractId);
                const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
                const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
                const info = dueInfo(r);
                return (
                  <tr key={r.id} className={info.isLate ? 'bg-rose-50 hover:bg-rose-100/80' : info.soon ? 'bg-amber-50 hover:bg-amber-100/70' : `${idx%2? 'bg-blue-50/35':''} hover:bg-blue-50`}>
                    <td className="px-5 py-3 text-[13px] font-extrabold text-slate-900">{periodShort(r.month, r.year)}</td>
                    <td className="px-4 py-3 text-[12.5px] font-bold text-blue-700">{c?.reference}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{t ? `${t.firstName} ${t.lastName}` : '—'}</td>
                    <td className="px-4 py-3"><span className="rounded-lg bg-blue-100 px-2 py-1 text-[12px] font-extrabold text-blue-800">{p?.reference}</span></td>
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-slate-600">{info.due.toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-bold">{formatMoney(r.amountDue, currency)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-bold text-emerald-700">{formatMoney(r.paid, currency)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-extrabold text-rose-700">{formatMoney(r.rest, currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} size="sm" /></td>
                    <td className="px-4 py-3">{info.isLate ? <span className="pulse-danger inline-flex rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-extrabold text-white">RETARD {info.late}j</span> : info.soon ? <span className="inline-flex rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-white">BIENTÔT</span> : <span className="text-[12px] text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucune échéance" subtitle="Générez des échéances pour un contrat." action={<Btn onClick={() => setGenOpen(true)}>Générer</Btn>} />}
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap justify-end gap-6 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[13px]">
            <span>Total attendu : <b>{formatMoney(totDue, currency)}</b></span>
            <span>Payé : <b className="text-emerald-700">{formatMoney(totPaid, currency)}</b></span>
            <span>Reste : <b className="text-rose-700">{formatMoney(totRest, currency)}</b></span>
          </div>
        )}
      </Card>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Générer des échéances" subtitle="Crée les loyers mensuels pour un contrat">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contrat" className="col-span-2"><select className={inputCls} value={gen.contractId} onChange={e => setGen({ ...gen, contractId: e.target.value })}><option value="">— Choisir —</option>{state.contracts.filter(c => c.status === 'actif').map(c => { const t = state.tenants.find(t => t.id === c.tenantId); const p = state.properties.find(p => p.id === c.propertyId); return <option key={c.id} value={c.id}>{c.reference} — {t?.firstName} {t?.lastName} — {p?.reference} ({formatMoney(c.monthlyRent, currency)}/mois)</option>; })}</select></Field>
          <Field label="Mois de départ"><select className={inputCls} value={gen.fromMonth} onChange={e => setGen({ ...gen, fromMonth: Number(e.target.value) })}>{MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
          <Field label="Année"><input type="number" className={inputCls} value={gen.fromYear} onChange={e => setGen({ ...gen, fromYear: Number(e.target.value) })} /></Field>
          <Field label="Nombre de mois"><input type="number" min={1} max={36} className={inputCls} value={gen.count} onChange={e => setGen({ ...gen, count: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setGenOpen(false)}>Annuler</Btn><Btn onClick={generate}>Générer</Btn></div>
      </Modal>
    </div>
  );
}
