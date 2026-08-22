import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="loading">Cargando…</p>;
  if (!session) return <Navigate to="/cuenta" replace />;
  return children;
}
