'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AppointmentDetailPanel } from '@/components/appointment-detail-panel';
import { DayScheduleBoard } from '@/components/day-schedule-board';
import { ManualBookingPanel } from '@/components/manual-booking-panel';
import { ScheduleOperationsPanel } from '@/components/schedule-operations-panel';
import { ScheduleSelectionPanel } from '@/components/schedule-selection-panel';
import { useAuth } from '@/components/auth-provider';
import {
  fetchAdminScheduleDay,
  fetchAdminScheduleWeek,
  updateAdminAppointment,
} from '@/lib/api';
import { addDays, formatDateLabel, todayLocalDate } from '@/lib/date';
import {
  readRescheduleHistory,
  RescheduleHistoryRecord,
} from '@/lib/reschedule-history';
import { ScheduleDayResult, ScheduleWeekResult } from '@/lib/types';

export default function SchedulePage() {
  const { session } = useAuth();
  const blockedSlotPanelRef = useRef<HTMLDivElement | null>(null);
  const manualBookingPanelRef = useRef<HTMLDivElement | null>(null);
  const appointmentDetailPanelRef = useRef<HTMLDivElement | null>(null);
  const [date, setDate] = useState(todayLocalDate());
  const [barberId, setBarberId] = useState('');
  const [dayData, setDayData] = useState<ScheduleDayResult | null>(null);
  const [weekData, setWeekData] = useState<ScheduleWeekResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [rescheduleHistory, setRescheduleHistory] = useState<RescheduleHistoryRecord[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedFreeSlot, setSelectedFreeSlot] = useState<{
    barberId: string;
    startAt: string;
    endAt: string;
  } | null>(null);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    setRescheduleHistory(readRescheduleHistory());
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([
      fetchAdminScheduleDay({
        accessToken: session.accessToken,
        date,
        barberId: barberId || undefined,
      }),
      fetchAdminScheduleWeek({
        accessToken: session.accessToken,
        startDate: date,
        barberId: barberId || undefined,
      }),
    ])
      .then(([dayResult, weekResult]) => {
        setDayData(dayResult);
        setWeekData(weekResult);
        setError(null);
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Raspored nije mogao da se ucita.');
      });
  }, [barberId, date, refreshNonce, session]);

  useEffect(() => {
    if (!dayData) {
      return;
    }

    if (
      selectedAppointmentId &&
      dayData.barbers.some((barber) =>
        barber.appointments.some((appointment) => appointment.id === selectedAppointmentId),
      )
    ) {
      return;
    }

    setSelectedAppointmentId(null);
  }, [dayData, selectedAppointmentId]);

  const selectedAppointment = useMemo(() => {
    if (!dayData || !selectedAppointmentId) {
      return null;
    }

    for (const barber of dayData.barbers) {
      const appointment = barber.appointments.find((item) => item.id === selectedAppointmentId);
      if (appointment) {
        return {
          id: appointment.id,
          status: appointment.status,
          barberId: barber.barberId,
          barberName: barber.displayName,
          serviceId: appointment.serviceId,
          serviceName: appointment.serviceName,
          customerId: appointment.customerId,
          customerPhone: appointment.customerPhone,
          customerFirstName: appointment.customerFirstName,
          customerLastName: appointment.customerLastName,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          priceAmount: 0,
          currency: '',
          createdByType: appointment.createdByType,
          cancelReason: null,
          requiresRescheduleReason:
            appointment.status === 'REQUIRES_RESCHEDULE'
              ? 'Termin zahteva novo zakazivanje zbog promene rasporeda.'
              : null,
        };
      }
    }

    return null;
  }, [dayData, selectedAppointmentId]);

  const selectedAppointmentRescheduleRecord = useMemo(() => {
    if (!selectedAppointmentId) {
      return null;
    }

    return (
      rescheduleHistory.find(
        (item) =>
          item.oldAppointmentId === selectedAppointmentId ||
          item.newAppointmentId === selectedAppointmentId,
      ) ?? null
    );
  }, [rescheduleHistory, selectedAppointmentId]);

  const selectedFreeSlotDetails = useMemo(() => {
    if (!dayData || !selectedFreeSlot) {
      return null;
    }

    const barber = dayData.barbers.find((item) => item.barberId === selectedFreeSlot.barberId);
    if (!barber) {
      return null;
    }

    return {
      ...selectedFreeSlot,
      barberName: barber.displayName,
    };
  }, [dayData, selectedFreeSlot]);

  function scrollToPanel(target: HTMLDivElement | null) {
    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function openLinkedAppointmentInSchedule(appointmentId: string, dateValue: string) {
    setDate(dateValue.slice(0, 10));
    setSelectedAppointmentId(appointmentId);
    setSelectedFreeSlot(null);
  }

  async function handleStatusChange(
    appointmentId: string,
    nextStatus: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
    cancelReason?: string,
  ) {
    if (!session) {
      return;
    }

    setBusyAppointmentId(appointmentId);
    setError(null);

    try {
      await updateAdminAppointment(session.accessToken, appointmentId, {
        status: nextStatus,
        cancelReason,
      });
      setRefreshNonce((current) => current + 1);
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Status termina nije mogao da se promeni.',
      );
    } finally {
      setBusyAppointmentId(null);
    }
  }

  return (
    <div className="stack">
      <section className="page-header">
        <div>
          <div className="badge" data-tone="warm">Schedule module</div>
          <h1 className="page-title">Day calendar</h1>
          <p className="page-subtitle">
            Day view za dnevni rad salona, sa izborom termina i operativnim akcijama na istom ekranu.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="filter-row">
          <input
            className="control"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <select
            className="control"
            value={barberId}
            onChange={(event) => setBarberId(event.target.value)}
          >
            <option value="">Svi barberi</option>
            {dayData?.barbers.map((barber) => (
              <option key={barber.barberId} value={barber.barberId}>
                {barber.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            onClick={() => setDate(addDays(date, -1))}
          >
            Prethodni dan
          </button>
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            onClick={() => setDate(addDays(date, 1))}
          >
            Sledeci dan
          </button>
        </div>
      </section>

      {error ? <div className="badge" data-tone="danger">{error}</div> : null}

      {dayData ? (
        <div className="split">
          <div style={{ flex: '0.75 1 0' }}>
            <section className="panel">
              <div className="page-header" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Operativni pregled</h2>
                  <p className="page-subtitle" style={{ marginTop: 8 }}>
                    Klik na `FREE` slot priprema blocked-slot formu, a klik na termin otvara detalje.
                  </p>
                </div>
              </div>
              <div className="helper-item">
                <strong>{formatDateLabel(dayData.date)}</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  {dayData.barbers.length} barbera - slot granularity {dayData.slotGranularityMinutes} min
                </div>
                {selectedFreeSlot ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Izabran free slot za blokadu.
                  </div>
                ) : null}
                {selectedAppointment ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Izabran termin: {selectedAppointment.barberName} - {selectedAppointment.serviceName}
                  </div>
                ) : null}
              </div>
            </section>

            <DayScheduleBoard
              data={dayData}
              rescheduleHistory={rescheduleHistory}
              selectedAppointmentId={selectedAppointmentId}
              selectedFreeSlotKey={
                selectedFreeSlot ? `${selectedFreeSlot.barberId}-${selectedFreeSlot.startAt}` : null
              }
              onSelectAppointment={(appointmentId, nextBarberId) => {
                setSelectedAppointmentId(appointmentId);
                setSelectedFreeSlot(null);
                setBarberId(nextBarberId);
              }}
              onSelectFreeSlot={(slot) => {
                setSelectedFreeSlot(slot);
                setSelectedAppointmentId(null);
                setBarberId(slot.barberId);
              }}
            />
          </div>

          <div style={{ flex: '0.95 1 0' }} className="stack">
            <ScheduleSelectionPanel
              selectedFreeSlot={selectedFreeSlotDetails}
              selectedAppointment={selectedAppointment}
              rescheduleHistoryRecord={selectedAppointmentRescheduleRecord}
              onJumpToBooking={() => scrollToPanel(manualBookingPanelRef.current)}
              onJumpToBlocking={() => scrollToPanel(blockedSlotPanelRef.current)}
              onJumpToAppointmentDetail={() => scrollToPanel(appointmentDetailPanelRef.current)}
              onOpenLinkedAppointment={(appointmentId, appointmentDate) =>
                openLinkedAppointmentInSchedule(appointmentId, appointmentDate)
              }
              onClearSelection={() => {
                setSelectedFreeSlot(null);
                setSelectedAppointmentId(null);
              }}
            />

            <div ref={blockedSlotPanelRef}>
              <ScheduleOperationsPanel
                data={dayData}
                selectedDate={date}
                selectedBarberId={barberId || selectedFreeSlot?.barberId || undefined}
                selectedBlockedRange={selectedFreeSlot}
                onChanged={() => setRefreshNonce((current) => current + 1)}
              />
            </div>

            <div ref={manualBookingPanelRef}>
              <ManualBookingPanel
                initialDate={date}
                initialBarberId={barberId || selectedFreeSlot?.barberId || undefined}
                initialStartAt={selectedFreeSlot?.startAt}
                title="Manual booking from calendar"
                subtitle="Klik na slobodan slot unapred popunjava barbera i vreme za brzo zakazivanje."
                onCreated={() => {
                  setSelectedFreeSlot(null);
                  setRefreshNonce((current) => current + 1);
                }}
              />
            </div>

            <div ref={appointmentDetailPanelRef}>
              <AppointmentDetailPanel
                appointment={selectedAppointment}
                onStatusChange={handleStatusChange}
                rescheduleHistoryRecord={selectedAppointmentRescheduleRecord}
                onOpenLinkedAppointment={(appointmentId) => {
                  const linkedRecord = rescheduleHistory.find(
                    (item) =>
                      item.oldAppointmentId === appointmentId ||
                      item.newAppointmentId === appointmentId,
                  );
                  const linkedDate = linkedRecord?.oldAppointmentId === appointmentId
                    ? linkedRecord.oldStartAt
                    : linkedRecord?.newAppointmentId === appointmentId
                      ? linkedRecord.newStartAt
                      : null;

                  if (linkedDate) {
                    openLinkedAppointmentInSchedule(appointmentId, linkedDate);
                  } else {
                    setSelectedAppointmentId(appointmentId);
                  }
                }}
                busyAppointmentId={busyAppointmentId}
              />
            </div>
          </div>
        </div>
      ) : null}

      {weekData ? (
        <section className="table-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Week strip</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Brz pregled sledecih 7 dana od {formatDateLabel(weekData.startDate)}.
              </p>
            </div>
          </div>

          <div className="calendar-grid">
            <div
              className="calendar-row"
              style={{
                gridTemplateColumns: `180px repeat(${Math.max(weekData.calendar.columns.length, 1)}, minmax(170px, 1fr))`,
              }}
            >
              <div className="calendar-column-header">Dan</div>
              {weekData.calendar.columns.map((column) => (
                <div key={column.barberId} className="calendar-column-header">
                  {column.displayName}
                </div>
              ))}
            </div>

            {weekData.calendar.days.map((day) => (
              <div
                key={day.date}
                className="calendar-row"
                style={{
                  gridTemplateColumns: `180px repeat(${Math.max(weekData.calendar.columns.length, 1)}, minmax(170px, 1fr))`,
                }}
              >
                <div className="calendar-slot-label">{formatDateLabel(day.date)}</div>
                {day.cells.map((cell) => (
                  <div key={`${day.date}-${cell.barberId}`} className="calendar-cell">
                    <div className="badge" data-tone={cell.hasDayOff ? 'danger' : 'neutral'}>
                      {cell.hasDayOff ? 'DAY OFF' : cell.isWorkingDay ? 'WORKING' : 'OFF'}
                    </div>
                    <div className="muted" style={{ marginTop: 8 }}>
                      {cell.appointmentCount} termina - {cell.blockedSlotCount} blokade
                    </div>
                    {cell.summary.requiresRescheduleSegments > 0 ? (
                      <div style={{ marginTop: 8 }}>
                        <span className="badge" data-tone="danger">
                          {cell.summary.requiresRescheduleSegments} reschedule
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
