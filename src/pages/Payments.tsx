import { useEffect, useMemo, useState } from 'react';
import { Plus, Eye, Printer, CheckCircle2, Wallet } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Modal, Field, inputCls, EmptyState, Pill } from '../components/ui';
import { formatMoney, formatDate, periodShort, methodLabel, uid } from '../utils/helpers';
import MonthCalendar, { parseKey } from '../components/MonthCalendar';
import Logo from '../components/Logo';
import { useToast } from '../components/notifications';
import type { PaymentMethod } from '../types';

export default function Payments({ search }: { search: string }) {
  const { state, update, logAction, rents, waters, addPaymentWithAllocations } = useStore();
  const { push } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const currency = state.settings.currency;

  // wizard state
  const [tenantId, setTenantId] = useState('');
  const [kind, setKind] = useState<'mixte' | 'loyer' | 'eau'>('mixte');
  const [selMonths, setSelMonths] = useState<string[]>([]);
  const [amountTouched, setAmountTouched] = useState(false);
  const [selWaters, setSelWaters] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('especes');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState('');

  const contract = state.contracts.find(c => c.tenantId === tenantId && c.status === 'actif') || null;
  const contractRentsAll = useMemo(() => contract ? rents.filter(r => r.contractId === contract.id) : [], [rents, contract]);
  // Mois sélectionnés dans le calendrier → échéances existantes OU à créer (paiement d'avance / longue durée)
  const rentEntries = useMemo(() => {
    if (!contract) return [] as { id: string; month: number; year: number; amountDue: number; rest: number; isNew: boolean }[];
    return [...selMonths].sort().map(k => {
      const { year, month } = parseKey(k);
      const ex = contractRentsAll.find(r => r.year === year && r.month === month);
      if (ex) return { id: ex.id, month, year, amountDue: ex.amountDue, rest: ex.rest, isNew: false };
      return { id: `new_${k}`, month, year, amountDue: contract.monthlyRent, rest: contract.monthlyRent, isNew: true };
    }).filter(e => e.isNew || e.rest > 0);
  }, [selMonths, contractRentsAll, contract]);
  const tenantWaters = useMemo(() => contract ? waters.filter(w => w.contractId === contract.id && w.rest > 0).sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth) : [], [waters, contract]);

  const selectedRentObjs = rentEntries;
  const selectedWaterObjs = tenantWaters.filter(w => selWaters.includes(w.id));
  const totalRentSel = selectedRentObjs.reduce((s, r) => s + r.rest, 0);
  const totalWaterSel = selectedWaterObjs.reduce((s, w) => s + w.rest, 0);
  const totalDue = totalRentSel + totalWaterSel;
  const amountNum = Number(amount) || 0;
  // Montant pré-rempli avec le total dû tant que l'utilisateur ne le modifie pas
  useEffect(() => { if (!amountTouched) setAmount(totalDue > 0 ? String(totalDue) : ''); }, [totalDue, amountTouched]);

  // Répartition chronologique : loyers d'abord (chrono), puis eau (chrono) — ou selon kind
  const preview = useMemo(() => {
    let left = amountNum;
    const rentAllocs: { id: string; label: string; due: number; rest: number; alloc: number; after: number }[] = [];
    const waterAllocs: { id: string; label: string; due: number; rest: number; alloc: number; after: number }[] = [];
    if (kind === 'mixte' || kind === 'loyer') {
      selectedRentObjs.forEach(r => {
        const alloc = Math.max(0, Math.min(r.rest, left));
        rentAllocs.push({ id: r.id, label: periodShort(r.month, r.year), due: r.amountDue, rest: r.rest, alloc, after: r.rest - alloc });
        left -= alloc;
      });
    }
    if (kind === 'mixte' || kind === 'eau') {
      selectedWaterObjs.forEach(w => {
        const alloc = Math.max(0, Math.min(w.rest, left));
        waterAllocs.push({ id: w.id, label: periodShort(w.periodMonth, w.periodYear), due: w.amountDue, rest: w.rest, alloc, after: w.rest - alloc });
        left -= alloc;
      });
    }
    return { rentAllocs, waterAllocs, unallocated: Math.max(0, left), covered: amountNum - Math.max(0, left) };
  }, [amountNum, selectedRentObjs, selectedWaterObjs, kind]);

  const openWizard = () => {
    setTenantId(''); setKind('mixte'); setSelMonths([]); setSelWaters([]); setAmount(''); setAmountTouched(false); setMethod('especes'); setDate(new Date().toISOString().slice(0, 10)); setComment('');
    setWizardOpen(true);
  };

  const toggleWater = (id: string) => setSelWaters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const validate = () => {
    if (!contract) { alert('Sélectionnez un locataire avec contrat actif.'); return; }
    if (selectedRentObjs.length === 0 && selectedWaterObjs.length === 0) { alert('Sélectionnez au moins une échéance ou facture.'); return; }
    if (amountNum <= 0) { alert('Montant reçu invalide.'); return; }
    const allocations: { rentScheduleId?: string; waterInvoiceId?: string; allocatedAmount: number }[] = [
      ...preview.rentAllocs.filter(a => a.alloc > 0).map(a => ({ rentScheduleId: a.id, allocatedAmount: a.alloc })),
      ...preview.waterAllocs.filter(a => a.alloc > 0).map(a => ({ waterInvoiceId: a.id, allocatedAmount: a.alloc })),
    ];
    // Crée les échéances manquantes (mois futurs payés d'avance) puis relie les affectations
    const idMap = new Map<string, string>();
    const toCreate = preview.rentAllocs.filter(a => a.alloc > 0 && a.id.startsWith('new_'));
    if (toCreate.length) {
      toCreate.forEach(a => idMap.set(a.id, uid('rs')));
      update(s => {
        toCreate.forEach(a => {
          const { year, month } = parseKey(a.id.slice(4));
          if (!s.rentSchedules.some(r => r.contractId === contract.id && r.year === year && r.month === month)) {
            s.rentSchedules.push({ id: idMap.get(a.id)!, contractId: contract.id, month, year, amountDue: contract.monthlyRent, createdAt: new Date().toISOString() });
          } else {
            const ex = s.rentSchedules.find(r => r.contractId === contract.id && r.year === year && r.month === month)!;
            idMap.set(a.id, ex.id);
          }
        });
        return s;
      });
    }
    const finalAllocations = allocations.map(a => a.rentScheduleId && idMap.has(a.rentScheduleId) ? { ...a, rentScheduleId: idMap.get(a.rentScheduleId)! } : a);
    const p = addPaymentWithAllocations({
      tenantId, contractId: contract.id, propertyId: contract.propertyId, paymentDate: date,
      amount: amountNum, method, kind: kind === 'mixte' ? 'mixte' : kind, comment,
      allocations: finalAllocations,
    });
    setWizardOpen(false);
    push({severity:'success', title:`Paiement ${p.reference} enregistré`, message:`${amountNum.toLocaleString('fr-FR')} ${currency} encaissés • sauvegarde auto déclenchée • reçu prêt à imprimer`});
    setReceiptId(p.id);
  };

  const filtered = useMemo(() => [...state.payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).filter(p => {
    if (!search) return true;
    const t = state.tenants.find(t => t.id === p.tenantId);
    return `${p.reference} ${t?.firstName} ${t?.lastName}`.toLowerCase().includes(search.toLowerCase());
  }), [state.payments, search, state.tenants]);

  const detail = state.payments.find(p => p.id === detailId) || null;
  const detailAllocs = detail ? state.allocations.filter(a => a.paymentId === detail.id) : [];
  const receipt = state.payments.find(p => p.id === receiptId) || null;
  const receiptAllocs = receipt ? state.allocations.filter(a => a.paymentId === receipt.id) : [];

  const receiptTenant = receipt ? state.tenants.find(t => t.id === receipt.tenantId) : null;
  const receiptProp = receipt ? state.properties.find(p => p.id === receipt.propertyId) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><div className="p-4"><p className="text-[12px] font-bold uppercase text-slate-500">Total encaissé</p><p className="mt-1 text-[22px] font-extrabold">{formatMoney(state.payments.reduce((s, p) => s + p.amount, 0), currency)}</p><p className="text-[12px] text-slate-500">{state.payments.length} opération(s)</p></div></Card>
        <Card><div className="p-4"><p className="text-[12px] font-bold uppercase text-slate-500">Affecté aux loyers</p><p className="mt-1 text-[22px] font-extrabold text-blue-700">{formatMoney(state.allocations.filter(a => a.rentScheduleId).reduce((s, a) => s + a.allocatedAmount, 0), currency)}</p></div></Card>
        <Card><div className="p-4"><p className="text-[12px] font-bold uppercase text-slate-500">Affecté à l'eau</p><p className="mt-1 text-[22px] font-extrabold text-teal-700">{formatMoney(state.allocations.filter(a => a.waterInvoiceId).reduce((s, a) => s + a.allocatedAmount, 0), currency)}</p></div></Card>
      </div>

      <Card>
        <CardHeader title="Paiements" subtitle="Chaque opération réelle et ses affectations sont conservées" action={<Btn onClick={openWizard}><Plus size={15} /> Nouveau paiement</Btn>} />
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[900px] text-left">
            <thead><tr className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-[11px] uppercase tracking-wider text-white shadow"><th className="px-5 py-3">Date</th><th className="px-4 py-3">Réf</th><th className="px-4 py-3">Locataire</th><th className="px-4 py-3">Logement</th><th className="px-4 py-3 text-right">Montant</th><th className="px-4 py-3">Mois concernés</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const t = state.tenants.find(t => t.id === p.tenantId);
                const pr = state.properties.find(pr => pr.id === p.propertyId);
                const allocs = state.allocations.filter(a => a.paymentId === p.id);
                const months = allocs.map(a => {
                  if (a.rentScheduleId) { const r = rents.find(r => r.id === a.rentScheduleId); return r ? periodShort(r.month, r.year) : ''; }
                  const w = waters.find(w => w.id === a.waterInvoiceId); return w ? `Eau ${periodShort(w.periodMonth, w.periodYear)}` : '';
                }).filter(Boolean).slice(0, 3).join(', ');
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-[13px] font-semibold">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 text-[12.5px] font-extrabold text-blue-700">{p.reference}</td>
                    <td className="px-4 py-3 text-[13px] font-bold">{t ? `${t.firstName} ${t.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-[13px]">{pr?.reference}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-extrabold">{formatMoney(p.amount, currency)}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{months || '—'}</td>
                    <td className="px-4 py-3"><Pill color="slate">{methodLabel(p.method)}</Pill></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                      <button onClick={() => setDetailId(p.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-blue-600 hover:text-white"><Eye size={16} /></button>
                      <button onClick={() => setReceiptId(p.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-emerald-600 hover:text-white"><Printer size={16} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucun paiement" action={<Btn onClick={openWizard}>Enregistrer un paiement</Btn>} />}
        </div>
      </Card>

      {/* Wizard */}
      <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title="Nouveau paiement (multi-mois)" subtitle="Sélectionnez les périodes, saisissez le montant — répartition chronologique automatique" width="max-w-4xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Locataire *"><select className={inputCls} value={tenantId} onChange={e => { setTenantId(e.target.value); setSelMonths([]); setSelWaters([]); setAmountTouched(false); }}><option value="">— Choisir —</option>{state.tenants.map(t => { const c = state.contracts.find(c => c.tenantId === t.id && c.status === 'actif'); if (!c) return null; const p = state.properties.find(p => p.id === c.propertyId); return <option key={t.id} value={t.id}>{t.firstName} {t.lastName} — {p?.reference} ({formatMoney(c.monthlyRent, currency)}/mois)</option>; })}</select></Field>
          <Field label="Type de paiement"><div className="flex gap-2">{([['mixte', 'Loyer + Eau'], ['loyer', 'Loyer uniquement'], ['eau', 'Eau uniquement']] as const).map(([v, l]) => <button key={v} onClick={() => setKind(v)} className={`flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-bold ${kind === v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>)}</div></Field>
        </div>

        {contract && (
          <>
            {(kind === 'mixte' || kind === 'loyer') && (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-bold uppercase text-slate-500">Mois de loyer à payer — {contract.reference} (cliquez dans le calendrier)</p>
                <MonthCalendar key={contract.id} contract={contract} rents={contractRentsAll} selected={selMonths} onChange={setSelMonths} currency={currency} />
                {rentEntries.some(e => e.isNew) && <p className="mt-2 rounded-lg bg-blue-50 p-2.5 text-[12px] font-semibold text-blue-800">ℹ️ {rentEntries.filter(e => e.isNew).length} échéance(s) future(s) seront créées automatiquement à la validation (paiement d'avance).</p>}
              </div>
            )}
            {(kind === 'mixte' || kind === 'eau') && (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-bold uppercase text-slate-500">Factures d'eau impayées (cochez)</p>
                {tenantWaters.length === 0 ? <p className="rounded-lg bg-emerald-50 p-3 text-[12.5px] text-emerald-700">Aucune facture d'eau impayée.</p> : (
                  <div className="flex flex-wrap gap-2">
                    {tenantWaters.map(w => (
                      <button key={w.id} onClick={() => toggleWater(w.id)} className={`rounded-xl border px-3 py-2 text-left text-[12.5px] ${selWaters.includes(w.id) ? 'border-teal-600 bg-teal-50' : 'border-slate-200'}`}>
                        <span className="font-extrabold">Eau {periodShort(w.periodMonth, w.periodYear)}</span>
                        <span className="block text-slate-600">Reste {formatMoney(w.rest, currency)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Loyer sélectionné"><input readOnly className={`${inputCls} bg-slate-50 font-bold`} value={formatMoney(totalRentSel, currency)} /></Field>
              <Field label="Eau sélectionnée"><input readOnly className={`${inputCls} bg-slate-50 font-bold`} value={formatMoney(totalWaterSel, currency)} /></Field>
              <Field label="Total dû sélect."><input readOnly className={`${inputCls} bg-blue-50 font-extrabold text-blue-800`} value={formatMoney(totalDue, currency)} /></Field>
              <Field label="Montant reçu *"><input type="number" className={`${inputCls} font-extrabold`} value={amount} onChange={e => { setAmount(e.target.value); setAmountTouched(true); }} placeholder="Ex : 450000" />{amountTouched && totalDue > 0 && <button type="button" onClick={() => setAmountTouched(false)} className="mt-1 text-[11.5px] font-bold text-blue-600 hover:underline">↺ Utiliser le total dû ({formatMoney(totalDue, currency)})</button>}</Field>
              <Field label="Date"><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></Field>
              <Field label="Mode"><select className={inputCls} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}><option value="especes">Espèces</option><option value="virement">Virement</option><option value="cheque">Chèque</option><option value="mobile_money">Mobile Money</option><option value="autre">Autre</option></select></Field>
              <Field label="Commentaire" className="col-span-2"><input className={inputCls} value={comment} onChange={e => setComment(e.target.value)} placeholder="Ex : Oct–Déc 2026" /></Field>
            </div>

            {amountNum > 0 && (selectedRentObjs.length > 0 || selectedWaterObjs.length > 0) && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-blue-900"><CheckCircle2 size={15} /> Répartition chronologique — vérifiez avant validation</p>
                <div className="mt-3 space-y-1.5 text-[12.5px]">
                  {preview.rentAllocs.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2"><span className="font-bold">Loyer {a.label} <span className="font-normal text-slate-500">(reste {formatMoney(a.rest, currency)})</span></span><span className="font-extrabold text-blue-700">{formatMoney(a.alloc, currency)} {a.after === 0 ? '— PAYÉ ✓' : a.alloc > 0 ? `— INCOMPLET (reste ${formatMoney(a.after, currency)})` : '— NON PAYÉ'}</span></div>
                  ))}
                  {preview.waterAllocs.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2"><span className="font-bold">Eau {a.label} <span className="font-normal text-slate-500">(reste {formatMoney(a.rest, currency)})</span></span><span className="font-extrabold text-teal-700">{formatMoney(a.alloc, currency)} {a.after === 0 ? '— PAYÉ ✓' : a.alloc > 0 ? `— INCOMPLET (reste ${formatMoney(a.after, currency)})` : '— NON PAYÉ'}</span></div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-slate-900 p-3 text-[12.5px] font-bold text-white">
                  <span>Total dû : {formatMoney(totalDue, currency)}</span>
                  <span>Reçu : <span className="text-emerald-300">{formatMoney(amountNum, currency)}</span></span>
                  <span>Reste : <span className="text-rose-300">{formatMoney(Math.max(0, totalDue - amountNum), currency)}</span></span>
                  {preview.unallocated > 0 && <span className="text-amber-300">Trop-perçu / non affecté : {formatMoney(preview.unallocated, currency)} (crédit)</span>}
                </div>
                <p className="mt-2 text-[11.5px] text-slate-500">Exemple cahier des charges : 150 000 F × 3 mois = 450 000 F. Si 400 000 F reçus → Oct PAYÉ, Nov PAYÉ, Déc 100 000 F INCOMPLET, reste 50 000 F.</p>
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setWizardOpen(false)}>Annuler</Btn><Btn onClick={validate} disabled={!contract || amountNum <= 0}><Wallet size={15} /> Enregistrer + reçu</Btn></div>
      </Modal>

      {/* Détail */}
      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? `Paiement ${detail.reference}` : ''} subtitle="Opération réelle + affectations conservées">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Locataire</p><p className="font-bold">{state.tenants.find(t => t.id === detail.tenantId)?.firstName} {state.tenants.find(t => t.id === detail.tenantId)?.lastName}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Montant reçu</p><p className="font-extrabold">{formatMoney(detail.amount, currency)} • {methodLabel(detail.method)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Date</p><p className="font-bold">{formatDate(detail.paymentDate)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Commentaire</p><p className="font-bold">{detail.comment || '—'}</p></div>
            </div>
            <p className="text-[12px] font-bold uppercase text-slate-500">Affectations ({detailAllocs.length})</p>
            <div className="space-y-1.5">
              {detailAllocs.map(a => {
                const r = a.rentScheduleId ? rents.find(r => r.id === a.rentScheduleId) : null;
                const w = a.waterInvoiceId ? waters.find(w => w.id === a.waterInvoiceId) : null;
                return <div key={a.id} className="flex justify-between rounded-lg border px-3 py-2 text-[12.5px]"><span className="font-bold">{r ? `Loyer ${periodShort(r.month, r.year)}` : w ? `Eau ${periodShort(w.periodMonth, w.periodYear)}` : '—'}</span><span className="font-extrabold text-emerald-700">{formatMoney(a.allocatedAmount, currency)}</span></div>;
              })}
              {detailAllocs.length === 0 && <p className="text-[12.5px] text-slate-500">Aucune affectation (crédit non affecté).</p>}
            </div>
            <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => { setDetailId(null); setReceiptId(detail.id); }}><Printer size={14} /> Voir reçu</Btn><Btn onClick={() => setDetailId(null)}>Fermer</Btn></div>
          </div>
        )}
      </Modal>

      {/* Reçu */}
      <Modal open={!!receipt} onClose={() => setReceiptId(null)} title={receipt ? `Reçu ${receipt.reference}` : ''} subtitle="Imprimez ou exportez en PDF (via impression)" width="max-w-xl">
        {receipt && (
          <div>
            <div id="receipt-print" className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6">
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <div className="mb-2 flex justify-center"><Logo size={54} rounded={12} animate={false} glow={false} /></div>
                <p className="text-[15px] font-extrabold uppercase tracking-wide">{state.settings.receiptHeader}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{state.settings.address} • {state.settings.phone}</p>
                <p className="mt-2 inline-block rounded-full bg-slate-900 px-4 py-1 text-[12px] font-extrabold uppercase tracking-widest text-white">Reçu de paiement</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
                <p><span className="text-slate-500">N° :</span> <b>{receipt.reference}</b></p>
                <p className="text-right"><span className="text-slate-500">Date :</span> <b>{formatDate(receipt.paymentDate)}</b></p>
                <p><span className="text-slate-500">Locataire :</span> <b>{receiptTenant?.firstName} {receiptTenant?.lastName}</b></p>
                <p className="text-right"><span className="text-slate-500">Logement :</span> <b>{receiptProp?.reference}</b></p>
                <p><span className="text-slate-500">Mode :</span> <b>{methodLabel(receipt.method)}</b></p>
                <p className="text-right"><span className="text-slate-500">Type :</span> <b>{receipt.kind === 'mixte' ? 'Loyer + Eau' : receipt.kind}</b></p>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border">
                <table className="app-table w-full text-[12.5px]"><thead><tr className="bg-slate-100 text-left text-[11px] uppercase"><th className="px-3 py-2">Désignation</th><th className="px-3 py-2 text-right">Montant</th></tr></thead>
                  <tbody className="divide-y">{receiptAllocs.map(a => {
                    const r = a.rentScheduleId ? rents.find(r => r.id === a.rentScheduleId) : null;
                    const w = a.waterInvoiceId ? waters.find(w => w.id === a.waterInvoiceId) : null;
                    return <tr key={a.id}><td className="px-3 py-2">{r ? `Loyer ${periodShort(r.month, r.year)}` : w ? `Eau ${periodShort(w.periodMonth, w.periodYear)} (${w.consumption} m³)` : ''}</td><td className="px-3 py-2 text-right font-bold">{formatMoney(a.allocatedAmount, currency)}</td></tr>;
                  })}</tbody></table>
              </div>
              <div className="mt-3 rounded-lg bg-slate-900 p-3 text-center text-[15px] font-extrabold text-white">Total reçu : {formatMoney(receipt.amount, currency)}</div>
              {receipt.comment && <p className="mt-2 text-center text-[12px] text-slate-500">« {receipt.comment} »</p>}
              <p className="mt-3 text-center text-[11px] italic text-slate-400">{state.settings.receiptFooter}</p>
              <div className="mt-4 flex justify-between text-[12px]"><span>Signature bailleur</span><span>Signature locataire</span></div>
            </div>
            <div className="mt-4 flex justify-end gap-2 print:hidden"><Btn variant="secondary" onClick={() => setReceiptId(null)}>Fermer</Btn><Btn onClick={() => { logAction({ action: 'export', module: 'Paiements', target: `Reçu ${receipt.reference}`, details: 'Impression ou enregistrement PDF du reçu demandé.' }); window.print(); }}><Printer size={14} /> Imprimer / PDF</Btn></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
