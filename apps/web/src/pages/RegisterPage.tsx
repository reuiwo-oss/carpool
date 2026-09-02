import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Role } from '@carpool/shared';
import { useAuth } from '../features/auth/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'PASSENGER' as Role });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await register(form);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main>
      <h1>Załóż konto</h1>
      <input placeholder="Imię" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" placeholder="Hasło (min. 8 znaków)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

      <fieldset>
        <legend>Jak chcesz podróżować?</legend>
        <label>
          <input type="radio" checked={form.role === 'PASSENGER'} onChange={() => setForm({ ...form, role: 'PASSENGER' })} />
          Pasażer — dołączam do przejazdów i wybieram miejsce
        </label>
        <label>
          <input type="radio" checked={form.role === 'DRIVER'} onChange={() => setForm({ ...form, role: 'DRIVER' })} />
          Kierowca — oferuję miejsca w swoim aucie
        </label>
      </fieldset>

      {error && <p>{error}</p>}
      <button onClick={submit}>Załóż konto</button>
      <p>Masz już konto? <Link to="/login">Zaloguj się</Link></p>
    </main>
  );
}
