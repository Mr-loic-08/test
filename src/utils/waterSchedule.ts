import type { AppState } from '../types';

export function parseLocalDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type ReadingScheduleSource = 'ponctuelle' | 'compteur' | 'general';

export function meterReadingSchedule(state: AppState, meterId: string, now = new Date()): { due: Date; source: ReadingScheduleSource; day: number } {
  const meter = state.waterMeters.find(m => m.id === meterId);
  const readings = state.waterReadings.filter(reading => reading.meterId === meterId);
  const override = parseLocalDate(meter?.nextReadingDate);
  const readFor = (date: Date) => readings.some(r => r.periodYear === date.getFullYear() && r.periodMonth === date.getMonth() + 1);

  // A one-off date takes precedence until its period has actually been read.
  if (override && !readFor(override)) {
    return { due: override, source: 'ponctuelle', day: override.getDate() };
  }

  const configured = meter?.readingDay;
  const day = Number.isInteger(configured) && configured! >= 1 && configured! <= 28
    ? configured!
    : Math.min(28, Math.max(1, state.settings.waterReadingDay || 25));
  const current = new Date(now.getFullYear(), now.getMonth(), day);
  // A reading already recorded this month moves the next reminder to next month.
  const due = readFor(current) ? new Date(now.getFullYear(), now.getMonth() + 1, day) : current;
  return { due, source: configured && configured >= 1 && configured <= 28 ? 'compteur' : 'general', day };
}

export function hasReadingForPlannedMonth(state: AppState, meterId: string, due: Date): boolean {
  return state.waterReadings.some(r => r.meterId === meterId && r.periodYear === due.getFullYear() && r.periodMonth === due.getMonth() + 1);
}