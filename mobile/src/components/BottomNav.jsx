import { NavLink } from 'react-router-dom';
import { useLayoutEffect, useRef } from 'react';
import { AppIcon } from './AppIcon';

export function BottomNav() {
  const navRef = useRef(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (navRef.current) document.documentElement.style.setProperty('--tm-bottom-nav-height', `${navRef.current.getBoundingClientRect().height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navRef.current);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--tm-bottom-nav-height'); };
  }, []);
  return <nav ref={navRef} className="mobile-bottom-nav" aria-label="Navegación principal">
    {[
      ['/', 'home', 'Inicio'], ['/categorias', 'grid', 'Categorías'],
      ['/favoritos', 'heart', 'Favoritos'], ['/mis-solicitudes', 'chat', 'Mensajes'], ['/mi-perfil', 'user', 'Perfil'],
    ].map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'}>
      {({ isActive }) => <><AppIcon name={icon} size={22} filled={isActive && icon === 'home'} /><span>{label}</span></>}
    </NavLink>)}
  </nav>;
}
