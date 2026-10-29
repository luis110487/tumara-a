import { Outlet, useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

export function Layout() {
  const { pathname } = useLocation();
  if (pathname === '/cuenta' || pathname === '/restablecer-contrasena') {
    return <main className="auth-layout"><Outlet /></main>;
  }
  if (pathname === '/categorias') return <div className="mobile-app-shell categories-app-shell"><main><Outlet /></main></div>;
  if (pathname === '/mis-servicios' || /^\/servicio\/[^/]+$/.test(pathname)) return <div className="mobile-app-shell service-app-shell"><main><Outlet /></main></div>;
  const home = ['/', '/favoritos', '/categorias', '/mi-perfil', '/mis-solicitudes'].includes(pathname);
  if (pathname === '/mi-perfil-profesional') return <div className="mobile-app-shell own-pro-shell"><main><Outlet /></main></div>;
  if (pathname === '/registrar') return <div className="mobile-app-shell pro-signup-shell"><main><Outlet /></main></div>;
  if (/^\/solicitud\/[^/]+\/chat$/.test(pathname)) return <div className="mobile-app-shell chat-app-shell"><main><Outlet /></main></div>;
  if (/^\/solicitar\/[^/]+$/.test(pathname)) return <div className="mobile-app-shell request-app-shell"><main><Outlet /></main></div>;
  if (/^\/profesional\/[^/]+$/.test(pathname)) return <div className="mobile-app-shell pro-app-shell"><main><Outlet /></main></div>;
  if (pathname === '/buscar') return <div className="mobile-app-shell results-app-shell"><main><Outlet /></main></div>;
  const tabs = ['/', '/buscar', '/categorias', '/favoritos', '/mis-solicitudes', '/mi-perfil'].includes(pathname);
  if (home) return <div className="mobile-app-shell"><main><Outlet /></main><BottomNav /></div>;
  return (
    <>
      <NavBar />
      <main className={tabs ? 'mobile-tab-content' : undefined}>
        <Outlet />
      </main>
      {tabs ? <BottomNav /> : <Footer />}
    </>
  );
}
