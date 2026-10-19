import { useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Trash2, Phone, Mail } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, StatusBadge, Modal, Field, inputCls, EmptyState, Pill, ProgressBar } from '../components/ui';
import type { Tenant } from '../types';
import { formatMoney, periodShort, formatDate, uid } from '../utils/helpers';

export default function Tenants({ search }: { search: string }) {
  const { state, update, rents, waters, tenantRentStatus, tenantWaterStatus } = useStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Tenant>>({});
  const [tab, setTab] = useState<'apercu' | 'loyers' | 'eau' | 'paiements'>('apercu');
  const currency = state.settings.currency;

  const filtered = useMemo(() => state.tenants.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) || t.phone.includes(q);
    if (!matchQ) return false;
    if (statusFilter === 'all') return true;
    const active = state.contracts.some(c => c.tenantId === t.id && c.status === 'actif');
    if (statusFilter === 'actif') return active;
    if (statusFilter === 'inactif') return !active;
    if (statusFilter === 'retard') { const r = tenantRentStatus(t.id); const w = tenantWaterStatus(t.id); return r.rest > 0 || w.rest > 0; }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.tenants, search, statusFilter, rents, waters]);

  const selected = state.tenants.find(t => t.id === selectedId) || null;
  const activeContract = selected ? state.contracts.find(c => c.tenantId === selected.id && c.status === 'actif') : null;
  const allContracts = selected ? state.contracts.filter(c => c.tenantId === selected.id) : [];
  const propOf = (contractId: string) => { const c = state.contracts.find(c => c.id === contractId); return c ? state.properties.find(p => p.id === c.propertyId) : null; };

  const openAdd = () => { setForm({ firstName: '', lastName: '', phone: '', email: '', address: '' }); setModal('add'); };
  const openEdit = (t: Tenant) => { setForm({ ...t }); setModal('edit'); };
  const save = () => {
    if (!form.firstName || !form.lastName || !form.phone) { alert('Nom, prénom et téléphone obligatoires.'); return; }
    if (modal === 'add') {
      update(s => { s.tenants.push({ id: uid('ten'), firstName: form.firstName!, lastName: form.lastName!, phone: form.phone!, email: form.email || '', address: form.address || '', idType: form.idType || '', idNumber: form.idNumber || '', emergencyContact: form.emergencyContact || '', emergencyPhone: form.emergencyPhone || '', notes: form.notes || '', createdAt: new Date().toISOString().slice(0, 10) }); return s; });
    } else if (modal === 'edit' && form.id) {
      update(s => { const i = s.tenants.findIndex(t => t.id === form.id); if (i >= 0) s.tenants[i] = { ...s.tenants[i], ...form } as Tenant; return s; });
    }
    setModal(null);
  };
  const remove = (id: string) => {
    const hasActive = state.contracts.some(c => c.tenantId === id && c.status === 'actif');
    if (hasActive) { alert('Impossible : locataire avec contrat actif.'); return; }
    if (!confirm('Supprimer ce locataire ? L\'historique restera consultable si des paiements existent — le locataire sera conservé dans l\'historique. Continuer ?')) return;
    update(s => { s.tenants = s.tenants.filter(t => t.id !== id); return s; });
    setSelectedId(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Locataires" subtitle={`${filtered.length} locataire(s)`} action={<Btn onClick={openAdd}><Plus size={15} /> Ajouter un locataire</Btn>} />
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 px-5 py-3">
          {([['all', 'Tous'], ['actif', 'Actifs'], ['inactif', 'Sans contrat actif'], ['retard', 'En retard']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`btn-uniform rounded-full px-4 py-2 text-[12.5px] font-bold shadow-sm ${statusFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[900px] text-left">
            <thead><tr className="bg-gradient-to-r from-violet-700 to-violet-600 text-[11px] uppercase tracking-wider text-white shadow">
              <th className="px-5 py-3">Locataire</th><th className="px-4 py-3">Logement</th><th className="px-4 py-3">État loyer</th><th className="px-4 py-3">État eau</th><th className="px-4 py-3">Reste total</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => {
                const r = tenantRentStatus(t.id); const w = tenantWaterStatus(t.id);
                const c = state.contracts.find(c => c.tenantId === t.id && c.status === 'actif');
                const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-[12px] font-extrabold text-blue-800">{t.firstName.charAt(0)}{t.lastName.charAt(0)}</span><div><p className="text-[13px] font-bold text-slate-900">{t.firstName} {t.lastName}</p><p className="text-[11.5px] text-slate-500">{t.phone}</p></div></div></td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{p ? `${p.reference} • ${p.type === 'studio' ? 'Studio' : p.type === 'appartement' ? 'Appt' : 'RDC'}` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} size="sm" /></td>
                    <td className="px-4 py-3"><StatusBadge status={w.status} size="sm" /></td>
                    <td className="px-4 py-3 text-[13px] font-extrabold text-slate-900">{formatMoney(r.rest + w.rest, currency)}</td>
                    <td className="px-4 py-3">{c ? <Pill color="green">Actif</Pill> : <Pill color="slate">Inactif</Pill>}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                      <button onClick={() => { setSelectedId(t.id); setTab('apercu'); }} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-blue-600 hover:text-white"><Eye size={16} /></button>
                      <button onClick={() => openEdit(t)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white"><Pencil size={16} /></button>
                      <button onClick={() => remove(t.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-rose-600 hover:text-white"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucun locataire" subtitle="Ajoutez votre premier locataire." action={<Btn onClick={openAdd}><Plus size={15} /> Ajouter</Btn>} />}
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} subtitle={activeContract ? `Contrat ${activeContract.reference} • ${propOf(activeContract.id)?.reference || ''}` : 'Sans contrat actif — historique conservé'} width="max-w-4xl">
        {selected && (() => {
          const r = tenantRentStatus(selected.id); const w = tenantWaterStatus(selected.id);
          const tenantRents = rents.filter(x => allContracts.some(c => c.id === x.contractId)).sort((a, b) => b.year - a.year || b.month - a.month);
          const tenantWaters = waters.filter(x => allContracts.some(c => c.id === x.contractId));
          const tenantPays = state.payments.filter(p => p.tenantId === selected.id).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[18px] font-extrabold text-white">{selected.firstName.charAt(0)}{selected.lastName.charAt(0)}</div>
                <div className="min-w-[200px] flex-1 text-[13px]">
                  <p className="flex items-center gap-1.5 text-slate-700"><Phone size={13} /> {selected.phone}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-slate-500"><Mail size={13} /> {selected.email || '—'}</p>
                  <p className="mt-0.5 text-slate-500">Enregistré le {formatDate(selected.createdAt)} • Pièce : {selected.idType || '—'} {selected.idNumber || ''}</p>
                </div>
                <div className="flex gap-2"><Btn variant="secondary" size="sm" onClick={() => { openEdit(selected); }}> <Pencil size={13} /> Modifier</Btn></div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="text-[13px] font-bold text-slate-800">État du loyer</p><StatusBadge status={r.status} size="sm" /></div>
                  <div className="mt-3 space-y-1 text-[12.5px]"><div className="flex justify-between"><span className="text-slate-500">Montant dû</span><span className="font-bold">{formatMoney(r.due, currency)}</span></div><div className="flex justify-between"><span className="text-slate-500">Payé</span><span className="font-bold text-emerald-700">{formatMoney(r.paid, currency)}</span></div><div className="flex justify-between"><span className="text-slate-500">Reste</span><span className="font-bold text-rose-700">{formatMoney(r.rest, currency)}</span></div></div>
                  <div className="mt-2"><ProgressBar value={r.paid} max={r.due || 1} color={r.rest === 0 ? 'green' : r.paid > 0 ? 'amber' : 'red'} /></div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="text-[13px] font-bold text-slate-800">État de l'eau</p><StatusBadge status={w.status} size="sm" /></div>
                  <div className="mt-3 space-y-1 text-[12.5px]"><div className="flex justify-between"><span className="text-slate-500">Montant dû</span><span className="font-bold">{formatMoney(w.due, currency)}</span></div><div className="flex justify-between"><span className="text-slate-500">Payé</span><span className="font-bold text-emerald-700">{formatMoney(w.paid, currency)}</span></div><div className="flex justify-between"><span className="text-slate-500">Reste</span><span className="font-bold text-rose-700">{formatMoney(w.rest, currency)}</span></div></div>
                  <div className="mt-2"><ProgressBar value={w.paid} max={w.due || 1} color={w.rest === 0 ? 'green' : w.paid > 0 ? 'amber' : 'red'} /></div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 p-3 text-center text-[13.5px] font-bold text-white">Total restant dû : <span className="text-amber-300">{formatMoney(r.rest + w.rest, currency)}</span></div>

              <div className="flex gap-2 border-b border-slate-100 pb-2">
                {([['apercu', 'Vue d\'ensemble'], ['loyers', `Loyers (${tenantRents.length})`], ['eau', `Eau (${tenantWaters.length})`], ['paiements', `Paiements (${tenantPays.length})`]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setTab(v)} className={`btn-uniform rounded-xl px-3.5 py-2 text-[12.5px] font-bold shadow-sm ${tab === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
                ))}
              </div>

              {tab === 'apercu' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-[13px]">
                  <div className="rounded-xl border border-slate-200 p-3"><p className="font-bold text-slate-800">Contrats ({allContracts.length})</p>{allContracts.map(c => <p key={c.id} className="mt-1 text-slate-600">{c.reference} • {propOf(c.id)?.reference} • {formatDate(c.startDate)} → {formatDate(c.endDate)} • <span className="font-bold">{c.status}</span></p>)} {allContracts.length === 0 && <p className="text-slate-500">Aucun contrat.</p>}</div>
                  <div className="rounded-xl border border-slate-200 p-3"><p className="font-bold text-slate-800">Contacts & notes</p><p className="mt-1 text-slate-600">Adresse : {selected.address || '—'}</p><p className="text-slate-600">Urgence : {selected.emergencyContact || '—'} {selected.emergencyPhone || ''}</p><p className="mt-1 text-slate-600">Notes : {selected.notes || '—'}</p></div>
                </div>
              )}
              {tab === 'loyers' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="app-table w-full text-left text-[12.5px]"><thead><tr className="bg-slate-50 text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Période</th><th className="px-3 py-2">Dû</th><th className="px-3 py-2">Payé</th><th className="px-3 py-2">Reste</th><th className="px-3 py-2">État</th></tr></thead><tbody className="divide-y">{tenantRents.map(x => <tr key={x.id}><td className="px-3 py-2 font-bold">{periodShort(x.month, x.year)}</td><td className="px-3 py-2">{formatMoney(x.amountDue, currency)}</td><td className="px-3 py-2 text-emerald-700">{formatMoney(x.paid, currency)}</td><td className="px-3 py-2 text-rose-700">{formatMoney(x.rest, currency)}</td><td className="px-3 py-2"><StatusBadge status={x.status} size="sm" /></td></tr>)}</tbody></table></div>
              )}
              {tab === 'eau' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="app-table w-full text-left text-[12.5px]"><thead><tr className="bg-slate-50 text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Période</th><th className="px-3 py-2">Index</th><th className="px-3 py-2">Conso.</th><th className="px-3 py-2">Montant</th><th className="px-3 py-2">Payé</th><th className="px-3 py-2">État</th></tr></thead><tbody className="divide-y">{tenantWaters.map(x => <tr key={x.id}><td className="px-3 py-2 font-bold">{periodShort(x.periodMonth, x.periodYear)}</td><td className="px-3 py-2">{x.previousIndex} → {x.currentIndex}</td><td className="px-3 py-2">{x.consumption} m³</td><td className="px-3 py-2">{formatMoney(x.amountDue, currency)}</td><td className="px-3 py-2 text-emerald-700">{formatMoney(x.paid, currency)}</td><td className="px-3 py-2"><StatusBadge status={x.status} size="sm" /></td></tr>)}{tenantWaters.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Aucune facture d'eau.</td></tr>}</tbody></table></div>
              )}
              {tab === 'paiements' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="app-table w-full text-left text-[12.5px]"><thead><tr className="bg-slate-50 text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Réf</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Montant</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Commentaire</th></tr></thead><tbody className="divide-y">{tenantPays.map(p => <tr key={p.id}><td className="px-3 py-2 font-bold text-blue-700">{p.reference}</td><td className="px-3 py-2">{formatDate(p.paymentDate)}</td><td className="px-3 py-2 font-bold">{formatMoney(p.amount, currency)}</td><td className="px-3 py-2">{p.kind}</td><td className="px-3 py-2 text-slate-500">{p.comment || '—'}</td></tr>)}{tenantPays.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">Aucun paiement.</td></tr>}</tbody></table></div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Ajouter un locataire' : 'Modifier le locataire'}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Prénom *"><input className={inputCls} value={form.firstName || ''} onChange={e => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom *"><input className={inputCls} value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Téléphone *"><input className={inputCls} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Adresse" className="md:col-span-2"><input className={inputCls} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Type pièce"><input className={inputCls} value={form.idType || ''} onChange={e => setForm({ ...form, idType: e.target.value })} placeholder="CNI, Passeport…" /></Field>
          <Field label="N° pièce"><input className={inputCls} value={form.idNumber || ''} onChange={e => setForm({ ...form, idNumber: e.target.value })} /></Field>
          <Field label="Contact urgence"><input className={inputCls} value={form.emergencyContact || ''} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} /></Field>
          <Field label="Tél. urgence"><input className={inputCls} value={form.emergencyPhone || ''} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} /></Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setModal(null)}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></div>
      </Modal>
    </div>
  );
}
