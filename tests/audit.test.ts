import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditEntry } from '../src/types';
import { seedState } from '../src/data/seed';
import { auditCutoff, buildMutationEntries, mergeAuditEntries, pruneAudit } from '../src/utils/audit';

function entry(id: string, timestamp: string): AuditEntry {
  return { id, timestamp, actor: 'Bailleur', action: 'modification', module: 'Test', target: id, details: 'Test' };
}

test('three-month retention clamps the day and expires entries only after the boundary', () => {
  const now = new Date(2026, 4, 31, 14, 30, 0);
  const cutoff = auditCutoff(now);
  assert.equal(cutoff.getFullYear(), 2026);
  assert.equal(cutoff.getMonth(), 1);
  assert.equal(cutoff.getDate(), 28);
  assert.equal(cutoff.getHours(), 14);
  const old = entry('old', new Date(cutoff.getTime() - 1).toISOString());
  const onBoundary = entry('boundary', cutoff.toISOString());
  const recent = entry('recent', now.toISOString());
  assert.deepEqual(pruneAudit([old, onBoundary, recent], now).map(e => e.id), ['recent', 'boundary']);
});

test('restoring a backup cannot erase current journal entries or resurrect expired entries', () => {
  const now = new Date(2026, 9, 19, 12, 0);
  const current = entry('current', new Date(2026, 9, 18, 8).toISOString());
  const restored = entry('restored', new Date(2026, 8, 5, 8).toISOString());
  const expired = entry('expired', new Date(2026, 5, 5, 8).toISOString());
  assert.deepEqual(mergeAuditEntries([current], [restored, expired, current], now).map(e => e.id), ['current', 'restored']);
});

test('editing a meter records the before and after dates without logging auto-backup metadata', () => {
  const before = structuredClone(seedState);
  const after = structuredClone(before);
  const meter = after.waterMeters.find(m => m.id === 'wm_a03')!;
  meter.readingDay = 19;
  meter.nextReadingDate = '2026-11-12';
  after.settings.lastAutoBackup = '2026-10-19T10:00:00.000Z';
  after.settings.autoBackupCount = 99;

  const logs = buildMutationEntries(before, after, new Date(2026, 9, 19));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, 'modification');
  assert.equal(logs[0].module, 'Eau / Compteurs');
  assert.match(logs[0].target, /EA-003/);
  assert.deepEqual(logs[0].changes?.map(c => [c.field, c.before, c.after]), [
    ['Jour mensuel du relevé', '22', '19'],
    ['Prochain relevé ponctuel', 'Non défini', '12/11/2026'],
  ]);
});

test('payment, allocation, and domain deletion are each recorded', () => {
  const before = structuredClone(seedState);
  const after = structuredClone(before);
  after.payments.push({ ...before.payments[0], id: 'payment-new', reference: 'PAY-TEST', amount: 100_000 });
  after.allocations.push({ id: 'allocation-new', paymentId: 'payment-new', rentScheduleId: 'rs_j_10', allocatedAmount: 100_000, createdAt: '2026-10-19' });
  after.documents = after.documents.filter(doc => doc.id !== 'doc_1');
  const logs = buildMutationEntries(before, after, new Date(2026, 9, 19));

  assert.equal(logs.find(e => e.target === 'Paiement PAY-TEST')?.action, 'enregistrement');
  assert.equal(logs.find(e => e.target.includes('PAY-TEST · Loyer 10/2026'))?.action, 'enregistrement');
  assert.equal(logs.find(e => e.target.includes('Contrat_Jean_Dupont.pdf'))?.action, 'suppression');
});