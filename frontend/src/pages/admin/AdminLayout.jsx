import { NavLink, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <section className="admin-layout">
      <span className="kicker">PANEL ADMIN</span>
      <h1>Administración</h1>
      <nav className="tabs">
        <NavLink to="/admin/profesionales" className={({ isActive }) => (isActive ? 'active' : '')}>Profesionales</NavLink>
        <NavLink to="/admin/categorias" className={({ isActive }) => (isActive ? 'active' : '')}>Categorías</NavLink>
        <NavLink to="/admin/solicitudes" className={({ isActive }) => (isActive ? 'active' : '')}>Solicitudes</NavLink>
        <NavLink to="/admin/usuarios" className={({ isActive }) => (isActive ? 'active' : '')}>Usuarios</NavLink>
        <NavLink to="/admin/banners" className={({ isActive }) => (isActive ? 'active' : '')}>Banners</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
