import { Building2, Banknote, Droplets, AlertTriangle, FileWarning, ArrowRight, Wallet, CircleCheck, CircleAlert, CircleX, BellRing, Gauge, Volume2, ShieldCheck, Plus } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, StatCard, StatusBadge, Pill, Btn } from '../components/ui';
import { formatMoney, periodShort, formatDate } from '../utils/helpers';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { PageKey } from '../components/layout';
import { HOUSING_IMG } from '../components/layout';
import type { AppAlert } from '../utils/alerts';
import { playLateAlert, playWaterAlert } from '../utils/sound';

export default function Dashboard({ go, alerts = [] }: { go: (p: PageKey) => void; alerts?: AppAlert[] }) {
  const lateAlerts = alerts.filter(a => a.category === 'retard_loyer');
  const waterAlerts = alerts.filter(a => a.category === 'releve_eau');
  const dueAlerts = alerts.filter(a => a.category === 'echeance_loyer');
  const { state, rents, waters } = useStore();
  const currency = state.settings.currency;

  const totalProps = state.properties.length;
  const occ = state.properties.filter(p => p.status === 'occupe').length;
  const libres = state.properties.filter(p => p.status === 'libre').length;

  const rentDue = rents.reduce((s, r) => s + r.amountDue, 0);
  const rentPaid = rents.reduce((s, r) => s + r.paid, 0);
  const rentRest = rents.reduce((s, r) => s + r.rest, 0);
  const waterDue = waters.reduce((s, w) => s + w.amountDue, 0);
  const waterPaid = waters.reduce((s, w) => s + w.paid, 0);
  const waterRest = waters.reduce((s, w) => s + w.rest, 0);

  const rentPaye = rents.filter(r => r.status === 'PAYE').length;
  const rentInc = rents.filter(r => r.status === 'INCOMPLET').length;
  const rentNon = rents.filter(r => r.status === 'NON_PAYE').length;
  const waterPaye = waters.filter(w => w.status === 'PAYE').length;
  const waterInc = waters.filter(w => w.status === 'INCOMPLET').length;
  const waterNon = waters.filter(w => w.status === 'NON_PAYE').length;

  // Contrats arrivant à expiration (< 90 jours) et expirés
  const now = new Date('2026-10-19');
  const expiring = state.contracts.filter(c => {
    if (c.status !== 'actif') return false;
    const end = new Date(c.endDate);
    const diff = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 120;
  });
  const lateRents = rents.filter(r => r.status !== 'PAYE' && new Date(r.year, r.month, 0) < now).slice(0, 5);
  const lastPayments = [...state.payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);

  const propData = [
    { name: 'Occupés', value: occ, color: '#2563eb' },
    { name: 'Libres', value: libres, color: '#10b981' },
    { name: 'Autres', value: totalProps - occ - libres, color: '#cbd5e1' },
  ];

  // encaissements 6 derniers mois
  const months: { label: string; loyers: number; eau: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(2026, 9 - i, 1);
    const m = d.getMonth() + 1, y = d.getFullYear();
    const rPaid = rents.filter(r => r.month === m && r.year === y).reduce((s, r) => s + r.paid, 0);
    const wPaid = waters.filter(w => w.periodMonth === m && w.periodYear === y).reduce((s, w) => s + w.paid, 0);
    months.push({ label: periodShort(m, y), loyers: rPaid, eau: wPaid });
  }

  const tenantName = (id: string) => {
    const t = state.tenants.find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : '—';
  };
  const propRef = (id: string) => state.properties.find(p => p.id === id)?.reference || '—';

  return (
    <div className="space-y-5">
      {/* HERO avec photo logement */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-900/10">
        <img src={HOUSING_IMG} alt="Résidence gérée" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1c3f]/95 via-[#143067]/88 to-blue-700/35" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_260px_at_15%_0%,rgba(96,165,250,0.35),transparent_60%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-6 md:p-7">
          <div className="max-w-[620px]">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[12px] font-bold text-blue-100 ring-1 ring-white/20 backdrop-blur"><ShieldCheck size={13} className="text-emerald-300" /> Sauvegarde auto {state.settings.autoBackupEnabled ? `active • toutes les ${state.settings.autoBackupIntervalMinutes} min` : 'désactivée'} • Sons {state.settings.soundEnabled ? 'ON' : 'OFF'}</p>
            <h2 className="mt-3 text-[24px] font-extrabold leading-tight tracking-tight text-white drop-shadow md:text-[27px]">Bonjour {state.settings.landlordName}, votre résidence est sous contrôle.</h2>
            <p className="mt-1.5 text-[13.5px] text-blue-100">{occ} logement(s) occupé(s) sur {totalProps} • <b className="text-white">{formatMoney(rentRest + waterRest, currency)}</b> reste à recevoir • Relevé eau prévu le <b className="text-white">{state.settings.waterReadingDay} du mois</b></p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Btn variant="success" onClick={() => go('payments')}><Plus size={16} /> Nouveau paiement</Btn>
              <Btn variant="secondary" onClick={() => go('reports')}>Voir rapports <ArrowRight size={15} /></Btn>
              <button type="button" onClick={() => { playLateAlert(); go('rents'); }} className="btn-uniform inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white backdrop-blur hover:bg-white/20"><Volume2 size={15} /> Tester alerte sonore</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/20 backdrop-blur"><p className="text-[20px] font-extrabold text-white">{totalProps}</p><p className="text-[10.5px] font-bold uppercase tracking-wide text-blue-100">Logements</p></div>
            <div className="rounded-2xl bg-rose-500/85 px-4 py-3 ring-1 ring-white/20 backdrop-blur"><p className="text-[20px] font-extrabold text-white">{lateAlerts.length}</p><p className="text-[10.5px] font-bold uppercase tracking-wide text-rose-100">Retards</p></div>
            <div className="rounded-2xl bg-cyan-500/85 px-4 py-3 ring-1 ring-white/20 backdrop-blur"><p className="text-[20px] font-extrabold text-white">{waterAlerts.length}</p><p className="text-[10.5px] font-bold uppercase tracking-wide text-cyan-100">Relevés eau</p></div>
          </div>
        </div>
      </div>

      {/* BANDEAU SIGNALEMENT — retards & prélèvements compteur */}
      {(lateAlerts.length > 0 || waterAlerts.length > 0 || dueAlerts.length > 0) && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {lateAlerts.length > 0 && (
            <button type="button" onClick={() => { playLateAlert(); go('rents'); }} className="btn-uniform pulse-danger flex items-start gap-3 rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-600 to-rose-700 p-4 text-left text-white shadow-lg">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><BellRing size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">🚨 {lateAlerts.length} retard{lateAlerts.length > 1 ? 's' : ''} de paiement</span><span className="mt-0.5 block truncate text-[12px] text-rose-100">{lateAlerts[0].title} — {lateAlerts[0].dateLabel}</span><span className="mt-1 block text-[11.5px] font-bold text-white/85">Cliquer pour relancer • son d’alerte joué</span></span><ArrowRight size={17} className="mt-1 shrink-0" />
            </button>
          )}
          {waterAlerts.length > 0 && (
            <button type="button" onClick={() => { playWaterAlert(); go('water'); }} className="btn-uniform flex items-start gap-3 rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-600 to-teal-700 p-4 text-left text-white shadow-lg">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><Gauge size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">💧 Prélèvement compteur d’eau</span><span className="mt-0.5 block truncate text-[12px] text-cyan-100">{waterAlerts[0].propertyRef} — {waterAlerts[0].dateLabel} • prévu le {state.settings.waterReadingDay}</span><span className="mt-1 block text-[11.5px] font-bold text-white/85">{waterAlerts.length} compteur{waterAlerts.length > 1 ? 's' : ''} à relever ce mois-ci</span></span><ArrowRight size={17} className="mt-1 shrink-0" />
            </button>
          )}
          {dueAlerts.length > 0 && (
            <button type="button" onClick={() => go('rents')} className="btn-uniform flex items-start gap-3 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-left text-white shadow-lg">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><AlertTriangle size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">⏰ Échéance loyer proche</span><span className="mt-0.5 block truncate text-[12px] text-amber-100">{dueAlerts[0].title} — {dueAlerts[0].dateLabel}</span><span className="mt-1 block text-[11.5px] font-bold text-white/85">{dueAlerts.length} loyer{dueAlerts.length > 1 ? 's' : ''} à encaisser sous 3 jours</span></span><ArrowRight size={17} className="mt-1 shrink-0" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Logements" value={String(totalProps)} sub={`${occ} occupés • ${libres} libres`} icon={<Building2 size={19} />} accent="blue" />
        <StatCard label="Loyers à recevoir" value={formatMoney(rentDue, currency)} sub={`${formatMoney(rentPaid, currency)} encaissés`} icon={<Wallet size={19} />} accent="green" />
        <StatCard label="Eau à recevoir" value={formatMoney(waterDue, currency)} sub={`${formatMoney(waterPaid, currency)} encaissés`} icon={<Droplets size={19} />} accent="teal" />
        <StatCard label="Reste à recevoir" value={formatMoney(rentRest + waterRest, currency)} sub={`Loyers ${formatMoney(rentRest, currency)} • Eau ${formatMoney(waterRest, currency)}`} icon={<Banknote size={19} />} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="État des loyers" subtitle="Toutes échéances enregistrées" action={<button onClick={() => go('rents')} className="btn-uniform inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800">Détail <ArrowRight size={14} /></button>} />
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center"><CircleCheck className="mx-auto text-emerald-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-emerald-700">{rentPaye}</p><p className="text-[11.5px] font-semibold text-emerald-600">Payés</p></div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center"><CircleAlert className="mx-auto text-amber-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-amber-700">{rentInc}</p><p className="text-[11.5px] font-semibold text-amber-600">Incomplets</p></div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center"><CircleX className="mx-auto text-rose-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-rose-700">{rentNon}</p><p className="text-[11.5px] font-semibold text-rose-600">Non payés</p></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="État de l'eau" subtitle="Toutes factures enregistrées" action={<button onClick={() => go('water')} className="btn-uniform inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800">Détail <ArrowRight size={14} /></button>} />
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center"><CircleCheck className="mx-auto text-emerald-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-emerald-700">{waterPaye}</p><p className="text-[11.5px] font-semibold text-emerald-600">Payées</p></div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center"><CircleAlert className="mx-auto text-amber-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-amber-700">{waterInc}</p><p className="text-[11.5px] font-semibold text-amber-600">Incomplètes</p></div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center"><CircleX className="mx-auto text-rose-600" size={20} /><p className="mt-1 text-[20px] font-extrabold text-rose-700">{waterNon}</p><p className="text-[11.5px] font-semibold text-rose-600">Non payées</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Répartition des logements" subtitle="Par statut d'occupation" />
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-[150px] w-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={propData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                    {propData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-[12.5px]">
              {propData.map(d => (
                <div key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /><span className="font-semibold text-slate-700">{d.name}</span><span className="font-bold text-slate-900">{d.value}</span></div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Encaissements — 6 derniers mois" subtitle="Loyers et eau encaissés par période" />
          <div className="h-[210px] px-3 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => formatMoney(Number(v || 0), currency)} />
                <Bar dataKey="loyers" fill="#2563eb" radius={[5, 5, 0, 0]} name="Loyers" />
                <Bar dataKey="eau" fill="#14b8a6" radius={[5, 5, 0, 0]} name="Eau" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="À faire" subtitle="Points d'attention" />
          <div className="space-y-2.5 px-5 py-4">
            <button onClick={() => go('rents')} className="btn-uniform flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-left hover:bg-rose-50">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <div className="flex-1"><p className="text-[13px] font-bold text-slate-900">{rentNon + rentInc} loyers en retard / incomplets</p><p className="text-[11.5px] text-slate-500">Reste {formatMoney(rentRest, currency)}</p></div>
              <ArrowRight size={15} className="text-slate-400" />
            </button>
            <button onClick={() => go('water')} className="btn-uniform flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-left hover:bg-amber-50">
              <Droplets size={18} className="shrink-0 text-amber-600" />
              <div className="flex-1"><p className="text-[13px] font-bold text-slate-900">{waterNon + waterInc} factures d'eau à suivre</p><p className="text-[11.5px] text-slate-500">Reste {formatMoney(waterRest, currency)}</p></div>
              <ArrowRight size={15} className="text-slate-400" />
            </button>
            <button onClick={() => go('contracts')} className="btn-uniform flex w-full items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-left hover:bg-violet-50">
              <FileWarning size={18} className="shrink-0 text-violet-600" />
              <div className="flex-1"><p className="text-[13px] font-bold text-slate-900">{expiring.length} contrat(s) bientôt expirés</p><p className="text-[11.5px] text-slate-500">Échéance sous 120 jours</p></div>
              <ArrowRight size={15} className="text-slate-400" />
            </button>
            <button onClick={() => go('maintenance')} className="btn-uniform flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100">
              <AlertTriangle size={18} className="shrink-0 text-slate-600" />
              <div className="flex-1"><p className="text-[13px] font-bold text-slate-900">{state.maintenances.filter(m => m.status === 'signale' || m.status === 'en_cours').length} maintenances en cours</p><p className="text-[11.5px] text-slate-500">À traiter</p></div>
              <ArrowRight size={15} className="text-slate-400" />
            </button>
          </div>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader title="Retards de loyers" subtitle="Échéances passées non soldées" action={<button onClick={() => go('rents')} className="btn-uniform rounded-lg px-2 py-1 text-[12.5px] font-bold text-blue-600 hover:bg-blue-50">Tout voir</button>} />
          <div className="divide-y divide-slate-50">
            {lateRents.length === 0 && <p className="px-5 py-6 text-center text-[12.5px] text-slate-500">Aucun retard. Bravo ! 🎉</p>}
            {lateRents.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-900">{tenantName(r.tenantId || '')} • {propRef(r.propertyId || '')}</p>
                  <p className="text-[12px] text-slate-500">{periodShort(r.month, r.year)} • Reste {formatMoney(r.rest, currency)}</p>
                </div>
                <StatusBadge status={r.status} size="sm" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader title="Dernières opérations" subtitle="Paiements récents" action={<button onClick={() => go('payments')} className="btn-uniform rounded-lg px-2 py-1 text-[12.5px] font-bold text-blue-600 hover:bg-blue-50">Tout voir</button>} />
          <div className="divide-y divide-slate-50">
            {lastPayments.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[12px] font-extrabold text-blue-700">{p.reference.slice(-3)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-900">{tenantName(p.tenantId)} • {propRef(p.propertyId)}</p>
                  <p className="text-[12px] text-slate-500">{formatDate(p.paymentDate)} • {p.kind === 'mixte' ? 'Loyer + Eau' : p.kind === 'loyer' ? 'Loyer' : 'Eau'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-extrabold text-slate-900">{formatMoney(p.amount, currency)}</p>
                  <Pill color="green">Encaissé</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
