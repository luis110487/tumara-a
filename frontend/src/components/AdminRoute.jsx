import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute({ children }) {
  const { session, loading, isAdmin, profileLoading } = useAuth();
  if (loading || profileLoading) return <p className="loading">Cargando…</p>;
  if (!session) return <Navigate to="/cuenta" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
