'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  fetchSalonSettings,
  fetchWorkingHours,
  replaceWorkingHours,
  updateSalonSettings,
} from '@/lib/api';
import { SalonAdminSettings, WorkingHoursAdminItem } from '@/lib/types';

import { useAuth } from './auth-provider';

const dayLabels: Record<number, string> = {
  1: 'Ponedeljak',
  2: 'Utorak',
  3: 'Sreda',
  4: 'Cetvrtak',
  5: 'Petak',
  6: 'Subota',
  7: 'Nedelja',
};

function isInvalidWorkingHours(item: WorkingHoursAdminItem): boolean {
  if (!item.isActive) {
    return false;
  }

  return item.startTimeLocal >= item.endTimeLocal;
}

export function SettingsManager() {
  const { session } = useAuth();
  const [salon, setSalon] = useState<SalonAdminSettings | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHoursAdminItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingSalon, setSavingSalon] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([
      fetchSalonSettings(session.accessToken),
      fetchWorkingHours(session.accessToken),
    ])
      .then(([salonSettings, workingHoursItems]) => {
        setSalon(salonSettings);
        setWorkingHours(workingHoursItems);
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Settings nisu mogle da se ucitaju.');
      });
  }, [session]);

  const invalidDays = useMemo(
    () => workingHours.filter(isInvalidWorkingHours).map((item) => dayLabels[item.dayOfWeek]),
    [workingHours],
  );

  async function handleSalonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !salon) {
      return;
    }

    if (!salon.name.trim() || !salon.phone.trim() || !salon.address.trim()) {
      setError('Naziv, telefon i adresa salona su obavezni.');
      return;
    }

    setSavingSalon(true);
    setError(null);
    setSuccess(null);

    try {
      const nextSalon = await updateSalonSettings(session.accessToken, salon);
      setSalon(nextSalon);
      setSuccess('Salon settings su sacuvane.');
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Salon settings nisu mogle da se sacuvaju.',
      );
    } finally {
      setSavingSalon(false);
    }
  }

  async function saveWorkingHours() {
    if (!session) {
      return;
    }

    if (invalidDays.length > 0) {
      setError(`Ispravi radno vreme za: ${invalidDays.join(', ')}.`);
      return;
    }

    setSavingHours(true);
    setError(null);
    setSuccess(null);

    try {
      const nextHours = await replaceWorkingHours(session.accessToken, workingHours);
      setWorkingHours(nextHours);
      setSuccess('Working hours su sacuvani.');
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Working hours nisu mogle da se sacuvaju.',
      );
    } finally {
      setSavingHours(false);
    }
  }

  return (
    <div className="stack">
      {salon ? (
        <section className="metrics-grid">
          <article className="metric-card">
            <p className="metric-label">Brand</p>
            <p className="metric-value">{salon.brandName || salon.name}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Valuta</p>
            <p className="metric-value">{salon.currency}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Slot granularity</p>
            <p className="metric-value">{salon.slotGranularityMinutes} min</p>
          </article>
        </section>
      ) : null}

      {error ? <div className="badge" data-tone="danger">{error}</div> : null}
      {success ? <div className="badge" data-tone="success">{success}</div> : null}

      <div className="split">
        <section className="form-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '2.3rem' }}>Salon settings</h1>
              <p className="page-subtitle">
                White-label i operativna podesavanja za jedan salon deployment.
              </p>
            </div>
          </div>

          {salon ? (
            <form className="form-grid" onSubmit={handleSalonSubmit}>
              <div className="field">
                <label>Name</label>
                <input
                  className="control"
                  value={salon.name}
                  onChange={(event) =>
                    setSalon((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="split">
                <div className="field">
                  <label>Slug</label>
                  <input
                    className="control"
                    value={salon.slug}
                    onChange={(event) =>
                      setSalon((current) =>
                        current ? { ...current, slug: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>Brand name</label>
                  <input
                    className="control"
                    value={salon.brandName ?? ''}
                    onChange={(event) =>
                      setSalon((current) =>
                        current ? { ...current, brandName: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>
              <div className="split">
                <div className="field">
                  <label>Phone</label>
                  <input
                    className="control"
                    value={salon.phone}
                    onChange={(event) =>
                      setSalon((current) =>
                        current ? { ...current, phone: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>Currency</label>
                  <input
                    className="control"
                    value={salon.currency}
                    onChange={(event) =>
                      setSalon((current) =>
                        current
                          ? { ...current, currency: event.target.value.toUpperCase() }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>Address</label>
                <input
                  className="control"
                  value={salon.address}
                  onChange={(event) =>
                    setSalon((current) =>
                      current ? { ...current, address: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="split">
                <div className="field">
                  <label>Timezone</label>
                  <input
                    className="control"
                    value={salon.timezone}
                    onChange={(event) =>
                      setSalon((current) =>
                        current ? { ...current, timezone: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>Slot granularity</label>
                  <select
                    className="control"
                    value={salon.slotGranularityMinutes}
                    onChange={(event) =>
                      setSalon((current) =>
                        current
                          ? {
                              ...current,
                              slotGranularityMinutes: Number(event.target.value),
                            }
                          : current,
                      )
                    }
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </div>
              </div>
              <label
                className="helper-item"
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={salon.isActive}
                  onChange={(event) =>
                    setSalon((current) =>
                      current ? { ...current, isActive: event.target.checked } : current,
                    )
                  }
                />
                Salon je aktivan
              </label>

              <button
                type="submit"
                className="control-button"
                data-variant="primary"
                disabled={savingSalon}
              >
                {savingSalon ? 'Cuvanje...' : 'Sacuvaj salon settings'}
              </button>
            </form>
          ) : null}
        </section>

        <section className="table-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Working hours</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Opste radno vreme salona koje availability engine koristi kao bazu.
              </p>
            </div>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={saveWorkingHours}
              disabled={savingHours || invalidDays.length > 0}
            >
              {savingHours ? 'Cuvanje...' : 'Sacuvaj working hours'}
            </button>
          </div>

          {invalidDays.length > 0 ? (
            <div className="helper-item" style={{ marginBottom: 18 }}>
              <strong>Neispravno radno vreme</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                Aktivni dan mora imati `start` pre `end`. Problematicni dani: {invalidDays.join(', ')}.
              </div>
            </div>
          ) : null}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dan</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Aktivan</th>
                </tr>
              </thead>
              <tbody>
                {workingHours.map((item) => (
                  <tr key={item.dayOfWeek}>
                    <td>{dayLabels[item.dayOfWeek]}</td>
                    <td>
                      <input
                        className="control"
                        type="time"
                        value={item.startTimeLocal.slice(0, 5)}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((currentItem) =>
                              currentItem.dayOfWeek === item.dayOfWeek
                                ? {
                                    ...currentItem,
                                    startTimeLocal: `${event.target.value}:00`,
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
                        type="time"
                        value={item.endTimeLocal.slice(0, 5)}
                        onChange={(event) =>
                          setWorkingHours((current) =>
                            current.map((currentItem) =>
                              currentItem.dayOfWeek === item.dayOfWeek
                                ? {
                                    ...currentItem,
                                    endTimeLocal: `${event.target.value}:00`,
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
                          setWorkingHours((current) =>
                            current.map((currentItem) =>
                              currentItem.dayOfWeek === item.dayOfWeek
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
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
