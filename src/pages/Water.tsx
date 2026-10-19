import { useMemo, useState } from 'react';
import { Plus, Droplets, Gauge, AlertTriangle, Receipt } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, StatusBadge, Modal, Field, inputCls, EmptyState, Pill, StatCard, FilterBtn } from '../components/ui';
import { nextWaterReadingDate } from '../utils/alerts';
import { playWaterAlert, playSuccess, playError } from '../utils/sound';
import { useToast } from '../components/notifications';
import { CalendarClock } from 'lucide-react';
import { formatMoney, formatDate, periodShort, uid, MONTHS_FR } from '../utils/helpers';

export default function Water({ search }: { search: string }) {
  const { state, update, waters } = useStore();
  const [tab, setTab] = useState<'compteurs' | 'factures' | 'releves'>('compteurs');
  const [readingModal, setReadingModal] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState('');
  const [form, setForm] = useState({ newIndex: '', date: new Date().toISOString().slice(0, 10), month: 10, year: 2026 });
  const [error, setError] = useState('');
  const currency = state.settings.currency;
  const { push } = useToast();

  const currentTariff = [...state.waterTariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  const filteredInvoices = useMemo(() => waters.filter(w => {
    if (!search) return true;
    const c = state.contracts.find(c => c.id === w.contractId);
    const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
    const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
    return `${t?.firstName} ${t?.lastName} ${p?.reference}`.toLowerCase().includes(search.toLowerCase());
  }), [waters, search, state.contracts, state.tenants, state.properties]);

  const totDue = filteredInvoices.reduce((s, w) => s + w.amountDue, 0);
  const totPaid = filteredInvoices.reduce((s, w) => s + w.paid, 0);
  const totRest = filteredInvoices.reduce((s, w) => s + w.rest, 0);

  const lastReadingOf = (meterId: string) => {
    const rs = state.waterReadings.filter(r => r.meterId === meterId).sort((a, b) => b.readingDate.localeCompare(a.readingDate));
    return rs[0] || null;
  };

  const openReading = (meterId?: string) => {
    setSelectedMeter(meterId || state.waterMeters[0]?.id || '');
    setForm({ newIndex: '', date: new Date().toISOString().slice(0, 10), month: 10, year: 2026 });
    setError('');
    setReadingModal(true);
  };

  const saveReading = () => {
    const meter = state.waterMeters.find(m => m.id === selectedMeter);
    if (!meter) { setError('Choisissez un compteur.'); return; }
    const newIdx = Number(form.newIndex);
    if (isNaN(newIdx) || form.newIndex === '') { setError('Saisissez le nouvel index.'); return; }
    const last = lastReadingOf(meter.id);
    const prevIdx = last ? last.currentReading : 0;
    // Règle métier: nouvel index >= ancien, sinon bloquer
    if (newIdx < prevIdx) { playError();
      setError(`ALERTE : le nouvel index (${newIdx} m³) est inférieur à l'ancien (${prevIdx} m³). Enregistrement bloqué. Vérifiez la saisie ou utilisez la procédure de remplacement de compteur.`);
      return;
    }
    const consumption = newIdx - prevIdx;
    const tariff = currentTariff?.pricePerM3 || 500;
    const amount = consumption * tariff;
    // contrat actif du logement
    const contract = state.contracts.find(c => c.propertyId === meter.propertyId && c.status === 'actif');
    if (!contract) { setError('Aucun contrat actif pour ce logement — impossible de facturer.'); return; }
    const readingId = uid('wr');
    update(s => {
      s.waterReadings.push({ id: readingId, meterId: meter.id, readingDate: form.date, previousReading: prevIdx, currentReading: newIdx, consumption, tariffPerM3: tariff, periodMonth: form.month, periodYear: form.year, createdAt: new Date().toISOString() });
      s.waterInvoices.push({ id: uid('wi'), contractId: contract.id, meterId: meter.id, readingId, periodMonth: form.month, periodYear: form.year, previousIndex: prevIdx, currentIndex: newIdx, consumption, tariffPerM3: tariff, amountDue: amount, createdAt: new Date().toISOString() });
      return s;
    });
    playSuccess(); push({severity:'water', title:'Relevé enregistré — facture générée', message:`Consommation ${consumption} m³ • ${amount.toLocaleString('fr-FR')} ${currency} • tarif figé ${tariff} ${currency}/m³`});
    setReadingModal(false);
  };

  const preview = (() => {
    const meter = state.waterMeters.find(m => m.id === selectedMeter);
    const last = meter ? lastReadingOf(meter.id) : null;
    const prevIdx = last ? last.currentReading : 0;
    const newIdx = Number(form.newIndex);
    if (!meter || isNaN(newIdx) || form.newIndex === '') return null;
    return { prevIdx, newIdx, consumption: newIdx - prevIdx, tariff: currentTariff?.pricePerM3 || 500, amount: Math.max(0, (newIdx - prevIdx)) * (currentTariff?.pricePerM3 || 500) };
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Tarif actuel" value={`${formatMoney(currentTariff?.pricePerM3 || 0, currency)} / m³`} sub={`En vigueur depuis ${formatDate(currentTariff?.effectiveFrom || '')}`} accent="teal" />
        <StatCard label="Factures attendues" value={formatMoney(totDue, currency)} sub={`${filteredInvoices.length} facture(s)`} accent="blue" />
        <StatCard label="Encaissées" value={formatMoney(totPaid, currency)} accent="green" />
        <StatCard label="Reste à recevoir" value={formatMoney(totRest, currency)} accent="red" />
      </div>

      <Card>
        <CardHeader theme="teal" title="Gestion de l'eau" subtitle="Compteurs • Relevés • Factures — tarif historisé par facture" action={<Btn onClick={() => openReading()}><Plus size={15} /> Nouveau relevé</Btn>} />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-cyan-50/40 px-5 py-3">
          {([['compteurs', 'Compteurs'], ['factures', `Factures (${waters.length})`], ['releves', `Relevés (${state.waterReadings.length})`]] as const).map(([v, l]) => (
            <FilterBtn key={v} color="teal" active={tab === v} onClick={() => setTab(v)}>{l}</FilterBtn>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-3 py-1.5 text-[12px] font-extrabold text-white shadow"><CalendarClock size={13}/> Prélèvement prévu le {state.settings.waterReadingDay} de chaque mois</span>
        </div>

        {tab === 'compteurs' && (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {state.waterMeters.map(m => {
              const p = state.properties.find(p => p.id === m.propertyId);
              const last = lastReadingOf(m.id);
              const c = state.contracts.find(c => c.propertyId === m.propertyId && c.status === 'actif');
              const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
              return (
                <div key={m.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700"><Gauge size={19} /></div><div><p className="text-[14px] font-extrabold text-slate-900">Logement {p?.reference}</p><p className="text-[12px] text-slate-500">N° {m.meterNumber}</p></div></div>
                    <Pill color={m.status === 'actif' ? 'green' : 'slate'}>{m.status}</Pill>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] text-slate-500">Ancien</p><p className="text-[14px] font-extrabold">{last ? `${last.currentReading} m³` : '—'}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] text-slate-500">Locataire</p><p className="truncate text-[12px] font-bold">{t ? `${t.firstName} ${t.lastName}` : '—'}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] text-slate-500">Dernier relevé</p><p className="text-[12px] font-bold">{last ? formatDate(last.readingDate) : '—'}</p></div>
                  </div>
                  {(() => { const next = nextWaterReadingDate(state, m.id); const diff = Math.floor((new Date(next.getFullYear(),next.getMonth(),next.getDate()).getTime() - new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()).getTime())/86400000); const hasCur = state.waterReadings.some(r=>r.meterId===m.id && r.periodMonth===new Date().getMonth()+1 && r.periodYear===new Date().getFullYear()); return (
                    <div className={`mt-3 rounded-xl border p-2.5 text-center text-[12px] font-bold ${!hasCur && diff<=3 ? 'pulse-danger border-cyan-300 bg-cyan-600 text-white' : 'border-cyan-100 bg-cyan-50 text-cyan-800'}`}>
                      <CalendarClock size={13} className="mr-1 inline"/> Prochain prélèvement : {formatDate(next.toISOString().slice(0,10))} { !hasCur && diff<0 ? `• EN RETARD ${Math.abs(diff)}j` : !hasCur && diff===0 ? "• AUJOURD'HUI" : !hasCur && diff<=3 ? `• dans ${diff}j` : ''}
                    </div> ); })()}
                  <Btn variant="teal" size="sm" className="mt-2.5 w-full" onClick={() => { playWaterAlert(); openReading(m.id); }}><Droplets size={14} /> Saisir relevé</Btn>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'factures' && (
          <div className="overflow-x-auto">
            <table className="app-table w-full min-w-[920px] text-left">
              <thead><tr className="bg-gradient-to-r from-cyan-700 to-teal-600 text-[11px] uppercase tracking-wider text-white"><th className="px-5 py-3.5">Période</th><th className="px-4 py-3.5">Logement</th><th className="px-4 py-3.5">Index</th><th className="px-4 py-3.5">Conso.</th><th className="px-4 py-3.5">Tarif figé</th><th className="px-4 py-3.5 text-right">Montant</th><th className="px-4 py-3.5 text-right">Payé</th><th className="px-4 py-3.5 text-right">Reste</th><th className="px-4 py-3.5">État</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.map(w => {
                  const c = state.contracts.find(c => c.id === w.contractId);
                  const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-[13px] font-extrabold">{periodShort(w.periodMonth, w.periodYear)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-blue-700">{p?.reference}</td>
                      <td className="px-4 py-3 text-[12.5px] text-slate-600">{w.previousIndex} → {w.currentIndex} m³</td>
                      <td className="px-4 py-3 text-[13px] font-bold">{w.consumption} m³</td>
                      <td className="px-4 py-3 text-[12.5px] text-slate-600">{formatMoney(w.tariffPerM3, currency)}/m³</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold">{formatMoney(w.amountDue, currency)}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-emerald-700">{formatMoney(w.paid, currency)}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-rose-700">{formatMoney(w.rest, currency)}</td>
                      <td className="px-4 py-3"><StatusBadge status={w.status} size="sm" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && <EmptyState title="Aucune facture" subtitle="Effectuez un relevé pour générer une facture." />}
          </div>
        )}

        {tab === 'releves' && (
          <div className="overflow-x-auto">
            <table className="app-table w-full min-w-[760px] text-left">
              <thead><tr className="bg-gradient-to-r from-teal-700 to-cyan-600 text-[11px] uppercase tracking-wider text-white"><th className="px-5 py-3.5">Date</th><th className="px-4 py-3.5">Compteur</th><th className="px-4 py-3.5">Logement</th><th className="px-4 py-3.5">Ancien</th><th className="px-4 py-3.5">Nouveau</th><th className="px-4 py-3.5">Conso.</th><th className="px-4 py-3.5">Période</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {[...state.waterReadings].sort((a, b) => b.readingDate.localeCompare(a.readingDate)).map(r => {
                  const m = state.waterMeters.find(m => m.id === r.meterId);
                  const p = m ? state.properties.find(p => p.id === m.propertyId) : null;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-[13px] font-semibold">{formatDate(r.readingDate)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-cyan-700">{m?.meterNumber}</td>
                      <td className="px-4 py-3 text-[13px]">{p?.reference}</td>
                      <td className="px-4 py-3 text-[13px]">{r.previousReading} m³</td>
                      <td className="px-4 py-3 text-[13px] font-bold">{r.currentReading} m³</td>
                      <td className="px-4 py-3"><Pill color="teal">{r.consumption} m³</Pill></td>
                      <td className="px-4 py-3 text-[12.5px] text-slate-500">{periodShort(r.periodMonth, r.periodYear)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={readingModal} onClose={() => setReadingModal(false)} title="Nouveau relevé de compteur" subtitle="Consommation = nouvel index − ancien index • Montant = conso × tarif">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Compteur"><select className={inputCls} value={selectedMeter} onChange={e => setSelectedMeter(e.target.value)}>{state.waterMeters.map(m => { const p = state.properties.find(p => p.id === m.propertyId); return <option key={m.id} value={m.id}>{m.meterNumber} — Logement {p?.reference}</option>; })}</select></Field>
          <Field label="Date du relevé"><input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Période (mois)"><select className={inputCls} value={form.month} onChange={e => setForm({ ...form, month: Number(e.target.value) })}>{MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
          <Field label="Année"><input type="number" className={inputCls} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label={`Ancien index (m³) — lecture seule`}><input className={`${inputCls} bg-slate-50`} readOnly value={preview?.prevIdx ?? (lastReadingOf(selectedMeter)?.currentReading || 0)} /></Field>
          <Field label="Nouvel index (m³) *"><input type="number" className={inputCls} value={form.newIndex} onChange={e => setForm({ ...form, newIndex: e.target.value })} placeholder="Ex : 138" autoFocus /></Field>
        </div>

        {preview && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-cyan-50 p-3 text-center"><p className="text-[11px] font-bold text-cyan-700">CONSOMMATION</p><p className="text-[18px] font-extrabold text-cyan-900">{preview.consumption} m³</p></div>
            <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-[11px] font-bold text-slate-500">TARIF APPLIQUÉ</p><p className="text-[18px] font-extrabold">{formatMoney(preview.tariff, currency)}/m³</p></div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-[11px] font-bold text-emerald-700">MONTANT FACTURE</p><p className="text-[18px] font-extrabold text-emerald-900">{formatMoney(preview.amount, currency)}</p></div>
          </div>
        )}

        {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] font-semibold text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600">
          <p className="flex items-center gap-1.5 font-bold text-slate-700"><Receipt size={13} /> Exemple du cahier des charges</p>
          <p className="mt-1">Ancien 125 m³ → Nouveau 138 m³ = 13 m³ × 500 F = <b>6 500 F</b>. Le tarif est figé sur la facture.</p>
        </div>

        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setReadingModal(false)}>Annuler</Btn><Btn onClick={saveReading}>Enregistrer le relevé</Btn></div>
      </Modal>
    </div>
  );
}
