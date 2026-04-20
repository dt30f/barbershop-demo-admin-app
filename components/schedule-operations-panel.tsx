'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  createAdminBarberDayOff,
  createAdminBlockedSlot,
  deleteAdminBarberDayOff,
  deleteAdminBlockedSlot,
} from '@/lib/api';
import { formatTimeLabel } from '@/lib/date';
import { BlockedSlotReasonType, ScheduleDayResult } from '@/lib/types';

import { useAuth } from './auth-provider';
import { useConfirm } from './confirm-provider';
import { useFeedback } from './feedback-provider';

type ScheduleOperationsPanelProps = {
  data: ScheduleDayResult;
  selectedDate: string;
  selectedBarberId?: string;
  selectedBlockedRange?: {
    barberId: string;
    startAt: string;
    endAt: string;
  } | null;
  onChanged?: () => void;
};

const blockedSlotReasonOptions: BlockedSlotReasonType[] = [
  'BREAK',
  'PERSONAL',
  'TRAINING',
  'OTHER',
];

function toIsoString(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toInputTime(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ScheduleOperationsPanel({
  data,
  selectedDate,
  selectedBarberId,
  selectedBlockedRange,
  onChanged,
}: ScheduleOperationsPanelProps) {
  const { session } = useAuth();
  const { confirm } = useConfirm();
  const { pushFeedback } = useFeedback();
  const [targetBarberId, setTargetBarberId] = useState(selectedBarberId ?? '');
  const [dayOffReason, setDayOffReason] = useState('');
  const [blockedStartTime, setBlockedStartTime] = useState('09:00');
  const [blockedEndTime, setBlockedEndTime] = useState('09:30');
  const [blockedReasonType, setBlockedReasonType] =
    useState<BlockedSlotReasonType>('BREAK');
  const [blockedNote, setBlockedNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBarberId) {
      setTargetBarberId(selectedBarberId);
      return;
    }

    if (!targetBarberId && data.barbers[0]) {
      setTargetBarberId(data.barbers[0].barberId);
    }
  }, [data.barbers, selectedBarberId, targetBarberId]);

  useEffect(() => {
    if (!selectedBlockedRange) {
      return;
    }

    setTargetBarberId(selectedBlockedRange.barberId);
    setBlockedStartTime(toInputTime(selectedBlockedRange.startAt));
    setBlockedEndTime(toInputTime(selectedBlockedRange.endAt));
  }, [selectedBlockedRange]);

  const targetBarber =
    data.barbers.find((barber) => barber.barberId === targetBarberId) ?? null;

  async function handleCreateDayOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !targetBarberId) {
      return;
    }

    setBusyAction('day-off');
    setError(null);
    setSuccess(null);

    try {
      const result = await createAdminBarberDayOff(session.accessToken, targetBarberId, {
        dateLocal: selectedDate,
        reason: dayOffReason || undefined,
      });

      setSuccess(
        `Slobodan dan je dodat. Pogodjeni termini za pomeranje: ${result.impactedAppointments}.`,
      );
      pushFeedback({
        tone: 'success',
        title: 'Day off je sacuvan',
        description: `Pogodjeni termini za pomeranje: ${result.impactedAppointments}.`,
      });
      setDayOffReason('');
      onChanged?.();
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Day off nije mogao da se sacuva.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Day off nije sacuvan',
        description: message,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteDayOff(dayOffId: string) {
    if (!session || !targetBarberId) {
      return;
    }

    const confirmed = await confirm({
      title: 'Ukloni day off?',
      description:
        'Barber ce ponovo postati dostupan za ovaj dan. Koristi ovu akciju samo ako zaista vracas raspored u radno stanje.',
      confirmLabel: 'Ukloni day off',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setBusyAction(`delete-day-off-${dayOffId}`);
    setError(null);
    setSuccess(null);

    try {
      await deleteAdminBarberDayOff(session.accessToken, targetBarberId, dayOffId);
      setSuccess('Slobodan dan je uklonjen.');
      pushFeedback({
        tone: 'success',
        title: 'Day off je uklonjen',
      });
      onChanged?.();
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Day off nije mogao da se obrise.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Day off nije obrisan',
        description: message,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateBlockedSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !targetBarberId) {
      return;
    }

    setBusyAction('blocked-slot');
    setError(null);
    setSuccess(null);

    try {
      const result = await createAdminBlockedSlot(session.accessToken, targetBarberId, {
        startAt: toIsoString(selectedDate, blockedStartTime),
        endAt: toIsoString(selectedDate, blockedEndTime),
        reasonType: blockedReasonType,
        note: blockedNote || undefined,
      });

      setSuccess(
        `Blokada vremena je sacuvana. Pogodjeni termini za pomeranje: ${result.impactedAppointments}.`,
      );
      pushFeedback({
        tone: 'success',
        title: 'Blocked slot je sacuvan',
        description: `Pogodjeni termini za pomeranje: ${result.impactedAppointments}.`,
      });
      setBlockedNote('');
      onChanged?.();
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Blocked slot nije mogao da se sacuva.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Blocked slot nije sacuvan',
        description: message,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteBlockedSlot(blockedSlotId: string) {
    if (!session || !targetBarberId) {
      return;
    }

    const confirmed = await confirm({
      title: 'Ukloni blocked slot?',
      description:
        'Ovaj interval ce ponovo postati dostupan u rasporedu ako nema drugih ogranicenja.',
      confirmLabel: 'Ukloni blokadu',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setBusyAction(`delete-blocked-slot-${blockedSlotId}`);
    setError(null);
    setSuccess(null);

    try {
      await deleteAdminBlockedSlot(session.accessToken, targetBarberId, blockedSlotId);
      setSuccess('Blokada vremena je uklonjena.');
      pushFeedback({
        tone: 'success',
        title: 'Blocked slot je uklonjen',
      });
      onChanged?.();
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Blocked slot nije mogao da se obrise.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Blocked slot nije obrisan',
        description: message,
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="stack">
      <section className="form-card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Schedule actions</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Day off i blocked slot akcije koje direktno menjaju raspored i reschedule status.
            </p>
          </div>
        </div>

        <div className="field">
          <label>Barber</label>
          <select
            className="control"
            value={targetBarberId}
            onChange={(event) => setTargetBarberId(event.target.value)}
          >
            <option value="">Izaberi barbera</option>
            {data.barbers.map((barber) => (
              <option key={barber.barberId} value={barber.barberId}>
                {barber.displayName}
              </option>
            ))}
          </select>
        </div>

        {targetBarber ? (
          <div className="helper-item">
            <strong>{targetBarber.displayName}</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {targetBarber.workingHours && targetBarber.workingHours.isActive
                ? `${targetBarber.workingHours.startTimeLocal.slice(0, 5)} - ${targetBarber.workingHours.endTimeLocal.slice(0, 5)}`
                : 'Nema radnog vremena za ovaj dan'}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {targetBarber.appointments.length} termina - {targetBarber.blockedSlots.length} blokade
            </div>
            {selectedBlockedRange && selectedBlockedRange.barberId === targetBarber.barberId ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Izabran slot za blokadu: {formatTimeLabel(selectedBlockedRange.startAt)} - {formatTimeLabel(selectedBlockedRange.endAt)}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <div className="badge" data-tone="danger">{error}</div> : null}
        {success ? <div className="badge" data-tone="success">{success}</div> : null}
      </section>

      <section className="form-card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Day off</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Ceo dan postaje nedostupan i preklopljeni termini prelaze u `REQUIRES_RESCHEDULE`.
            </p>
          </div>
        </div>

        {targetBarber?.dayOff ? (
          <div className="helper-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>Aktivan day off</strong>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                disabled={busyAction === `delete-day-off-${targetBarber.dayOff.id}`}
                onClick={() => handleDeleteDayOff(targetBarber.dayOff!.id)}
              >
                Ukloni
              </button>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {targetBarber.dayOff.reason || 'Bez dodatnog razloga'}
            </div>
          </div>
        ) : (
          <form className="form-grid" onSubmit={handleCreateDayOff}>
            <div className="field">
              <label>Razlog</label>
              <input
                className="control"
                value={dayOffReason}
                onChange={(event) => setDayOffReason(event.target.value)}
                placeholder="Odmor, bolest, privatne obaveze..."
              />
            </div>
            <button
              type="submit"
              className="control-button"
              data-variant="primary"
              disabled={!targetBarberId || busyAction === 'day-off'}
            >
              {busyAction === 'day-off' ? 'Cuvanje...' : 'Dodaj slobodan dan'}
            </button>
          </form>
        )}
      </section>

      <section className="form-card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Blocked slot</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Koristi za pauze, trening ili privatnu blokadu dela dana.
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleCreateBlockedSlot}>
          <div className="split">
            <div className="field">
              <label>Od</label>
              <input
                className="control"
                type="time"
                value={blockedStartTime}
                onChange={(event) => setBlockedStartTime(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Do</label>
              <input
                className="control"
                type="time"
                value={blockedEndTime}
                onChange={(event) => setBlockedEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="split">
            <div className="field">
              <label>Tip</label>
              <select
                className="control"
                value={blockedReasonType}
                onChange={(event) =>
                  setBlockedReasonType(event.target.value as BlockedSlotReasonType)
                }
              >
                {blockedSlotReasonOptions.map((reasonType) => (
                  <option key={reasonType} value={reasonType}>
                    {reasonType}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Napomena</label>
              <input
                className="control"
                value={blockedNote}
                onChange={(event) => setBlockedNote(event.target.value)}
                placeholder="Pauza, edukacija..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="control-button"
            data-variant="primary"
            disabled={!targetBarberId || busyAction === 'blocked-slot'}
          >
            {busyAction === 'blocked-slot' ? 'Cuvanje...' : 'Dodaj blokadu'}
          </button>
        </form>

        <div className="stack" style={{ marginTop: 18 }}>
          {targetBarber?.blockedSlots.length ? (
            targetBarber.blockedSlots.map((slot) => (
              <div key={slot.id} className="helper-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{slot.reasonType}</strong>
                  <button
                    type="button"
                    className="control-button"
                    data-variant="ghost"
                    disabled={busyAction === `delete-blocked-slot-${slot.id}`}
                    onClick={() => handleDeleteBlockedSlot(slot.id)}
                  >
                    Ukloni
                  </button>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {formatTimeLabel(slot.startAt)} - {formatTimeLabel(slot.endAt)}
                </div>
                {slot.note ? (
                  <div className="muted" style={{ marginTop: 6 }}>{slot.note}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="muted">Za izabrani dan nema blokiranih intervala.</div>
          )}
        </div>
      </section>

      {targetBarber?.appointments.length ? (
        <section className="table-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Daily appointments</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Pregled termina izabranog barbera za ovaj dan.
              </p>
            </div>
          </div>

          <div className="stack">
            {targetBarber.appointments.map((appointment) => (
              <div key={appointment.id} className="helper-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{appointment.serviceName}</strong>
                  <span className="status-chip" data-status={appointment.status}>
                    {appointment.status}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {formatTimeLabel(appointment.startAt)} - {formatTimeLabel(appointment.endAt)}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {[appointment.customerFirstName, appointment.customerLastName].filter(Boolean).join(' ') || 'Klijent'}
                  {' - '}
                  {appointment.customerPhone}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
