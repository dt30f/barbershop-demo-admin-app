'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  createAdminAppointment,
  fetchAdminBarberServices,
  fetchAdminBarbers,
  fetchBarberAvailability,
} from '@/lib/api';
import { formatTimeLabel } from '@/lib/date';
import {
  BarberAdminItem,
  BarberAvailabilityResult,
  BarberServicePricingItem,
} from '@/lib/types';

import { useAuth } from './auth-provider';
import { useFeedback } from './feedback-provider';

type ManualBookingPanelProps = {
  initialDate: string;
  initialBarberId?: string;
  initialStartAt?: string;
  title?: string;
  subtitle?: string;
  onCreated?: () => void;
};

export function ManualBookingPanel({
  initialDate,
  initialBarberId,
  initialStartAt,
  title = 'Manual booking',
  subtitle = 'Telefonski ili walk-in termin koji admin unosi direktno u raspored.',
  onCreated,
}: ManualBookingPanelProps) {
  const { session } = useAuth();
  const { pushFeedback } = useFeedback();
  const [bookingDate, setBookingDate] = useState(initialDate);
  const [barbers, setBarbers] = useState<BarberAdminItem[]>([]);
  const [pricing, setPricing] = useState<BarberServicePricingItem[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState(initialBarberId ?? '');
  const [selectedBarberServiceId, setSelectedBarberServiceId] = useState('');
  const [availability, setAvailability] = useState<BarberAvailabilityResult | null>(null);
  const [selectedStartAt, setSelectedStartAt] = useState('');
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBookingDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialBarberId) {
      setSelectedBarberId(initialBarberId);
    }
  }, [initialBarberId]);

  useEffect(() => {
    if (initialStartAt) {
      setSelectedStartAt(initialStartAt);
      return;
    }

    setSelectedStartAt('');
  }, [initialStartAt]);

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([
      fetchAdminBarbers(session.accessToken),
      fetchAdminBarberServices(session.accessToken),
    ])
      .then(([barberItems, pricingItems]) => {
        setBarbers(barberItems.filter((item) => item.isActive));
        setPricing(pricingItems.filter((item) => item.isActive));

        if (initialBarberId) {
          setSelectedBarberId(initialBarberId);
          return;
        }

        if (!selectedBarberId && barberItems[0]) {
          setSelectedBarberId(barberItems[0].id);
        }
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Booking forma nije mogla da se ucita.');
      });
  }, [initialBarberId, selectedBarberId, session]);

  useEffect(() => {
    if (!selectedBarberId) {
      setSelectedBarberServiceId('');
      return;
    }

    const barberServices = pricing.filter(
      (item) => item.barberId === selectedBarberId && item.isActive && item.barberServiceId,
    );
    const nextService = barberServices[0];

    if (!nextService) {
      setSelectedBarberServiceId('');
      return;
    }

    if (
      !barberServices.some((item) => item.barberServiceId === selectedBarberServiceId)
    ) {
      setSelectedBarberServiceId(nextService.barberServiceId ?? '');
    }
  }, [pricing, selectedBarberId, selectedBarberServiceId]);

  useEffect(() => {
    setAvailability(null);

    if (!session || !selectedBarberId || !selectedBarberServiceId) {
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

        const hasSelectedSlot = result.slots.some((slot) => slot.startAt === selectedStartAt);
        const hasInitialSlot = initialStartAt
          ? result.slots.some((slot) => slot.startAt === initialStartAt)
          : false;

        if (initialStartAt && hasInitialSlot) {
          setSelectedStartAt(initialStartAt);
          return;
        }

        if (selectedStartAt && !hasSelectedSlot) {
          setSelectedStartAt('');
        }
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Slobodni termini nisu mogli da se ucitaju.');
      });
  }, [bookingDate, initialStartAt, selectedBarberId, selectedBarberServiceId, selectedStartAt, session]);

  const serviceOptions = pricing.filter(
    (item) => item.barberId === selectedBarberId && item.isActive && item.barberServiceId,
  );

  const selectedService =
    serviceOptions.find((item) => item.barberServiceId === selectedBarberServiceId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    if (!selectedBarberId || !selectedBarberServiceId || !selectedStartAt) {
      setError('Izaberi barbera, uslugu i slobodan termin.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createAdminAppointment(session.accessToken, {
        customerPhoneNumber,
        customerFirstName,
        customerLastName: customerLastName || undefined,
        barberId: selectedBarberId,
        barberServiceId: selectedBarberServiceId,
        startAt: selectedStartAt,
      });

      setSuccess(
        `Termin je dodat: ${created.barberName} - ${created.serviceName} u ${formatTimeLabel(created.startAt)}.`,
      );
      pushFeedback({
        tone: 'success',
        title: 'Termin je sacuvan',
        description: `${created.barberName} - ${created.serviceName} u ${formatTimeLabel(created.startAt)}.`,
      });
      setCustomerPhoneNumber('');
      setCustomerFirstName('');
      setCustomerLastName('');
      setSelectedStartAt('');
      onCreated?.();
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Rucni termin nije mogao da se sacuva.';
      setError(message);
      pushFeedback({
        tone: 'danger',
        title: 'Manual booking nije uspeo',
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="form-card">
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            {subtitle}
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="split">
          <div className="field">
            <label>Barber</label>
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
            <label>Datum</label>
            <input
              className="control"
              type="date"
              value={bookingDate}
              onChange={(event) => setBookingDate(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Usluga</label>
          <select
            className="control"
            value={selectedBarberServiceId}
            onChange={(event) => setSelectedBarberServiceId(event.target.value)}
          >
            <option value="">Izaberi uslugu</option>
            {serviceOptions.map((item) => (
              <option key={item.barberServiceId ?? `${item.barberId}-${item.serviceId}`} value={item.barberServiceId ?? ''}>
                {item.serviceName} - {item.priceAmount} {item.currency}
                {item.durationOverrideMinutes ? ` - ${item.durationOverrideMinutes} min` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedService ? (
          <div className="helper-item">
            <strong>{selectedService.serviceName}</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              Cena {selectedService.priceAmount} {selectedService.currency}
              {selectedService.durationOverrideMinutes
                ? ` - override ${selectedService.durationOverrideMinutes} min`
                : ''}
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
                  {availability.message ?? 'Za izabrani datum nema validnih slotova.'}
                </div>
              </div>
            )
          ) : (
            <div className="muted">Izaberi barbera i uslugu da bi video slobodne slotove.</div>
          )}
        </div>

        <div className="split">
          <div className="field">
            <label>Ime klijenta</label>
            <input
              className="control"
              value={customerFirstName}
              onChange={(event) => setCustomerFirstName(event.target.value)}
            />
          </div>
          <div className="field">
            <label>Prezime klijenta</label>
            <input
              className="control"
              value={customerLastName}
              onChange={(event) => setCustomerLastName(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Telefon</label>
          <input
            className="control"
            value={customerPhoneNumber}
            onChange={(event) => setCustomerPhoneNumber(event.target.value)}
            placeholder="+3816..."
          />
        </div>

        {error ? <div className="badge" data-tone="danger">{error}</div> : null}
        {success ? <div className="badge" data-tone="success">{success}</div> : null}

        <div className="toolbar-row">
          <button type="submit" className="control-button" data-variant="primary" disabled={saving}>
            {saving ? 'Cuvanje...' : 'Dodaj termin'}
          </button>
          {selectedStartAt ? (
            <span className="badge" data-tone="neutral">
              Izabran slot {formatTimeLabel(selectedStartAt)}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
