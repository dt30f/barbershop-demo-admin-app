'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo } from 'react';

import { todayLocalDate } from '@/lib/date';

import { useAuth } from './auth-provider';

const navItems = [
  { href: '/', label: 'Dashboard', hint: 'Pregled', title: 'Operativni dashboard' },
  { href: '/schedule', label: 'Day Calendar', hint: 'Raspored', title: 'Dnevni raspored' },
  { href: '/appointments', label: 'Appointments', hint: 'Tabela', title: 'Termin i recepcija' },
  { href: '/barbers', label: 'Barbers', hint: 'CRUD', title: 'Barber menadzment' },
  { href: '/services', label: 'Services', hint: 'Cene', title: 'Usluge i pricing' },
  { href: '/settings', label: 'Settings', hint: 'Salon', title: 'Salon settings' },
];

function getSessionDisplayName(email: string) {
  return email.split('@')[0] ?? email;
}

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, session, logout } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, router, session]);

  const activeNav =
    navItems.find((item) => pathname === item.href) ??
    navItems.find((item) => pathname.startsWith(item.href) && item.href !== '/') ??
    navItems[0];

  const today = todayLocalDate();
  const sessionName = useMemo(
    () => (session ? getSessionDisplayName(session.staff.email) : ''),
    [session],
  );

  if (loading || !session) {
    return (
      <div className="login-shell">
        <div className="panel shell-loading">
          <div className="badge" data-tone="warm">Admin shell</div>
          <h2 style={{ margin: '12px 0 0' }}>Ucitavanje admin aplikacije...</h2>
          <p className="page-subtitle">
            Pripremamo dashboard, raspored i recepcijske tokove za trenutnu sesiju.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-card">
          <p className="brand-kicker">White-label admin</p>
          <h1 className="brand-title">Downtown Barber</h1>
          <p className="page-subtitle">
            Operativni panel za dnevni raspored, termine i osnovna podesavanja salona.
          </p>
        </div>

        <div className="sidebar-card">
          <div className="muted" style={{ marginBottom: 12 }}>
            Ulogovan korisnik
          </div>
          <div style={{ fontWeight: 700 }}>{sessionName}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {session.staff.email}
          </div>
          <div style={{ marginTop: 10 }}>
            <span className="badge" data-tone={session.staff.role === 'ADMIN' ? 'warm' : 'neutral'}>
              {session.staff.role}
            </span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={isActive}
              >
                <span>{item.label}</span>
                <span className="muted">{item.hint}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="control-button"
            data-variant="ghost"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <section className="shell-topbar">
          <div>
            <div className="badge" data-tone="warm">{activeNav.hint}</div>
            <h2 className="shell-title">{activeNav.title}</h2>
            <p className="shell-subtitle">
              Brzi dnevni ulazi i session pregled za trenutni admin tok.
            </p>
          </div>

          <div className="shell-actions">
            <Link
              href={`/appointments?datePreset=today`}
              className="control-button"
              data-variant="ghost"
            >
              Danasnji termini
            </Link>
            <Link
              href={`/schedule?date=${today}`}
              className="control-button"
              data-variant="ghost"
            >
              Danasnji raspored
            </Link>
            <button
              type="button"
              className="control-button"
              data-variant="primary"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              Logout
            </button>
          </div>
        </section>

        {session.staff.role === 'BARBER' ? (
          <section className="shell-context-card">
            <div className="page-actions" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>Barber session</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  Ovaj nalog ima ogranicen pristup i fokusiran je na sopstveni raspored.
                </div>
              </div>
              <span className="badge" data-tone="neutral">Self schedule mode</span>
            </div>
          </section>
        ) : null}

        {children}
      </main>
    </div>
  );
}
