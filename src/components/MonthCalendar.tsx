import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Check, Plus, X, Eraser, CalendarCheck2 } from 'lucide-react';
import type { Contract, PaymentStatus } from '../types';
import { MONTHS_FR, MONTHS_SHORT, formatMoney, periodShort } from '../utils/helpers';
import { playClick } from '../utils/sound';

export interface CalRent { id: string; month: number; year: number; amountDue: number; paid: number; rest: number; status: PaymentStatus }

export const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
export const parseKey = (k: string) => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) });
const idx = (y: number, m: number) => y * 12 + (m - 1);

interface Props {
  contract: Contract;
  rents: CalRent[];            // échéances existantes du contrat
  selected: string[];          // clés "YYYY-MM"
  onChange: (keys: string[]) => void;
  currency: string;
}

type CellState = 'paid' | 'late' | 'partial' | 'due' | 'new' | 'outside';

export default function MonthCalendar({ contract, rents, selected, onChange, currency }: Props) {
  const startY = Number(contract.startDate.slice(0, 4)), startM = Number(contract.startDate.slice(5, 7));
  const endY = Number(contract.endDate.slice(0, 4)), endM = Number(contract.endDate.slice(5, 7));
  const today = new Date();
  const [allowOutside, setAllowOutside] = useState(false);
  const [nextCount, setNextCount] = useState(6);

  const byKey = useMemo(() => { const m = new Map<string, CalRent>(); rents.forEach(r => m.set(monthKey(r.year, r.month), r)); return m; }, [rents]);

  // Année affichée par défaut : celle du premier mois non soldé (sinon année courante)
  const firstUnpaid = useMemo(() => {
    const list = [...rents].filter(r => r.rest > 0).sort((a, b) => idx(a.year, a.month) - idx(b.year, b.month));
    return list[0];
  }, [rents]);
  const [viewYear, setViewYear] = useState<number>(() => firstUnpaid?.year ?? Math.min(Math.max(today.getFullYear(), startY), endY));

  const minYear = startY;
  const maxYear = allowOutside ? Math.max(endY, today.getFullYear()) + 20 : endY;
  const years: number[] = []; for (let y = minYear; y <= maxYear; y++) years.push(y);
  const safeYear = Math.min(Math.max(viewYear, minYear), maxYear);

  const inContract = (y: number, m: number) => idx(y, m) >= idx(startY, startM) && idx(y, m) <= idx(endY, endM);

  const cell = (y: number, m: number): { state: CellState; rest: number; due: number; disabled: boolean } => {
    const r = byKey.get(monthKey(y, m));
    if (r) {
      if (r.status === 'PAYE') return { state: 'paid', rest: 0, due: r.amountDue, disabled: true };
      const dueDate = new Date(y, m - 1, Math.min(contract.dueDay || 5, 28));
      const late = dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (r.status === 'INCOMPLET') return { state: 'partial', rest: r.rest, due: r.amountDue, disabled: false };
      return { state: late ? 'late' : 'due', rest: r.rest, due: r.amountDue, disabled: false };
    }
    if (inContract(y, m)) return { state: 'new', rest: contract.monthlyRent, due: contract.monthlyRent, disabled: false };
    if (allowOutside && idx(y, m) >= idx(startY, startM)) return { state: 'new', rest: contract.monthlyRent, due: contract.monthlyRent, disabled: false };
    return { state: 'outside', rest: 0, due: 0, disabled: true };
  };

  const selSet = new Set(selected);
  const toggle = (y: number, m: number) => {
    const k = monthKey(y, m); playClick();
    onChange(selSet.has(k) ? selected.filter(x => x !== k) : [...selected, k].sort());
  };

  const selectableOfYear = (y: number) => Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !cell(y, m).disabled).map(m => monthKey(y, m));
  const selectYear = () => onChange(Array.from(new Set([...selected, ...selectableOfYear(safeYear)])).sort());
  const clearYear = () => onChange(selected.filter(k => parseKey(k).year !== safeYear));
  const clearAll = () => onChange([]);

  // Sélectionner les N prochains mois non soldés (chronologique, à partir du premier impayé) — sans limite de durée
  const selectNext = () => {
    const out: string[] = [];
    let y = firstUnpaid ? firstUnpaid.year : Math.max(startY, today.getFullYear());
    let m = firstUnpaid ? firstUnpaid.month : (startY === today.getFullYear() ? Math.max(startM, today.getMonth() + 1) : 1);
    if (!firstUnpaid && idx(y, m) < idx(startY, startM)) { y = startY; m = startM; }
    let guard = 0;
    while (out.length < nextCount && guard++ < 600) {
      const c = cell(y, m);
      if (!c.disabled) out.push(monthKey(y, m));
      m++; if (m > 12) { m = 1; y++; }
      if (!allowOutside && idx(y, m) > idx(endY, endM)) break;
    }
    onChange(Array.from(new Set([...selected, ...out])).sort());
    if (out.length) setViewYear(parseKey(out[0]).year);
  };

  const styles: Record<CellState, string> = {
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-not-allowed opacity-80',
    late: 'border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-500',
    partial: 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-500',
    due: 'border-slate-200 bg-white text-slate-700 hover:border-blue-400',
    new: 'border-dashed border-blue-300 bg-blue-50/50 text-blue-800 hover:border-blue-500',
    outside: 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed',
  };
  const labels: Record<CellState, string> = { paid: 'Payé', late: 'Non payé • retard', partial: 'Incomplet', due: 'Non payé', new: 'Échéance à créer', outside: 'Hors contrat' };

  const selectedInfo = selected.map(k => ({ k, ...parseKey(k) })).sort((a, b) => a.k.localeCompare(b.k));
  const totalSel = selectedInfo.reduce((s, it) => s + cell(it.year, it.month).rest, 0);
  const selYears = new Set(selectedInfo.map(i => i.year));

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      {/* En-tête calendrier */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={18} />
          <div><p className="text-[13.5px] font-extrabold leading-tight">Calendrier des loyers</p><p className="text-[11.5px] text-blue-100">Contrat {contract.reference} • {periodShort(startM, startY)} → {periodShort(endM, endY)} • {formatMoney(contract.monthlyRent, currency)}/mois</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={safeYear <= minYear} onClick={() => { playClick(); setViewYear(safeYear - 1); }} className="btn-uniform btn-icon flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/30 disabled:opacity-35" title="Année précédente"><ChevronLeft size={18} /></button>
          <select value={safeYear} onChange={e => setViewYear(Number(e.target.value))} className="h-9 rounded-xl border-0 bg-white px-3 text-[14px] font-extrabold text-blue-800 shadow focus:outline-none focus:ring-2 focus:ring-white/60">
            {years.map(y => <option key={y} value={y}>{y}{selYears.has(y) ? ' ●' : ''}</option>)}
          </select>
          <button type="button" disabled={safeYear >= maxYear} onClick={() => { playClick(); setViewYear(safeYear + 1); }} className="btn-uniform btn-icon flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/30 disabled:opacity-35" title="Année suivante"><ChevronRight size={18} /></button>
          <button type="button" onClick={() => { playClick(); setViewYear(Math.min(Math.max(today.getFullYear(), minYear), maxYear)); }} className="btn-uniform ml-1 flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[12px] font-bold ring-1 ring-white/25 hover:bg-white/30"><CalendarCheck2 size={14} /> Aujourd'hui</button>
        </div>
      </div>

      {/* Grille de mois */}
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const c = cell(safeYear, m);
          const isSel = selSet.has(monthKey(safeYear, m));
          const isToday = safeYear === today.getFullYear() && m === today.getMonth() + 1;
          return (
            <button key={m} type="button" disabled={c.disabled} onClick={() => toggle(safeYear, m)} title={`${MONTHS_FR[m - 1]} ${safeYear} — ${labels[c.state]}`}
              className={`btn-uniform relative rounded-2xl border-2 px-3 py-2.5 text-left ${isSel ? 'border-blue-600 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-300/50 ring-2 ring-blue-300' : styles[c.state]}`}>
              <span className="flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold">{MONTHS_SHORT[m - 1]}</span>
                {isSel ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-700"><Check size={13} strokeWidth={3} /></span>
                  : c.state === 'paid' ? <Check size={15} className="text-emerald-600" />
                  : c.state === 'new' ? <Plus size={14} className="text-blue-500" /> : null}
              </span>
              <span className={`mt-0.5 block text-[11px] font-semibold ${isSel ? 'text-blue-100' : ''}`}>{c.state === 'paid' ? 'Payé ✓' : c.state === 'outside' ? 'Hors contrat' : formatMoney(c.rest, currency)}</span>
              <span className={`block text-[10px] font-bold uppercase tracking-wide ${isSel ? 'text-blue-200' : 'opacity-75'}`}>{isSel ? 'Sélectionné' : c.state === 'new' ? 'À créer' : c.state === 'late' ? 'Retard' : c.state === 'partial' ? 'Incomplet' : c.state === 'due' ? 'Non payé' : ''}</span>
              {isToday && <span className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${isSel ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>MOIS ACTUEL</span>}
            </button>
          );
        })}
      </div>

      {/* Légende + raccourcis */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11.5px] font-semibold text-slate-600">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-400" /> Payé</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-amber-400" /> Incomplet</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-rose-400" /> Non payé en retard</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-dashed border-blue-400 bg-blue-100" /> Échéance à créer (avance)</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-blue-600" /> Sélectionné</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <button type="button" onClick={() => { playClick(); selectYear(); }} className="btn-uniform rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-100">Toute l'année {safeYear}</button>
        <button type="button" onClick={() => { playClick(); clearYear(); }} className="btn-uniform flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-100"><Eraser size={13} /> Vider {safeYear}</button>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1">
          <span className="text-[12px] font-bold text-slate-600">Les</span>
          <input type="number" min={1} max={120} value={nextCount} onChange={e => setNextCount(Math.max(1, Math.min(120, Number(e.target.value) || 1)))} className="h-7 w-14 rounded-lg border border-slate-300 text-center text-[13px] font-extrabold focus:border-blue-500 focus:outline-none" />
          <span className="text-[12px] font-bold text-slate-600">prochains mois non soldés</span>
          <button type="button" onClick={() => { playClick(); selectNext(); }} className="btn-uniform rounded-lg bg-blue-600 px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-blue-700">Sélectionner</button>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-600">
          <input type="checkbox" checked={allowOutside} onChange={e => setAllowOutside(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          Autoriser après la fin du contrat (reconduction)
        </label>
      </div>

      {/* Résumé sélection */}
      <div className="border-t border-blue-100 bg-blue-50/60 px-4 py-3">
        {selectedInfo.length === 0 ? (
          <p className="text-[12.5px] font-semibold text-slate-500">Cliquez sur un ou plusieurs mois. Changez d'année avec les flèches : la sélection est conservée sur toute la durée du contrat.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-extrabold text-blue-900">{selectedInfo.length} mois sélectionné{selectedInfo.length > 1 ? 's' : ''} • du {periodShort(selectedInfo[0].month, selectedInfo[0].year)} au {periodShort(selectedInfo[selectedInfo.length - 1].month, selectedInfo[selectedInfo.length - 1].year)} • <span className="text-blue-700">{formatMoney(totalSel, currency)}</span></p>
              <button type="button" onClick={() => { playClick(); clearAll(); }} className="btn-uniform flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-rose-600 hover:bg-rose-50"><X size={13} /> Tout effacer</button>
            </div>
            <div className="mt-2 flex max-h-[84px] flex-wrap gap-1.5 overflow-y-auto">
              {selectedInfo.map(it => (
                <span key={it.k} className="inline-flex items-center gap-1 rounded-full bg-blue-600 py-1 pl-2.5 pr-1 text-[11.5px] font-bold text-white shadow-sm">
                  {periodShort(it.month, it.year)}
                  <button type="button" onClick={() => toggle(it.year, it.month)} className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 hover:bg-white/50"><X size={10} /></button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
