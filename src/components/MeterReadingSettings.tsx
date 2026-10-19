import { useState } from 'react';
import { CalendarClock, Check, Clock3, Droplets, Pencil, RotateCcw, Save } from 'lucide-react';
import { useStore } from '../store/store';
import { useToast } from './notifications';
import { Btn, Card, CardHeader, Field, inputCls, Modal, Pill } from './ui';
import { daysBetween } from '../utils/alerts';
import { localDateKey, meterReadingSchedule, parseLocalDate } from '../utils/waterSchedule';
import { formatDate } from '../utils/helpers';
import type { WaterMeter } from '../types';

export default function MeterReadingSettings({ onGlobalSaved }: { onGlobalSaved?: (day: number) => void }) {
  const { state, update } = useStore();
  const { push } = useToast();
  const [globalDay, setGlobalDay] = useState(String(state.settings.waterReadingDay || 25));
  const [meterId, setMeterId] = useState<string | null>(null);
  const [mode, setMode] = useState<'general' | 'personnalise'>('general');
  const [customDay, setCustomDay] = useState('25');
  const [oneOff, setOneOff] = useState('');
  const [error, setError] = useState('');
  const current = state.waterMeters.find(m => m.id === meterId);
  const today = new Date();

  const edit = (meter: WaterMeter) => {
    setMeterId(meter.id);
    setMode(meter.readingDay ? 'personnalise' : 'general');
    setCustomDay(String(meter.readingDay || state.settings.waterReadingDay || 25));
    setOneOff(meter.nextReadingDate || '');
    setError('');
  };

  const saveGlobal = () => {
    const day = Number(globalDay);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      push({ severity: 'warning', title: 'Jour invalide', message: 'Choisissez un jour entre 1 et 28 pour tous les mois.' });
      return;
    }
    if (day === state.settings.waterReadingDay) return;
    update(s => { s.settings.waterReadingDay = day; return s; });
    onGlobalSaved?.(day);
    push({ severity: 'success', title: 'Planning général mis à jour', message: `Relevé prévu le ${day} du mois pour les compteurs sans exception.` });
  };

  const saveMeter = () => {
    if (!current) return;
    const day = Number(customDay);
    if (mode === 'personnalise' && (!Number.isInteger(day) || day < 1 || day > 28)) {
      setError('Le jour personnalisé doit être compris entre 1 et 28.');
      return;
    }
    const plannedDate = oneOff ? parseLocalDate(oneOff) : null;
    if (oneOff && !plannedDate) {
      setError('Date ponctuelle invalide.');
      return;
    }
    if (plannedDate && state.waterReadings.some(r => r.meterId === current.id && r.periodYear === plannedDate.getFullYear() && r.periodMonth === plannedDate.getMonth() + 1)) {
      setError('Un relevé est déjà enregistré pour ce mois. Choisissez une autre date.');
      return;
    }
    const nextDay = mode === 'personnalise' ? day : undefined;
    const nextOneOff = plannedDate ? localDateKey(plannedDate) : undefined;
    if (current.readingDay === nextDay && current.nextReadingDate === nextOneOff) {
      setMeterId(null);
      return;
    }
    update(s => {
      const meter = s.waterMeters.find(m => m.id === current.id);
      if (meter) { meter.readingDay = nextDay; meter.nextReadingDate = nextOneOff; }
      return s;
    });
    push({ severity: 'water', title: `Planning modifié · ${current.meterNumber}`, message: nextOneOff ? `Prochain relevé déplacé au ${formatDate(nextOneOff)}. Le planning mensuel reprend ensuite.` : `Rappel mensuel le ${nextDay ?? state.settings.waterReadingDay} du mois.` });
    setMeterId(null);
  };

  return (
    <>
      <Card>
        <CardHeader theme="teal" title="Dates prévues des relevés" subtitle="Modifiez le planning général ou choisissez une date pour chaque compteur. Les rappels et alertes suivent ces dates." />
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 bg-cyan-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white"><CalendarClock size={19} /></div>
            <div><p className="text-[13px] font-extrabold text-slate-900">Jour de relevé général</p><p className="text-[12px] text-slate-500">Appliqué aux compteurs sans jour personnalisé, chaque mois</p></div>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Jour (1 à 28)"><input type="number" min={1} max={28} step={1} className={`${inputCls} w-24`} value={globalDay} onChange={e => setGlobalDay(e.target.value)} /></Field>
            <Btn variant="teal" onClick={saveGlobal}><Save size={15} /> Enregistrer</Btn>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table w-full min-w-[690px] text-left">
            <thead><tr className="bg-gradient-to-r from-cyan-700 to-teal-600 text-[11px] font-bold uppercase tracking-wide text-white">
              <th className="px-5 py-3">Compteur / Logement</th><th className="px-4 py-3">Récurrence</th><th className="px-4 py-3">Prochain relevé</th><th className="px-4 py-3">Situation</th><th className="px-5 py-3 text-right">Modifier</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {state.waterMeters.map((meter, index) => {
                const { due, source, day } = meterReadingSchedule(state, meter.id, today);
                const daysLeft = daysBetween(today, due);
                const property = state.properties.find(p => p.id === meter.propertyId);
                return (
                  <tr key={meter.id} className={`${index % 2 ? 'bg-cyan-50/40' : 'bg-white'} hover:bg-cyan-100/50`}>
                    <td className="px-5 py-3"><p className="text-[13px] font-bold text-slate-900">{meter.meterNumber}</p><p className="text-[11.5px] text-slate-500">Logement {property?.reference || '—'}</p></td>
                    <td className="px-4 py-3"><span className="text-[12.5px] font-semibold text-slate-700">Le {meter.readingDay || state.settings.waterReadingDay} du mois</span><p className="text-[11px] text-slate-500">{meter.readingDay ? 'Personnalisé' : 'Planning général'}</p></td>
                    <td className="px-4 py-3"><p className="text-[13px] font-bold text-slate-800">{formatDate(localDateKey(due))}</p>{source === 'ponctuelle' && <p className="text-[11px] font-semibold text-cyan-700">Date ponctuelle, puis reprise mensuelle</p>}</td>
                    <td className="px-4 py-3">{meter.status !== 'actif' ? <Pill color="slate">Inactif</Pill> : daysLeft < 0 ? <Pill color="red">Retard de {Math.abs(daysLeft)} j</Pill> : daysLeft <= 3 ? <Pill color="amber">{daysLeft === 0 ? "Aujourd'hui" : `Dans ${daysLeft} j`}</Pill> : <Pill color="teal">Planifié · jour {day}</Pill>}</td>
                    <td className="px-5 py-3 text-right"><Btn size="sm" variant="secondary" onClick={() => edit(meter)}><Pencil size={13} /> Ajuster</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-slate-100 px-5 py-3 text-[12px] text-slate-600"><Droplets size={15} className="mt-0.5 shrink-0 text-cyan-600" /><span>Une date ponctuelle est utilisée pour le prochain relevé seulement. Après l'enregistrement du relevé, le jour mensuel reprend automatiquement. Chaque modification figure dans le journal d'activité.</span></div>
      </Card>

      <Modal open={Boolean(current)} onClose={() => setMeterId(null)} title={current ? `Ajuster le relevé · ${current.meterNumber}` : 'Ajuster le relevé'} subtitle={current ? `Logement ${state.properties.find(p => p.id === current.propertyId)?.reference || '—'} · planning individuel du compteur` : ''}>
        {current && <div className="space-y-5">
          <div className="rounded-xl bg-cyan-50 p-3 text-[12.5px] font-semibold text-cyan-900">Date actuellement prévue : <b>{formatDate(localDateKey(meterReadingSchedule(state, current.id).due))}</b>. Les factures passées ne sont jamais recalculées.</div>
          <div>
            <p className="mb-2 text-[12.5px] font-bold text-slate-700">Récurrence mensuelle</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setMode('general')} className={`btn-uniform rounded-xl border-2 p-3 text-left text-[12.5px] ${mode === 'general' ? 'border-cyan-600 bg-cyan-50 text-cyan-900' : 'border-slate-200 text-slate-600'}`}><span className="flex items-center gap-2 font-bold">{mode === 'general' && <Check size={15} />} Jour général</span><span className="mt-1 block">Le {state.settings.waterReadingDay} du mois</span></button>
              <button type="button" onClick={() => setMode('personnalise')} className={`btn-uniform rounded-xl border-2 p-3 text-left text-[12.5px] ${mode === 'personnalise' ? 'border-cyan-600 bg-cyan-50 text-cyan-900' : 'border-slate-200 text-slate-600'}`}><span className="flex items-center gap-2 font-bold">{mode === 'personnalise' && <Check size={15} />} Jour personnalisé</span><span className="mt-1 block">Spécifique à ce compteur</span></button>
            </div>
            {mode === 'personnalise' && <Field label="Jour du mois pour ce compteur (1 à 28)" className="mt-3"><input type="number" min={1} max={28} step={1} value={customDay} onChange={e => setCustomDay(e.target.value)} className={inputCls} /></Field>}
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
            <Field label="Déplacer le prochain relevé à une date précise (facultatif)"><input type="date" value={oneOff} onChange={e => { setOneOff(e.target.value); setError(''); }} className={inputCls} /></Field>
            <p className="mt-2 text-[12px] text-slate-600">Cette date remplace une seule occurrence. Le planning mensuel reprend après ce relevé.</p>
            {oneOff && <button type="button" onClick={() => setOneOff('')} className="btn-uniform mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-cyan-700 hover:bg-cyan-100"><RotateCcw size={12} /> Revenir au planning mensuel</button>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-[12.5px] font-semibold text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setMeterId(null)}>Annuler</Btn><Btn variant="teal" onClick={saveMeter}><Clock3 size={15} /> Enregistrer la date</Btn></div>
        </div>}
      </Modal>
    </>
  );
}