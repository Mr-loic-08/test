import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useStore } from '../store/store';
import { Card, CardHeader, Btn, StatCard, StatusBadge } from '../components/ui';
import { formatMoney, periodShort, formatDate, toCSV, downloadFile } from '../utils/helpers';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function Reports() {
  const { state, rents, waters } = useStore();
  const [year, setYear] = useState(2026);
  const [tenantF, setTenantF] = useState('all');
  const currency = state.settings.currency;

  const rentsY = rents.filter(r => r.year === year && (tenantF === 'all' || r.tenantId === tenantF));
  const watersY = waters.filter(w => w.periodYear === year && (tenantF === 'all' || w.tenantId === tenantF));

  const rDue = rentsY.reduce((s, r) => s + r.amountDue, 0);
  const rPaid = rentsY.reduce((s, r) => s + r.paid, 0);
  const wDue = watersY.reduce((s, w) => s + w.amountDue, 0);
  const wPaid = watersY.reduce((s, w) => s + w.paid, 0);

  const monthly = useMemo(() => {
    const arr = [];
    for (let m = 1; m <= 12; m++) {
      const rd = rentsY.filter(r => r.month === m).reduce((s, r) => s + r.amountDue, 0);
      const rp = rentsY.filter(r => r.month === m).reduce((s, r) => s + r.paid, 0);
      const wd = watersY.filter(w => w.periodMonth === m).reduce((s, w) => s + w.amountDue, 0);
      const wp = watersY.filter(w => w.periodMonth === m).reduce((s, w) => s + w.paid, 0);
      arr.push({ mois: periodShort(m, year), attendu: rd + wd, encaisse: rp + wp, loyers: rp, eau: wp });
    }
    return arr;
  }, [rentsY, watersY, year]);

  const statusPie = [
    { name: 'Payés', value: rentsY.filter(r => r.status === 'PAYE').length, color: '#10b981' },
    { name: 'Incomplets', value: rentsY.filter(r => r.status === 'INCOMPLET').length, color: '#f59e0b' },
    { name: 'Non payés', value: rentsY.filter(r => r.status === 'NON_PAYE').length, color: '#f43f5e' },
  ];

  const impayes = [...rentsY.filter(r => r.status !== 'PAYE').map(r => ({ type: 'Loyer' as const, r })), ...watersY.filter(w => w.status !== 'PAYE').map(w => ({ type: 'Eau' as const, w }))];

  const exportCSV = () => {
    const rows = rentsY.map(r => {
      const c = state.contracts.find(c => c.id === r.contractId);
      const t = c ? state.tenants.find(t => t.id === c.tenantId) : null;
      const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
      return { Periode: periodShort(r.month, r.year), Contrat: c?.reference, Locataire: t ? `${t.firstName} ${t.lastName}` : '', Logement: p?.reference, Attendu: r.amountDue, Paye: r.paid, Reste: r.rest, Etat: r.status };
    });
    downloadFile(`rapport-loyers-${year}.csv`, toCSV(rows), 'text/csv');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Rapports et statistiques" subtitle="Revenus • impayés • historiques — calculés depuis les données" action={<div className="flex gap-2"><Btn variant="secondary" size="sm" onClick={exportCSV}><Download size={14} /> CSV</Btn><Btn size="sm" onClick={() => window.print()}><Printer size={14} /> Imprimer / PDF</Btn></div>} />
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-bold">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <select value={tenantF} onChange={e => setTenantF(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold"><option value="all">Tous locataires</option>{state.tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select>
          <span className="ml-auto text-[12.5px] text-slate-500">Résumé {tenantF === 'all' ? 'global' : 'par locataire'} • année {year}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Revenus attendus" value={formatMoney(rDue + wDue, currency)} sub={`Loyers ${formatMoney(rDue, currency)} • Eau ${formatMoney(wDue, currency)}`} accent="blue" />
        <StatCard label="Encaissés" value={formatMoney(rPaid + wPaid, currency)} sub={`${rDue + wDue ? Math.round(((rPaid + wPaid) / (rDue + wDue)) * 100) : 0}% recouvré`} accent="green" />
        <StatCard label="Reste dû" value={formatMoney((rDue - rPaid) + (wDue - wPaid), currency)} accent="red" />
        <StatCard label="Impayés / incomplets" value={String(impayes.length)} sub="Échéances + factures" accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Évolution des encaissements" subtitle={`Attendu vs encaissé — ${year}`} />
          <div className="h-[260px] px-3 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={0} angle={-20} height={50} dy={10} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => formatMoney(Number(v || 0), currency)} />
                <Bar dataKey="attendu" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Attendu" />
                <Bar dataKey="encaisse" fill="#2563eb" radius={[4, 4, 0, 0]} name="Encaissé" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Répartition statuts loyers" />
          <div className="flex h-[260px] flex-col items-center justify-center">
            <div className="h-[170px] w-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} strokeWidth={0}>{statusPie.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-3 text-[12px] font-semibold">{statusPie.map(d => <span key={d.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name} ({d.value})</span>)}</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Loyers vs Eau encaissés" subtitle="Par mois" />
        <div className="h-[200px] px-3 py-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={1} />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatMoney(Number(v || 0), currency)} />
              <Line type="monotone" dataKey="loyers" stroke="#2563eb" strokeWidth={2.5} dot={false} name="Loyers" />
              <Line type="monotone" dataKey="eau" stroke="#14b8a6" strokeWidth={2.5} dot={false} name="Eau" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={`Impayés et incomplets (${impayes.length})`} subtitle="Loyers + eau non soldés" />
          <div className="max-h-[320px] divide-y divide-slate-50 overflow-y-auto">
            {impayes.slice(0, 30).map((it, i) => {
              if (it.type === 'Loyer') {
                const r = it.r; const c = state.contracts.find(c => c.id === r.contractId); const t = c ? state.tenants.find(t => t.id === c.tenantId) : null; const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
                return <div key={i} className="flex items-center gap-3 px-5 py-2.5"><span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-blue-700">LOYER</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">{t?.firstName} {t?.lastName} • {p?.reference} • {periodShort(r.month, r.year)}</p><p className="text-[12px] text-slate-500">Reste {formatMoney(r.rest, currency)}</p></div><StatusBadge status={r.status} size="sm" /></div>;
              } else {
                const w = it.w; const c = state.contracts.find(c => c.id === w.contractId); const t = c ? state.tenants.find(t => t.id === c.tenantId) : null; const p = c ? state.properties.find(p => p.id === c.propertyId) : null;
                return <div key={i} className="flex items-center gap-3 px-5 py-2.5"><span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-teal-700">EAU</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">{t?.firstName} {t?.lastName} • {p?.reference} • {periodShort(w.periodMonth, w.periodYear)}</p><p className="text-[12px] text-slate-500">Reste {formatMoney(w.rest, currency)}</p></div><StatusBadge status={w.status} size="sm" /></div>;
              }
            })}
            {impayes.length === 0 && <p className="px-5 py-6 text-center text-[13px] text-slate-500">Aucun impayé. 🎉</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Historique des paiements" subtitle="Dernières opérations" />
          <div className="max-h-[320px] divide-y divide-slate-50 overflow-y-auto">
            {[...state.payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 20).map(p => {
              const t = state.tenants.find(t => t.id === p.tenantId);
              return <div key={p.id} className="flex items-center gap-3 px-5 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">{p.reference} • {t?.firstName} {t?.lastName}</p><p className="text-[12px] text-slate-500">{formatDate(p.paymentDate)} • {p.kind}</p></div><p className="text-[13px] font-extrabold">{formatMoney(p.amount, currency)}</p></div>;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
