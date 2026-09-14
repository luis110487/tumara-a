import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="loading">Cargando…</p>;
  // Guardamos a dónde iba para devolverlo ahí después de iniciar sesión.
  if (!session) return <Navigate to="/cuenta" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
