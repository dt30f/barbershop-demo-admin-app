'use client';

import { useConfirm } from './confirm-provider';
import { RescheduleHistoryRecord } from '@/lib/reschedule-history';
import { AdminAppointmentsResult } from '@/lib/types';
import { formatDateLabel, formatTimeLabel } from '@/lib/date';

export function AppointmentsTable({
  data,
  onPageChange,
  onStatusChange,
  onStartReschedule,
  rescheduleHistory,
  busyAppointmentId,
  selectedAppointmentId,
  onSelectAppointment,
}: {
  data: AdminAppointmentsResult;
  onPageChange: (page: number) => void;
  onStatusChange?: (
    appointmentId: string,
    status: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
    cancelReason?: string,
  ) => void;
  onStartReschedule?: (appointmentId: string) => void;
  rescheduleHistory?: RescheduleHistoryRecord[];
  busyAppointmentId?: string | null;
  selectedAppointmentId?: string | null;
  onSelectAppointment?: (appointmentId: string) => void;
}) {
  const { confirm } = useConfirm();

  return (
    <section className="table-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Appointments</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Tabela za recepciju i salon admin flow sa filterima, sortiranjem i listanjem stranica.
          </p>
        </div>
        <div className="badge" data-tone="neutral">
          Ukupno {data.pagination.total}
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Termin</th>
              <th>Klijent</th>
              <th>Barber</th>
              <th>Usluga</th>
              <th>Status</th>
              <th>Kreiran</th>
              <th>Cena</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const rescheduleRecord =
                rescheduleHistory?.find(
                  (historyItem) =>
                    historyItem.oldAppointmentId === item.id ||
                    historyItem.newAppointmentId === item.id,
                ) ?? null;
              const isRescheduledOld = rescheduleRecord?.oldAppointmentId === item.id;
              const isRescheduledNew = rescheduleRecord?.newAppointmentId === item.id;
              const linkedAppointmentId = isRescheduledOld
                ? rescheduleRecord?.newAppointmentId
                : isRescheduledNew
                  ? rescheduleRecord?.oldAppointmentId
                  : null;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectAppointment?.(item.id)}
                  style={{
                    cursor: onSelectAppointment ? 'pointer' : 'default',
                    background:
                      selectedAppointmentId === item.id ? 'rgba(183, 121, 43, 0.08)' : 'transparent',
                  }}
                >
                  <td>
                    <strong>{formatDateLabel(item.startAt)}</strong>
                    <div className="muted">
                      {formatTimeLabel(item.startAt)} - {formatTimeLabel(item.endAt)}
                    </div>
                  </td>
                  <td>
                    <strong>{item.customerFirstName ?? 'Klijent'} {item.customerLastName ?? ''}</strong>
                    <div className="muted">{item.customerPhone}</div>
                  </td>
                  <td>{item.barberName}</td>
                  <td>{item.serviceName}</td>
                  <td>
                    <span className="status-chip" data-status={item.status}>
                      {item.status}
                    </span>
                    {isRescheduledOld ? (
                      <div style={{ marginTop: 8 }}>
                        <span className="badge" data-tone="danger">RESCHEDULED FROM</span>
                      </div>
                    ) : null}
                    {isRescheduledNew ? (
                      <div style={{ marginTop: 8 }}>
                        <span className="badge" data-tone="success">RESCHEDULED TO</span>
                      </div>
                    ) : null}
                  </td>
                  <td>{item.createdByType}</td>
                  <td>
                    {item.priceAmount} {item.currency}
                  </td>
                  <td>
                    <div className="page-actions">
                      {linkedAppointmentId ? (
                        <button
                          type="button"
                          className="control-button"
                          data-variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectAppointment?.(linkedAppointmentId);
                          }}
                        >
                          Povezani termin
                        </button>
                      ) : null}

                      {item.status === 'CONFIRMED' ? (
                        <>
                          <button
                            type="button"
                            className="control-button"
                            data-variant="ghost"
                            disabled={busyAppointmentId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onStatusChange?.(item.id, 'COMPLETED');
                            }}
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            className="control-button"
                            data-variant="ghost"
                            disabled={busyAppointmentId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onStatusChange?.(item.id, 'NO_SHOW');
                            }}
                          >
                            No show
                          </button>
                          <button
                            type="button"
                            className="control-button"
                            data-variant="ghost"
                            disabled={busyAppointmentId === item.id}
                            onClick={async (event) => {
                              event.stopPropagation();
                              const confirmed = await confirm({
                                title: 'Otkazi potvrden termin?',
                                description:
                                  'Termin ce biti otkazan iz admin panela. Koristi ovu akciju samo kada zaista zelis da uklonis rezervaciju.',
                                confirmLabel: 'Otkazi termin',
                                tone: 'danger',
                              });
                              if (confirmed) {
                                const cancelReason = 'Cancelled by admin.';
                                onStatusChange?.(item.id, 'CANCELLED', cancelReason);
                              }
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {item.status === 'REQUIRES_RESCHEDULE' ? (
                        <>
                          <button
                            type="button"
                            className="control-button"
                            data-variant="primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectAppointment?.(item.id);
                              onStartReschedule?.(item.id);
                            }}
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className="control-button"
                            data-variant="ghost"
                            disabled={busyAppointmentId === item.id}
                            onClick={async (event) => {
                              event.stopPropagation();
                              const confirmed = await confirm({
                                title: 'Otkazi termin koji ceka reschedule?',
                                description:
                                  'Ova akcija zatvara konfliktni termin umesto da ga premestis na novi slot.',
                                confirmLabel: 'Otkazi termin',
                                tone: 'danger',
                              });
                              if (confirmed) {
                                const cancelReason =
                                  item.requiresRescheduleReason ?? 'Cancelled after reschedule request.';
                                onStatusChange?.(item.id, 'CANCELLED', cancelReason);
                              }
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="toolbar-row" style={{ justifyContent: 'space-between', marginTop: 18 }}>
        <div className="muted">
          Strana {data.pagination.page} / {data.pagination.totalPages}
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            disabled={data.pagination.page <= 1}
            onClick={() => onPageChange(data.pagination.page - 1)}
          >
            Prethodna
          </button>
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            disabled={data.pagination.page >= data.pagination.totalPages}
            onClick={() => onPageChange(data.pagination.page + 1)}
          >
            Sledeca
          </button>
        </div>
      </div>
    </section>
  );
}
