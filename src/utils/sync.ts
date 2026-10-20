import type { AppSettings, AppState, AuditEntry } from '../types';
import { mergeAuditEntries, pruneAudit } from './audit';

export const BACKUP_FORMAT = 'gestion-locative-backup';
export const BACKUP_VERSION = 2;

export interface BackupDevice { id: string; name: string }
export interface BackupFile {
  app: 'GestionLocative';
  format: string;
  version: number;
  exportedAt: string;
  device: BackupDevice;
  counts: Record<string, number>;
  data: AppState;
}

export interface ParsedBackup { data: AppState; exportedAt?: string; device?: BackupDevice }

/** Reads a v1 or v2 backup file and rejects anything that is not a usable snapshot. */
export function parseBackup(raw: string): ParsedBackup {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Fichier illisible : ce n'est pas une sauvegarde JSON valide."); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Fichier de sauvegarde vide ou corrompu.');
  const envelope = parsed as Partial<BackupFile> & Partial<AppState>;
  const data = (envelope.data ?? parsed) as AppState;
  if (!data || typeof data !== 'object' || !Array.isArray(data.properties) || !Array.isArray(data.tenants) || !Array.isArray(data.contracts)) {
    throw new Error("Ce fichier ne contient pas de données de gestion locative (biens, locataires, contrats).");
  }
  return { data, exportedAt: envelope.exportedAt, device: envelope.device };
}

export function backupCounts(state: AppState): Record<string, number> {
  return {
    properties: state.properties.length, tenants: state.tenants.length, contracts: state.contracts.length,
    rentSchedules: state.rentSchedules.length, waterMeters: state.waterMeters.length, waterReadings: state.waterReadings.length,
    waterInvoices: state.waterInvoices.length, payments: state.payments.length, allocations: state.allocations.length,
    documents: state.documents.length, maintenances: state.maintenances.length, auditLog: (state.auditLog || []).length,
  };
}

export function buildBackupFile(state: AppState, device: BackupDevice, now = new Date()): BackupFile {
  return { app: 'GestionLocative', format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), device, counts: backupCounts(state), data: state };
}

export interface MergeLine { key: string; label: string; added: number; updated: number; kept: number; duplicates: number }
export interface MergeReport {
  lines: MergeLine[];
  totals: { added: number; updated: number; kept: number; duplicates: number };
  renamedPayments: { before: string; after: string }[];
  settingsImported: boolean;
  auditAdded: number;
}

type Row = { id: string } & Record<string, unknown>;
type Collection = 'properties' | 'tenants' | 'contracts' | 'rentSchedules' | 'waterMeters' | 'waterReadings' | 'waterInvoices' | 'payments' | 'allocations' | 'waterTariffs' | 'maintenances' | 'documents';

const LABELS: Record<Collection, string> = {
  properties: 'Biens', tenants: 'Locataires', contracts: 'Contrats', rentSchedules: 'Échéances de loyer',
  waterMeters: 'Compteurs d’eau', waterReadings: 'Relevés d’eau', waterInvoices: 'Factures d’eau',
  payments: 'Paiements', allocations: 'Affectations de paiement', waterTariffs: 'Tarifs de l’eau',
  maintenances: 'Interventions', documents: 'Documents',
};
const ORDER: Collection[] = ['properties', 'tenants', 'contracts', 'rentSchedules', 'waterMeters', 'waterReadings', 'waterInvoices', 'payments', 'allocations', 'waterTariffs', 'maintenances', 'documents'];

/** Most recent edit marker available on a record. */
function marker(row: Row): string {
  return String(row.updatedAt || row.createdAt || row.timestamp || '');
}

/** Business settings are shared between devices; sound/backup preferences stay local. */
const SHARED_SETTINGS: (keyof AppSettings)[] = [
  'landlordName', 'company', 'phone', 'email', 'address', 'currency',
  'receiptHeader', 'receiptFooter', 'dueDayDefault', 'waterReadingDay',
  'rentLateGraceDays', 'alertRentDaysBefore',
];

function unionById(local: Row[], incoming: Row[], line: MergeLine, fromPeer: Set<string>): Row[] {
  const merged = new Map<string, Row>(local.map(row => [row.id, row]));
  for (const row of incoming) {
    if (!row?.id) continue;
    const current = merged.get(row.id);
    if (!current) {
      merged.set(row.id, row);
      fromPeer.add(row.id);
      line.added++;
    } else if (JSON.stringify(current) !== JSON.stringify(row)) {
      // Last edit wins; an equal marker keeps the local version to avoid silent overwrites.
      if (marker(row) > marker(current)) { merged.set(row.id, row); line.updated++; } else line.kept++;
    }
  }
  return [...merged.values()];
}

function dedupe(rows: Row[], keyOf: (row: Row) => string | null, remap: Map<string, string>, line: MergeLine): Row[] {
  const byKey = new Map<string, Row>();
  const kept: Row[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) { kept.push(row); continue; }
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, row); kept.push(row); continue; }
    // The same period recorded on both machines: keep one row and redirect references.
    remap.set(row.id, existing.id);
    line.duplicates++;
    if (line.added > 0) line.added--;
  }
  return kept;
}

function uniqueReference(base: string, taken: Set<string>): string {
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

/**
 * Merges a backup coming from another machine into the local data.
 * Nothing is deleted: records are added, refreshed when newer, or kept as-is.
 */
export function mergeStates(local: AppState, incoming: AppState, options: { importSettings?: boolean; now?: Date } = {}): { state: AppState; report: MergeReport } {
  const now = options.now ?? new Date();
  const next = structuredClone(local);
  const lines = new Map<Collection, MergeLine>();
  const fromPeer = new Set<string>();
  const remapRent = new Map<string, string>();
  const remapWaterInvoice = new Map<string, string>();
  const remapReading = new Map<string, string>();

  for (const key of ORDER) {
    const line: MergeLine = { key, label: LABELS[key], added: 0, updated: 0, kept: 0, duplicates: 0 };
    lines.set(key, line);
    const localRows = (local[key] ?? []) as unknown as Row[];
    const incomingRows = (incoming[key] ?? []) as unknown as Row[];
    (next[key] as unknown as Row[]) = unionById(localRows, incomingRows, line, fromPeer);
  }

  // Remove duplicate periods created independently on both machines.
  (next.rentSchedules as unknown as Row[]) = dedupe(next.rentSchedules as unknown as Row[], row => `${row.contractId}|${row.year}|${row.month}`, remapRent, lines.get('rentSchedules')!);
  (next.waterReadings as unknown as Row[]) = dedupe(next.waterReadings as unknown as Row[], row => `${row.meterId}|${row.periodYear}|${row.periodMonth}`, remapReading, lines.get('waterReadings')!);
  (next.waterInvoices as unknown as Row[]) = dedupe(next.waterInvoices as unknown as Row[], row => `${row.contractId}|${row.periodYear}|${row.periodMonth}`, remapWaterInvoice, lines.get('waterInvoices')!);

  next.waterInvoices = next.waterInvoices.map(invoice => invoice.readingId && remapReading.has(invoice.readingId)
    ? { ...invoice, readingId: remapReading.get(invoice.readingId) } : invoice);

  // Two machines can generate the same payment number for different payments.
  const renamedPayments: MergeReport['renamedPayments'] = [];
  const takenReferences = new Set<string>();
  next.payments = next.payments.map(payment => {
    if (!takenReferences.has(payment.reference)) { takenReferences.add(payment.reference); return payment; }
    const after = uniqueReference(payment.reference, takenReferences);
    takenReferences.add(after);
    renamedPayments.push({ before: payment.reference, after });
    return { ...payment, reference: after };
  });

  const paymentIds = new Set(next.payments.map(payment => payment.id));
  const seenAllocations = new Set<string>();
  const allocationLine = lines.get('allocations')!;
  next.allocations = next.allocations
    .map(allocation => ({
      ...allocation,
      rentScheduleId: allocation.rentScheduleId ? remapRent.get(allocation.rentScheduleId) ?? allocation.rentScheduleId : undefined,
      waterInvoiceId: allocation.waterInvoiceId ? remapWaterInvoice.get(allocation.waterInvoiceId) ?? allocation.waterInvoiceId : undefined,
    }))
    .filter(allocation => {
      if (!paymentIds.has(allocation.paymentId)) { allocationLine.duplicates++; return false; }
      const key = `${allocation.paymentId}|${allocation.rentScheduleId || ''}|${allocation.waterInvoiceId || ''}|${allocation.allocatedAmount}`;
      if (seenAllocations.has(key)) { allocationLine.duplicates++; if (allocationLine.added > 0) allocationLine.added--; return false; }
      seenAllocations.add(key);
      return true;
    });

  const localAudit = pruneAudit(local.auditLog, now);
  const mergedAudit: AuditEntry[] = mergeAuditEntries(localAudit, pruneAudit(incoming.auditLog, now), now);
  next.auditLog = mergedAudit;

  let settingsImported = false;
  if (options.importSettings) {
    const shared: Partial<AppSettings> = {};
    for (const field of SHARED_SETTINGS) {
      if (incoming.settings?.[field] !== undefined) (shared as Record<string, unknown>)[field] = incoming.settings[field];
    }
    if (JSON.stringify({ ...local.settings, ...shared }) !== JSON.stringify(local.settings)) settingsImported = true;
    next.settings = { ...local.settings, ...shared };
  }

  const list = ORDER.map(key => lines.get(key)!);
  const totals = list.reduce((acc, line) => ({
    added: acc.added + line.added, updated: acc.updated + line.updated,
    kept: acc.kept + line.kept, duplicates: acc.duplicates + line.duplicates,
  }), { added: 0, updated: 0, kept: 0, duplicates: 0 });

  return {
    state: next,
    report: { lines: list, totals, renamedPayments, settingsImported, auditAdded: Math.max(0, mergedAudit.length - localAudit.length) },
  };
}
