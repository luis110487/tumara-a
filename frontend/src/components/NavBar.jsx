import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function NavBar() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="nav">
      <Logo />
      <nav>
        <Link to="/">Inicio</Link>
        <Link to="/buscar">Categorías</Link>
        <Link to="/buscar">Profesionales</Link>
        <Link to="/mis-solicitudes">Solicitudes</Link>
        <a href="/#como-funciona">Cómo funciona</a>
      </nav>
      <div className="nav-actions">
        {session && <Link to="/mis-solicitudes" className="nav-messages">💬 Mensajes</Link>}
        {session ? (
          <button className="btn outline" type="button" onClick={handleLogout}>Cerrar sesión</button>
        ) : (
          <>
            <Link className="btn outline" to="/cuenta">Iniciar sesión</Link>
            <Link className="btn primary" to="/cuenta">Regístrate</Link>
          </>
        )}
      </div>
    </header>
  );
}
