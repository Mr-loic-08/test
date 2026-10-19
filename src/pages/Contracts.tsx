import { useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Ban, FileText, Printer } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Pill, Modal, Field, inputCls, EmptyState, StatusBadge } from '../components/ui';
import type { Contract, ContractStatus } from '../types';
import { formatMoney, formatDate, uid, contractStatusLabel, periodShort } from '../utils/helpers';

export default function Contracts({ search }: { search: string }) {
  const { state, update, logAction, contractRents, contractWaters } = useStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Contract>>({});
  const [detailTab, setDetailTab] = useState<'infos' | 'loyers' | 'eau'>('infos');
  const currency = state.settings.currency;

  const filtered = useMemo(() => state.contracts.filter(c => {
    const t = state.tenants.find(t => t.id === c.tenantId);
    const p = state.properties.find(p => p.id === c.propertyId);
    const q = search.toLowerCase();
    const matchQ = !q || c.reference.toLowerCase().includes(q) || `${t?.firstName} ${t?.lastName}`.toLowerCase().includes(q) || (p?.reference.toLowerCase().includes(q) || false);
    return matchQ && (statusFilter === 'all' || c.status === statusFilter);
  }), [state.contracts, search, statusFilter, state.tenants, state.properties]);

  const selected = state.contracts.find(c => c.id === selectedId) || null;

  const openAdd = () => { setForm({ reference: `CT${String(state.contracts.length + 1).padStart(4, '0')}`, startDate: new Date().toISOString().slice(0, 10), endDate: '', monthlyRent: 0, depositAmount: 0, dueDay: state.settings.dueDayDefault, status: 'actif' }); setModal('add'); };
  const openEdit = (c: Contract) => { setForm({ ...c }); setModal('edit'); };

  const save = () => {
    if (!form.tenantId || !form.propertyId || !form.startDate || !form.endDate || !form.monthlyRent) { alert('Locataire, logement, dates et loyer obligatoires.'); return; }
    // règle: pas 2 contrats actifs sur même logement
    const conflict = state.contracts.some(c => c.propertyId === form.propertyId && c.status === 'actif' && c.id !== form.id && (modal === 'add' || form.status === 'actif'));
    if (conflict && (form.status === 'actif' || modal === 'add')) {
      if (!confirm('Attention : ce logement a déjà un contrat actif. Continuer quand même ? (Déconseillé)')) return;
    }
    if (modal === 'add') {
      const contract: Contract = {
        id: uid('ct'), reference: form.reference || `CT${Date.now()}`, propertyId: form.propertyId!, tenantId: form.tenantId!,
        startDate: form.startDate!, endDate: form.endDate!, monthlyRent: Number(form.monthlyRent),
        charges: Number(form.charges || 0), depositAmount: Number(form.depositAmount || 0), dueDay: Number(form.dueDay || 5),
        conditions: form.conditions || '', status: (form.status as ContractStatus) || 'actif', createdAt: new Date().toISOString(),
      };
      update(s => {
        s.contracts.push(contract);
        // générer échéances mensuelles entre start et end (max 36)
        const start = new Date(contract.startDate); const end = new Date(contract.endDate);
        const months: { m: number; y: number }[] = [];
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end && months.length < 36) { months.push({ m: cur.getMonth() + 1, y: cur.getFullYear() }); cur.setMonth(cur.getMonth() + 1); }
        months.forEach(({ m, y }) => {
          const exists = s.rentSchedules.some(r => r.contractId === contract.id && r.month === m && r.year === y);
          if (!exists) s.rentSchedules.push({ id: uid('rs'), contractId: contract.id, month: m, year: y, amountDue: contract.monthlyRent, createdAt: new Date().toISOString() });
        });
        // marquer logement occupé si actif
        if (contract.status === 'actif') { const p = s.properties.find(p => p.id === contract.propertyId); if (p) { p.status = 'occupe'; p.monthlyRent = contract.monthlyRent; } }
        return s;
      });
    } else if (modal === 'edit' && form.id) {
      update(s => { const i = s.contracts.findIndex(c => c.id === form.id); if (i >= 0) s.contracts[i] = { ...s.contracts[i], ...form } as Contract; return s; });
    }
    setModal(null);
  };

  const resiliate = (c: Contract) => {
    if (!confirm(`Résilier le contrat ${c.reference} ?`)) return;
    update(s => {
      const i = s.contracts.findIndex(x => x.id === c.id);
      if (i >= 0) s.contracts[i].status = 'resilie';
      const p = s.properties.find(p => p.id === c.propertyId);
      // si plus aucun contrat actif sur ce logement -> libre
      const stillActive = s.contracts.some(x => x.propertyId === c.propertyId && x.status === 'actif' && x.id !== c.id);
      if (p && !stillActive) p.status = 'libre';
      return s;
    });
  };

  const statusColor = (s: ContractStatus) => s === 'actif' ? 'green' : s === 'a_venir' ? 'blue' : s === 'expire' ? 'amber' : 'red';
  const freeProperties = state.properties.filter(p => p.status !== 'occupe' || (form.propertyId && p.id === form.propertyId));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Contrats de location" subtitle={`${filtered.length} contrat(s) — référence pour les échéances`} action={<Btn onClick={openAdd}><Plus size={15} /> Nouveau contrat</Btn>} />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {([['all', 'Tous'], ['actif', 'Actifs'], ['a_venir', 'À venir'], ['expire', 'Expirés'], ['resilie', 'Résiliés']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`btn-uniform rounded-full px-4 py-2 text-[12.5px] font-bold shadow-sm ${statusFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[880px] text-left">
            <thead><tr className="bg-gradient-to-r from-indigo-700 to-violet-600 text-[11px] uppercase tracking-wider text-white shadow">
              <th className="px-5 py-3">N° Contrat</th><th className="px-4 py-3">Locataire</th><th className="px-4 py-3">Logement</th><th className="px-4 py-3">Début</th><th className="px-4 py-3">Fin</th><th className="px-4 py-3">Loyer</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => {
                const t = state.tenants.find(t => t.id === c.tenantId);
                const p = state.properties.find(p => p.id === c.propertyId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-[13px] font-extrabold text-blue-700">{c.reference}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{t ? `${t.firstName} ${t.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{p?.reference || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{formatDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{formatDate(c.endDate)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold">{formatMoney(c.monthlyRent, currency)}</td>
                    <td className="px-4 py-3"><Pill color={statusColor(c.status) as 'green'}>{contractStatusLabel(c.status)}</Pill></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                      <button onClick={() => { setSelectedId(c.id); setDetailTab('infos'); }} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-blue-600 hover:text-white"><Eye size={16} /></button>
                      <button onClick={() => openEdit(c)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white"><Pencil size={16} /></button>
                      {c.status === 'actif' && <button onClick={() => resiliate(c)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-rose-600 hover:text-white" title="Résilier"><Ban size={16} /></button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucun contrat" action={<Btn onClick={openAdd}><Plus size={15} /> Nouveau contrat</Btn>} />}
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `Contrat ${selected.reference}` : ''} subtitle="Détail du contrat" width="max-w-3xl">
        {selected && (() => {
          const t = state.tenants.find(t => t.id === selected.tenantId);
          const p = state.properties.find(p => p.id === selected.propertyId);
          const rs = contractRents(selected.id); const ws = contractWaters(selected.id);
          const rPaid = rs.reduce((s, r) => s + r.paid, 0); const rDue = rs.reduce((s, r) => s + r.amountDue, 0);
          const wPaid = ws.reduce((s, w) => s + w.paid, 0); const wDue = ws.reduce((s, w) => s + w.amountDue, 0);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white"><FileText size={18} /></div><div><p className="text-[14px] font-extrabold">{t?.firstName} {t?.lastName} • {p?.reference}</p><p className="text-[12px] text-slate-500">{formatDate(selected.startDate)} → {formatDate(selected.endDate)}</p></div></div>
                <Pill color={statusColor(selected.status) as 'green'}>{contractStatusLabel(selected.status)}</Pill>
              </div>
              <div className="flex gap-2">
                {([['infos', 'Informations'], ['loyers', `Loyers (${rs.length})`], ['eau', `Eau (${ws.length})`]] as const).map(([v, l]) => <button key={v} onClick={() => setDetailTab(v)} className={`btn-uniform rounded-xl px-3.5 py-2 text-[12.5px] font-bold shadow-sm ${detailTab === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}
              </div>
              {detailTab === 'infos' && (
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Locataire</p><p className="font-bold">{t?.firstName} {t?.lastName}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Logement</p><p className="font-bold">{p?.reference} • {p?.address}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Loyer mensuel</p><p className="font-bold">{formatMoney(selected.monthlyRent, currency)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Caution</p><p className="font-bold">{formatMoney(selected.depositAmount, currency)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Jour d'échéance</p><p className="font-bold">Le {selected.dueDay} de chaque mois</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Synthèse loyers</p><p className="font-bold">{formatMoney(rPaid, currency)} / {formatMoney(rDue, currency)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Synthèse eau</p><p className="font-bold">{formatMoney(wPaid, currency)} / {formatMoney(wDue, currency)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Conditions</p><p className="font-bold">{selected.conditions || '—'}</p></div>
                </div>
              )}
              {detailTab === 'loyers' && (
                <div className="max-h-[300px] overflow-y-auto rounded-xl border"><table className="app-table w-full text-left text-[12.5px]"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-3 py-2">Période</th><th className="px-3 py-2">Dû</th><th className="px-3 py-2">Payé</th><th className="px-3 py-2">Reste</th><th className="px-3 py-2">État</th></tr></thead><tbody className="divide-y">{rs.map(r => <tr key={r.id}><td className="px-3 py-2 font-bold">{periodShort(r.month, r.year)}</td><td className="px-3 py-2">{formatMoney(r.amountDue, currency)}</td><td className="px-3 py-2">{formatMoney(r.paid, currency)}</td><td className="px-3 py-2">{formatMoney(r.rest, currency)}</td><td className="px-3 py-2"><StatusBadge status={r.status} size="sm" /></td></tr>)}</tbody></table></div>
              )}
              {detailTab === 'eau' && (
                <div className="max-h-[300px] overflow-y-auto rounded-xl border"><table className="app-table w-full text-left text-[12.5px]"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-3 py-2">Période</th><th className="px-3 py-2">Conso</th><th className="px-3 py-2">Montant</th><th className="px-3 py-2">Payé</th><th className="px-3 py-2">État</th></tr></thead><tbody className="divide-y">{ws.map(w => <tr key={w.id}><td className="px-3 py-2 font-bold">{periodShort(w.periodMonth, w.periodYear)}</td><td className="px-3 py-2">{w.consumption} m³</td><td className="px-3 py-2">{formatMoney(w.amountDue, currency)}</td><td className="px-3 py-2">{formatMoney(w.paid, currency)}</td><td className="px-3 py-2"><StatusBadge status={w.status} size="sm" /></td></tr>)}{ws.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">Aucune facture.</td></tr>}</tbody></table></div>
              )}
              <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => { logAction({ action: 'export', module: 'Contrats', target: selected.reference, details: 'Impression du contrat demandée.' }); window.print(); }}><Printer size={14} /> Imprimer</Btn><Btn onClick={() => setSelectedId(null)}>Fermer</Btn></div>
            </div>
          );
        })()}
      </Modal>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Nouveau contrat' : 'Modifier le contrat'} subtitle="Le contrat sert de référence pour les échéances">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Référence"><input className={inputCls} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="Statut"><select className={inputCls} value={form.status || 'actif'} onChange={e => setForm({ ...form, status: e.target.value as ContractStatus })}><option value="a_venir">À venir</option><option value="actif">Actif</option><option value="expire">Expiré</option><option value="resilie">Résilié</option></select></Field>
          <Field label="Locataire *"><select className={inputCls} value={form.tenantId || ''} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">— Choisir —</option>{state.tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></Field>
          <Field label="Logement *"><select className={inputCls} value={form.propertyId || ''} onChange={e => { const p = state.properties.find(p => p.id === e.target.value); setForm({ ...form, propertyId: e.target.value, monthlyRent: p?.monthlyRent || form.monthlyRent }); }}><option value="">— Choisir —</option>{state.properties.map(p => <option key={p.id} value={p.id}>{p.reference} • {p.address} ({p.status})</option>)}</select></Field>
          <Field label="Date début *"><input type="date" className={inputCls} value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="Date fin *"><input type="date" className={inputCls} value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="Loyer mensuel *"><input type="number" className={inputCls} value={form.monthlyRent || ''} onChange={e => setForm({ ...form, monthlyRent: Number(e.target.value) })} /></Field>
          <Field label="Caution"><input type="number" className={inputCls} value={form.depositAmount || ''} onChange={e => setForm({ ...form, depositAmount: Number(e.target.value) })} /></Field>
          <Field label="Jour d'échéance"><input type="number" min={1} max={28} className={inputCls} value={form.dueDay || 5} onChange={e => setForm({ ...form, dueDay: Number(e.target.value) })} /></Field>
          <Field label="Charges"><input type="number" className={inputCls} value={form.charges || ''} onChange={e => setForm({ ...form, charges: Number(e.target.value) })} /></Field>
          <Field label="Conditions particulières" className="md:col-span-2"><textarea className={inputCls} rows={2} value={form.conditions || ''} onChange={e => setForm({ ...form, conditions: e.target.value })} /></Field>
        </div>
        {freeProperties.length === 0 && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-700">Tous les logements sont occupés.</p>}
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setModal(null)}>Annuler</Btn><Btn onClick={save}>Enregistrer + générer échéances</Btn></div>
      </Modal>
    </div>
  );
}
