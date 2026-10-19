import type { PaymentStatus } from '../types';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatMoney(n: number, currency = 'F'): string {
  const v = Math.round(n);
  return v.toLocaleString('fr-FR').replace(/\u202F/g, ' ') + ' ' + currency;
}

export function formatDate(d: string): string {
  if (!d) return '—';
  try {
    // A YYYY-MM-DD business date must remain the same day in every local timezone.
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
      : new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

export function formatDateTime(d: string): string {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

export const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function periodLabel(month: number, year: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`;
}
export function periodShort(month: number, year: number): string {
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

export function getStatus(due: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'NON_PAYE';
  if (paid >= due) return 'PAYE';
  return 'INCOMPLET';
}

export function statusLabel(s: PaymentStatus): string {
  return s === 'PAYE' ? 'PAYÉ' : s === 'INCOMPLET' ? 'INCOMPLET' : 'NON PAYÉ';
}

export function remaining(due: number, paid: number): number {
  return Math.max(0, due - paid);
}

export function downloadFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(';')];
  rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(';')));
  return '\uFEFF' + lines.join('\n');
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function contractStatusLabel(s: string): string {
  const map: Record<string, string> = { a_venir: 'À venir', actif: 'Actif', expire: 'Expiré', resilie: 'Résilié' };
  return map[s] || s;
}
export function propertyStatusLabel(s: string): string {
  const map: Record<string, string> = { libre: 'Libre', occupe: 'Occupé', reserve: 'Réservé', maintenance: 'En maintenance' };
  return map[s] || s;
}
export function propertyTypeLabel(s: string): string {
  const map: Record<string, string> = { appartement: 'Appartement', studio: 'Studio', 'rez-de-chaussee': 'Rez-de-chaussée' };
  return map[s] || s;
}
export function maintenanceStatusLabel(s: string): string {
  const map: Record<string, string> = { signale: 'Signalé', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };
  return map[s] || s;
}
export function priorityLabel(s: string): string {
  const map: Record<string, string> = { basse: 'Basse', moyenne: 'Moyenne', haute: 'Haute', urgente: 'Urgente' };
  return map[s] || s;
}
export function methodLabel(s: string): string {
  const map: Record<string, string> = { especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', mobile_money: 'Mobile Money', autre: 'Autre' };
  return map[s] || s;
}
