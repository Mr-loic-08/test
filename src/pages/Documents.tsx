import { useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Download, FolderOpen } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Pill, Modal, Field, inputCls, EmptyState } from '../components/ui';
import type { DocumentType } from '../types';
import { formatDate, uid } from '../utils/helpers';

export default function Documents({ search }: { search: string }) {
  const { state, update } = useStore();
  const [typeF, setTypeF] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'autre' as DocumentType, tenantId: '', propertyId: '', contractId: '' });

  const filtered = useMemo(() => [...state.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q);
    return matchQ && (typeF === 'all' || d.type === typeF);
  }), [state.documents, search, typeF]);

  const typeLabel = (t: string) => ({ contrat: 'Contrat', piece: 'Pièce justificative', recu: 'Reçu', etat_lieux: 'État des lieux', facture: 'Facture', autre: 'Autre' } as Record<string, string>)[t] || t;

  const save = () => {
    if (!form.name) { alert('Nom du document obligatoire.'); return; }
    update(s => { s.documents.push({ id: uid('doc'), name: form.name, type: form.type, tenantId: form.tenantId || undefined, propertyId: form.propertyId || undefined, contractId: form.contractId || undefined, filePath: `C:\\GestionLocative\\docs\\${form.name}`, size: '—', createdAt: new Date().toISOString() }); return s; });
    setModal(false);
  };
  const remove = (id: string) => { if (!confirm('Supprimer la référence du document ? (Le fichier local n\'est pas effacé)')) return; update(s => { s.documents = s.documents.filter(d => d.id !== id); return s; }); };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-900">
        <p className="flex items-center gap-2 font-extrabold"><FolderOpen size={16} /> Stockage local — application desktop</p>
        <p className="mt-1">Les fichiers sont conservés localement sur l'ordinateur ou référencés par leur chemin (ex : <code className="rounded bg-white px-1">C:\GestionLocative\docs\…</code>). Pensez à inclure le dossier des pièces jointes dans votre sauvegarde complète.</p>
      </div>
      <Card>
        <CardHeader title="Documents" subtitle={`${filtered.length} document(s) référencés`} action={<Btn onClick={() => setModal(true)}><Plus size={15} /> Ajouter un document</Btn>} />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {([['all', 'Tous'], ['contrat', 'Contrats'], ['piece', 'Pièces'], ['recu', 'Reçus'], ['etat_lieux', 'États des lieux'], ['facture', 'Factures'], ['autre', 'Autres']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTypeF(v)} className={`btn-uniform rounded-full px-4 py-2 text-[12.5px] font-bold shadow-sm ${typeF === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[860px] text-left">
            <thead><tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-[11px] uppercase tracking-wider text-white shadow"><th className="px-5 py-3">Nom</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Locataire</th><th className="px-4 py-3">Logement</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Chemin local</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileText size={15} /></span><span className="text-[13px] font-bold">{d.name}</span></div></td>
                  <td className="px-4 py-3"><Pill color="blue">{typeLabel(d.type)}</Pill></td>
                  <td className="px-4 py-3 text-[12.5px]">{d.tenantId ? `${state.tenants.find(t => t.id === d.tenantId)?.firstName || ''} ${state.tenants.find(t => t.id === d.tenantId)?.lastName || ''}` : '—'}</td>
                  <td className="px-4 py-3 text-[12.5px]">{d.propertyId ? state.properties.find(p => p.id === d.propertyId)?.reference : '—'}</td>
                  <td className="px-4 py-3 text-[12.5px]">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate text-[11.5px] text-slate-500" title={d.filePath}>{d.filePath || '—'}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white" title="Ouvrir (desktop)"><Download size={16} /></button><button onClick={() => remove(d.id)} className="btn-uniform btn-icon rounded-lg border border-transparent p-1.5 text-slate-500 hover:bg-rose-600 hover:text-white"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="Aucun document" action={<Btn onClick={() => setModal(true)}>Ajouter</Btn>} />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Ajouter un document" subtitle="Référencez un fichier local (chemin conservé)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom du fichier *" className="md:col-span-2"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex : Contrat_Jean_Dupont.pdf" /></Field>
          <Field label="Type"><select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as DocumentType })}><option value="contrat">Contrat</option><option value="piece">Pièce justificative</option><option value="recu">Reçu</option><option value="etat_lieux">État des lieux</option><option value="facture">Facture</option><option value="autre">Autre</option></select></Field>
          <Field label="Locataire"><select className={inputCls} value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">—</option>{state.tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></Field>
          <Field label="Logement"><select className={inputCls} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}><option value="">—</option>{state.properties.map(p => <option key={p.id} value={p.id}>{p.reference}</option>)}</select></Field>
          <Field label="Contrat"><select className={inputCls} value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })}><option value="">—</option>{state.contracts.map(c => <option key={c.id} value={c.id}>{c.reference}</option>)}</select></Field>
          <div className="md:col-span-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-[13px] text-slate-500">
            <p className="font-bold text-slate-700">Glissez un fichier ici (simulation desktop)</p>
            <p className="mt-1">En version Electron, le fichier sera copié dans le dossier local de l'application et son chemin enregistré en base SQLite.</p>
            <Btn variant="secondary" size="sm" className="mt-3">Parcourir…</Btn>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn><Btn onClick={save}>Enregistrer la référence</Btn></div>
      </Modal>
    </div>
  );
}
