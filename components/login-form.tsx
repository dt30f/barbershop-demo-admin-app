'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { useAuth } from './auth-provider';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@downtownbarber.rs');
  const [password, setPassword] = useState('Admin123!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login nije uspeo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="control"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="control"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? <div className="badge" data-tone="danger">{error}</div> : null}

      <button
        type="submit"
        className="control-button"
        data-variant="primary"
        disabled={submitting}
      >
        {submitting ? 'Prijava...' : 'Uloguj se u admin'}
      </button>
    </form>
  );
}
