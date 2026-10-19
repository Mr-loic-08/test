import { useRef, useState } from 'react';
import { Save, Download, Upload, RotateCcw, Database, ShieldCheck, FileSpreadsheet, FileText, DatabaseBackup, Clock3, Play } from 'lucide-react';
import { readAutoBackupHistory, restoreAutoBackup } from '../store/store';
import { useToast } from '../components/notifications';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn } from '../components/ui';
import { formatDateTime, toCSV, downloadFile, formatMoney, periodShort } from '../utils/helpers';
import * as XLSX from 'xlsx';

export default function Backup() {
  const { state, update, reset, importState, logAction, rents, waters, triggerAutoBackup, lastSavedAt } = useStore();
  const { push } = useToast();
  const autoHistory = readAutoBackupHistory();
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const currency = state.settings.currency;

  const backup = () => {
    const payload = JSON.stringify({ app: 'GestionLocative', version: '1.0', exportedAt: new Date().toISOString(), data: state }, null, 2);
    downloadFile(`gestion-locative-backup-${new Date().toISOString().slice(0, 10)}.json`, payload, 'application/json');
    update(s => { s.settings.lastBackup = new Date().toISOString(); return s; });
    logAction({ action: 'sauvegarde', module: 'Sauvegarde', target: 'Sauvegarde complète JSON', details: 'Export de la base locale et des références des documents.' });
    setMsg('Sauvegarde complète téléchargée (base + documents référencés). Conservez aussi le dossier des fichiers joints.'); push({severity:'success', title:'Sauvegarde complète téléchargée', message:'Fichier JSON enregistré — pensez au dossier des pièces jointes.'});
  };

  const restoreFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed.data || parsed;
        if (!data.properties || !data.tenants) throw new Error('Format invalide');
        if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return;
        importState(data);
        setMsg('Sauvegarde restaurée avec succès.');
      } catch { setMsg('Erreur : fichier de sauvegarde invalide.'); }
    };
    reader.readAsText(f);
  };

  const exportCSV = (kind: 'loyers' | 'eau' | 'paiements' | 'locataires') => {
    let rows: Record<string, unknown>[] = [];
    let name = '';
    if (kind === 'loyers') {
      name = 'loyers'; rows = rents.map(r => {
        const c = state.contracts.find(c => c.id === r.contractId); const t = c ? state.tenants.find(t => t.id === c.tenantId) : null; const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
        return { Periode: periodShort(r.month, r.year), Contrat: c?.reference, Locataire: t ? `${t.firstName} ${t.lastName}` : '', Logement: p?.reference, Attendu: r.amountDue, Paye: r.paid, Reste: r.rest, Etat: r.status };
      });
    } else if (kind === 'eau') {
      name = 'eau'; rows = waters.map(w => {
        const c = state.contracts.find(c => c.id === w.contractId); const t = c ? state.tenants.find(t => t.id === c.tenantId) : null; const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
        return { Periode: periodShort(w.periodMonth, w.periodYear), Logement: p?.reference, Locataire: t ? `${t.firstName} ${t.lastName}` : '', Ancien: w.previousIndex, Nouveau: w.currentIndex, Conso_m3: w.consumption, Tarif: w.tariffPerM3, Montant: w.amountDue, Paye: w.paid, Reste: w.rest, Etat: w.status };
      });
    } else if (kind === 'paiements') {
      name = 'paiements'; rows = state.payments.map(p => {
        const t = state.tenants.find(t => t.id === p.tenantId);
        return { Reference: p.reference, Date: p.paymentDate, Locataire: t ? `${t.firstName} ${t.lastName}` : '', Montant: p.amount, Mode: p.method, Type: p.kind, Commentaire: p.comment || '' };
      });
    } else {
      name = 'locataires'; rows = state.tenants.map(t => ({ Prenom: t.firstName, Nom: t.lastName, Telephone: t.phone, Email: t.email || '', Adresse: t.address }));
    }
    downloadFile(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv');
    logAction({ action: 'export', module: 'Sauvegarde', target: `${name} (CSV)`, details: `${rows.length} ligne(s) exportée(s).` });
    setMsg(`Export CSV « ${name} » téléchargé (${rows.length} lignes).`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rents.map(r => {
      const c = state.contracts.find(c => c.id === r.contractId); const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
      return { Période: periodShort(r.month, r.year), Contrat: c?.reference, Locataire: t ? `${t.firstName} ${t.lastName}` : '', Attendu: r.amountDue, Payé: r.paid, Reste: r.rest, État: r.status };
    }));
    const ws2 = XLSX.utils.json_to_sheet(waters.map(w => ({ Période: periodShort(w.periodMonth, w.periodYear), Conso_m3: w.consumption, Tarif: w.tariffPerM3, Montant: w.amountDue, Payé: w.paid, Reste: w.rest, État: w.status })));
    const ws3 = XLSX.utils.json_to_sheet(state.payments.map(p => ({ Réf: p.reference, Date: p.paymentDate, Montant: p.amount, Mode: p.method, Type: p.kind })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Loyers');
    XLSX.utils.book_append_sheet(wb, ws2, 'Eau');
    XLSX.utils.book_append_sheet(wb, ws3, 'Paiements');
    XLSX.writeFile(wb, `gestion-locative-${new Date().toISOString().slice(0, 10)}.xlsx`);
    logAction({ action: 'export', module: 'Sauvegarde', target: 'Données financières (Excel)', details: 'Export Excel des loyers, de l’eau et des paiements.' });
    setMsg('Export Excel téléchargé (3 onglets : Loyers, Eau, Paiements).');
  };

  const sizeKo = Math.round((JSON.stringify(state).length / 1024) * 10) / 10;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25"><DatabaseBackup size={24}/></span>
            <div>
              <p className="text-[17px] font-extrabold">Sauvegarde automatique {state.settings.autoBackupEnabled ? 'ACTIVE' : 'DÉSACTIVÉE'}</p>
              <p className="mt-0.5 text-[12.5px] text-emerald-100">Toutes les {state.settings.autoBackupIntervalMinutes} min • à chaque paiement • avant fermeture • Dernière : {state.settings.lastAutoBackup ? new Date(state.settings.lastAutoBackup).toLocaleString('fr-FR') : '—'} ({state.settings.autoBackupCount||0} sauvegardes)</p>
              <p className="text-[12px] text-emerald-100/85">Enregistrement continu : {new Date(lastSavedAt).toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={()=>{ update(s=>{ s.settings.autoBackupEnabled=!s.settings.autoBackupEnabled; return s; }); }}>{state.settings.autoBackupEnabled?'Désactiver':'Activer'} l'auto-save</Btn>
            <Btn variant="dark" onClick={()=>{ triggerAutoBackup('manuel-backup'); push({severity:'success', title:'Sauvegarde automatique effectuée', message:'Instantané enregistré sur l\'appareil, restaurable ci-dessous.'}); }}><Play size={14}/> Sauvegarder maintenant</Btn>
            <Btn variant="secondary" onClick={()=>{ const d=restoreAutoBackup(); if(!d){ push({severity:'warning', title:'Aucune sauvegarde auto trouvée'}); return; } if(confirm('Restaurer la dernière sauvegarde automatique ?')){ importState(d); push({severity:'success', title:'Sauvegarde automatique restaurée'}); } }}>Restaurer l'auto-save</Btn>
          </div>
        </div>
        {autoHistory.length>0 && (
          <div className="mt-4 flex flex-wrap gap-2">{autoHistory.slice(0,5).map((h,i)=>(<span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-bold ring-1 ring-white/20"><Clock3 size={11}/> {new Date(h.at).toLocaleString('fr-FR')} • {h.sizeKo} Ko</span>))}</div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Sauvegarde & restauration" subtitle="Données stockées localement — exportables à tout moment" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <Save size={26} className="mx-auto text-blue-600" />
              <p className="mt-2 text-[13.5px] font-extrabold">Sauvegarde complète</p>
              <p className="mt-1 text-[12px] text-slate-500">Base + références documents (JSON)</p>
              <Btn className="mt-3 w-full" onClick={backup}>Sauvegarder</Btn>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <Upload size={26} className="mx-auto text-emerald-600" />
              <p className="mt-2 text-[13.5px] font-extrabold">Restaurer</p>
              <p className="mt-1 text-[12px] text-slate-500">Depuis un fichier .json</p>
              <Btn variant="secondary" className="mt-3 w-full" onClick={() => fileRef.current?.click()}>Importer</Btn>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) restoreFile(f); e.target.value = ''; }} />
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 text-center">
              <RotateCcw size={26} className="mx-auto text-rose-600" />
              <p className="mt-2 text-[13.5px] font-extrabold">Réinitialiser</p>
              <p className="mt-1 text-[12px] text-slate-500">Revenir aux données de démo</p>
              <Btn variant="danger" className="mt-3 w-full" onClick={() => { if (confirm('Réinitialiser les données de démonstration ?')) { reset(); setMsg('Données de démonstration restaurées.'); } }}>Réinitialiser</Btn>
            </div>
          </div>
          {msg && <div className="mx-5 mb-5 rounded-xl bg-emerald-50 p-3 text-[12.5px] font-semibold text-emerald-800">{msg}</div>}
          <div className="border-t border-slate-100 px-5 py-4 text-[12.5px] text-slate-600">
            <p><b>Dernière sauvegarde :</b> {state.settings.lastBackup ? formatDateTime(state.settings.lastBackup) : 'Jamais'}</p>
            <p className="mt-1"><b>Dossier de destination :</b> {state.settings.backupFolder || 'Téléchargements'} <button className="btn-uniform ml-2 rounded-lg px-2 py-1 font-bold text-blue-600 hover:bg-blue-50" onClick={() => { const v = prompt('Dossier de sauvegarde :', state.settings.backupFolder || ''); if (v !== null) update(s => { s.settings.backupFolder = v; return s; }); }}>Modifier</button></p>
            <p className="mt-1"><b>Procédure fichiers joints :</b> copiez aussi le dossier <code className="rounded bg-slate-100 px-1">C:\GestionLocative\docs</code> et <code className="rounded bg-slate-100 px-1">C:\GestionLocative\recus</code> sur clé USB ou disque externe.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Informations" />
          <div className="space-y-3 p-5 text-[13px]">
            <div className="flex items-center gap-2.5"><Database size={17} className="text-slate-500" /><span>Stockage actuel : <b>navigateur local</b></span></div>
            <div className="flex items-center gap-2.5"><ShieldCheck size={17} className="text-emerald-600" /><span>Taille estimée : <b>{sizeKo} Ko</b></span></div>
            <div className="rounded-xl bg-slate-50 p-3 text-[12.5px]">
              <p><b>{state.properties.length}</b> biens • <b>{state.tenants.length}</b> locataires • <b>{state.contracts.length}</b> contrats</p>
              <p className="mt-1"><b>{rents.length}</b> échéances loyer • <b>{waters.length}</b> factures eau</p>
              <p className="mt-1"><b>{state.payments.length}</b> paiements • <b>{state.allocations.length}</b> affectations</p>
              <p className="mt-1">Reste total : <b className="text-rose-700">{formatMoney(rents.reduce((s, r) => s + r.rest, 0) + waters.reduce((s, w) => s + w.rest, 0), currency)}</b></p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-[12px] text-blue-900"><b>Vos données sont en sécurité</b> et restent sur votre appareil. Aucun serveur distant requis.</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Exportation des données" subtitle="CSV • Excel • PDF (via impression)" />
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-5">
          <button onClick={() => exportCSV('loyers')} className="btn-uniform rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-blue-400 hover:bg-blue-50"><FileText size={22} className="mx-auto text-blue-600" /><p className="mt-2 text-[13px] font-bold">Loyers (CSV)</p></button>
          <button onClick={() => exportCSV('eau')} className="btn-uniform rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-teal-400 hover:bg-teal-50"><FileText size={22} className="mx-auto text-teal-600" /><p className="mt-2 text-[13px] font-bold">Eau (CSV)</p></button>
          <button onClick={() => exportCSV('paiements')} className="btn-uniform rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-violet-400 hover:bg-violet-50"><FileText size={22} className="mx-auto text-violet-600" /><p className="mt-2 text-[13px] font-bold">Paiements (CSV)</p></button>
          <button onClick={() => exportCSV('locataires')} className="btn-uniform rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-amber-400 hover:bg-amber-50"><FileText size={22} className="mx-auto text-amber-600" /><p className="mt-2 text-[13px] font-bold">Locataires (CSV)</p></button>
          <button onClick={exportExcel} className="btn-uniform rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center hover:bg-emerald-100"><FileSpreadsheet size={22} className="mx-auto text-emerald-600" /><p className="mt-2 text-[13px] font-bold">Tout en Excel</p></button>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[12.5px] text-slate-500"><Download size={14} /> Les reçus et rapports s'exportent en PDF via le bouton Imprimer de chaque écran.</div>
      </Card>
    </div>
  );
}
