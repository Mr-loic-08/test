import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, PaymentAllocation, Payment, RentSchedule, WaterInvoice, PaymentStatus, AppSettings } from '../types';
import { seedState } from '../data/seed';
import { getStatus, remaining, uid } from '../utils/helpers';
import { setSoundEnabled, setSoundVolume, playSuccess } from '../utils/sound';

const STORAGE_KEY = 'gestion_locative_v1';
export const AUTOBACKUP_KEY = 'gestion_locative_autobackup_latest';
export const AUTOBACKUP_HISTORY_KEY = 'gestion_locative_autobackup_history';

export const DEFAULT_SETTINGS: AppSettings = {
  landlordName: 'Bailleur Démo', company: 'SCI Les Palmiers', phone: '', email: '', address: '', currency: 'F',
  receiptHeader: 'GESTION LOCATIVE', receiptFooter: 'Merci de votre confiance.', dueDayDefault: 5,
  soundEnabled: true, soundVolume: 0.6, soundOnAlerts: true, soundOnPayment: true, soundOnClick: false,
  autoBackupEnabled: true, autoBackupIntervalMinutes: 5, autoBackupCount: 0,
  waterReadingDay: 25, rentLateGraceDays: 0, alertRentDaysBefore: 3,
};

function withDefaults(s: AppState): AppState {
  return { ...seedState, ...s, settings: { ...DEFAULT_SETTINGS, ...(seedState.settings as AppSettings), ...(s.settings || {}) } as AppSettings };
}
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw) as AppState; if (parsed?.properties && parsed?.tenants) return withDefaults(parsed); }
  } catch {}
  return structuredClone(seedState);
}
export interface AutoBackupInfo { at: string; sizeKo: number; }
export function readAutoBackupHistory(): AutoBackupInfo[] {
  try { return JSON.parse(localStorage.getItem(AUTOBACKUP_HISTORY_KEY) || '[]'); } catch { return []; }
}
export function restoreAutoBackup(): AppState | null {
  try { const raw = localStorage.getItem(AUTOBACKUP_KEY); if (!raw) return null; const p = JSON.parse(raw); const d = p.data || p; return withDefaults(d); } catch { return null; }
}

interface ComputedRent extends RentSchedule { paid: number; rest: number; status: PaymentStatus; tenantId?: string; propertyId?: string; }
interface ComputedWater extends WaterInvoice { paid: number; rest: number; status: PaymentStatus; tenantId?: string; propertyId?: string; }
interface StoreCtx {
  state: AppState; update: (fn: (s: AppState) => AppState) => void; reset: () => void; importState: (s: AppState) => void;
  rents: ComputedRent[]; waters: ComputedWater[]; rentPaidMap: Map<string, number>; waterPaidMap: Map<string, number>;
  addPaymentWithAllocations: (p: Omit<Payment, 'id' | 'createdAt' | 'reference'> & { allocations: { rentScheduleId?: string; waterInvoiceId?: string; allocatedAmount: number }[] }) => Payment;
  tenantRentStatus: (tenantId: string) => { due: number; paid: number; rest: number; status: PaymentStatus; countPaye: number; countInc: number; countNon: number };
  tenantWaterStatus: (tenantId: string) => { due: number; paid: number; rest: number; status: PaymentStatus; countPaye: number; countInc: number; countNon: number };
  contractRents: (contractId: string) => ComputedRent[]; contractWaters: (contractId: string) => ComputedWater[];
  lastSavedAt: string; triggerAutoBackup: (reason?: string) => void;
}
const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => new Date().toISOString());
  const stateRef = useRef(state); stateRef.current = state;
  const lastAutoRef = useRef<number>(Date.now());

  // Sauvegarde instantanée à chaque modification (debounce court)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setLastSavedAt(new Date().toISOString()); } catch {}
    setSoundEnabled(state.settings.soundEnabled !== false); setSoundVolume(state.settings.soundVolume ?? 0.6);
  }, [state]);

  const doAutoBackup = (reason = 'auto') => {
    try {
      const payload = { app: 'GestionLocative', kind: 'autobackup', reason, exportedAt: new Date().toISOString(), data: stateRef.current };
      const str = JSON.stringify(payload);
      localStorage.setItem(AUTOBACKUP_KEY, str);
      const hist = readAutoBackupHistory();
      hist.unshift({ at: payload.exportedAt, sizeKo: Math.round((str.length / 1024) * 10) / 10 });
      localStorage.setItem(AUTOBACKUP_HISTORY_KEY, JSON.stringify(hist.slice(0, 10)));
      lastAutoRef.current = Date.now();
      // met à jour les métadonnées sans boucle (valeurs identiques ignorées par l'intervalle)
      setState(prev => ({ ...prev, settings: { ...prev.settings, lastAutoBackup: payload.exportedAt, autoBackupCount: (prev.settings.autoBackupCount || 0) + 1 } }));
    } catch {}
  };
  const triggerAutoBackup = (reason?: string) => doAutoBackup(reason || 'manuel');

  // Boucle sauvegarde automatique
  useEffect(() => {
    if (!state.settings.autoBackupEnabled) return;
    const intervalMs = Math.max(1, state.settings.autoBackupIntervalMinutes || 5) * 60000;
    const id = setInterval(() => { if (Date.now() - lastAutoRef.current >= intervalMs - 5000) doAutoBackup('intervalle'); }, 15000);
    // première sauvegarde auto 8s après ouverture si jamais faite récemment
    const first = setTimeout(() => { if (Date.now() - lastAutoRef.current > 60000) doAutoBackup('ouverture'); }, 8000);
    return () => { clearInterval(id); clearTimeout(first); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.autoBackupEnabled, state.settings.autoBackupIntervalMinutes]);

  // Sauvegarde auto avant fermeture
  useEffect(() => {
    const onBefore = () => { try { localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify({ app: 'GestionLocative', kind: 'autobackup', reason: 'fermeture', exportedAt: new Date().toISOString(), data: stateRef.current })); } catch {} };
    window.addEventListener('beforeunload', onBefore); return () => window.removeEventListener('beforeunload', onBefore);
  }, []);

  const update = (fn: (s: AppState) => AppState) => setState(prev => fn(structuredClone(prev)));
  const reset = () => setState(structuredClone(seedState));
  const importState = (s: AppState) => setState(withDefaults(s));

  const { rents, waters, rentPaidMap, waterPaidMap } = useMemo(() => {
    const rentPaidMap = new Map<string, number>(); const waterPaidMap = new Map<string, number>();
    state.allocations.forEach(a => {
      if (a.rentScheduleId) rentPaidMap.set(a.rentScheduleId, (rentPaidMap.get(a.rentScheduleId) || 0) + a.allocatedAmount);
      if (a.waterInvoiceId) waterPaidMap.set(a.waterInvoiceId, (waterPaidMap.get(a.waterInvoiceId) || 0) + a.allocatedAmount);
    });
    const contractById = new Map(state.contracts.map(c => [c.id, c]));
    const rents = state.rentSchedules.map(r => { const paid = rentPaidMap.get(r.id) || 0; const c = contractById.get(r.contractId); return { ...r, paid, rest: remaining(r.amountDue, paid), status: getStatus(r.amountDue, paid), tenantId: c?.tenantId, propertyId: c?.propertyId }; }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    const waters = state.waterInvoices.map(w => { const paid = waterPaidMap.get(w.id) || 0; const c = contractById.get(w.contractId); return { ...w, paid, rest: remaining(w.amountDue, paid), status: getStatus(w.amountDue, paid), tenantId: c?.tenantId, propertyId: c?.propertyId }; }).sort((a, b) => a.periodYear !== b.periodYear ? b.periodYear - a.periodYear : b.periodMonth - a.periodMonth);
    return { rents, waters, rentPaidMap, waterPaidMap };
  }, [state]);

  const tenantRentStatus = (tenantId: string) => {
    const contracts = state.contracts.filter(c => c.tenantId === tenantId).map(c => c.id);
    const list = rents.filter(r => contracts.includes(r.contractId));
    const due = list.reduce((s, r) => s + r.amountDue, 0); const paid = list.reduce((s, r) => s + r.paid, 0); const rest = list.reduce((s, r) => s + r.rest, 0);
    const countPaye = list.filter(r => r.status === 'PAYE').length; const countInc = list.filter(r => r.status === 'INCOMPLET').length; const countNon = list.filter(r => r.status === 'NON_PAYE').length;
    let status: PaymentStatus = 'PAYE';
    if (list.length > 0) { if (rest === 0 && due > 0) status = 'PAYE'; else if (paid === 0) status = 'NON_PAYE'; else status = 'INCOMPLET'; }
    return { due, paid, rest, status, countPaye, countInc, countNon };
  };
  const tenantWaterStatus = (tenantId: string) => {
    const contracts = state.contracts.filter(c => c.tenantId === tenantId).map(c => c.id);
    const list = waters.filter(w => contracts.includes(w.contractId));
    const due = list.reduce((s, r) => s + r.amountDue, 0); const paid = list.reduce((s, r) => s + r.paid, 0); const rest = list.reduce((s, r) => s + r.rest, 0);
    const countPaye = list.filter(r => r.status === 'PAYE').length; const countInc = list.filter(r => r.status === 'INCOMPLET').length; const countNon = list.filter(r => r.status === 'NON_PAYE').length;
    let status: PaymentStatus = 'PAYE';
    if (list.length > 0) { if (rest === 0) status = 'PAYE'; else if (paid === 0) status = 'NON_PAYE'; else status = 'INCOMPLET'; }
    return { due, paid, rest, status, countPaye, countInc, countNon };
  };
  const contractRents = (contractId: string) => rents.filter(r => r.contractId === contractId).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const contractWaters = (contractId: string) => waters.filter(w => w.contractId === contractId).sort((a, b) => a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth);

  const addPaymentWithAllocations: StoreCtx['addPaymentWithAllocations'] = (input) => {
    const year = new Date().getFullYear(); const count = state.payments.length + 1;
    const reference = `PAY-${year}-${String(count).padStart(3, '0')}`;
    const payment: Payment = { id: uid('pay'), reference, tenantId: input.tenantId, contractId: input.contractId, propertyId: input.propertyId, paymentDate: input.paymentDate, amount: input.amount, method: input.method, kind: input.kind, comment: input.comment, createdAt: new Date().toISOString() };
    const allocs: PaymentAllocation[] = input.allocations.filter(a => a.allocatedAmount > 0).map(a => ({ id: uid('al'), paymentId: payment.id, rentScheduleId: a.rentScheduleId, waterInvoiceId: a.waterInvoiceId, allocatedAmount: a.allocatedAmount, createdAt: new Date().toISOString() }));
    setState(prev => { const next = structuredClone(prev); next.payments.push(payment); next.allocations.push(...allocs); next.documents.push({ id: uid('doc'), name: `Recu_${reference}.pdf`, type: 'recu', tenantId: payment.tenantId, propertyId: payment.propertyId, contractId: payment.contractId, paymentId: payment.id, filePath: `C:\\GestionLocative\\recus\\Recu_${reference}.pdf`, size: '95 Ko', createdAt: new Date().toISOString() }); return next; });
    if (stateRef.current.settings.soundEnabled && stateRef.current.settings.soundOnPayment) playSuccess();
    setTimeout(() => doAutoBackup('apres-paiement'), 400);
    return payment;
  };

  const value: StoreCtx = { state, update, reset, importState, rents, waters, rentPaidMap, waterPaidMap, addPaymentWithAllocations, tenantRentStatus, tenantWaterStatus, contractRents, contractWaters, lastSavedAt, triggerAutoBackup };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useStore(): StoreCtx { const ctx = useContext(Ctx); if (!ctx) throw new Error('useStore must be used within StoreProvider'); return ctx; }
