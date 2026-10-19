import { useMemo, useState } from 'react';
import { Plus, Building2, Search, Eye, Pencil, Trash2, Droplets, FileText, Banknote } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Pill, Modal, Field, inputCls, EmptyState, ProgressBar } from '../components/ui';
import type { Property, PropertyStatus, PropertyType } from '../types';
import { formatMoney, propertyStatusLabel, propertyTypeLabel, uid, formatDate } from '../utils/helpers';
import { HOUSING_IMG } from '../components/layout';

export default function Properties({ search }: { search: string }) {
  const { state, update, contractRents, contractWaters } = useStore();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Property>>({});
  const currency = state.settings.currency;

  const filtered = useMemo(() => {
    return state.properties.filter(p => {
      const q = search.toLowerCase();
      const matchQ = !q || p.reference.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || p.type === typeFilter;
      const matchS = statusFilter === 'all' || p.status === statusFilter;
      return matchQ && matchT && matchS;
    });
  }, [state.properties, search, typeFilter, statusFilter]);

  const selected = state.properties.find(p => p.id === selectedId) || null;
  const selectedContract = selected ? state.contracts.find(c => c.propertyId === selected.id && c.status === 'actif') : null;
  const selectedTenant = selectedContract ? state.tenants.find(t => t.id === selectedContract.tenantId) : null;
  const selectedMeter = selected ? state.waterMeters.find(m => m.propertyId === selected.id) : null;

  const openAdd = () => { setForm({ reference: '', type: 'appartement', address: '', description: '', monthlyRent: 0, status: 'libre', surface: 0, etage: '' }); setModal('add'); };
  const openEdit = (p: Property) => { setForm({ ...p }); setModal('edit'); };

  const save = () => {
    if (!form.reference || !form.address || !form.monthlyRent) { alert('Référence, adresse et loyer mensuel sont obligatoires.'); return; }
    if (modal === 'add') {
      const prop: Property = {
        id: uid('prop'), reference: form.reference!.toUpperCase(), type: (form.type as PropertyType) || 'appartement',
        address: form.address!, description: form.description || '', monthlyRent: Number(form.monthlyRent),
        charges: Number(form.charges || 0), status: (form.status as PropertyStatus) || 'libre',
        notes: form.notes || '', equipements: [], surface: Number(form.surface || 0), etage: form.etage || '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      update(s => { s.properties.push(prop); s.waterMeters.push({ id: uid('wm'), propertyId: prop.id, meterNumber: `EA-${String(s.waterMeters.length + 1).padStart(3, '0')}`, installationDate: new Date().toISOString().slice(0, 10), status: 'actif', createdAt: new Date().toISOString() }); return s; });
    } else if (modal === 'edit' && form.id) {
      update(s => { const i = s.properties.findIndex(p => p.id === form.id); if (i >= 0) s.properties[i] = { ...s.properties[i], ...form, updatedAt: new Date().toISOString() } as Property; return s; });
    }
    setModal(null);
  };

  const remove = (id: string) => {
    const hasActive = state.contracts.some(c => c.propertyId === id && c.status === 'actif');
    if (hasActive) { alert('Impossible : ce logement a un contrat actif. Résiliez d\'abord le contrat.'); return; }
    if (!confirm('Supprimer ce logement ?')) return;
    update(s => { s.properties = s.properties.filter(p => p.id !== id); return s; });
    setSelectedId(null);
  };

  const statusColor = (s: PropertyStatus) => s === 'occupe' ? 'green' : s === 'libre' ? 'blue' : s === 'reserve' ? 'amber' : 'red';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(['appartement', 'studio', 'rez-de-chaussee'] as PropertyType[]).map(t => (
          <Card key={t}><div className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Building2 size={19} /></div><div><p className="text-[20px] font-extrabold text-slate-900">{state.properties.filter(p => p.type === t).length}</p><p className="text-[12px] font-semibold text-slate-500">{propertyTypeLabel(t)}s</p></div></div></Card>
        ))}
        <Card><div className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Banknote size={19} /></div><div><p className="text-[18px] font-extrabold text-slate-900">{formatMoney(state.properties.filter(p => p.status === 'occupe').reduce((s, p) => s + p.monthlyRent, 0), currency)}</p><p className="text-[12px] font-semibold text-slate-500">Loyers mensuels (occupés)</p></div></div></Card>
      </div>

      <Card>
        <CardHeader title="Biens" subtitle={`${filtered.length} logement(s)`} action={<Btn onClick={openAdd}><Plus size={15} /> Ajouter un bien</Btn>} />
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} readOnly placeholder="Recherche globale (barre du haut)…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] outline-none" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium">
            <option value="all">Tous les types</option>
            <option value="appartement">Appartement</option>
            <option value="studio">Studio</option>
            <option value="rez-de-chaussee">Rez-de-chaussée</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium">
            <option value="all">Tous les statuts</option>
            <option value="libre">Libre</option>
            <option value="occupe">Occupé</option>
            <option value="reserve">Réservé</option>
            <option value="maintenance">En maintenance</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[820px] text-left">
            <thead><tr className="bg-gradient-to-r from-slate-700 to-blue-700 text-[11px] uppercase tracking-wider text-white shadow">
              <th className="px-5 py-3">Type</th><th className="px-4 py-3">Réf</th><th className="px-4 py-3">Étage</th><th className="px-4 py-3">Surface</th><th className="px-4 py-3">Loyer</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Building2 size={15} /></span><span className="text-[13px] font-bold text-slate-800">{propertyTypeLabel(p.type)}</span></div></td>
                  <td className="px-4 py-3 text-[13px] font-bold text-blue-700">{p.reference}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{p.etage || '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{p.surface ? `${p.surface} m²` : '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-900">{formatMoney(p.monthlyRent, currency)}</td>
                  <td className="px-4 py-3"><Pill color={statusColor(p.status) as 'green'}>{propertyStatusLabel(p.status)}</Pill></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    <button onClick={() => setSelectedId(p.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-blue-600 hover:text-white" title="Voir"><Eye size={16} /></button>
                    <button onClick={() => openEdit(p)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white" title="Modifier"><Pencil size={16} /></button>
                    <button onClick={() => remove(p.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-rose-600 hover:text-white" title="Supprimer"><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucun bien trouvé" subtitle="Modifiez les filtres ou ajoutez un nouveau logement." action={<Btn onClick={openAdd}><Plus size={15} /> Ajouter un bien</Btn>} />}
        </div>
      </Card>

      {/* Fiche détail */}
      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `Détails du logement — ${selected.reference}` : ''} subtitle={selected ? `${propertyTypeLabel(selected.type)} • ${selected.address}` : ''} width="max-w-3xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200"><img src={HOUSING_IMG} alt={selected.reference} className="h-[170px] w-full object-cover"/><span className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-extrabold text-white">{selected.reference}</span></div>
              <div className="md:col-span-2 grid grid-cols-2 gap-3 text-[13px]">
                <div><p className="font-semibold text-slate-500">Type</p><p className="font-bold text-slate-900">{propertyTypeLabel(selected.type)}</p></div>
                <div><p className="font-semibold text-slate-500">Statut</p><Pill color={statusColor(selected.status) as 'green'}>{propertyStatusLabel(selected.status)}</Pill></div>
                <div><p className="font-semibold text-slate-500">Loyer mensuel</p><p className="font-bold text-slate-900">{formatMoney(selected.monthlyRent, currency)}</p></div>
                <div><p className="font-semibold text-slate-500">Charges</p><p className="font-bold text-slate-900">{formatMoney(selected.charges || 0, currency)}</p></div>
                <div><p className="font-semibold text-slate-500">Surface / Étage</p><p className="font-bold text-slate-900">{selected.surface} m² • {selected.etage}</p></div>
                <div><p className="font-semibold text-slate-500">Compteur d'eau</p><p className="font-bold text-slate-900">{selectedMeter ? selectedMeter.meterNumber : '—'}</p></div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">Description</p>
              <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700">{selected.description || '—'}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><FileText size={15} className="text-blue-600" /> Locataire actuel</div>
                {selectedTenant && selectedContract ? (
                  <div className="text-[13px]"><p className="font-bold">{selectedTenant.firstName} {selectedTenant.lastName}</p><p className="text-slate-500">{selectedTenant.phone}</p><p className="mt-1 text-slate-500">Contrat {selectedContract.reference} • {formatDate(selectedContract.startDate)} → {formatDate(selectedContract.endDate)}</p></div>
                ) : <p className="text-[13px] text-slate-500">Aucun contrat actif — logement disponible.</p>}
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><Droplets size={15} className="text-teal-600" /> Compteur & eau</div>
                {selectedMeter ? (
                  <div className="text-[13px]"><p className="font-bold">N° {selectedMeter.meterNumber}</p><p className="text-slate-500">Installé le {formatDate(selectedMeter.installationDate)} • {selectedMeter.status}</p>
                    {selectedContract && (() => { const ws = contractWaters(selectedContract.id); const rest = ws.reduce((s, w) => s + w.rest, 0); return <div className="mt-2"><ProgressBar value={ws.reduce((s, w) => s + w.paid, 0)} max={ws.reduce((s, w) => s + w.amountDue, 0) || 1} color={rest > 0 ? 'amber' : 'green'} /><p className="mt-1 text-[12px] text-slate-500">Reste eau : {formatMoney(rest, currency)}</p></div>; })()}
                  </div>
                ) : <p className="text-[13px] text-slate-500">Aucun compteur associé.</p>}
              </div>
            </div>
            {selectedContract && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><Banknote size={15} className="text-emerald-600" /> Loyers du contrat {selectedContract.reference}</div>
                {(() => { const rs = contractRents(selectedContract.id); const paid = rs.reduce((s, r) => s + r.paid, 0); const due = rs.reduce((s, r) => s + r.amountDue, 0); return (<><ProgressBar value={paid} max={due || 1} color={due - paid > 0 ? 'amber' : 'green'} /><p className="mt-1 text-[12.5px] text-slate-600">{formatMoney(paid, currency)} / {formatMoney(due, currency)} • Reste {formatMoney(due - paid, currency)}</p></>); })()}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => { if (selected) openEdit(selected); setSelectedId(null); }}><Pencil size={14} /> Modifier</Btn>
              <Btn onClick={() => setSelectedId(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Ajouter un bien' : 'Modifier le bien'} subtitle="Renseignez les informations du logement">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Référence *"><input className={inputCls} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Ex : A03" /></Field>
          <Field label="Type *"><select className={inputCls} value={form.type || 'appartement'} onChange={e => setForm({ ...form, type: e.target.value as PropertyType })}><option value="appartement">Appartement</option><option value="studio">Studio</option><option value="rez-de-chaussee">Rez-de-chaussée</option></select></Field>
          <Field label="Adresse / localisation *" className="md:col-span-2"><input className={inputCls} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rue, quartier, ville" /></Field>
          <Field label="Loyer mensuel (F) *"><input type="number" className={inputCls} value={form.monthlyRent || ''} onChange={e => setForm({ ...form, monthlyRent: Number(e.target.value) })} /></Field>
          <Field label="Charges (F)"><input type="number" className={inputCls} value={form.charges || ''} onChange={e => setForm({ ...form, charges: Number(e.target.value) })} /></Field>
          <Field label="Surface (m²)"><input type="number" className={inputCls} value={form.surface || ''} onChange={e => setForm({ ...form, surface: Number(e.target.value) })} /></Field>
          <Field label="Étage"><input className={inputCls} value={form.etage || ''} onChange={e => setForm({ ...form, etage: e.target.value })} placeholder="RDC, 1er, 2ème…" /></Field>
          <Field label="Statut"><select className={inputCls} value={form.status || 'libre'} onChange={e => setForm({ ...form, status: e.target.value as PropertyStatus })}><option value="libre">Libre</option><option value="occupe">Occupé</option><option value="reserve">Réservé</option><option value="maintenance">En maintenance</option></select></Field>
          <Field label="Description" className="md:col-span-2"><textarea className={inputCls} rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setModal(null)}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></div>
      </Modal>
    </div>
  );
}
