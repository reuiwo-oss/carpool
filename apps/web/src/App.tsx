import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './features/auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import CommunityPage from './pages/CommunityPage';
import MinePage from './pages/MinePage';
import RideDetailPage from './pages/RideDetailPage';
import CreateRidePage from './pages/CreateRidePage';
import Layout from './pages/Layout';

/** Trasa dostępna tylko po zalogowaniu; opcjonalnie tylko dla danej roli */
function Protected({ children, role }: { children: JSX.Element; role?: 'DRIVER' | 'PASSENGER' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Protected><SearchPage /></Protected>} />
        <Route path="/community" element={<Protected><CommunityPage /></Protected>} />
        <Route path="/mine" element={<Protected><MinePage /></Protected>} />
        <Route path="/rides/new" element={<Protected role="DRIVER"><CreateRidePage /></Protected>} />
        <Route path="/rides/:id" element={<Protected><RideDetailPage /></Protected>} />
      </Route>
    </Routes>
  );
}
