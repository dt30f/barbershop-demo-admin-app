'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/auth-provider';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, router, session]);

  return (
    <div className="login-shell">
      <div className="login-grid">
        <section className="login-hero panel">
          <p className="brand-kicker">Admin MVP</p>
          <h1 className="page-title">Web panel za salon operacije</h1>
          <p className="page-subtitle">
            Ovo je prvi slice admin aplikacije: login, dnevni kalendar, appointments tabela i
            spreman shell za dalje CRUD ekrane.
          </p>

          <ul className="helper-list">
            <li className="helper-item">
              Demo admin: <strong>admin@downtownbarber.rs</strong> / <strong>Admin123!</strong>
            </li>
            <li className="helper-item">
              Demo barber: <strong>nikola@downtownbarber.rs</strong> / <strong>Barber123!</strong>
            </li>
            <li className="helper-item">
              Frontend radi protiv postojećeg Nest backend-a na <strong>localhost:3000</strong>.
            </li>
          </ul>
        </section>

        <section className="login-card form-card">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Prijava</h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                MVP staff login preko postojećeg backend auth modula.
              </p>
            </div>
          </div>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
