'use client';

import Link from 'next/link';

import { RescheduleHistoryRecord } from '@/lib/reschedule-history';
import { AdminAppointmentsResult } from '@/lib/types';
import { formatDateLabel, formatTimeLabel } from '@/lib/date';

type SelectedFreeSlot = {
  barberId: string;
  barberName: string;
  startAt: string;
  endAt: string;
};

type ScheduleSelectionPanelProps = {
  selectedFreeSlot: SelectedFreeSlot | null;
  selectedAppointment: AdminAppointmentsResult['items'][number] | null;
  rescheduleHistoryRecord?: RescheduleHistoryRecord | null;
  onJumpToBooking?: () => void;
  onJumpToBlocking?: () => void;
  onJumpToAppointmentDetail?: () => void;
  onOpenLinkedAppointment?: (appointmentId: string, date: string) => void;
  onClearSelection?: () => void;
};

export function ScheduleSelectionPanel({
  selectedFreeSlot,
  selectedAppointment,
  rescheduleHistoryRecord,
  onJumpToBooking,
  onJumpToBlocking,
  onJumpToAppointmentDetail,
  onOpenLinkedAppointment,
  onClearSelection,
}: ScheduleSelectionPanelProps) {
  if (!selectedFreeSlot && !selectedAppointment) {
    return null;
  }

  const isRescheduledOld =
    selectedAppointment && rescheduleHistoryRecord?.oldAppointmentId === selectedAppointment.id;
  const isRescheduledNew =
    selectedAppointment && rescheduleHistoryRecord?.newAppointmentId === selectedAppointment.id;
  const linkedAppointmentId = isRescheduledOld
    ? rescheduleHistoryRecord?.newAppointmentId
    : isRescheduledNew
      ? rescheduleHistoryRecord?.oldAppointmentId
      : null;
  const linkedAppointmentDate = isRescheduledOld
    ? rescheduleHistoryRecord?.newStartAt
    : isRescheduledNew
      ? rescheduleHistoryRecord?.oldStartAt
      : null;

  return (
    <section className="form-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Selection actions</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Brzi naredni koraci za trenutno izabran slot ili termin.
          </p>
        </div>
        <button
          type="button"
          className="control-button"
          data-variant="ghost"
          onClick={onClearSelection}
        >
          Ocisti izbor
        </button>
      </div>

      {selectedFreeSlot ? (
        <div className="stack">
          <div className="helper-item">
            <strong>Izabran slobodan slot</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {selectedFreeSlot.barberName}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {formatDateLabel(selectedFreeSlot.startAt)} - {formatTimeLabel(selectedFreeSlot.startAt)}
              {' - '}
              {formatTimeLabel(selectedFreeSlot.endAt)}
            </div>
          </div>

          <div className="page-actions">
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={onJumpToBooking}
            >
              Zakazi termin za ovaj slot
            </button>
            <button
              type="button"
              className="control-button"
              data-variant="ghost"
              onClick={onJumpToBlocking}
            >
              Blokiraj ovaj slot
            </button>
          </div>
        </div>
      ) : null}

      {selectedAppointment ? (
        <div className="stack">
          <div className="helper-item">
            <strong>Izabran termin</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {selectedAppointment.customerFirstName || selectedAppointment.customerLastName
                ? [selectedAppointment.customerFirstName, selectedAppointment.customerLastName]
                    .filter(Boolean)
                    .join(' ')
                : 'Klijent'}
              {' - '}
              {selectedAppointment.customerPhone}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {selectedAppointment.barberName} - {selectedAppointment.serviceName}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {formatDateLabel(selectedAppointment.startAt)} - {formatTimeLabel(selectedAppointment.startAt)}
              {' - '}
              {formatTimeLabel(selectedAppointment.endAt)}
            </div>
            {rescheduleHistoryRecord ? (
              <div style={{ marginTop: 10 }}>
                <span className="badge" data-tone={isRescheduledOld ? 'danger' : 'success'}>
                  {isRescheduledOld ? 'RESCHEDULED FROM' : 'RESCHEDULED TO'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="page-actions">
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={onJumpToAppointmentDetail}
            >
              Otvori detalje termina
            </button>
            <Link
              className="control-button"
              data-variant="ghost"
              href={`/appointments?appointmentId=${selectedAppointment.id}`}
            >
              Otvori u appointments listi
            </Link>
            {linkedAppointmentId && linkedAppointmentDate ? (
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                onClick={() => onOpenLinkedAppointment?.(linkedAppointmentId, linkedAppointmentDate)}
              >
                Otvori povezani termin
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
