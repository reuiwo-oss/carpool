import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ArmchairIcon, CarIcon } from '../components/icons';
import { BackButton, Corners, PrimaryButton } from '../components/ui';

/**
 * Rejestracja bez wyboru roli. Kierowcą jest ten, kto zgłosi auto do wycieczki,
 * pasażerem ten, kto zajmie fotel — i jedno nie wyklucza drugiego, więc
 * pytanie „kim jesteś?" straciło sens.
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="screen" onSubmit={submit} style={{ padding: '16px 24px 40px', overflow: 'auto' }}>
      <div style={{ alignSelf: 'flex-start', marginLeft: -8 }}>
        <BackButton label="Logowanie" onClick={() => navigate('/login')} />
      </div>

      <h1 style={{ fontSize: 34, margin: '12px 0 22px' }}>Załóż konto</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label htmlFor="reg-name">Imię</label>
          <input id="reg-name" className="input" autoComplete="given-name"
            placeholder="Jak mamy się do ciebie zwracać?"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="reg-email">E-mail</label>
          <input id="reg-email" className="input" type="email" autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="reg-password">Hasło (min. 8 znaków)</label>
          <input id="reg-password" className="input" type="password" autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      </div>

      {/*
        Zamiast wyboru roli — informacja, że wyboru nie ma. Ekran zostaje
        na tyle pełny, że nie wygląda na okrojony formularz.
      */}
      <div className="blueprint" style={{
        margin: '26px 6px 0', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.1 }}>
          Jedno konto, obie strony
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <CarIcon size={24} />
          <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
            Zgłoś auto do wycieczki, a będziesz w niej kierowcą.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <ArmchairIcon size={24} />
          <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
            Zajmij fotel w cudzym aucie, a będziesz pasażerem. W następnej wycieczce może być odwrotnie.
          </div>
        </div>
      </div>

      <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 24 }}>
        Załóż konto
      </PrimaryButton>

      {error && (
        <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}
    </form>
  );
}
