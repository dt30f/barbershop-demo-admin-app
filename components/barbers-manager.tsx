'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createAdminBarber,
  fetchAdminBarbers,
  updateAdminBarber,
} from '@/lib/api';
import { BarberAdminItem } from '@/lib/types';

import { useAuth } from './auth-provider';

type BarberFormState = {
  firstName: string;
  lastName: string;
  displayName: string;
  level: string;
  bio: string;
  photoUrl: string;
  isActive: boolean;
  displayOrder: number;
};

const emptyForm: BarberFormState = {
  firstName: '',
  lastName: '',
  displayName: '',
  level: '',
  bio: '',
  photoUrl: '',
  isActive: true,
  displayOrder: 0,
};

function mapBarberToForm(barber: BarberAdminItem): BarberFormState {
  return {
    firstName: barber.firstName,
    lastName: barber.lastName,
    displayName: barber.displayName,
    level: barber.level ?? '',
    bio: barber.bio ?? '',
    photoUrl: barber.photoUrl ?? '',
    isActive: barber.isActive,
    displayOrder: barber.displayOrder,
  };
}

export function BarbersManager() {
  const { session } = useAuth();
  const [barbers, setBarbers] = useState<BarberAdminItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BarberFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  useEffect(() => {
    if (!session) {
      return;
    }

    fetchAdminBarbers(session.accessToken)
      .then((items) => {
        setBarbers(items);
        const hasSelection = selectedId
          ? items.some((item) => item.id === selectedId)
          : false;

        if (!hasSelection) {
          setSelectedId(items[0]?.id ?? null);
        }
      })
      .catch((reason: { message?: string }) => {
        setError(reason?.message ?? 'Barberi nisu mogli da se ucitaju.');
      });
  }, [refreshNonce, session]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedBarber = barbers.find((item) => item.id === selectedId);
    if (selectedBarber) {
      setForm(mapBarberToForm(selectedBarber));
    }
  }, [barbers, selectedId]);

  const selectedBarber = barbers.find((item) => item.id === selectedId) ?? null;
  const filteredBarbers = useMemo(
    () =>
      barbers.filter((barber) => {
        if (statusFilter === 'ACTIVE' && !barber.isActive) {
          return false;
        }

        if (statusFilter === 'INACTIVE' && barber.isActive) {
          return false;
        }

        const haystack = [
          barber.displayName,
          barber.firstName,
          barber.lastName,
          barber.level ?? '',
          barber.linkedStaffEmail ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchTerm.trim().toLowerCase());
      }),
    [barbers, searchTerm, statusFilter],
  );

  const activeBarbersCount = barbers.filter((item) => item.isActive).length;
  const linkedStaffCount = barbers.filter((item) => item.linkedStaffEmail).length;

  function selectBarber(barber: BarberAdminItem) {
    setSelectedId(barber.id);
    setForm(mapBarberToForm(barber));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim() || !form.displayName.trim()) {
      setError('First name, last name i display name su obavezni.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedId) {
        const updated = await updateAdminBarber(session.accessToken, selectedId, form);
        setBarbers((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        selectBarber(updated);
        setSuccess(`Sacuvane su izmene za ${updated.displayName}.`);
      } else {
        const created = await createAdminBarber(session.accessToken, form);
        setBarbers((current) =>
          [...current, created].sort(
            (left, right) => left.displayOrder - right.displayOrder,
          ),
        );
        selectBarber(created);
        setSuccess(`Kreiran je barber ${created.displayName}.`);
      }

      setRefreshNonce((current) => current + 1);
    } catch (reason) {
      setError(
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : 'Barber nije mogao da se sacuva.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-label">Ukupno barbera</p>
          <p className="metric-value">{barbers.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Aktivni</p>
          <p className="metric-value">{activeBarbersCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Povezani staff</p>
          <p className="metric-value">{linkedStaffCount}</p>
        </article>
      </section>

      <div className="split">
        <section className="table-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '2.3rem' }}>Barbers</h1>
              <p className="page-subtitle">
                Upravljanje barber profilima, redosledom prikaza i aktivnim statusom.
              </p>
            </div>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={() => {
                setSelectedId(null);
                setForm(emptyForm);
                setError(null);
                setSuccess(null);
              }}
            >
              Novi barber
            </button>
          </div>

          <div className="filter-row" style={{ marginBottom: 18 }}>
            <input
              className="control"
              placeholder="Pretraga po imenu, level-u ili staff email-u"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="control"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
              }
            >
              <option value="ALL">Svi statusi</option>
              <option value="ACTIVE">Samo aktivni</option>
              <option value="INACTIVE">Samo neaktivni</option>
            </select>
          </div>

          <div className="stack">
            {filteredBarbers.map((barber) => (
              <button
                key={barber.id}
                type="button"
                className="helper-item"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  outline:
                    selectedId === barber.id
                      ? '2px solid rgba(183, 121, 43, 0.45)'
                      : 'none',
                }}
                onClick={() => selectBarber(barber)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{barber.displayName}</strong>
                  <span
                    className="badge"
                    data-tone={barber.isActive ? 'success' : 'neutral'}
                  >
                    {barber.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {barber.level || 'No level'} - order {barber.displayOrder}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {barber.activeServicesCount} aktivnih usluga
                  {barber.linkedStaffEmail ? ` - ${barber.linkedStaffEmail}` : ''}
                </div>
              </button>
            ))}

            {filteredBarbers.length === 0 ? (
              <div className="helper-item">
                <strong>Nema rezultata</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Probaj drugi filter ili dodaj novog barbera.
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="form-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>{selectedBarber ? 'Edit barber' : 'Create barber'}</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Osnovni podaci koji se kasnije vide i u mobile aplikaciji.
              </p>
            </div>
          </div>

          {selectedBarber ? (
            <div className="helper-item" style={{ marginBottom: 18 }}>
              <strong>{selectedBarber.displayName}</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                {selectedBarber.linkedStaffEmail || 'Nema povezan staff nalog'}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {selectedBarber.activeServicesCount} aktivnih usluga
              </div>
            </div>
          ) : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="split">
              <div className="field">
                <label>First name</label>
                <input
                  className="control"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  className="control"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Display name</label>
              <input
                className="control"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </div>

            <div className="split">
              <div className="field">
                <label>Level</label>
                <input
                  className="control"
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, level: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Display order</label>
                <input
                  className="control"
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displayOrder: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Photo URL</label>
              <input
                className="control"
                value={form.photoUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, photoUrl: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Bio</label>
              <textarea
                className="control"
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                style={{ minHeight: 120, paddingTop: 12, paddingBottom: 12 }}
              />
            </div>

            <label
              className="helper-item"
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Barber je aktivan
            </label>

            {error ? <div className="badge" data-tone="danger">{error}</div> : null}
            {success ? <div className="badge" data-tone="success">{success}</div> : null}

            <div className="toolbar-row">
              <button
                type="submit"
                className="control-button"
                data-variant="primary"
                disabled={saving}
              >
                {saving ? 'Cuvanje...' : selectedBarber ? 'Sacuvaj izmene' : 'Kreiraj barbera'}
              </button>
              <button
                type="button"
                className="control-button"
                data-variant="ghost"
                onClick={() => {
                  setSelectedId(null);
                  setForm(emptyForm);
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
    </div>
  );
}
