import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './features/auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TripsListPage from './pages/TripsListPage';
import TripDetailPage from './pages/TripDetailPage';
import CreateTripPage from './pages/CreateTripPage';
import MyTripsPage from './pages/MyTripsPage';
import VehiclesPage from './pages/VehiclesPage';
import RideRequestsPage from './pages/RideRequestsPage';
import CreateRideRequestPage from './pages/CreateRideRequestPage';
import CommunityPage from './pages/CommunityPage';
import MessagesPage from './pages/MessagesPage';
import ThreadPage from './pages/ThreadPage';
import Layout from './pages/Layout';

/**
 * Trasa dostępna po zalogowaniu. Bez wariantu „tylko dla roli" — rola nie jest
 * cechą konta, tylko wynikiem udziału w konkretnej wycieczce.
 */
function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Protected><TripsListPage /></Protected>} />
        <Route path="/community" element={<Protected><CommunityPage /></Protected>} />
        <Route path="/mine" element={<Protected><MyTripsPage /></Protected>} />
        <Route path="/messages" element={<Protected><MessagesPage /></Protected>} />
        <Route path="/messages/:id" element={<Protected><ThreadPage /></Protected>} />
        <Route path="/trips/new" element={<Protected><CreateTripPage /></Protected>} />
        <Route path="/trips/:id" element={<Protected><TripDetailPage /></Protected>} />
        <Route path="/vehicles" element={<Protected><VehiclesPage /></Protected>} />
        <Route path="/requests" element={<Protected><RideRequestsPage /></Protected>} />
        <Route path="/requests/new" element={<Protected><CreateRideRequestPage /></Protected>} />
      </Route>
    </Routes>
  );
}
