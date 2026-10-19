import { useState } from 'react';
import { User, Droplets, Receipt, Save, Plus, History, Volume2, BellRing, DatabaseBackup, Gauge, Clock3 } from 'lucide-react';
import { testSound, setSoundEnabled, setSoundVolume } from '../utils/sound';
import { useToast } from '../components/notifications';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, Field, inputCls } from '../components/ui';
import { formatMoney, formatDate, uid } from '../utils/helpers';

export default function Settings() {
  const { state, update, triggerAutoBackup } = useStore();
  const { push } = useToast();
  const [tab, setTab] = useState<'bailleur' | 'eau' | 'recus' | 'general' | 'sons' | 'alertes'>('bailleur');
  const [s, setS] = useState(state.settings);
  const [newTariff, setNewTariff] = useState('');
  const [tariffDate, setTariffDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState('');
  const currency = state.settings.currency;

  const currentTariff = [...state.waterTariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  const saveSettings = () => {
    update(st => { st.settings = { ...s }; return st; });
    setSoundEnabled(s.soundEnabled); setSoundVolume(s.soundVolume);
    setMsg('Paramètres enregistrés et appliqués immédiatement.');
    push({severity:'success', title:'Paramètres enregistrés', message:'Sons, alertes et sauvegarde auto mis à jour.'});
    setTimeout(() => setMsg(''), 3000);
  };

  const addTariff = () => {
    const price = Number(newTariff);
    if (!price || price <= 0) { alert('Prix invalide.'); return; }
    update(st => {
      // clôturer l'ancien tarif
      const sorted = [...st.waterTariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
      if (sorted[0]) sorted[0].effectiveTo = tariffDate;
      st.waterTariffs.push({ id: uid('wt'), pricePerM3: price, effectiveFrom: tariffDate, createdAt: new Date().toISOString() });
      return st;
    });
    setNewTariff('');
    setMsg(`Nouveau tarif ${formatMoney(price, currency)}/m³ en vigueur dès le ${formatDate(tariffDate)}. Les anciennes factures gardent leur tarif.`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_1fr]">
      <Card>
        <div className="p-3">
          <p className="px-2 pb-2 text-[12px] font-bold uppercase text-slate-500">Paramètres</p>
          {([['bailleur', 'Bailleur', <User key="u" size={16} />], ['eau', 'Tarification eau', <Droplets key="d" size={16} />], ['sons', 'Sons & notifications', <Volume2 key="s" size={16} />], ['alertes', 'Alertes & sauvegarde auto', <BellRing key="a" size={16} />], ['recus', 'Reçus', <Receipt key="r" size={16} />], ['general', 'Général', <Save key="g" size={16} />]] as const).map(([v, l, icon]) => (
            <button key={v} onClick={() => setTab(v)} className={`btn-uniform flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold ${tab === v ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{icon}{l}</button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {msg && <div className="rounded-xl bg-emerald-50 p-3 text-[13px] font-bold text-emerald-800">{msg}</div>}

        {tab === 'bailleur' && (
          <Card>
            <CardHeader title="Informations du bailleur" subtitle="Affichées sur les reçus et rapports" action={<Btn onClick={saveSettings}><Save size={14} /> Enregistrer</Btn>} />
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <Field label="Nom complet / Raison sociale"><input className={inputCls} value={s.landlordName} onChange={e => setS({ ...s, landlordName: e.target.value })} /></Field>
              <Field label="Société (optionnel)"><input className={inputCls} value={s.company} onChange={e => setS({ ...s, company: e.target.value })} /></Field>
              <Field label="Téléphone"><input className={inputCls} value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} value={s.email} onChange={e => setS({ ...s, email: e.target.value })} /></Field>
              <Field label="Adresse" className="md:col-span-2"><input className={inputCls} value={s.address} onChange={e => setS({ ...s, address: e.target.value })} /></Field>
            </div>
          </Card>
        )}

        {tab === 'eau' && (
          <>
            <Card>
              <CardHeader title="Tarification de l'eau" subtitle="Prix unitaire du m³ — historisé, jamais recalculé sur l'ancien" />
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className="rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 p-5 text-white">
                  <p className="text-[12px] font-bold uppercase opacity-80">Tarif actuel</p>
                  <p className="mt-1 text-[32px] font-extrabold">{formatMoney(currentTariff?.pricePerM3 || 0, currency)}<span className="text-[16px]"> / m³</span></p>
                  <p className="mt-1 text-[12.5px] opacity-80">En vigueur depuis le {formatDate(currentTariff?.effectiveFrom || '')}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[13px] font-extrabold">Nouveau tarif</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Prix / m³ (F)"><input type="number" className={inputCls} value={newTariff} onChange={e => setNewTariff(e.target.value)} placeholder="Ex : 500" /></Field>
                    <Field label="Entrée en vigueur"><input type="date" className={inputCls} value={tariffDate} onChange={e => setTariffDate(e.target.value)} /></Field>
                  </div>
                  <Btn className="mt-3 w-full" onClick={addTariff}><Plus size={15} /> Appliquer le nouveau tarif</Btn>
                  <p className="mt-2 text-[11.5px] text-slate-500">Chaque facture conserve le tarif appliqué à sa création.</p>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Historique des tarifs" subtitle="Traçabilité complète" action={<span className="flex items-center gap-1 text-[12px] text-slate-500"><History size={13} /> {state.waterTariffs.length} tarif(s)</span>} />
              <table className="app-table w-full text-left">
                <thead><tr className="bg-gradient-to-r from-cyan-700 to-teal-600 text-[11px] uppercase tracking-wider text-white shadow"><th className="px-5 py-3">Date d'effet</th><th className="px-4 py-3">Fin</th><th className="px-4 py-3 text-right">Prix / m³</th><th className="px-4 py-3">Statut</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {[...state.waterTariffs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(t => (
                    <tr key={t.id}><td className="px-5 py-3 text-[13px] font-bold">{formatDate(t.effectiveFrom)}</td><td className="px-4 py-3 text-[13px]">{t.effectiveTo ? formatDate(t.effectiveTo) : '—'}</td><td className="px-4 py-3 text-right text-[13px] font-extrabold">{formatMoney(t.pricePerM3, currency)}</td><td className="px-4 py-3">{!t.effectiveTo ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-700">En vigueur</span> : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-bold text-slate-500">Archivé</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}


        {tab === 'sons' && (
          <Card>
            <CardHeader theme="violet" title="Notifications sonores sur l'appareil" subtitle="Sons générés sur l'appareil (WebAudio) — aucun fichier, 100% hors-ligne" action={<Btn variant="success" onClick={saveSettings}><Save size={14}/> Appliquer</Btn>} />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Volume2 size={18}/></span><div><p className="text-[13.5px] font-extrabold">Sons de l'application</p><p className="text-[12px] text-slate-500">Retards, paiements, relevés d'eau, clics boutons</p></div></div>
                <button type="button" onClick={()=>{ const v=!s.soundEnabled; setS({...s, soundEnabled:v}); setSoundEnabled(v); if(v) testSound('success'); }} className={`btn-uniform rounded-full px-5 py-2.5 text-[13px] font-extrabold text-white shadow ${s.soundEnabled?'bg-emerald-600':'bg-slate-400'}`}>{s.soundEnabled?'🔊 ACTIVÉS':'🔇 COUPÉS'}</button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {([['soundOnAlerts','Alertes retard / eau','Joue un son quand un retard ou un relevé est détecté'],['soundOnPayment','Paiement enregistré','Son de confirmation à chaque encaissement'],['soundOnClick','Clic boutons','Petit retour sonore au survol/clic']] as const).map(([k,l,d])=>(
                  <label key={k} className="card-uniform flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <input type="checkbox" checked={!!s[k]} onChange={e=>setS({...s,[k]:e.target.checked})} className="mt-1 h-4 w-4 accent-violet-600"/>
                    <span><span className="block text-[13px] font-extrabold">{l}</span><span className="mt-0.5 block text-[12px] text-slate-500">{d}</span></span>
                  </label>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between"><p className="text-[13px] font-extrabold">Volume</p><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[12px] font-extrabold text-violet-700">{Math.round((s.soundVolume??0.6)*100)}%</span></div>
                <input type="range" min={0} max={100} value={Math.round((s.soundVolume??0.6)*100)} onChange={e=>{ const v=Number(e.target.value)/100; setS({...s,soundVolume:v}); setSoundVolume(v); }} className="mt-3 w-full accent-violet-600"/>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn size="sm" variant="secondary" onClick={()=>testSound('success')}>▶ Succès</Btn>
                  <Btn size="sm" variant="secondary" onClick={()=>testSound('warning')}>▶ Avertissement</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>testSound('danger')}>▶ Retard loyer</Btn>
                  <Btn size="sm" variant="teal" onClick={()=>testSound('water')}>▶ Relevé eau</Btn>
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === 'alertes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader theme="rose" title="Signaler les retards & prélèvements" subtitle="Dates suivies automatiquement sur le tableau de bord, la cloche et par son" action={<Btn variant="success" onClick={saveSettings}><Save size={14}/> Appliquer</Btn>} />
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <Field label="Jour d'échéance loyer (défaut contrats)"><input type="number" min={1} max={28} className={inputCls} value={s.dueDayDefault} onChange={e=>setS({...s,dueDayDefault:Number(e.target.value)})}/></Field>
                <Field label="Délai de grâce retard (jours)"><input type="number" min={0} max={15} className={inputCls} value={s.rentLateGraceDays} onChange={e=>setS({...s,rentLateGraceDays:Number(e.target.value)})}/></Field>
                <Field label="Alerter avant échéance (jours)"><input type="number" min={1} max={10} className={inputCls} value={s.alertRentDaysBefore} onChange={e=>setS({...s,alertRentDaysBefore:Number(e.target.value)})}/></Field>
                <div className="rounded-2xl bg-rose-50 p-4 text-[12.5px] text-rose-800 md:col-span-3"><b>Retard loyer :</b> signalé en rouge (ligne + badge RETARD Xj + cloche + son) dès que la date d'échéance du contrat est dépassée et que le reste &gt; 0.</div>
              </div>
            </Card>
            <Card>
              <CardHeader theme="teal" title="Date de prélèvement compteur d'eau" subtitle="Rappel mensuel par compteur" action={<Btn variant="teal" onClick={saveSettings}><Gauge size={14}/> Appliquer</Btn>} />
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <Field label="Jour du prélèvement (chaque mois)"><input type="number" min={1} max={28} className={inputCls} value={s.waterReadingDay} onChange={e=>setS({...s,waterReadingDay:Number(e.target.value)})}/></Field>
                <div className="rounded-2xl bg-cyan-50 p-4 text-[12.5px] text-cyan-900"><b>Exemple :</b> jour = {s.waterReadingDay} → chaque compteur sans relevé du mois est signalé 3 jours avant, le jour J et en retard ensuite (carte compteur + cloche + son eau).</div>
              </div>
            </Card>
            <Card>
              <CardHeader theme="emerald" title="Sauvegarde automatique" subtitle="Protection continue des données sur l'appareil" action={<Btn variant="success" onClick={()=>{ saveSettings(); triggerAutoBackup('depuis-parametres'); push({severity:'success', title:'Sauvegarde automatique effectuée', message:'Instantané enregistré sur l\'appareil.'}); }}><DatabaseBackup size={14}/> Sauvegarder maintenant</Btn>} />
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2"><div className="flex items-center gap-3"><Clock3 className="text-emerald-600" size={20}/><div><p className="text-[13.5px] font-extrabold">Sauvegarde automatique</p><p className="text-[12px] text-slate-500">À intervalle régulier, à chaque paiement et avant fermeture</p></div></div><button type="button" onClick={()=>setS({...s,autoBackupEnabled:!s.autoBackupEnabled})} className={`btn-uniform rounded-full px-4 py-2 text-[12.5px] font-extrabold text-white ${s.autoBackupEnabled?'bg-emerald-600':'bg-slate-400'}`}>{s.autoBackupEnabled?'ACTIVE':'INACTIVE'}</button></div>
                <Field label="Intervalle (minutes)"><input type="number" min={1} max={120} className={inputCls} value={s.autoBackupIntervalMinutes} onChange={e=>setS({...s,autoBackupIntervalMinutes:Number(e.target.value)})}/></Field>
                <div className="rounded-2xl bg-slate-50 p-4 text-[12.5px] md:col-span-3"><p><b>Dernière sauvegarde auto :</b> {s.lastAutoBackup ? new Date(s.lastAutoBackup).toLocaleString('fr-FR') : '—'} • <b>Nombre :</b> {s.autoBackupCount||0} • <b>Dossier :</b> {s.backupFolder||'—'}</p><p className="mt-1 text-slate-500">L'instantané automatique se restaure en 1 clic depuis l'écran Sauvegarde.</p></div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'recus' && (
          <Card>
            <CardHeader title="Préférences des reçus" subtitle="Personnalisez l'en-tête et le pied de page" action={<Btn onClick={saveSettings}><Save size={14} /> Enregistrer</Btn>} />
            <div className="grid grid-cols-1 gap-4 p-5">
              <Field label="En-tête du reçu"><input className={inputCls} value={s.receiptHeader} onChange={e => setS({ ...s, receiptHeader: e.target.value })} /></Field>
              <Field label="Pied de page / mention"><textarea className={inputCls} rows={2} value={s.receiptFooter} onChange={e => setS({ ...s, receiptFooter: e.target.value })} /></Field>
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center">
                <p className="text-[13px] font-extrabold uppercase">{s.receiptHeader}</p>
                <p className="mt-1 text-[11.5px] text-slate-500">{s.address} • {s.phone}</p>
                <p className="mt-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">APERÇU REÇU</p>
                <p className="mt-2 text-[11px] italic text-slate-400">{s.receiptFooter}</p>
              </div>
            </div>
          </Card>
        )}

        {tab === 'general' && (
          <Card>
            <CardHeader title="Préférences générales" subtitle="Devise, échéance, sauvegarde" action={<Btn onClick={saveSettings}><Save size={14} /> Enregistrer</Btn>} />
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <Field label="Devise (symbole)"><select className={inputCls} value={s.currency} onChange={e => setS({ ...s, currency: e.target.value })}><option value="F">F (Franc CFA)</option><option value="FCFA">FCFA</option><option value="€">€ (Euro)</option><option value="$">$ (Dollar)</option></select></Field>
              <Field label="Jour d'échéance par défaut"><input type="number" min={1} max={28} className={inputCls} value={s.dueDayDefault} onChange={e => setS({ ...s, dueDayDefault: Number(e.target.value) })} /></Field>
              <Field label="Dossier de sauvegarde"><input className={inputCls} value={s.backupFolder || ''} onChange={e => setS({ ...s, backupFolder: e.target.value })} /></Field>
              <Field label="Dernière sauvegarde"><input className={`${inputCls} bg-slate-50`} readOnly value={s.lastBackup ? formatDate(s.lastBackup) : 'Jamais'} /></Field>
              <div className="md:col-span-2 rounded-xl bg-slate-50 p-4 text-[12.5px] text-slate-600">
                <p className="font-extrabold text-slate-800">À propos de l'application desktop</p>
                <p className="mt-1">Gestion Locative v1.0 — React + Vite + TailwindCSS • Electron (desktop) • SQLite (base locale). Fonctionne hors ligne, sans serveur distant ni Internet pour l'usage courant. Sauvegardez régulièrement vos données.</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
