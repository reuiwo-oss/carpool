import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await login(email, password);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main>
      <h1>Zaloguj się</h1>
      <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p>{error}</p>}
      <button onClick={submit}>Zaloguj się</button>
      <p>Nie masz konta? <Link to="/register">Załóż konto</Link></p>
    </main>
  );
}
