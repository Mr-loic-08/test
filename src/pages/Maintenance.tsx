import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Pill, Modal, Field, inputCls, EmptyState } from '../components/ui';
import type { MaintenanceItem, MaintenanceStatus, MaintenancePriority } from '../types';
import { formatMoney, formatDate, uid, maintenanceStatusLabel, priorityLabel } from '../utils/helpers';

export default function Maintenance({ search }: { search: string }) {
  const { state, update } = useStore();
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceItem>>({});
  const currency = state.settings.currency;

  const filtered = useMemo(() => [...state.maintenances].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).filter(m => {
    const p = state.properties.find(p => p.id === m.propertyId);
    const q = search.toLowerCase();
    const matchQ = !q || m.title.toLowerCase().includes(q) || (p?.reference.toLowerCase().includes(q) || false);
    return matchQ && (statusF === 'all' || m.status === statusF);
  }), [state.maintenances, search, statusF, state.properties]);

  const totalCost = filtered.reduce((s, m) => s + (m.cost || 0), 0);

  const openAdd = () => { setForm({ propertyId: state.properties[0]?.id, title: '', description: '', priority: 'moyenne', status: 'signale', reportedAt: new Date().toISOString().slice(0, 10) }); setModal(true); };
  const openEdit = (m: MaintenanceItem) => { setForm({ ...m }); setModal(true); };
  const save = () => {
    if (!form.propertyId || !form.title) { alert('Logement et titre obligatoires.'); return; }
    if (form.id) {
      update(s => { const i = s.maintenances.findIndex(x => x.id === form.id); if (i >= 0) s.maintenances[i] = { ...s.maintenances[i], ...form } as MaintenanceItem; return s; });
    } else {
      update(s => { s.maintenances.push({ id: uid('mnt'), propertyId: form.propertyId!, title: form.title!, description: form.description || '', priority: (form.priority as MaintenancePriority) || 'moyenne', cost: Number(form.cost || 0), provider: form.provider || '', status: (form.status as MaintenanceStatus) || 'signale', reportedAt: form.reportedAt || new Date().toISOString().slice(0, 10), notes: form.notes || '' }); return s; });
    }
    setModal(false);
  };
  const remove = (id: string) => { if (!confirm('Supprimer ?')) return; update(s => { s.maintenances = s.maintenances.filter(m => m.id !== id); return s; }); };
  const setStatus = (id: string, status: MaintenanceStatus) => update(s => { const m = s.maintenances.find(x => x.id === id); if (m) { m.status = status; if (status === 'termine') m.completedAt = new Date().toISOString().slice(0, 10); } return s; });

  const prColor = (p: MaintenancePriority) => p === 'urgente' ? 'red' : p === 'haute' ? 'amber' : p === 'moyenne' ? 'blue' : 'slate';
  const stColor = (s: MaintenanceStatus) => s === 'termine' ? 'green' : s === 'en_cours' ? 'blue' : s === 'annule' ? 'slate' : 'amber';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(['signale', 'en_cours', 'termine'] as MaintenanceStatus[]).map(st => (
          <Card key={st}><div className="p-4"><p className="text-[12px] font-bold uppercase text-slate-500">{maintenanceStatusLabel(st)}</p><p className="mt-1 text-[24px] font-extrabold">{state.maintenances.filter(m => m.status === st).length}</p></div></Card>
        ))}
        <Card><div className="p-4"><p className="text-[12px] font-bold uppercase text-slate-500">Coût total suivi</p><p className="mt-1 text-[20px] font-extrabold">{formatMoney(totalCost, currency)}</p></div></Card>
      </div>
      <Card>
        <CardHeader title="Demandes de maintenance" subtitle="Suivi logement • priorité • coût • prestataire • statut" action={<Btn onClick={openAdd}><Plus size={15} /> Nouvelle demande</Btn>} />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {([['all', 'Toutes'], ['signale', 'Signalées'], ['en_cours', 'En cours'], ['termine', 'Terminées'], ['annule', 'Annulées']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusF(v)} className={`btn-uniform rounded-full px-4 py-2 text-[12.5px] font-bold shadow-sm ${statusF === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[900px] text-left">
            <thead><tr className="bg-gradient-to-r from-amber-600 to-orange-600 text-[11px] uppercase tracking-wider text-white shadow"><th className="px-5 py-3">Date</th><th className="px-4 py-3">Logement</th><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Priorité</th><th className="px-4 py-3">Prestataire</th><th className="px-4 py-3 text-right">Coût</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 text-[12.5px]">{formatDate(m.reportedAt)}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-blue-700">{state.properties.find(p => p.id === m.propertyId)?.reference}</td>
                  <td className="px-4 py-3"><p className="text-[13px] font-bold">{m.title}</p><p className="max-w-[260px] truncate text-[12px] text-slate-500">{m.description}</p></td>
                  <td className="px-4 py-3"><Pill color={prColor(m.priority) as 'red'}>{priorityLabel(m.priority)}</Pill></td>
                  <td className="px-4 py-3 text-[12.5px]">{m.provider || '—'}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-bold">{m.cost ? formatMoney(m.cost, currency) : '—'}</td>
                  <td className="px-4 py-3"><select value={m.status} onChange={e => setStatus(m.id, e.target.value as MaintenanceStatus)} className={`rounded-full border px-2 py-1 text-[12px] font-bold ${stColor(m.status) === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : stColor(m.status) === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><option value="signale">Signalé</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="annule">Annulé</option></select></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button onClick={() => openEdit(m)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white"><Pencil size={16} /></button><button onClick={() => remove(m.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-rose-600 hover:text-white"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucune demande" subtitle="Créez votre première demande de maintenance." action={<Btn onClick={openAdd}>Nouvelle demande</Btn>} />}
        </div>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Modifier la demande' : 'Nouvelle demande de maintenance'}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Logement *"><select className={inputCls} value={form.propertyId || ''} onChange={e => setForm({ ...form, propertyId: e.target.value })}>{state.properties.map(p => <option key={p.id} value={p.id}>{p.reference} — {p.address}</option>)}</select></Field>
          <Field label="Date signalement"><input type="date" className={inputCls} value={form.reportedAt || ''} onChange={e => setForm({ ...form, reportedAt: e.target.value })} /></Field>
          <Field label="Titre *" className="md:col-span-2"><input className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Fuite robinet cuisine" /></Field>
          <Field label="Description" className="md:col-span-2"><textarea className={inputCls} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Priorité"><select className={inputCls} value={form.priority || 'moyenne'} onChange={e => setForm({ ...form, priority: e.target.value as MaintenancePriority })}><option value="basse">Basse</option><option value="moyenne">Moyenne</option><option value="haute">Haute</option><option value="urgente">Urgente</option></select></Field>
          <Field label="Statut"><select className={inputCls} value={form.status || 'signale'} onChange={e => setForm({ ...form, status: e.target.value as MaintenanceStatus })}><option value="signale">Signalé</option><option value="en_cours">En cours</option><option value="termine">Terminé</option><option value="annule">Annulé</option></select></Field>
          <Field label="Coût (F)"><input type="number" className={inputCls} value={form.cost || ''} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} /></Field>
          <Field label="Prestataire"><input className={inputCls} value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} /></Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></div>
      </Modal>
    </div>
  );
}
