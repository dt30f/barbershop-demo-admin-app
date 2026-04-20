'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createAdminAppointment,
  fetchAdminBarberServices,
  fetchAdminBarbers,
  fetchBarberAvailability,
  updateAdminAppointment,
} from '@/lib/api';
import {
  formatDateLabel,
  formatTimeLabel,
  toDateInputValue,
} from '@/lib/date';
import {
  AdminAppointmentsResult,
  BarberAdminItem,
  BarberAvailabilityResult,
  BarberServicePricingItem,
} from '@/lib/types';

import { useAuth } from './auth-provider';

type RescheduleAppointmentPanelProps = {
  appointment: AdminAppointmentsResult['items'][number] | null;
  onCompleted?: (result: {
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
  }) => void;
};

export function RescheduleAppointmentPanel({
  appointment,
  onCompleted,
}: RescheduleAppointmentPanelProps) {
  const { session } = useAuth();
  const [barbers, setBarbers] = useState<BarberAdminItem[]>([]);
  const [pricing, setPricing] = useState<BarberServicePricingItem[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedBarberServiceId, setSelectedBarberServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [availability, setAvailability] = useState<BarberAvailabilityResult | null>(null);
  const [selectedStartAt, setSelectedStartAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session || !appointment || appointment.status !== 'REQUIRES_RESCHEDULE') {
      return;
    }

    Promise.all([
      fetchAdminBarbers(session.accessToken),
      fetchAdminBarberServices(session.accessToken),
    ])
      .then(([barberItems, pricingItems]) => {
        setBarbers(barberItems.filter((item) => item.isActive));
        setPricing(pricingItems.filter((item) => item.isActive));
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Reschedule panel nije mogao da se ucita.');
      });
  }, [appointment, session]);

  useEffect(() => {
    if (!appointment || appointment.status !== 'REQUIRES_RESCHEDULE') {
      setSelectedBarberId('');
      setSelectedBarberServiceId('');
      setBookingDate('');
      setSelectedStartAt('');
      setAvailability(null);
      return;
    }

    setSelectedBarberId(appointment.barberId);
    setBookingDate(toDateInputValue(appointment.startAt));
    setSelectedStartAt('');
    setError(null);
    setSuccess(null);
  }, [appointment]);

  const matchingServiceOptions = useMemo(() => {
    if (!appointment) {
      return [];
    }

    return pricing.filter(
      (item) =>
        item.barberId === selectedBarberId &&
        item.serviceId === appointment.serviceId &&
        item.barberServiceId &&
        item.isActive,
    );
  }, [appointment, pricing, selectedBarberId]);

  useEffect(() => {
    const nextService = matchingServiceOptions[0];

    if (!nextService) {
      setSelectedBarberServiceId('');
      return;
    }

    if (
      !matchingServiceOptions.some(
        (item) => item.barberServiceId === selectedBarberServiceId,
      )
    ) {
      setSelectedBarberServiceId(nextService.barberServiceId ?? '');
    }
  }, [matchingServiceOptions, selectedBarberServiceId]);

  useEffect(() => {
    setAvailability(null);

    if (!session || !appointment || !selectedBarberId || !selectedBarberServiceId || !bookingDate) {
      return;
    }

    fetchBarberAvailability({
      salonId: session.staff.salonId,
      barberId: selectedBarberId,
      barberServiceId: selectedBarberServiceId,
      date: bookingDate,
    })
      .then((result) => {
        setAvailability(result);
        setError(null);

        if (selectedStartAt && !result.slots.some((slot) => slot.startAt === selectedStartAt)) {
          setSelectedStartAt('');
        }
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Slobodni termini za reschedule nisu mogli da se ucitaju.');
      });
  }, [
    appointment,
    bookingDate,
    selectedBarberId,
    selectedBarberServiceId,
    selectedStartAt,
    session,
  ]);

  const selectedService = matchingServiceOptions.find(
    (item) => item.barberServiceId === selectedBarberServiceId,
  );
  const selectedBarber =
    barbers.find((item) => item.id === selectedBarberId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !appointment) {
      return;
    }

    if (!selectedBarberId || !selectedBarberServiceId || !selectedStartAt) {
      setError('Izaberi novog barbera i slobodan termin za reschedule.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createAdminAppointment(session.accessToken, {
        customerPhoneNumber: appointment.customerPhone,
        customerFirstName: appointment.customerFirstName || 'Klijent',
        customerLastName: appointment.customerLastName || undefined,
        barberId: selectedBarberId,
        barberServiceId: selectedBarberServiceId,
        startAt: selectedStartAt,
      });

      const cancelReason =
        `Rescheduled from ${formatDateLabel(appointment.startAt)} ${formatTimeLabel(appointment.startAt)} ` +
        `to ${formatDateLabel(created.startAt)} ${formatTimeLabel(created.startAt)} with ${created.barberName}.`;

      await updateAdminAppointment(session.accessToken, appointment.id, {
        status: 'CANCELLED',
        cancelReason,
      });

      setSuccess(
        `Termin je pomeren na ${formatDateLabel(created.startAt)} u ${formatTimeLabel(created.startAt)} kod ${created.barberName}.`,
      );
      setSelectedStartAt('');
      onCompleted?.({
        oldAppointmentId: appointment.id,
        oldStartAt: appointment.startAt,
        oldEndAt: appointment.endAt,
        oldBarberName: appointment.barberName,
        oldServiceName: appointment.serviceName,
        newAppointment: created,
      });
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Reschedule nije mogao da se sacuva.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!appointment || appointment.status !== 'REQUIRES_RESCHEDULE') {
    return null;
  }

  return (
    <section className="form-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Reschedule appointment</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Ovaj korak se radi nakon sto day off ili blokada prebaci termin u `REQUIRES_RESCHEDULE`.
          </p>
        </div>
      </div>

      <div className="helper-item" style={{ marginBottom: 18 }}>
        <strong>
          {[appointment.customerFirstName, appointment.customerLastName].filter(Boolean).join(' ') || 'Klijent'}
        </strong>
        <div className="muted" style={{ marginTop: 6 }}>{appointment.customerPhone}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Stari termin: {appointment.barberName} - {appointment.serviceName}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {formatDateLabel(appointment.startAt)} - {formatTimeLabel(appointment.startAt)} - {formatTimeLabel(appointment.endAt)}
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="split">
          <div className="field">
            <label>Novi barber</label>
            <select
              className="control"
              value={selectedBarberId}
              onChange={(event) => setSelectedBarberId(event.target.value)}
            >
              <option value="">Izaberi barbera</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Novi datum</label>
            <input
              className="control"
              type="date"
              value={bookingDate}
              onChange={(event) => setBookingDate(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Service mapping</label>
          <select
            className="control"
            value={selectedBarberServiceId}
            onChange={(event) => setSelectedBarberServiceId(event.target.value)}
            disabled={matchingServiceOptions.length <= 1}
          >
            <option value="">Izaberi servis</option>
            {matchingServiceOptions.map((item) => (
              <option key={item.barberServiceId ?? `${item.barberId}-${item.serviceId}`} value={item.barberServiceId ?? ''}>
                {item.serviceName} - {item.priceAmount} {item.currency}
                {item.durationOverrideMinutes ? ` - ${item.durationOverrideMinutes} min` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedBarber && selectedService ? (
          <div className="helper-item">
            <strong>{selectedBarber.displayName}</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              {selectedService.serviceName} - {selectedService.priceAmount} {selectedService.currency}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {selectedService.durationOverrideMinutes
                ? `Override trajanje ${selectedService.durationOverrideMinutes} min`
                : 'Koristi se osnovno trajanje usluge'}
            </div>
          </div>
        ) : null}

        {selectedBarberId && matchingServiceOptions.length === 0 ? (
          <div className="helper-item">
            <strong>Nema aktivnog service mapping-a</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              Izabrani barber trenutno nema aktivnu kombinaciju za servis `{appointment.serviceName}`.
            </div>
          </div>
        ) : null}

        <div className="field">
          <label>Slobodni termini</label>
          {availability ? (
            availability.slots.length > 0 ? (
              <div className="page-actions">
                {availability.slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    className="control-button"
                    data-variant={selectedStartAt === slot.startAt ? 'primary' : 'ghost'}
                    onClick={() => setSelectedStartAt(slot.startAt)}
                  >
                    {formatTimeLabel(slot.startAt)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="helper-item">
                <strong>Nema slobodnih termina</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  {availability.message ?? 'Za izabrani datum nema slobodnih slotova.'}
                </div>
              </div>
            )
          ) : (
            <div className="muted">Izaberi barbera i datum da bi video slobodne slotove.</div>
          )}
        </div>

        {error ? <div className="badge" data-tone="danger">{error}</div> : null}
        {success ? <div className="badge" data-tone="success">{success}</div> : null}

        <div className="toolbar-row">
          <button
            type="submit"
            className="control-button"
            data-variant="primary"
            disabled={saving}
          >
            {saving ? 'Cuvanje...' : 'Sacuvaj novi termin i zatvori stari'}
          </button>
          {selectedStartAt ? (
            <span className="badge" data-tone="neutral">
              Novi slot {formatTimeLabel(selectedStartAt)}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
