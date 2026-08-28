import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function NavBar() {
  const { session, signOut, isAdmin, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="nav">
      <Logo />
      <nav className={menuOpen ? 'open' : ''}>
        <Link to="/" onClick={closeMenu}>Inicio</Link>
        <Link to="/buscar" onClick={closeMenu}>Categorías</Link>
        <Link to="/buscar" onClick={closeMenu}>Profesionales</Link>
        {session && <Link to="/mis-solicitudes" onClick={closeMenu}>Solicitudes</Link>}
        {session && <Link to="/mi-perfil" onClick={closeMenu}>Mi perfil</Link>}
        {role === 'professional' && <Link to="/mi-perfil-profesional" onClick={closeMenu}>Mi perfil profesional</Link>}
        <a href="/#como-funciona" onClick={closeMenu}>Cómo funciona</a>
        {isAdmin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
        <div className="nav-mobile-actions">
          {session && <Link to="/mis-solicitudes" className="nav-messages" onClick={closeMenu}>💬 Mensajes</Link>}
          {session ? (
            <button className="btn outline" type="button" onClick={handleLogout}>Cerrar sesión</button>
          ) : (
            <>
              <Link className="btn outline" to="/cuenta" onClick={closeMenu}>Iniciar sesión</Link>
              <Link className="btn primary" to="/cuenta" onClick={closeMenu}>Regístrate</Link>
            </>
          )}
        </div>
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
      <button
        className={`nav-burger ${menuOpen ? 'open' : ''}`}
        type="button"
        aria-label="Abrir menú"
        onClick={() => setMenuOpen(o => !o)}
      >
        <span /><span /><span />
      </button>
      {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}
    </header>
  );
}
