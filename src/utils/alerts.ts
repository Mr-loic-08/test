import type { AppState } from '../types';
import { meterReadingSchedule } from './waterSchedule';

export type AlertSeverity = 'danger' | 'warning' | 'water' | 'info';
export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  category: 'retard_loyer' | 'echeance_loyer' | 'releve_eau' | 'facture_eau' | 'contrat' | 'maintenance';
  title: string;
  message: string;
  dateLabel: string;
  days: number; // retard (+) ou jours restants (-)
  page: string;
  tenantName?: string;
  propertyRef?: string;
}

const DAY = 86400000;
export function daysBetween(a: Date, b: Date) {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
}

export function computeAlerts(state: AppState, rents: { id: string; contractId: string; month: number; year: number; amountDue: number; paid: number; rest: number; status: string }[], waters: { id: string; contractId: string; periodMonth: number; periodYear: number; amountDue: number; rest: number; status: string }[], now = new Date()): AppAlert[] {
  const alerts: AppAlert[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const waterReadingDay = state.settings.waterReadingDay ?? 25;
  const grace = state.settings.rentLateGraceDays ?? 0;

  // --- Loyers : retard + échéance proche ---
  rents.forEach(r => {
    if (r.status === 'PAYE' || r.rest <= 0) return;
    const c = state.contracts.find(x => x.id === r.contractId); if (!c) return;
    const t = state.tenants.find(x => x.id === c.tenantId);
    const p = state.properties.find(x => x.id === c.propertyId);
    const dueDate = new Date(r.year, r.month - 1, Math.min(c.dueDay || 5, 28));
    const lateDays = daysBetween(dueDate, today) - grace;
    const tenantName = t ? `${t.firstName} ${t.lastName}` : 'Locataire';
    if (lateDays > 0) {
      alerts.push({
        id: `late-rent-${r.id}`, severity: 'danger', category: 'retard_loyer',
        title: `Retard de paiement — ${tenantName}`,
        message: `Loyer ${r.month}/${r.year} • ${p?.reference || ''} • reste ${r.rest.toLocaleString('fr-FR')} ${state.settings.currency} • échéance le ${dueDate.toLocaleDateString('fr-FR')}`,
        dateLabel: `En retard de ${lateDays} jour${lateDays > 1 ? 's' : ''}`,
        days: lateDays, page: 'rents', tenantName, propertyRef: p?.reference,
      });
    } else if (lateDays >= -(state.settings.alertRentDaysBefore ?? 3)) {
      alerts.push({
        id: `due-rent-${r.id}`, severity: 'warning', category: 'echeance_loyer',
        title: `Échéance loyer proche — ${tenantName}`,
        message: `Loyer ${r.month}/${r.year} • ${p?.reference || ''} • ${r.rest.toLocaleString('fr-FR')} ${state.settings.currency} à recevoir avant le ${dueDate.toLocaleDateString('fr-FR')}`,
        dateLabel: lateDays === 0 ? "Aujourd'hui" : `Dans ${Math.abs(lateDays)} jour${Math.abs(lateDays) > 1 ? 's' : ''}`,
        days: lateDays, page: 'rents', tenantName, propertyRef: p?.reference,
      });
    }
  });

  // --- Eau : factures impayées anciennes ---
  waters.forEach(w => {
    if (w.status === 'PAYE' || w.rest <= 0) return;
    const c = state.contracts.find(x => x.id === w.contractId); if (!c) return;
    const t = state.tenants.find(x => x.id === c.tenantId);
    const p = state.properties.find(x => x.id === c.propertyId);
    const due = new Date(w.periodYear, w.periodMonth - 1, waterReadingDay);
    const late = daysBetween(due, today);
    if (late > 5) {
      alerts.push({
        id: `late-water-${w.id}`, severity: 'water', category: 'facture_eau',
        title: `Facture d'eau en retard — ${t ? `${t.firstName} ${t.lastName}` : ''}`,
        message: `Eau ${w.periodMonth}/${w.periodYear} • ${p?.reference || ''} • reste ${w.rest.toLocaleString('fr-FR')} ${state.settings.currency}`,
        dateLabel: `Depuis ${late} jours`, days: late, page: 'water', tenantName: t ? `${t.firstName} ${t.lastName}` : undefined, propertyRef: p?.reference,
      });
    }
  });

  // --- Eau : date de prélèvement / relevé compteur ---
  state.waterMeters.filter(m => m.status === 'actif').forEach(m => {
    const p = state.properties.find(x => x.id === m.propertyId);
    const c = state.contracts.find(x => x.propertyId === m.propertyId && x.status === 'actif');
    if (!c) return;
    const t = state.tenants.find(x => x.id === c.tenantId);
    const readings = state.waterReadings.filter(r => r.meterId === m.id).sort((a, b) => b.readingDate.localeCompare(a.readingDate));
    const last = readings[0];
    const { due: nextDue } = meterReadingSchedule(state, m.id, today);
    const diff = daysBetween(today, nextDue); // >0 futur, <0 retard
    if (diff <= 3) {
      const overdue = diff < 0;
      alerts.push({
        id: `reading-${m.id}-${nextDue.getFullYear()}-${nextDue.getMonth() + 1}`,
        severity: 'water', category: 'releve_eau',
        title: overdue ? `Relevé compteur en retard — ${p?.reference || ''}` : `Prélèvement compteur à prévoir — ${p?.reference || ''}`,
        message: `Compteur ${m.meterNumber} • ${t ? `${t.firstName} ${t.lastName}` : ''} • dernier index ${last ? `${last.currentReading} m³ le ${new Date(last.readingDate).toLocaleDateString('fr-FR')}` : 'aucun relevé'} • relevé prévu le ${nextDue.toLocaleDateString('fr-FR')}`,
        dateLabel: overdue ? `En retard de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? 's' : ''}` : diff === 0 ? "Aujourd'hui" : `Dans ${diff} jour${diff > 1 ? 's' : ''}`,
        days: -diff, page: 'water', tenantName: t ? `${t.firstName} ${t.lastName}` : undefined, propertyRef: p?.reference,
      });
    }
  });

  // --- Contrats ---
  state.contracts.filter(c => c.status === 'actif').forEach(c => {
    const diff = daysBetween(today, new Date(c.endDate));
    if (diff >= 0 && diff <= 90) {
      const t = state.tenants.find(x => x.id === c.tenantId); const p = state.properties.find(x => x.id === c.propertyId);
      alerts.push({ id: `contract-${c.id}`, severity: 'info', category: 'contrat', title: `Contrat bientôt expiré — ${c.reference}`, message: `${t ? `${t.firstName} ${t.lastName}` : ''} • ${p?.reference || ''} • fin le ${new Date(c.endDate).toLocaleDateString('fr-FR')}`, dateLabel: `Dans ${diff} jours`, days: -diff, page: 'contracts' });
    }
  });

  // tri : dangers d'abord, plus gros retard d'abord
  const rank: Record<AlertSeverity, number> = { danger: 0, water: 1, warning: 2, info: 3 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || b.days - a.days);
}

export function nextWaterReadingDate(state: AppState, meterId: string, now = new Date()): Date {
  return meterReadingSchedule(state, meterId, now).due;
}
