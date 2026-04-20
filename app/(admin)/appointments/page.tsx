'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AppointmentDetailPanel } from '@/components/appointment-detail-panel';
import { AppointmentsTable } from '@/components/appointments-table';
import { ManualBookingPanel } from '@/components/manual-booking-panel';
import { RescheduleAppointmentPanel } from '@/components/reschedule-appointment-panel';
import { RescheduleQueuePanel } from '@/components/reschedule-queue-panel';
import { useAuth } from '@/components/auth-provider';
import { useFeedback } from '@/components/feedback-provider';
import {
  fetchAdminAppointments,
  fetchAdminScheduleDay,
  updateAdminAppointment,
} from '@/lib/api';
import { addDays, formatDateLabel, formatTimeLabel, todayLocalDate } from '@/lib/date';
import {
  readRescheduleHistory,
  RescheduleHistoryRecord,
  upsertRescheduleHistory,
  writeRescheduleHistory,
} from '@/lib/reschedule-history';
import { AdminAppointmentsResult } from '@/lib/types';

function buildDateRangeFromPreset(preset: string) {
  const today = todayLocalDate();

  switch (preset) {
    case 'today':
      return { dateFrom: today, dateTo: today };
    case 'next14':
      return { dateFrom: today, dateTo: addDays(today, 14) };
    case 'next7':
    default:
      return { dateFrom: today, dateTo: addDays(today, 7) };
  }
}

function normalizeDatePreset(value: string | null) {
  if (value === 'today' || value === 'next7' || value === 'next14') {
    return value;
  }

  return '';
}

export default function AppointmentsPage() {
  const { session } = useAuth();
  const { pushFeedback } = useFeedback();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reschedulePanelRef = useRef<HTMLDivElement | null>(null);

  const initialPreset = normalizeDatePreset(searchParams.get('datePreset'));
  const initialRange = initialPreset
    ? buildDateRangeFromPreset(initialPreset)
    : {
        dateFrom: searchParams.get('dateFrom') ?? todayLocalDate(),
        dateTo: searchParams.get('dateTo') ?? addDays(todayLocalDate(), 7),
      };

  const [data, setData] = useState<AdminAppointmentsResult | null>(null);
  const [barberId, setBarberId] = useState(searchParams.get('barberId') ?? '');
  const [customerPhone, setCustomerPhone] = useState(searchParams.get('customerPhone') ?? '');
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize') ?? '10'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'START_AT');
  const [sortDirection, setSortDirection] = useState(searchParams.get('sortDirection') ?? 'ASC');
  const [datePreset, setDatePreset] = useState(initialPreset);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(
    searchParams.get('appointmentId') ?? '',
  );
  const [barberOptions, setBarberOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [rescheduleHistory, setRescheduleHistory] = useState<RescheduleHistoryRecord[]>([]);
  const [lastReschedule, setLastReschedule] = useState<{
    oldAppointmentId: string;
    oldStartAt: string;
    oldEndAt: string;
    oldBarberName: string;
    oldServiceName: string;
    newAppointment: {
      id: string;
      barberId: string;
      barberName: string;
      serviceId: string;
      serviceName: string;
      startAt: string;
      endAt: string;
      priceAmount: number;
      currency: string;
    };
  } | null>(null);

  useEffect(() => {
    setRescheduleHistory(readRescheduleHistory());
  }, []);

  useEffect(() => {
    const nextPreset = normalizeDatePreset(searchParams.get('datePreset'));
    const nextRange = nextPreset
      ? buildDateRangeFromPreset(nextPreset)
      : {
          dateFrom: searchParams.get('dateFrom') ?? todayLocalDate(),
          dateTo: searchParams.get('dateTo') ?? addDays(todayLocalDate(), 7),
        };

    setBarberId(searchParams.get('barberId') ?? '');
    setCustomerPhone(searchParams.get('customerPhone') ?? '');
    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    setStatus(searchParams.get('status') ?? '');
    setPage(Math.max(1, Number(searchParams.get('page') ?? '1')));
    setPageSize(Number(searchParams.get('pageSize') ?? '10'));
    setSortBy(searchParams.get('sortBy') ?? 'START_AT');
    setSortDirection(searchParams.get('sortDirection') ?? 'ASC');
    setDatePreset(nextPreset);
    setSelectedAppointmentId(searchParams.get('appointmentId') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (datePreset) {
      params.set('datePreset', datePreset);
    } else {
      params.set('dateFrom', dateFrom);
      params.set('dateTo', dateTo);
    }

    if (barberId) {
      params.set('barberId', barberId);
    }
    if (status) {
      params.set('status', status);
    }
    if (customerPhone) {
      params.set('customerPhone', customerPhone);
    }
    if (selectedAppointmentId) {
      params.set('appointmentId', selectedAppointmentId);
    }
    if (page !== 1) {
      params.set('page', String(page));
    }
    if (pageSize !== 10) {
      params.set('pageSize', String(pageSize));
    }
    if (sortBy !== 'START_AT') {
      params.set('sortBy', sortBy);
    }
    if (sortDirection !== 'ASC') {
      params.set('sortDirection', sortDirection);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    }
  }, [
    barberId,
    customerPhone,
    dateFrom,
    datePreset,
    dateTo,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
    selectedAppointmentId,
    sortBy,
    sortDirection,
    status,
  ]);

  useEffect(() => {
    if (!session) {
      return;
    }

    fetchAdminScheduleDay({
      accessToken: session.accessToken,
      date: todayLocalDate(),
    })
      .then((response) => {
        setBarberOptions(
          response.barbers.map((barber) => ({
            id: barber.barberId,
            name: barber.displayName,
          })),
        );
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    fetchAdminAppointments({
      accessToken: session.accessToken,
      page,
      pageSize,
      sortBy,
      sortDirection,
      dateFrom,
      dateTo,
      barberId: barberId || undefined,
      status: status || undefined,
      customerPhone: customerPhone || undefined,
    })
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Appointments lista nije mogla da se ucita.');
      });
  }, [
    barberId,
    customerPhone,
    dateFrom,
    dateTo,
    page,
    pageSize,
    refreshNonce,
    session,
    sortBy,
    sortDirection,
    status,
  ]);

  useEffect(() => {
    if (!data?.items.length) {
      return;
    }

    if (selectedAppointmentId && data.items.some((item) => item.id === selectedAppointmentId)) {
      return;
    }

    setSelectedAppointmentId(data.items[0].id);
  }, [data, selectedAppointmentId]);

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
      pushFeedback({
        tone: 'success',
        title: 'Status termina je azuriran',
        description: `Termin je prebacen u ${nextStatus}.`,
      });
      setRefreshNonce((current) => current + 1);
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Status termina nije mogao da se promeni.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Status termina nije promenjen',
        description: message,
      });
    } finally {
      setBusyAppointmentId(null);
    }
  }

  function applyDatePreset(nextPreset: 'today' | 'next7' | 'next14') {
    const nextRange = buildDateRangeFromPreset(nextPreset);
    setDatePreset(nextPreset);
    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    setPage(1);
  }

  function clearFilters() {
    const nextRange = buildDateRangeFromPreset('next7');
    setBarberId('');
    setCustomerPhone('');
    setStatus('');
    setDatePreset('');
    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    setSelectedAppointmentId('');
    setPage(1);
    setPageSize(10);
    setSortBy('START_AT');
    setSortDirection('ASC');
  }

  const rescheduleQueueData = useMemo(() => {
    if (!data) {
      return null;
    }

    return {
      ...data,
      items: data.items.filter((item) => item.status === 'REQUIRES_RESCHEDULE'),
    };
  }, [data]);

  const selectedAppointment =
    data?.items.find((item) => item.id === selectedAppointmentId) ?? null;
  const selectedAppointmentRescheduleRecord =
    selectedAppointment
      ? rescheduleHistory.find(
          (item) =>
            item.oldAppointmentId === selectedAppointment.id ||
            item.newAppointmentId === selectedAppointment.id,
        ) ?? null
      : null;

  function scrollToReschedulePanel() {
    reschedulePanelRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="stack">
      <section className="page-header">
        <div>
          <div className="badge" data-tone="warm">Reception flow</div>
          <h1 className="page-title">Appointments table</h1>
          <p className="page-subtitle">
            Filtriranje, status akcije, detaljni pregled i rucni unos termina za dnevni rad recepcije.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Filter presets</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Brzi ulazi za najcesce operativne scenarije.
            </p>
          </div>
        </div>

        <div className="page-actions">
          <button type="button" className="control-button" data-variant="ghost" onClick={() => applyDatePreset('today')}>
            Danas
          </button>
          <button type="button" className="control-button" data-variant="ghost" onClick={() => applyDatePreset('next7')}>
            Sledecih 7 dana
          </button>
          <button type="button" className="control-button" data-variant="ghost" onClick={() => applyDatePreset('next14')}>
            Sledecih 14 dana
          </button>
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            onClick={() => {
              applyDatePreset('next14');
              setStatus('REQUIRES_RESCHEDULE');
            }}
          >
            Reschedule queue
          </button>
          <button type="button" className="control-button" data-variant="ghost" onClick={clearFilters}>
            Reset filtera
          </button>
        </div>
      </section>

      <ManualBookingPanel
        initialDate={dateFrom}
        initialBarberId={barberId || undefined}
        onCreated={() => setRefreshNonce((current) => current + 1)}
      />

      {lastReschedule ? (
        <section className="panel">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Reschedule completed</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Poslednji pomeren termin je sacuvan i stari konfliktni appointment je zatvoren.
              </p>
            </div>
          </div>

          <div className="split">
            <div className="helper-item">
              <strong>Stari termin</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                {lastReschedule.oldBarberName} - {lastReschedule.oldServiceName}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {formatDateLabel(lastReschedule.oldStartAt)} - {formatTimeLabel(lastReschedule.oldStartAt)} - {formatTimeLabel(lastReschedule.oldEndAt)}
              </div>
            </div>

            <div className="helper-item">
              <strong>Novi termin</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                {lastReschedule.newAppointment.barberName} - {lastReschedule.newAppointment.serviceName}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {formatDateLabel(lastReschedule.newAppointment.startAt)} - {formatTimeLabel(lastReschedule.newAppointment.startAt)} - {formatTimeLabel(lastReschedule.newAppointment.endAt)}
              </div>
            </div>
          </div>

          <div className="toolbar-row" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={() => {
                setStatus('');
                setDatePreset('');
                setDateFrom(lastReschedule.newAppointment.startAt.slice(0, 10));
                setDateTo(lastReschedule.newAppointment.startAt.slice(0, 10));
                setSelectedAppointmentId(lastReschedule.newAppointment.id);
                setPage(1);
                setRefreshNonce((current) => current + 1);
              }}
            >
              Otvori novi termin u tabeli
            </button>
            <button
              type="button"
              className="control-button"
              data-variant="ghost"
              onClick={() => setLastReschedule(null)}
            >
              Zatvori summary
            </button>
          </div>
        </section>
      ) : null}

      {selectedAppointment?.status === 'REQUIRES_RESCHEDULE' ? (
        <div ref={reschedulePanelRef}>
          <RescheduleAppointmentPanel
            appointment={selectedAppointment}
            onCompleted={(result) => {
              const nextHistory = upsertRescheduleHistory(rescheduleHistory, {
                oldAppointmentId: result.oldAppointmentId,
                oldStartAt: result.oldStartAt,
                oldEndAt: result.oldEndAt,
                oldBarberName: result.oldBarberName,
                oldServiceName: result.oldServiceName,
                newAppointmentId: result.newAppointment.id,
                newStartAt: result.newAppointment.startAt,
                newEndAt: result.newAppointment.endAt,
                newBarberName: result.newAppointment.barberName,
                newServiceName: result.newAppointment.serviceName,
              });
              setRescheduleHistory(nextHistory);
              writeRescheduleHistory(nextHistory);
              setLastReschedule(result);
              pushFeedback({
                tone: 'success',
                title: 'Reschedule je zavrsen',
                description: `Novi termin: ${result.newAppointment.barberName} u ${formatTimeLabel(result.newAppointment.startAt)}.`,
              });
              setRefreshNonce((current) => current + 1);
              setSelectedAppointmentId('');
            }}
          />
        </div>
      ) : null}

      <section className="panel">
        <div className="filter-row">
          <input
            className="control"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDatePreset('');
              setDateFrom(event.target.value);
            }}
          />
          <input
            className="control"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDatePreset('');
              setDateTo(event.target.value);
            }}
          />
          <select className="control" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Svi barberi</option>
            {barberOptions.map((barber) => (
              <option key={barber.id} value={barber.id}>{barber.name}</option>
            ))}
          </select>
          <select className="control" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Svi statusi</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REQUIRES_RESCHEDULE">REQUIRES_RESCHEDULE</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
          <input
            className="control"
            placeholder="Telefon klijenta"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
          />
          <select className="control" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="START_AT">Po vremenu</option>
            <option value="STATUS">Po statusu</option>
            <option value="BARBER_NAME">Po barberu</option>
            <option value="CUSTOMER_PHONE">Po telefonu</option>
            <option value="CREATED_AT">Po kreiranju</option>
          </select>
          <select className="control" value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
          <select
            className="control"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 po strani</option>
            <option value={20}>20 po strani</option>
            <option value={50}>50 po strani</option>
          </select>
        </div>
      </section>

      {status === 'REQUIRES_RESCHEDULE' ? (
        <RescheduleQueuePanel
          data={rescheduleQueueData}
          subtitle="Brzi pregled termina koji cekaju kontaktiranje i novi slot."
          appointmentsHref={`/appointments?status=REQUIRES_RESCHEDULE${datePreset ? `&datePreset=${datePreset}` : ''}`}
          selectedAppointmentHref={(appointmentId) =>
            `/appointments?status=REQUIRES_RESCHEDULE${datePreset ? `&datePreset=${datePreset}` : ''}&appointmentId=${appointmentId}`
          }
        />
      ) : null}

      {error ? <div className="badge" data-tone="danger">{error}</div> : null}

      <div className="split">
        <div style={{ flex: '1.5 1 0' }}>
          {data ? (
            <AppointmentsTable
              data={data}
              onPageChange={setPage}
              onStatusChange={handleStatusChange}
              onStartReschedule={() => scrollToReschedulePanel()}
              rescheduleHistory={rescheduleHistory}
              busyAppointmentId={busyAppointmentId}
              selectedAppointmentId={selectedAppointmentId || null}
              onSelectAppointment={setSelectedAppointmentId}
            />
          ) : null}
        </div>

        <div style={{ flex: '0.9 1 0' }}>
          <AppointmentDetailPanel
            appointment={selectedAppointment}
            onStatusChange={handleStatusChange}
            onStartReschedule={() => scrollToReschedulePanel()}
            rescheduleHistoryRecord={selectedAppointmentRescheduleRecord}
            onOpenLinkedAppointment={(appointmentId) => setSelectedAppointmentId(appointmentId)}
            busyAppointmentId={busyAppointmentId}
          />
        </div>
      </div>
    </div>
  );
}
