import type { AppState, AuditAction, AuditChange, AuditEntry } from '../types';
import { uid } from './helpers';

const THREE_MONTHS = 3;

export function auditCutoff(now = new Date()): Date {
  // Clamp day of month: 31 May -> 28 February, rather than spilling into March.
  const monthStart = new Date(now.getFullYear(), now.getMonth() - THREE_MONTHS, 1);
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(now.getDate(), lastDay), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
}

export function pruneAudit(entries: AuditEntry[] | undefined, now = new Date()): AuditEntry[] {
  if (!Array.isArray(entries)) return [];
  const cutoff = auditCutoff(now).getTime();
  return entries.filter(entry => entry?.id && Number.isFinite(Date.parse(entry.timestamp)) && Date.parse(entry.timestamp) >= cutoff)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function mergeAuditEntries(current: AuditEntry[], restored: AuditEntry[], now = new Date()): AuditEntry[] {
  const entries = new Map<string, AuditEntry>();
  for (const entry of [...current, ...restored]) if (entry?.id) entries.set(entry.id, entry);
  return pruneAudit([...entries.values()], now);
}

export type AuditInput = Pick<AuditEntry, 'action' | 'module' | 'target' | 'details'> & { changes?: AuditChange[] };
export function newAuditEntry(input: AuditInput, actor: string, now = new Date()): AuditEntry {
  return { id: uid('audit'), timestamp: now.toISOString(), actor: actor || 'Bailleur', ...input };
}

type Collection = 'properties' | 'tenants' | 'contracts' | 'rentSchedules' | 'waterMeters' | 'waterReadings' | 'waterInvoices' | 'payments' | 'allocations' | 'waterTariffs' | 'maintenances' | 'documents';
const COLLECTIONS: { key: Collection; module: string; noun: string; action?: AuditAction }[] = [
  { key: 'properties', module: 'Biens', noun: 'Logement' },
  { key: 'tenants', module: 'Locataires', noun: 'Locataire' },
  { key: 'contracts', module: 'Contrats', noun: 'Contrat' },
  { key: 'rentSchedules', module: 'Loyers', noun: 'Échéance de loyer' },
  { key: 'waterMeters', module: 'Eau / Compteurs', noun: 'Compteur d’eau' },
  { key: 'waterReadings', module: 'Eau / Compteurs', noun: 'Relevé d’eau', action: 'enregistrement' },
  { key: 'waterInvoices', module: 'Eau / Compteurs', noun: 'Facture d’eau' },
  { key: 'payments', module: 'Paiements', noun: 'Paiement', action: 'enregistrement' },
  { key: 'allocations', module: 'Paiements', noun: 'Affectation de paiement', action: 'enregistrement' },
  { key: 'waterTariffs', module: 'Paramètres', noun: 'Tarif de l’eau' },
  { key: 'maintenances', module: 'Maintenance', noun: 'Intervention' },
  { key: 'documents', module: 'Documents', noun: 'Document' },
];

type Row = Record<string, unknown> & { id: string };
const FIELD_LABELS: Record<string, string> = {
  reference: 'Référence', firstName: 'Prénom', lastName: 'Nom', phone: 'Téléphone', email: 'Email',
  address: 'Adresse', monthlyRent: 'Loyer mensuel', status: 'Statut', type: 'Type',
  startDate: 'Début', endDate: 'Fin', dueDay: 'Jour d’échéance', depositAmount: 'Caution',
  amountDue: 'Montant dû', amount: 'Montant', paymentDate: 'Date du paiement', method: 'Mode de paiement',
  paymentMethod: 'Mode de paiement', comment: 'Commentaire', notes: 'Notes', description: 'Description',
  meterNumber: 'Référence compteur', readingDay: 'Jour mensuel du relevé', nextReadingDate: 'Prochain relevé ponctuel',
  readingDate: 'Date du relevé', currentReading: 'Nouvel index', previousReading: 'Ancien index',
  consumption: 'Consommation', pricePerM3: 'Prix par m³', tariffPerM3: 'Tarif appliqué',
  effectiveFrom: 'Tarif applicable depuis', effectiveTo: 'Tarif applicable jusqu’au',
  priority: 'Priorité', cost: 'Coût', provider: 'Prestataire', reportedAt: 'Date du signalement',
  completedAt: 'Date de résolution', name: 'Nom du document', filePath: 'Chemin local',
  allocatedAmount: 'Montant affecté', documentType: 'Type de document',
  waterReadingDay: 'Jour général du relevé', rentLateGraceDays: 'Délai de grâce loyers',
  alertRentDaysBefore: 'Alerte loyer avant échéance', soundEnabled: 'Notifications sonores',
  soundVolume: 'Volume', soundOnAlerts: 'Sons des alertes', soundOnPayment: 'Son des paiements',
  soundOnClick: 'Son des clics', autoBackupEnabled: 'Sauvegarde automatique',
  autoBackupIntervalMinutes: 'Intervalle de sauvegarde (min)', landlordName: 'Nom du bailleur',
  company: 'Société', currency: 'Devise', receiptHeader: 'En-tête des reçus',
  receiptFooter: 'Pied des reçus', backupFolder: 'Dossier de sauvegarde',
};
const IGNORE_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'lastAutoBackup', 'autoBackupCount', 'lastBackup']);
const SENSITIVE_FIELDS = new Set(['idNumber', 'emergencyPhone', 'phone', 'email', 'emergencyContact', 'notes', 'comment', 'filePath']);

function showValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Non défini';
  if (SENSITIVE_FIELDS.has(key)) return '(donnée confidentielle modifiée)';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ') || 'Aucun';
  if (typeof value === 'object') return '(détails modifiés)';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [y, m, d] = String(value).split('-');
    return `${d}/${m}/${y}`;
  }
  return String(value).slice(0, 180);
}

function changedFields(before: Row | Record<string, unknown>, after: Row | Record<string, unknown>): AuditChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(key => !IGNORE_FIELDS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key => ({ field: FIELD_LABELS[key] || key, before: showValue(key, before[key]), after: showValue(key, after[key]) }));
}

function labelFor(key: Collection, row: Row, state: AppState): string {
  const contract = (contractId: unknown) => state.contracts.find(c => c.id === contractId)?.reference || String(contractId || '');
  const property = (propertyId: unknown) => state.properties.find(p => p.id === propertyId)?.reference || String(propertyId || '');
  const meter = (meterId: unknown) => state.waterMeters.find(m => m.id === meterId)?.meterNumber || String(meterId || '');
  if (key === 'properties') return String(row.reference || row.id);
  if (key === 'tenants') return `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.id;
  if (key === 'contracts') return `${row.reference || row.id} · ${property(row.propertyId)}`;
  if (key === 'rentSchedules') return `${row.month}/${row.year} · ${contract(row.contractId)}`;
  if (key === 'waterMeters') return `${row.meterNumber || row.id} · ${property(row.propertyId)}`;
  if (key === 'waterReadings') return `${meter(row.meterId)} · ${row.readingDate || ''}`;
  if (key === 'waterInvoices') return `${row.periodMonth}/${row.periodYear} · ${contract(row.contractId)}`;
  if (key === 'payments') return String(row.reference || row.id);
  if (key === 'allocations') {
    const payment = state.payments.find(p => p.id === row.paymentId);
    const rent = state.rentSchedules.find(r => r.id === row.rentScheduleId);
    const water = state.waterInvoices.find(w => w.id === row.waterInvoiceId);
    return `${payment?.reference || row.paymentId || ''} · ${rent ? `Loyer ${rent.month}/${rent.year}` : water ? `Eau ${water.periodMonth}/${water.periodYear}` : 'Non affecté'}`;
  }
  if (key === 'waterTariffs') return `${showValue('pricePerM3', row.pricePerM3)} / m³ · ${showValue('effectiveFrom', row.effectiveFrom)}`;
  if (key === 'maintenances') return `${row.title || row.id} · ${property(row.propertyId)}`;
  if (key === 'documents') return String(row.name || row.id);
  return row.id;
}

function createdDetails(key: Collection, row: Row): string {
  if (key === 'payments') return `Montant reçu : ${showValue('amount', row.amount)}. Mode : ${showValue('method', row.method)}.`;
  if (key === 'allocations') return `Montant affecté : ${showValue('allocatedAmount', row.allocatedAmount)}.`;
  if (key === 'rentSchedules' || key === 'waterInvoices') return `Montant dû : ${showValue('amountDue', row.amountDue)}.`;
  if (key === 'waterReadings') return `Index ${showValue('previousReading', row.previousReading)} → ${showValue('currentReading', row.currentReading)} m³.`;
  return 'Nouvel élément enregistré.';
}

export function buildMutationEntries(before: AppState, after: AppState, now = new Date()): AuditEntry[] {
  const actor = after.settings.landlordName || before.settings.landlordName || 'Bailleur';
  const entries: AuditEntry[] = [];

  for (const { key, module, noun, action } of COLLECTIONS) {
    const previous = new Map((before[key] as unknown as Row[]).map(item => [item.id, item]));
    const next = new Map((after[key] as unknown as Row[]).map(item => [item.id, item]));
    for (const [id, row] of next) {
      const old = previous.get(id);
      if (!old) {
        entries.push(newAuditEntry({ action: action || 'creation', module, target: `${noun} ${labelFor(key, row, after)}`, details: createdDetails(key, row) }, actor, now));
      } else {
        const changes = changedFields(old, row);
        if (changes.length) entries.push(newAuditEntry({ action: 'modification', module, target: `${noun} ${labelFor(key, row, after)}`, details: `Champs modifiés : ${changes.map(c => c.field).join(', ')}.`, changes }, actor, now));
      }
    }
    for (const [id, row] of previous) {
      if (!next.has(id)) entries.push(newAuditEntry({ action: 'suppression', module, target: `${noun} ${labelFor(key, row, before)}`, details: 'Élément retiré de l’application. Cette opération reste dans le journal jusqu’à son expiration.' }, actor, now));
    }
  }

  const settingsChanges = changedFields(before.settings as unknown as Record<string, unknown>, after.settings as unknown as Record<string, unknown>);
  if (settingsChanges.length) entries.push(newAuditEntry({ action: 'modification', module: 'Paramètres', target: 'Préférences générales', details: `Champs modifiés : ${settingsChanges.map(c => c.field).join(', ')}.`, changes: settingsChanges }, actor, now));
  return entries;
}