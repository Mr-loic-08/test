import assert from 'node:assert/strict';
import test from 'node:test';
import { seedState } from '../src/data/seed';
import { buildBackupFile, mergeStates, parseBackup } from '../src/utils/sync';
import type { AppState } from '../src/types';

const line = (report: ReturnType<typeof mergeStates>['report'], key: string) => report.lines.find(l => l.key === key)!;

test('a backup file round-trips and invalid files are rejected with a clear message', () => {
  const file = buildBackupFile(seedState, { id: 'dev-1', name: 'Poste bureau' }, new Date(2026, 9, 19));
  const parsed = parseBackup(JSON.stringify(file));
  assert.equal(parsed.device?.name, 'Poste bureau');
  assert.equal(parsed.data.properties.length, seedState.properties.length);
  assert.equal(file.counts.payments, seedState.payments.length);

  // A plain state (version 1 export) is still accepted.
  assert.equal(parseBackup(JSON.stringify(seedState)).data.tenants.length, seedState.tenants.length);
  assert.throws(() => parseBackup('{'), /pas une sauvegarde JSON valide/);
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' })), /ne contient pas de données/);
});

test('work done on the second machine is added without deleting local records', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  peer.tenants.push({ id: 'ten_new', firstName: 'Awa', lastName: 'Koné', phone: '07 00 00 00 01', address: 'Cocody', createdAt: '2026-10-18' });
  peer.maintenances = peer.maintenances.filter(m => m.id !== 'mnt_1');
  local.properties.push({ ...local.properties[0], id: 'prop_local', reference: 'D01', createdAt: '2026-10-17', updatedAt: '2026-10-17' });

  const { state, report } = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  assert.ok(state.tenants.some(t => t.id === 'ten_new'), 'le locataire distant est ajouté');
  assert.ok(state.properties.some(p => p.id === 'prop_local'), 'le bien local est conservé');
  assert.ok(state.maintenances.some(m => m.id === 'mnt_1'), 'une suppression distante ne supprime pas en local');
  assert.equal(line(report, 'tenants').added, 1);
});

test('the most recently edited version of the same record wins', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  local.properties[0] = { ...local.properties[0], monthlyRent: 460000, updatedAt: '2026-10-10T08:00:00.000Z' };
  peer.properties[0] = { ...peer.properties[0], monthlyRent: 520000, updatedAt: '2026-10-18T08:00:00.000Z' };
  peer.tenants[0] = { ...peer.tenants[0], phone: '07 11 11 11 11', createdAt: '2020-01-01' };

  const { state, report } = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  assert.equal(state.properties[0].monthlyRent, 520000);
  assert.equal(line(report, 'properties').updated, 1);
  // Older/equal marker: the local value is preserved and reported as kept.
  assert.equal(state.tenants[0].phone, seedState.tenants[0].phone);
  assert.equal(line(report, 'tenants').kept, 1);
});

test('the same month recorded on both machines is not duplicated and payments stay attached', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  // March 2027 does not exist in the seed: each machine creates it on its own.
  local.rentSchedules.push({ id: 'rs_local_mar', contractId: 'ct_001', month: 3, year: 2027, amountDue: 500000, createdAt: '2026-10-15' });
  peer.rentSchedules.push({ id: 'rs_peer_mar', contractId: 'ct_001', month: 3, year: 2027, amountDue: 500000, createdAt: '2026-10-16' });
  peer.payments.push({ id: 'pay_peer', reference: 'PAY-2026-010', tenantId: 'ten_jean', contractId: 'ct_001', propertyId: 'prop_a03', paymentDate: '2026-10-16', amount: 500000, method: 'especes', kind: 'loyer', createdAt: '2026-10-16' });
  peer.allocations.push({ id: 'al_peer', paymentId: 'pay_peer', rentScheduleId: 'rs_peer_mar', allocatedAmount: 500000, createdAt: '2026-10-16' });

  const { state, report } = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  const march = state.rentSchedules.filter(r => r.contractId === 'ct_001' && r.month === 3 && r.year === 2027);
  assert.equal(march.length, 1, 'une seule échéance de mars 2027 subsiste');
  assert.equal(march[0].id, 'rs_local_mar', 'la ligne locale sert de référence');
  assert.equal(state.allocations.find(a => a.id === 'al_peer')?.rentScheduleId, 'rs_local_mar', 'le paiement distant pointe vers l’échéance conservée');
  assert.equal(line(report, 'rentSchedules').duplicates, 1);
  assert.equal(state.rentSchedules.filter(r => r.contractId === 'ct_001' && r.year === 2026 && r.month === 11).length, 1, 'les mois existants ne sont pas dupliqués');
});

test('two different payments numbered identically are both kept, one is renumbered', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  const base = { tenantId: 'ten_marie', contractId: 'ct_002', propertyId: 'prop_b02', method: 'especes' as const, kind: 'loyer' as const };
  local.payments.push({ ...base, id: 'pay_local_x', reference: 'PAY-2026-007', paymentDate: '2026-10-12', amount: 270000, createdAt: '2026-10-12' });
  peer.payments.push({ ...base, id: 'pay_peer_x', reference: 'PAY-2026-007', paymentDate: '2026-10-14', amount: 150000, createdAt: '2026-10-14' });

  const { state, report } = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  assert.equal(state.payments.filter(p => p.id === 'pay_local_x' || p.id === 'pay_peer_x').length, 2);
  assert.deepEqual(report.renamedPayments, [{ before: 'PAY-2026-007', after: 'PAY-2026-007-2' }]);
  assert.equal(new Set(state.payments.map(p => p.reference)).size, state.payments.length, 'les références restent uniques');
});

test('identical allocations synced twice are not counted twice', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  peer.allocations.push({ id: 'al_duplicate', paymentId: 'pay_002', rentScheduleId: 'rs_m_10', allocatedAmount: 270000, createdAt: '2026-10-02' });

  const { state } = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  const paid = state.allocations.filter(a => a.rentScheduleId === 'rs_m_10').reduce((sum, a) => sum + a.allocatedAmount, 0);
  assert.equal(paid, 270000, 'le loyer d’octobre reste payé une seule fois');
});

test('device preferences stay local while shared settings can be imported', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  local.settings = { ...local.settings, soundEnabled: false, autoBackupIntervalMinutes: 30, waterReadingDay: 25 };
  peer.settings = { ...peer.settings, soundEnabled: true, autoBackupIntervalMinutes: 5, waterReadingDay: 12, currency: 'FCFA' };

  const withoutSettings = mergeStates(local, peer, { now: new Date(2026, 9, 19) }).state;
  assert.equal(withoutSettings.settings.waterReadingDay, 25);

  const { state, report } = mergeStates(local, peer, { importSettings: true, now: new Date(2026, 9, 19) });
  assert.equal(state.settings.waterReadingDay, 12);
  assert.equal(state.settings.currency, 'FCFA');
  assert.equal(state.settings.soundEnabled, false, 'les sons restent un réglage de l’appareil');
  assert.equal(state.settings.autoBackupIntervalMinutes, 30);
  assert.equal(report.settingsImported, true);
});

test('journals from both machines are combined and expired entries stay out', () => {
  const now = new Date(2026, 9, 19, 12);
  const local = structuredClone(seedState) as AppState;
  const peer = structuredClone(seedState) as AppState;
  local.auditLog = [{ id: 'a-local', timestamp: new Date(2026, 9, 18).toISOString(), actor: 'Poste A', action: 'modification', module: 'Biens', target: 'A01', details: 'Local' }];
  peer.auditLog = [
    { id: 'a-peer', timestamp: new Date(2026, 9, 17).toISOString(), actor: 'Poste B', action: 'enregistrement', module: 'Paiements', target: 'PAY', details: 'Distant' },
    { id: 'a-old', timestamp: new Date(2026, 2, 1).toISOString(), actor: 'Poste B', action: 'modification', module: 'Biens', target: 'Ancien', details: 'Expiré' },
  ];

  const { state, report } = mergeStates(local, peer, { now });
  assert.deepEqual(state.auditLog.map(e => e.id), ['a-local', 'a-peer']);
  assert.equal(report.auditAdded, 1);
});

test('merging the same backup twice changes nothing the second time', () => {
  const local = structuredClone(seedState);
  const peer = structuredClone(seedState);
  peer.tenants.push({ id: 'ten_sync', firstName: 'Sync', lastName: 'Test', phone: '05 00 00 00 00', address: 'Abidjan', createdAt: '2026-10-18' });

  const first = mergeStates(local, peer, { now: new Date(2026, 9, 19) });
  const second = mergeStates(first.state, peer, { now: new Date(2026, 9, 19) });
  assert.equal(second.report.totals.added, 0);
  assert.equal(second.report.totals.updated, 0);
  assert.equal(second.report.totals.duplicates, 0);
  assert.equal(second.state.tenants.length, first.state.tenants.length);
});
