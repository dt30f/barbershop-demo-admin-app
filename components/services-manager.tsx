'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createAdminService,
  fetchAdminBarberServices,
  fetchAdminBarbers,
  fetchAdminServices,
  updateAdminService,
  upsertAdminBarberServices,
} from '@/lib/api';
import {
  BarberAdminItem,
  BarberServicePricingItem,
  ServiceAdminItem,
} from '@/lib/types';

import { useAuth } from './auth-provider';

type ServiceFormState = {
  name: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
  displayOrder: number;
};

const emptyServiceForm: ServiceFormState = {
  name: '',
  description: '',
  durationMinutes: 30,
  isActive: true,
  displayOrder: 0,
};

function mapServiceToForm(service: ServiceAdminItem): ServiceFormState {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    isActive: service.isActive,
    displayOrder: service.displayOrder,
  };
}

export function ServicesManager() {
  const { session } = useAuth();
  const [services, setServices] = useState<ServiceAdminItem[]>([]);
  const [barbers, setBarbers] = useState<BarberAdminItem[]>([]);
  const [pricing, setPricing] = useState<BarberServicePricingItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(emptyServiceForm);
  const [focusSelectedService, setFocusSelectedService] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([
      fetchAdminServices(session.accessToken),
      fetchAdminBarbers(session.accessToken),
      fetchAdminBarberServices(session.accessToken),
    ])
      .then(([serviceItems, barberItems, pricingItems]) => {
        setServices(serviceItems);
        setBarbers(barberItems);
        setPricing(pricingItems);

        const hasSelectedService = selectedServiceId
          ? serviceItems.some((item) => item.id === selectedServiceId)
          : false;
        if (!hasSelectedService) {
          setSelectedServiceId(serviceItems[0]?.id ?? null);
        }

        const hasSelectedBarber = selectedBarberId
          ? barberItems.some((item) => item.id === selectedBarberId)
          : false;
        if (!hasSelectedBarber && barberItems[0]) {
          setSelectedBarberId(barberItems[0].id);
        } else if (!barberItems[0]) {
          setSelectedBarberId('');
        }
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Services modul nije mogao da se ucita.');
      });
  }, [refreshNonce, session]);

  useEffect(() => {
    if (!selectedServiceId) {
      if (services[0]) {
        setServiceForm(mapServiceToForm(services[0]));
      } else {
        setServiceForm(emptyServiceForm);
      }
      return;
    }

    const selectedService = services.find((item) => item.id === selectedServiceId);
    if (selectedService) {
      setServiceForm(mapServiceToForm(selectedService));
    }
  }, [selectedServiceId, services]);

  const selectedService = services.find((item) => item.id === selectedServiceId) ?? null;
  const filteredPricing = useMemo(
    () =>
      pricing.filter((item) => {
        if (selectedBarberId && item.barberId !== selectedBarberId) {
          return false;
        }

        if (focusSelectedService && selectedServiceId && item.serviceId !== selectedServiceId) {
          return false;
        }

        return true;
      }),
    [focusSelectedService, pricing, selectedBarberId, selectedServiceId],
  );

  const activeServicesCount = services.filter((item) => item.isActive).length;
  const activePricingCount = pricing.filter((item) => item.isActive).length;
  const selectedBarber =
    barbers.find((item) => item.id === selectedBarberId) ?? null;

  async function handleServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    if (!serviceForm.name.trim() || serviceForm.durationMinutes < 1) {
      setError('Naziv usluge i trajanje vece od 0 su obavezni.');
      return;
    }

    setSavingService(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedServiceId) {
        const updated = await updateAdminService(
          session.accessToken,
          selectedServiceId,
          serviceForm,
        );
        setServices((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedServiceId(updated.id);
        setServiceForm(mapServiceToForm(updated));
        setSuccess(`Sacuvana je usluga ${updated.name}.`);
      } else {
        const created = await createAdminService(session.accessToken, serviceForm);
        setServices((current) =>
          [...current, created].sort(
            (left, right) => left.displayOrder - right.displayOrder,
          ),
        );
        setSelectedServiceId(created.id);
        setServiceForm(mapServiceToForm(created));
        setSuccess(`Kreirana je usluga ${created.name}.`);
      }

      setRefreshNonce((current) => current + 1);
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Service nije mogao da se sacuva.',
      );
    } finally {
      setSavingService(false);
    }
  }

  async function savePricing() {
    if (!session) {
      return;
    }

    if (filteredPricing.some((item) => item.priceAmount < 0)) {
      setError('Cena ne moze biti negativna.');
      return;
    }

    setSavingPricing(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = filteredPricing.map((item) => ({
        barberId: item.barberId,
        serviceId: item.serviceId,
        priceAmount: item.priceAmount,
        currency: item.currency,
        durationOverrideMinutes: item.durationOverrideMinutes ?? null,
        isActive: item.isActive,
      }));

      const nextPricing = await upsertAdminBarberServices(session.accessToken, payload);
      setPricing(nextPricing);
      setSuccess('Pricing matrix je sacuvan.');
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Pricing nije mogao da se sacuva.',
      );
    } finally {
      setSavingPricing(false);
    }
  }

  return (
    <div className="stack">
      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-label">Ukupno usluga</p>
          <p className="metric-value">{services.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Aktivne usluge</p>
          <p className="metric-value">{activeServicesCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Aktivni pricing redovi</p>
          <p className="metric-value">{activePricingCount}</p>
        </article>
      </section>

      <div className="split">
        <section className="table-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '2.3rem' }}>Services</h1>
              <p className="page-subtitle">
                Upravljanje uslugama i njihovim trajanjem za mobile booking flow.
              </p>
            </div>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={() => {
                setSelectedServiceId(null);
                setServiceForm(emptyServiceForm);
                setError(null);
                setSuccess(null);
              }}
            >
              Nova usluga
            </button>
          </div>

          <div className="stack">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                className="helper-item"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  outline:
                    selectedServiceId === service.id
                      ? '2px solid rgba(183, 121, 43, 0.45)'
                      : 'none',
                }}
                onClick={() => {
                  setSelectedServiceId(service.id);
                  setServiceForm(mapServiceToForm(service));
                  setError(null);
                  setSuccess(null);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{service.name}</strong>
                  <span
                    className="badge"
                    data-tone={service.isActive ? 'success' : 'neutral'}
                  >
                    {service.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {service.durationMinutes} min - {service.activeBarbersCount} aktivnih barbera
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="form-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>{selectedService ? 'Edit service' : 'Create service'}</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Jedna usluga je jedan appointment u MVP-u.
              </p>
            </div>
          </div>

          {selectedService ? (
            <div className="helper-item" style={{ marginBottom: 18 }}>
              <strong>{selectedService.name}</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                Osnovno trajanje {selectedService.durationMinutes} min
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Aktivna kod {selectedService.activeBarbersCount} barbera
              </div>
            </div>
          ) : null}

          <form className="form-grid" onSubmit={handleServiceSubmit}>
            <div className="field">
              <label>Name</label>
              <input
                className="control"
                value={serviceForm.name}
                onChange={(event) =>
                  setServiceForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                className="control"
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                style={{ minHeight: 120, paddingTop: 12, paddingBottom: 12 }}
              />
            </div>
            <div className="split">
              <div className="field">
                <label>Duration (minutes)</label>
                <input
                  className="control"
                  type="number"
                  min={1}
                  value={serviceForm.durationMinutes}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>Display order</label>
                <input
                  className="control"
                  type="number"
                  min={0}
                  value={serviceForm.displayOrder}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      displayOrder: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <label
              className="helper-item"
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={serviceForm.isActive}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Service je aktivan
            </label>
            {error ? <div className="badge" data-tone="danger">{error}</div> : null}
            {success ? <div className="badge" data-tone="success">{success}</div> : null}
            <div className="toolbar-row">
              <button
                type="submit"
                className="control-button"
                data-variant="primary"
                disabled={savingService}
              >
                {savingService ? 'Cuvanje...' : selectedService ? 'Sacuvaj uslugu' : 'Kreiraj uslugu'}
              </button>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                onClick={() => {
                  setSelectedServiceId(null);
                  setServiceForm(emptyServiceForm);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="table-card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Pricing matrix</h2>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Cena ide po barber + service kombinaciji, uz opcioni duration override.
            </p>
          </div>
          <div className="page-actions">
            <select
              className="control"
              value={selectedBarberId}
              onChange={(event) => setSelectedBarberId(event.target.value)}
            >
              <option value="">Svi barberi</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.displayName}</option>
              ))}
            </select>
            <label
              className="helper-item"
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={focusSelectedService}
                onChange={(event) => setFocusSelectedService(event.target.checked)}
              />
              Fokus na izabranu uslugu
            </label>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={savePricing}
              disabled={savingPricing}
            >
              {savingPricing ? 'Cuvanje...' : 'Sacuvaj pricing'}
            </button>
          </div>
        </div>

        <div className="helper-item" style={{ marginBottom: 18 }}>
          <strong>
            {selectedBarber ? selectedBarber.displayName : 'Svi barberi'}
          </strong>
          <div className="muted" style={{ marginTop: 6 }}>
            {selectedService && focusSelectedService
              ? `Prikazana je samo usluga ${selectedService.name}.`
              : 'Prikazane su sve usluge za izabrani scope.'}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Barber</th>
                <th>Service</th>
                <th>Cena</th>
                <th>Valuta</th>
                <th>Override</th>
                <th>Aktivno</th>
              </tr>
            </thead>
            <tbody>
              {filteredPricing.map((item) => (
                <tr key={`${item.barberId}-${item.serviceId}`}>
                  <td>{item.barberName}</td>
                  <td>{item.serviceName}</td>
                  <td>
                    <input
                      className="control"
                      type="number"
                      min={0}
                      value={item.priceAmount}
                      onChange={(event) =>
                        setPricing((current) =>
                          current.map((currentItem) =>
                            currentItem.barberId === item.barberId &&
                            currentItem.serviceId === item.serviceId
                              ? {
                                  ...currentItem,
                                  priceAmount: Number(event.target.value),
                                }
                              : currentItem,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="control"
                      value={item.currency}
                      onChange={(event) =>
                        setPricing((current) =>
                          current.map((currentItem) =>
                            currentItem.barberId === item.barberId &&
                            currentItem.serviceId === item.serviceId
                              ? {
                                  ...currentItem,
                                  currency: event.target.value.toUpperCase(),
                                }
                              : currentItem,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="control"
                      type="number"
                      min={1}
                      value={item.durationOverrideMinutes ?? ''}
                      onChange={(event) =>
                        setPricing((current) =>
                          current.map((currentItem) =>
                            currentItem.barberId === item.barberId &&
                            currentItem.serviceId === item.serviceId
                              ? {
                                  ...currentItem,
                                  durationOverrideMinutes: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                }
                              : currentItem,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) =>
                        setPricing((current) =>
                          current.map((currentItem) =>
                            currentItem.barberId === item.barberId &&
                            currentItem.serviceId === item.serviceId
                              ? {
                                  ...currentItem,
                                  isActive: event.target.checked,
                                }
                              : currentItem,
                          ),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}

              {filteredPricing.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="muted">
                      Nema pricing redova za izabrani filter.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
