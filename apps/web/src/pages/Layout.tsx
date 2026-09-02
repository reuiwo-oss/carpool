import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import TabBar from '../components/TabBar';

/** Ekrany z paskiem zakładek — szczegóły i publikacja mają zamiast niego „wróć". */
const TAB_ROUTES = ['/', '/community', '/mine'];

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const showTabs = TAB_ROUTES.includes(pathname);

  return (
    <>
      <Outlet />
      {showTabs && user && <TabBar role={user.role} />}
    </>
  );
}
