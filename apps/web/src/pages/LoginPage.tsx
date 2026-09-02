import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { CarIcon } from '../components/icons';
import { PrimaryButton } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="screen"
      onSubmit={submit}
      style={{ padding: '28px 24px 40px', overflow: 'auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
        <CarIcon size={26} color="var(--color-accent-700)" />
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, letterSpacing: '.02em' }}>
          CARPOOL
        </span>
      </div>

      <h1 style={{ fontSize: 40, margin: '0 0 6px' }}>Jedziemy razem</h1>
      <p style={{ color: 'var(--color-neutral-700)', margin: '0 0 32px' }}>
        Zaloguj się, żeby znaleźć auto albo zabrać kogoś ze sobą.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="np. kasia@poczta.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Hasło</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 10 }}>
          Zaloguj się
        </PrimaryButton>

        {error && (
          <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14, margin: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 14, color: 'var(--color-neutral-700)' }}>
        Nie masz konta?{' '}
        <Link to="/register" style={{ fontWeight: 500, color: 'var(--color-accent-700)' }}>
          Załóż konto
        </Link>
      </div>
    </form>
  );
}
