import { useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRightLeft, CheckCircle2, Download, Laptop, Pencil, RefreshCw, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { useStore } from '../store/store';
import { useToast } from './notifications';
import { Btn, Card, CardHeader, Field, inputCls, Modal, Pill } from './ui';
import { downloadFile, formatDateTime } from '../utils/helpers';
import { backupCounts, buildBackupFile, mergeStates, parseBackup, type MergeReport } from '../utils/sync';
import type { AppState } from '../types';

interface Pending {
  fileName: string;
  incoming: AppState;
  exportedAt?: string;
  peerName?: string;
  report: MergeReport;
  merged: AppState;
}

export default function SyncPanel() {
  const { state, device, updateDevice, applyState, importState, logAction } = useStore();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [mode, setMode] = useState<'fusion' | 'remplacement'>('fusion');
  const [importSettings, setImportSettings] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(device.name);

  const exportForSync = () => {
    const now = new Date();
    const file = buildBackupFile(state, { id: device.id, name: device.name }, now);
    const slug = device.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'poste';
    downloadFile(`synchro-${slug}-${now.toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`, JSON.stringify(file, null, 2), 'application/json');
    updateDevice({ lastExportAt: now.toISOString() });
    logAction({ action: 'export', module: 'Synchronisation', target: `Fichier de synchronisation (${device.name})`, details: `Export de ${backupCounts(state).payments} paiement(s) et ${backupCounts(state).contracts} contrat(s) pour l'autre appareil.` });
    push({ severity: 'success', title: 'Fichier de synchronisation créé', message: 'Transférez-le sur l’autre appareil (clé USB, e-mail, dossier partagé) puis importez-le.' });
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBackup(String(reader.result));
        const preview = mergeStates(state, parsed.data, { importSettings });
        setPending({ fileName: file.name, incoming: parsed.data, exportedAt: parsed.exportedAt, peerName: parsed.device?.name, report: preview.report, merged: preview.state });
        setMode('fusion');
      } catch (error) {
        push({ severity: 'danger', title: 'Import impossible', message: error instanceof Error ? error.message : 'Fichier illisible.' });
      }
    };
    reader.onerror = () => push({ severity: 'danger', title: 'Lecture impossible', message: 'Le fichier n’a pas pu être lu.' });
    reader.readAsText(file);
  };

  const recompute = (withSettings: boolean) => {
    setImportSettings(withSettings);
    setPending(current => {
      if (!current) return current;
      const preview = mergeStates(state, current.incoming, { importSettings: withSettings });
      return { ...current, report: preview.report, merged: preview.state };
    });
  };

  const confirmImport = () => {
    if (!pending) return;
    const now = new Date().toISOString();
    if (mode === 'remplacement') {
      if (!confirm('Remplacer toutes les données de cet appareil par celles du fichier ? Les saisies locales non présentes dans le fichier seront perdues.')) return;
      importState(pending.incoming);
      logAction({ action: 'restauration', module: 'Synchronisation', target: pending.fileName, details: `Remplacement complet des données par la sauvegarde de ${pending.peerName || 'l’autre appareil'}.` });
      push({ severity: 'warning', title: 'Données remplacées', message: 'Cet appareil utilise maintenant le contenu du fichier importé.' });
    } else {
      const { totals, renamedPayments, settingsImported } = pending.report;
      applyState(pending.merged, {
        action: 'restauration', module: 'Synchronisation', target: `Fusion depuis ${pending.peerName || pending.fileName}`,
        details: `${totals.added} ajout(s), ${totals.updated} mise(s) à jour, ${totals.kept} version(s) locale(s) conservée(s), ${totals.duplicates} doublon(s) fusionné(s)${renamedPayments.length ? `, ${renamedPayments.length} paiement(s) renuméroté(s)` : ''}${settingsImported ? ', paramètres partagés importés' : ''}.`,
      });
      push({ severity: 'success', title: 'Synchronisation terminée', message: `${totals.added} ajout(s) et ${totals.updated} mise(s) à jour appliqués. Exportez depuis cet appareil pour mettre l’autre à jour.` });
    }
    updateDevice({ lastImportAt: now, lastPeerName: pending.peerName || pending.fileName });
    setPending(null);
  };

  const saveName = () => {
    const name = draftName.trim();
    if (!name) return;
    updateDevice({ name });
    setRenaming(false);
    push({ severity: 'info', title: 'Appareil renommé', message: `Les fichiers exportés porteront le nom « ${name} ».` });
  };

  return (
    <>
      <Card>
        <CardHeader theme="violet" title="Synchroniser deux appareils" subtitle="Exportez depuis un poste, importez sur l’autre : les deux machines se complètent sans rien perdre."
          action={<div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Importer un fichier</Btn><Btn variant="primary" onClick={exportForSync}><Download size={15} /> Exporter pour l’autre appareil</Btn></div>} />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ''; }} />

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-violet-700"><Laptop size={15} /> Cet appareil</span>
              <button type="button" onClick={() => { setDraftName(device.name); setRenaming(true); }} className="btn-uniform rounded-lg px-2 py-1 text-[12px] font-bold text-violet-700 hover:bg-violet-100"><Pencil size={12} /> Renommer</button>
            </div>
            <p className="mt-2 text-[15px] font-extrabold text-slate-900">{device.name}</p>
            <p className="mt-1 text-[11.5px] text-slate-500">Identifiant : {device.id.slice(-8)}</p>
            <dl className="mt-3 space-y-1 text-[12px] text-slate-600">
              <div className="flex justify-between gap-2"><dt>Dernier export</dt><dd className="font-bold text-slate-800">{device.lastExportAt ? formatDateTime(device.lastExportAt) : 'Jamais'}</dd></div>
              <div className="flex justify-between gap-2"><dt>Dernier import</dt><dd className="font-bold text-slate-800">{device.lastImportAt ? formatDateTime(device.lastImportAt) : 'Jamais'}</dd></div>
              {device.lastPeerName && <div className="flex justify-between gap-2"><dt>Dernier poste reçu</dt><dd className="font-bold text-slate-800">{device.lastPeerName}</dd></div>}
            </dl>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900"><ArrowLeftRight size={16} className="text-violet-600" /> Comment garder les deux postes identiques</p>
            <ol className="mt-3 space-y-2 text-[12.5px] text-slate-600">
              <li><b className="text-slate-800">1.</b> Sur le poste où vous venez de travailler, cliquez sur <b>Exporter pour l’autre appareil</b>.</li>
              <li><b className="text-slate-800">2.</b> Transférez le fichier (clé USB, e-mail, dossier partagé). Aucune connexion n’est requise pendant l’utilisation.</li>
              <li><b className="text-slate-800">3.</b> Sur le second poste, cliquez sur <b>Importer un fichier</b> et gardez le mode <b>Fusionner</b>. Un récapitulatif s’affiche avant d’appliquer.</li>
              <li><b className="text-slate-800">4.</b> Exportez depuis ce second poste et importez le fichier sur le premier : les deux machines contiennent alors les mêmes données.</li>
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[12px] text-emerald-900">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>La fusion <b>n’efface jamais</b> une donnée locale : elle ajoute ce qui manque, met à jour la version la plus récente, réunit les deux journaux et fusionne les doublons (même mois de loyer saisi des deux côtés).</span>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[12px] text-amber-900">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              <span>Une suppression faite sur un poste n’est pas reportée sur l’autre : l’élément revient à la synchronisation suivante. Supprimez-le sur les deux postes si nécessaire.</span>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={renaming} onClose={() => setRenaming(false)} title="Nom de cet appareil" subtitle="Ce nom identifie les fichiers de synchronisation" width="max-w-md">
        <Field label="Nom de l’appareil"><input className={inputCls} value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Poste bureau, Ordinateur portable…" autoFocus /></Field>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setRenaming(false)}>Annuler</Btn><Btn onClick={saveName}>Enregistrer</Btn></div>
      </Modal>

      <Modal open={Boolean(pending)} onClose={() => setPending(null)} title="Vérifier avant d’appliquer" subtitle={pending ? `${pending.fileName}${pending.peerName ? ` · provenance : ${pending.peerName}` : ''}${pending.exportedAt ? ` · exporté le ${formatDateTime(pending.exportedAt)}` : ''}` : ''} width="max-w-3xl">
        {pending && <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setMode('fusion')} className={`btn-uniform rounded-2xl border-2 p-3 text-left ${mode === 'fusion' ? 'border-violet-600 bg-violet-50' : 'border-slate-200'}`}>
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">{mode === 'fusion' && <CheckCircle2 size={15} className="text-violet-600" />} Fusionner (recommandé)</span>
              <span className="mt-1 block text-[12px] text-slate-600">Réunit les données des deux appareils.</span>
            </button>
            <button type="button" onClick={() => setMode('remplacement')} className={`btn-uniform rounded-2xl border-2 p-3 text-left ${mode === 'remplacement' ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}>
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">{mode === 'remplacement' && <CheckCircle2 size={15} className="text-rose-600" />} Remplacer tout</span>
              <span className="mt-1 block text-[12px] text-slate-600">Écrase les données locales par le fichier.</span>
            </button>
          </div>

          {mode === 'fusion' ? (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-[20px] font-extrabold text-emerald-700">{pending.report.totals.added}</p><p className="text-[11px] font-bold uppercase text-emerald-700">Ajouts</p></div>
                <div className="rounded-xl bg-blue-50 p-3 text-center"><p className="text-[20px] font-extrabold text-blue-700">{pending.report.totals.updated}</p><p className="text-[11px] font-bold uppercase text-blue-700">Mises à jour</p></div>
                <div className="rounded-xl bg-slate-100 p-3 text-center"><p className="text-[20px] font-extrabold text-slate-700">{pending.report.totals.kept}</p><p className="text-[11px] font-bold uppercase text-slate-600">Versions locales gardées</p></div>
                <div className="rounded-xl bg-amber-50 p-3 text-center"><p className="text-[20px] font-extrabold text-amber-700">{pending.report.totals.duplicates}</p><p className="text-[11px] font-bold uppercase text-amber-700">Doublons fusionnés</p></div>
              </div>

              <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200">
                <table className="app-table w-full text-left text-[12.5px]">
                  <thead><tr className="bg-gradient-to-r from-violet-700 to-violet-600 text-[11px] font-bold uppercase tracking-wide text-white"><th className="px-4 py-2.5">Catégorie</th><th className="px-3 py-2.5 text-right">Ajouts</th><th className="px-3 py-2.5 text-right">Mises à jour</th><th className="px-3 py-2.5 text-right">Gardées</th><th className="px-3 py-2.5 text-right">Doublons</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {pending.report.lines.filter(l => l.added || l.updated || l.kept || l.duplicates).map(l => (
                      <tr key={l.key} className="hover:bg-violet-50/60"><td className="px-4 py-2 font-bold text-slate-800">{l.label}</td><td className="px-3 py-2 text-right font-bold text-emerald-700">{l.added || '—'}</td><td className="px-3 py-2 text-right font-bold text-blue-700">{l.updated || '—'}</td><td className="px-3 py-2 text-right text-slate-600">{l.kept || '—'}</td><td className="px-3 py-2 text-right text-amber-700">{l.duplicates || '—'}</td></tr>
                    ))}
                    {!pending.report.lines.some(l => l.added || l.updated || l.kept || l.duplicates) && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Les deux appareils sont déjà identiques. Aucune modification à appliquer.</td></tr>}
                  </tbody>
                </table>
              </div>

              {pending.report.auditAdded > 0 && <p className="text-[12px] text-slate-600">{pending.report.auditAdded} action(s) du journal de l’autre appareil seront ajoutées à l’historique.</p>}
              {pending.report.renamedPayments.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-3 text-[12px] text-amber-900">
                  <p className="font-bold">Paiements renumérotés pour éviter deux fois le même numéro :</p>
                  <p className="mt-1">{pending.report.renamedPayments.map(r => `${r.before} → ${r.after}`).join(' · ')}</p>
                </div>
              )}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" checked={importSettings} onChange={event => recompute(event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-600" />
                <span className="text-[12.5px] text-slate-700"><b>Importer aussi les paramètres partagés</b> (bailleur, devise, jour de relevé, textes des reçus). Les sons et la sauvegarde automatique restent propres à cet appareil.</span>
              </label>
            </>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[12.5px] text-rose-900">
              <p className="flex items-center gap-2 font-extrabold"><TriangleAlert size={16} /> Mode remplacement</p>
              <p className="mt-1">Toutes les données de cet appareil seront écrasées par le fichier : {pending.incoming.properties.length} bien(s), {pending.incoming.tenants.length} locataire(s), {pending.incoming.payments.length} paiement(s). Les saisies locales absentes du fichier seront perdues. Utilisez ce mode pour installer l’application sur un nouvel ordinateur.</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="secondary" onClick={() => setPending(null)}>Annuler</Btn>
            <Btn variant={mode === 'fusion' ? 'success' : 'danger'} onClick={confirmImport}>{mode === 'fusion' ? <><RefreshCw size={15} /> Appliquer la fusion</> : <><ArrowRightLeft size={15} /> Remplacer les données</>}</Btn>
          </div>
        </div>}
      </Modal>
    </>
  );
}

export function SyncStatusPill({ lastExportAt, lastImportAt }: { lastExportAt?: string; lastImportAt?: string }) {
  const label = lastImportAt || lastExportAt ? `Dernier échange ${formatDateTime(lastImportAt && (!lastExportAt || lastImportAt > lastExportAt) ? lastImportAt : lastExportAt!)}` : 'Aucun échange effectué';
  return <Pill color="violet">{label}</Pill>;
}
