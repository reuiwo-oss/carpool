import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #ddd' }}>
        <Link to="/" style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>Carpool</Link>
        {user?.role === 'DRIVER' && <Link to="/rides/new">Nowy przejazd</Link>}
        <span style={{ marginLeft: 'auto' }}>
          {user?.name} ({user?.role === 'DRIVER' ? 'kierowca' : 'pasażer'})
        </span>
        <button onClick={logout}>Wyloguj</button>
      </header>
      <main><Outlet /></main>
    </>
  );
}
