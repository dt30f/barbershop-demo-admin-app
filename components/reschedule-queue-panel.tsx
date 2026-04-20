'use client';

import Link from 'next/link';

import { formatDateLabel, formatTimeLabel } from '@/lib/date';
import { AdminAppointmentsResult } from '@/lib/types';

type RescheduleQueuePanelProps = {
  data: AdminAppointmentsResult | null;
  title?: string;
  subtitle?: string;
  appointmentsHref?: string;
  selectedAppointmentHref?: (appointmentId: string) => string;
};

export function RescheduleQueuePanel({
  data,
  title = 'Reschedule queue',
  subtitle = 'Termini koji traze novu rezervaciju zbog kasnije promene rasporeda.',
  appointmentsHref = '/appointments?status=REQUIRES_RESCHEDULE',
  selectedAppointmentHref,
}: RescheduleQueuePanelProps) {
  const items = data?.items ?? [];

  return (
    <section className="panel">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            {subtitle}
          </p>
        </div>
        <Link href={appointmentsHref} className="control-button" data-variant="ghost">
          Otvori tabelu
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="helper-item">
          <strong>Nema termina za pomeranje</strong>
          <div className="muted" style={{ marginTop: 6 }}>
            Trenutno nema `REQUIRES_RESCHEDULE` termina u izabranom periodu.
          </div>
        </div>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <div key={item.id} className="helper-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>
                  {item.customerFirstName ?? 'Klijent'} {item.customerLastName ?? ''}
                </strong>
                <span className="status-chip" data-status={item.status}>
                  {item.status}
                </span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {formatDateLabel(item.startAt)} - {formatTimeLabel(item.startAt)} - {formatTimeLabel(item.endAt)}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {item.barberName} - {item.serviceName} - {item.customerPhone}
              </div>
              {item.requiresRescheduleReason ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  {item.requiresRescheduleReason}
                </div>
              ) : null}
              {selectedAppointmentHref ? (
                <div style={{ marginTop: 10 }}>
                  <Link
                    href={selectedAppointmentHref(item.id)}
                    className="control-button"
                    data-variant="ghost"
                  >
                    Otvori detalje
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
