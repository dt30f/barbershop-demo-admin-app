'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { fetchAdminAppointments, fetchAdminScheduleDay } from '@/lib/api';
import {
  addDays,
  formatDateLabel,
  formatTimeLabel,
  todayLocalDate,
} from '@/lib/date';
import { AdminAppointmentsResult, ScheduleDayResult } from '@/lib/types';

import { useAuth } from './auth-provider';
import { RescheduleQueuePanel } from './reschedule-queue-panel';

export function DashboardOverview() {
  const { session } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleDayResult | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointmentsResult | null>(null);
  const [rescheduleQueue, setRescheduleQueue] = useState<AdminAppointmentsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const date = todayLocalDate();

    Promise.all([
      fetchAdminScheduleDay({
        accessToken: session.accessToken,
        date,
      }),
      fetchAdminAppointments({
        accessToken: session.accessToken,
        dateFrom: date,
        dateTo: date,
        page: 1,
        pageSize: 8,
        sortBy: 'START_AT',
        sortDirection: 'ASC',
      }),
      fetchAdminAppointments({
        accessToken: session.accessToken,
        dateFrom: date,
        dateTo: addDays(date, 14),
        status: 'REQUIRES_RESCHEDULE',
        page: 1,
        pageSize: 8,
        sortBy: 'START_AT',
        sortDirection: 'ASC',
      }),
    ])
      .then(([scheduleResult, appointmentResult, rescheduleResult]) => {
        setSchedule(scheduleResult);
        setAppointments(appointmentResult);
        setRescheduleQueue(rescheduleResult);
        setError(null);
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Dashboard nije mogao da ucita podatke.');
      });
  }, [session]);

  const today = todayLocalDate();

  const summary = useMemo(
    () =>
      schedule?.barbers.reduce(
        (accumulator, barber) => {
          accumulator.barbers += 1;
          accumulator.booked += barber.summary.bookedSegments;
          accumulator.blocked += barber.summary.blockedSegments;
          accumulator.conflicts += barber.summary.requiresRescheduleSegments;
          accumulator.dayOff += barber.dayOff ? 1 : 0;
          accumulator.noCoverage +=
            !barber.dayOff && (!barber.workingHours || !barber.workingHours.isActive) ? 1 : 0;
          return accumulator;
        },
        {
          barbers: 0,
          booked: 0,
          blocked: 0,
          conflicts: 0,
          dayOff: 0,
          noCoverage: 0,
        },
      ) ?? {
        barbers: 0,
        booked: 0,
        blocked: 0,
        conflicts: 0,
        dayOff: 0,
        noCoverage: 0,
      },
    [schedule],
  );

  const dayOffBarbers = useMemo(
    () => schedule?.barbers.filter((barber) => barber.dayOff) ?? [],
    [schedule],
  );
  const noCoverageBarbers = useMemo(
    () =>
      schedule?.barbers.filter(
        (barber) => !barber.dayOff && (!barber.workingHours || !barber.workingHours.isActive),
      ) ?? [],
    [schedule],
  );
  const conflictBarbers = useMemo(
    () =>
      schedule?.barbers.filter((barber) => barber.summary.requiresRescheduleSegments > 0) ?? [],
    [schedule],
  );

  const actionCards = [
    {
      title: 'Danasnji termini',
      value: appointments?.pagination.total ?? 0,
      description: 'Brz ulaz u recepcijski pregled za danas.',
      href: '/appointments?datePreset=today',
    },
    {
      title: 'Reschedule red',
      value: rescheduleQueue?.pagination.total ?? 0,
      description: 'Termini koje treba kontaktirati i pomeriti.',
      href: '/appointments?status=REQUIRES_RESCHEDULE&datePreset=next14',
    },
    {
      title: 'Day off danas',
      value: summary.dayOff,
      description: 'Barberi koji su danas oznaceni kao odsutni.',
      href: `/schedule?date=${today}`,
    },
    {
      title: 'Bez pokrica',
      value: summary.noCoverage,
      description: 'Aktivni barberi bez definisanog radnog vremena za danas.',
      href: `/schedule?date=${today}`,
    },
  ];

  return (
    <div className="stack">
      <section className="page-header">
        <div>
          <div className="badge" data-tone="warm">MVP admin cockpit</div>
          <h1 className="page-title">Dnevni pregled salona</h1>
          <p className="page-subtitle">
            Operativni ekran za recepciju: danasnji termini, reschedule red, day off i coverage problemi.
          </p>
        </div>
      </section>

      {error ? <div className="badge" data-tone="danger">{error}</div> : null}

      <section className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Barberi danas</p>
          <p className="metric-value">{summary.barbers}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Booked slotovi</p>
          <p className="metric-value">{summary.booked}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Blocked slotovi</p>
          <p className="metric-value">{summary.blocked}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Reschedule konflikti</p>
          <p className="metric-value">{summary.conflicts}</p>
        </div>
      </section>

      <section className="metrics-grid">
        {actionCards.map((card) => (
          <Link key={card.title} href={card.href} className="metric-card">
            <p className="metric-label">{card.title}</p>
            <p className="metric-value">{card.value}</p>
            <p className="muted" style={{ margin: 0 }}>{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="panel">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Brze akcije</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Najcesci ulazi za recepciju i dnevni rad salona.
            </p>
          </div>
        </div>

        <div className="page-actions">
          <Link href="/appointments?datePreset=today" className="control-button" data-variant="ghost">
            Danasnji termini
          </Link>
          <Link href="/appointments?status=REQUIRES_RESCHEDULE&datePreset=next14" className="control-button" data-variant="ghost">
            Reschedule queue
          </Link>
          <Link href={`/schedule?date=${today}`} className="control-button" data-variant="ghost">
            Otvori danasnji raspored
          </Link>
          <Link href="/services" className="control-button" data-variant="ghost">
            Usluge i cene
          </Link>
          <Link href="/settings" className="control-button" data-variant="ghost">
            Salon settings
          </Link>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Attention board</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Stavke koje danas najvise traze reakciju.
              </p>
            </div>
          </div>

          <div className="stack">
            {conflictBarbers.map((barber) => (
              <Link
                key={`conflict-${barber.barberId}`}
                href={`/appointments?status=REQUIRES_RESCHEDULE&barberId=${barber.barberId}&datePreset=next14`}
                className="helper-item"
              >
                <strong>{barber.displayName}</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  {barber.summary.requiresRescheduleSegments} slotova trazi novo zakazivanje.
                </div>
              </Link>
            ))}

            {dayOffBarbers.map((barber) => (
              <Link
                key={`dayoff-${barber.barberId}`}
                href={`/schedule?date=${today}&barberId=${barber.barberId}`}
                className="helper-item"
              >
                <strong>{barber.displayName}</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Day off danas{barber.dayOff?.reason ? ` - ${barber.dayOff.reason}` : ''}.
                </div>
              </Link>
            ))}

            {noCoverageBarbers.map((barber) => (
              <Link
                key={`coverage-${barber.barberId}`}
                href={`/schedule?date=${today}&barberId=${barber.barberId}`}
                className="helper-item"
              >
                <strong>{barber.displayName}</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Nema aktivno radno vreme za danas, proveri coverage.
                </div>
              </Link>
            ))}

            {conflictBarbers.length === 0 &&
            dayOffBarbers.length === 0 &&
            noCoverageBarbers.length === 0 ? (
              <div className="helper-item">
                <strong>Nema hitnih stavki</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Danas nema reschedule konflikata ni coverage problema.
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Naredni termini</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Brz pregled prvih termina za danas.
              </p>
            </div>
          </div>

          <div className="stack">
            {appointments?.items.map((item) => (
              <Link
                key={item.id}
                href={`/appointments?datePreset=today&appointmentId=${item.id}`}
                className="helper-item"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{item.customerFirstName ?? 'Klijent'} {item.customerLastName ?? ''}</strong>
                  <span className="status-chip" data-status={item.status}>{item.status}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {item.barberName} - {item.serviceName}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {formatTimeLabel(item.startAt)} - {formatTimeLabel(item.endAt)} - {item.customerPhone}
                </div>
              </Link>
            ))}

            {appointments?.items.length === 0 ? (
              <div className="helper-item">
                <strong>Nema termina za danas</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Danas trenutno nema zakazanih termina.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Raspored po barberu</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                {schedule ? formatDateLabel(schedule.date) : 'Ucitavanje rasporeda...'}
              </p>
            </div>
          </div>

          <div className="stack">
            {schedule?.barbers.map((barber) => (
              <Link
                key={barber.barberId}
                href={`/schedule?date=${today}&barberId=${barber.barberId}`}
                className="panel"
                style={{ padding: 18 }}
              >
                <div className="page-actions" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{barber.displayName}</div>
                    <div className="muted">
                      {barber.summary.bookedSegments} booked, {barber.summary.blockedSegments} blocked
                    </div>
                  </div>
                  {barber.summary.requiresRescheduleSegments > 0 ? (
                    <span className="badge" data-tone="danger">
                      {barber.summary.requiresRescheduleSegments} konflikta
                    </span>
                  ) : barber.dayOff ? (
                    <span className="badge" data-tone="warm">DAY OFF</span>
                  ) : (
                    <span className="badge" data-tone="success">Stabilan dan</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <RescheduleQueuePanel
          data={rescheduleQueue}
          subtitle="Najblizi termini koji vec cekaju da budu prebaceni na novi slot."
          appointmentsHref="/appointments?status=REQUIRES_RESCHEDULE&datePreset=next14"
          selectedAppointmentHref={(appointmentId) =>
            `/appointments?status=REQUIRES_RESCHEDULE&datePreset=next14&appointmentId=${appointmentId}`
          }
        />
      </section>
    </div>
  );
}
