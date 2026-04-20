'use client';

export type RescheduleHistoryRecord = {
  oldAppointmentId: string;
  oldStartAt: string;
  oldEndAt: string;
  oldBarberName: string;
  oldServiceName: string;
  newAppointmentId: string;
  newStartAt: string;
  newEndAt: string;
  newBarberName: string;
  newServiceName: string;
};

const STORAGE_KEY = 'barber-admin-reschedule-history';

export function readRescheduleHistory(): RescheduleHistoryRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as RescheduleHistoryRecord[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function writeRescheduleHistory(items: RescheduleHistoryRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function upsertRescheduleHistory(
  items: RescheduleHistoryRecord[],
  nextItem: RescheduleHistoryRecord,
): RescheduleHistoryRecord[] {
  const filtered = items.filter(
    (item) =>
      item.oldAppointmentId !== nextItem.oldAppointmentId &&
      item.newAppointmentId !== nextItem.newAppointmentId,
  );

  return [nextItem, ...filtered].slice(0, 25);
}
