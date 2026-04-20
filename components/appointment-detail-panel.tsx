'use client';

import { useConfirm } from './confirm-provider';
import { RescheduleHistoryRecord } from '@/lib/reschedule-history';
import { AdminAppointmentsResult } from '@/lib/types';
import { formatDateLabel, formatTimeLabel } from '@/lib/date';

type AppointmentDetailPanelProps = {
  appointment: AdminAppointmentsResult['items'][number] | null;
  onStatusChange?: (
    appointmentId: string,
    status: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
    cancelReason?: string,
  ) => void;
  onStartReschedule?: (appointmentId: string) => void;
  rescheduleHistoryRecord?: RescheduleHistoryRecord | null;
  onOpenLinkedAppointment?: (appointmentId: string) => void;
  busyAppointmentId?: string | null;
};

export function AppointmentDetailPanel({
  appointment,
  onStatusChange,
  onStartReschedule,
  rescheduleHistoryRecord,
  onOpenLinkedAppointment,
  busyAppointmentId,
}: AppointmentDetailPanelProps) {
  const { confirm } = useConfirm();

  if (!appointment) {
    return (
      <section className="form-card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Appointment detail</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Izaberi termin iz tabele ili reschedule queue da vidis detalje i akcije.
            </p>
          </div>
        </div>

        <div className="helper-item">
          <strong>Nijedan termin nije izabran</strong>
          <div className="muted" style={{ marginTop: 6 }}>
            Klik na red u tabeli otvara detalje termina na istom ekranu.
          </div>
        </div>
      </section>
    );
  }

  const customerName =
    [appointment.customerFirstName, appointment.customerLastName].filter(Boolean).join(' ') ||
    'Klijent';
  const isRescheduledOld = rescheduleHistoryRecord?.oldAppointmentId === appointment.id;
  const isRescheduledNew = rescheduleHistoryRecord?.newAppointmentId === appointment.id;
  const linkedAppointmentId = isRescheduledOld
    ? rescheduleHistoryRecord?.newAppointmentId
    : isRescheduledNew
      ? rescheduleHistoryRecord?.oldAppointmentId
      : null;

  return (
    <section className="form-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Appointment detail</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Operativni prikaz jednog termina sa brzim status akcijama.
          </p>
        </div>
        <span className="status-chip" data-status={appointment.status}>
          {appointment.status}
        </span>
      </div>

      <div className="stack">
        <div className="helper-item">
          <strong>{customerName}</strong>
          <div className="muted" style={{ marginTop: 6 }}>{appointment.customerPhone}</div>
        </div>

        <div className="helper-item">
          <strong>{appointment.barberName}</strong>
          <div className="muted" style={{ marginTop: 6 }}>{appointment.serviceName}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {formatDateLabel(appointment.startAt)} - {formatTimeLabel(appointment.startAt)} - {formatTimeLabel(appointment.endAt)}
          </div>
        </div>

        <div className="helper-item">
          <strong>Naplate i izvor</strong>
          <div className="muted" style={{ marginTop: 6 }}>
            {appointment.currency ? `${appointment.priceAmount} ${appointment.currency}` : 'Cena nije prikazana u ovom pregledu.'}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Kreiran od: {appointment.createdByType}
          </div>
        </div>

        {appointment.requiresRescheduleReason ? (
          <div className="helper-item">
            <strong>Reschedule razlog</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {appointment.requiresRescheduleReason}
            </div>
          </div>
        ) : null}

        {rescheduleHistoryRecord ? (
          <div className="helper-item">
            <strong>{isRescheduledOld ? 'Rescheduled from' : 'Rescheduled to'}</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {isRescheduledOld
                ? `${rescheduleHistoryRecord.newBarberName} - ${rescheduleHistoryRecord.newServiceName}`
                : `${rescheduleHistoryRecord.oldBarberName} - ${rescheduleHistoryRecord.oldServiceName}`}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {isRescheduledOld
                ? `${formatDateLabel(rescheduleHistoryRecord.newStartAt)} - ${formatTimeLabel(rescheduleHistoryRecord.newStartAt)} - ${formatTimeLabel(rescheduleHistoryRecord.newEndAt)}`
                : `${formatDateLabel(rescheduleHistoryRecord.oldStartAt)} - ${formatTimeLabel(rescheduleHistoryRecord.oldStartAt)} - ${formatTimeLabel(rescheduleHistoryRecord.oldEndAt)}`}
            </div>
            {linkedAppointmentId ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="control-button"
                  data-variant="ghost"
                  onClick={() => onOpenLinkedAppointment?.(linkedAppointmentId)}
                >
                  Otvori povezani termin
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {appointment.cancelReason ? (
          <div className="helper-item">
            <strong>Cancel reason</strong>
            <div className="muted" style={{ marginTop: 6 }}>{appointment.cancelReason}</div>
          </div>
        ) : null}

        <div className="toolbar-row">
          {appointment.status === 'CONFIRMED' ? (
            <>
              <button
                type="button"
                className="control-button"
                data-variant="primary"
                disabled={busyAppointmentId === appointment.id}
                onClick={() => onStatusChange?.(appointment.id, 'COMPLETED')}
              >
                Complete
              </button>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                disabled={busyAppointmentId === appointment.id}
                onClick={() => onStatusChange?.(appointment.id, 'NO_SHOW')}
              >
                No show
              </button>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                disabled={busyAppointmentId === appointment.id}
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Otkazi potvrden termin?',
                    description:
                      'Termin ce biti otkazan iz detaljnog prikaza. Nastavi samo ako zelis da zatvoris ovu rezervaciju.',
                    confirmLabel: 'Otkazi termin',
                    tone: 'danger',
                  });
                  if (confirmed) {
                    const cancelReason = 'Cancelled by admin.';
                    onStatusChange?.(appointment.id, 'CANCELLED', cancelReason);
                  }
                }}
              >
                Cancel
              </button>
            </>
          ) : null}

          {appointment.status === 'REQUIRES_RESCHEDULE' ? (
            <>
              <button
                type="button"
                className="control-button"
                data-variant="primary"
                onClick={() => onStartReschedule?.(appointment.id)}
              >
                Pokreni reschedule
              </button>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                disabled={busyAppointmentId === appointment.id}
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Otkazi termin koji ceka reschedule?',
                    description:
                      'Ovo ce zatvoriti termin umesto da ga prebacis na novi slot za klijenta.',
                    confirmLabel: 'Otkazi termin',
                    tone: 'danger',
                  });
                  if (confirmed) {
                    const cancelReason =
                      appointment.requiresRescheduleReason ?? 'Cancelled after reschedule request.';
                    onStatusChange?.(appointment.id, 'CANCELLED', cancelReason);
                  }
                }}
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
