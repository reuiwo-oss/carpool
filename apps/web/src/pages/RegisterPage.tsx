import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role } from '@carpool/shared';
import { useAuth } from '../features/auth/AuthContext';
import { ArmchairIcon, CarIcon } from '../components/icons';
import { BackButton, Corners, PrimaryButton } from '../components/ui';

const ROLE_OPTIONS: { role: Role; title: string; body: string; icon: React.ReactNode }[] = [
  {
    role: 'PASSENGER',
    title: 'Jestem pasażerem',
    body: 'Dołączam do przejazdów i wybieram miejsce w aucie.',
    icon: <ArmchairIcon size={28} />,
  },
  {
    role: 'DRIVER',
    title: 'Jestem kierowcą',
    body: 'Oferuję miejsca w swoim aucie i widzę, kto jedzie.',
    icon: <CarIcon size={28} />,
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'PASSENGER' as Role });
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

      <div style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '26px 0 10px' }} id="role-caption">
        Jak chcesz podróżować? <span style={{ color: 'var(--color-neutral-500)' }}>To ustawia cały interfejs.</span>
      </div>

      {/* Semantyka radia, nie przycisków — wybór jest jeden i zmienia cały interfejs. */}
      <div role="radiogroup" aria-labelledby="role-caption"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '0 6px' }}>
        {ROLE_OPTIONS.map((opt) => {
          const selected = form.role === opt.role;
          return (
            <button
              key={opt.role}
              type="button"
              role="radio"
              aria-checked={selected}
              className="blueprint"
              onClick={() => setForm({ ...form, role: opt.role })}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 150,
                fontFamily: 'var(--font-body)',
                background: selected ? 'var(--color-accent)' : 'transparent',
                color: selected ? 'var(--color-bg)' : 'var(--color-text)',
                borderColor: selected ? 'var(--color-accent)' : 'var(--color-divider)',
              }}
            >
              <Corners />
              {opt.icon}
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{opt.body}</div>
              </div>
            </button>
          );
        })}
      </div>

      <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 28 }}>
        {form.role === 'DRIVER' ? 'Załóż konto kierowcy' : 'Załóż konto pasażera'}
      </PrimaryButton>

      {error && (
        <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}
    </form>
  );
}
