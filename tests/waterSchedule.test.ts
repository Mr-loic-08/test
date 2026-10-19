import assert from 'node:assert/strict';
import test from 'node:test';
import { seedState } from '../src/data/seed';
import { computeAlerts } from '../src/utils/alerts';
import { localDateKey, meterReadingSchedule, parseLocalDate } from '../src/utils/waterSchedule';

test('general and per-meter recurring days are used for planned readings', () => {
  const state = structuredClone(seedState);
  state.waterReadings = [];
  const now = new Date(2026, 9, 18);
  const inherited = meterReadingSchedule(state, 'wm_a02', now);
  const custom = meterReadingSchedule(state, 'wm_a03', now);
  assert.equal(localDateKey(inherited.due), '2026-10-25');
  assert.equal(inherited.source, 'general');
  assert.equal(localDateKey(custom.due), '2026-10-22');
  assert.equal(custom.source, 'compteur');
});

test('changing the general day updates reminders only for meters without a custom day', () => {
  const state = structuredClone(seedState);
  state.waterReadings = [];
  state.settings.waterReadingDay = 12;
  const now = new Date(2026, 9, 19);
  assert.equal(localDateKey(meterReadingSchedule(state, 'wm_a02', now).due), '2026-10-12');
  assert.equal(localDateKey(meterReadingSchedule(state, 'wm_a03', now).due), '2026-10-22');
  assert.equal(computeAlerts(state, [], [], now).find(a => a.category === 'releve_eau' && a.propertyRef === 'A02')?.dateLabel, 'En retard de 7 jours');
});

test('one-off date takes precedence and overdue alert uses that exact date', () => {
  const state = structuredClone(seedState);
  state.waterReadings = [];
  state.waterMeters.find(m => m.id === 'wm_a03')!.nextReadingDate = '2026-10-20';
  const now = new Date(2026, 9, 23);
  const scheduled = meterReadingSchedule(state, 'wm_a03', now);
  assert.equal(scheduled.source, 'ponctuelle');
  assert.equal(localDateKey(scheduled.due), '2026-10-20');
  const alerts = computeAlerts(state, [], [], now);
  const alert = alerts.find(a => a.category === 'releve_eau' && a.propertyRef === 'A03');
  assert.ok(alert);
  assert.equal(alert.dateLabel, 'En retard de 3 jours');
  assert.match(alert.message, /20\/10\/2026/);
});

test('once the scheduled month is recorded the next reminder resumes monthly', () => {
  const state = structuredClone(seedState);
  state.waterMeters.find(m => m.id === 'wm_a03')!.nextReadingDate = '2026-10-21';
  // Seed already has an October reading for this meter.
  const result = meterReadingSchedule(state, 'wm_a03', new Date(2026, 9, 23));
  assert.equal(localDateKey(result.due), '2026-11-22');
  assert.equal(result.source, 'compteur');
  assert.equal(computeAlerts(state, [], [], new Date(2026, 9, 23)).some(a => a.category === 'releve_eau' && a.propertyRef === 'A03'), false);
});

test('date parser rejects invalid dates and keeps calendar dates local', () => {
  assert.equal(parseLocalDate('2026-02-30'), null);
  assert.equal(localDateKey(parseLocalDate('2028-02-29')!), '2028-02-29');
});