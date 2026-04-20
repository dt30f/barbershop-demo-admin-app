'use client';

import { RescheduleHistoryRecord } from '@/lib/reschedule-history';
import { ScheduleDayResult } from '@/lib/types';

function overlaps(slotStart: string, slotEnd: string, itemStart: string, itemEnd: string) {
  const slotStartMs = new Date(slotStart).getTime();
  const slotEndMs = new Date(slotEnd).getTime();
  const itemStartMs = new Date(itemStart).getTime();
  const itemEndMs = new Date(itemEnd).getTime();

  return itemStartMs < slotEndMs && itemEndMs > slotStartMs;
}

type DayScheduleBoardProps = {
  data: ScheduleDayResult;
  rescheduleHistory?: RescheduleHistoryRecord[];
  selectedAppointmentId?: string | null;
  selectedFreeSlotKey?: string | null;
  onSelectAppointment?: (appointmentId: string, barberId: string) => void;
  onSelectFreeSlot?: (input: {
    barberId: string;
    startAt: string;
    endAt: string;
  }) => void;
};

export function DayScheduleBoard({
  data,
  rescheduleHistory,
  selectedAppointmentId,
  selectedFreeSlotKey,
  onSelectAppointment,
  onSelectFreeSlot,
}: DayScheduleBoardProps) {
  const templateColumns = `140px repeat(${Math.max(data.calendar.columns.length, 1)}, minmax(220px, 1fr))`;

  return (
    <section className="calendar-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Day calendar</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Slot grid za operatere salona. Kolone su barberi, a redovi prate slot granularnost backend-a.
          </p>
        </div>
        <div className="badge" data-tone="neutral">
          {data.slotGranularityMinutes} min slot
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-row" style={{ gridTemplateColumns: templateColumns }}>
          <div className="calendar-column-header">Vreme</div>
          {data.calendar.columns.map((column) => (
            <div key={column.barberId} className="calendar-column-header">
              <div style={{ fontWeight: 700 }}>{column.displayName}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {column.summary.bookedSegments} booked - {column.summary.blockedSegments} blocked
              </div>
            </div>
          ))}
        </div>

        {data.calendar.timeAxis.map((slot) => (
          <div key={slot.startAt} className="calendar-row" style={{ gridTemplateColumns: templateColumns }}>
            <div className="calendar-slot-label">{slot.label}</div>
            {data.calendar.columns.map((column) => {
              const items = column.items.filter((item) =>
                overlaps(slot.startAt, slot.endAt, item.startAt, item.endAt),
              );

              return (
                <div
                  key={`${column.barberId}-${slot.startAt}`}
                  className="calendar-cell"
                  onClick={() => {
                    if (items.length === 0) {
                      onSelectFreeSlot?.({
                        barberId: column.barberId,
                        startAt: slot.startAt,
                        endAt: slot.endAt,
                      });
                    }
                  }}
                  style={{
                    cursor: items.length === 0 && onSelectFreeSlot ? 'pointer' : 'default',
                    outline:
                      selectedFreeSlotKey === `${column.barberId}-${slot.startAt}`
                        ? '2px solid rgba(47, 107, 77, 0.45)'
                        : 'none',
                  }}
                >
                  {items.length === 0 ? (
                    <span className="badge" data-tone="success">FREE</span>
                  ) : (
                    items.map((item) => (
                      (() => {
                        const rescheduleRecord =
                          item.appointmentId
                            ? rescheduleHistory?.find(
                                (historyItem) =>
                                  historyItem.oldAppointmentId === item.appointmentId ||
                                  historyItem.newAppointmentId === item.appointmentId,
                              ) ?? null
                            : null;
                        const isRescheduledOld =
                          item.appointmentId && rescheduleRecord?.oldAppointmentId === item.appointmentId;
                        const isRescheduledNew =
                          item.appointmentId && rescheduleRecord?.newAppointmentId === item.appointmentId;

                        return (
                          <div
                            key={`${item.id}-${slot.startAt}`}
                            className="calendar-item"
                            data-type={item.type}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (item.type === 'APPOINTMENT' && item.appointmentId) {
                                onSelectAppointment?.(item.appointmentId, column.barberId);
                              }
                            }}
                            style={{
                              cursor:
                                item.type === 'APPOINTMENT' && onSelectAppointment ? 'pointer' : 'default',
                              outline:
                                item.appointmentId && selectedAppointmentId === item.appointmentId
                                  ? '2px solid rgba(183, 121, 43, 0.4)'
                                  : 'none',
                            }}
                          >
                            <strong>{item.title}</strong>
                            {item.subtitle ? <span className="muted">{item.subtitle}</span> : null}
                            {item.status ? (
                              <span className="status-chip" data-status={item.status}>
                                {item.status}
                              </span>
                            ) : null}
                            {isRescheduledOld ? (
                              <span className="badge" data-tone="danger">RESCHEDULED FROM</span>
                            ) : null}
                            {isRescheduledNew ? (
                              <span className="badge" data-tone="success">RESCHEDULED TO</span>
                            ) : null}
                          </div>
                        );
                      })()
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
