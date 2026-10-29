import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppIcon } from './AppIcon';

export function BottomNav() {
  const navRef = useRef(null);
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    let previous = window.scrollY, distance = 0, direction = 0, frame = 0, focusFrame = 0;
    const editing = () => {
      const element = document.activeElement;
      return element && !element.disabled && !element.readOnly && (element.isContentEditable || element.matches('textarea,input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([type=range]):not([type=color])'));
    };
    const focus = () => { cancelAnimationFrame(focusFrame); focusFrame = requestAnimationFrame(() => { distance = 0; previous = window.scrollY; setHidden(Boolean(editing())); }); };
    focus();
    const update = () => {
      frame = 0;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const current = Math.max(0, Math.min(window.scrollY, max)), delta = current - previous;
      previous = current;
      if (editing()) { distance = 0; setHidden(true); return; }
      if (current < 32 || navRef.current?.contains(document.activeElement)) { distance = 0; setHidden(false); return; }
      if (Math.abs(delta) < 1) return;
      const next = Math.sign(delta);
      if (next !== direction) { direction = next; distance = 0; }
      distance += Math.abs(delta);
      if (distance >= 12) { setHidden(direction > 0); distance = 0; }
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', focus);
    return () => { window.removeEventListener('scroll', scroll); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', focus); cancelAnimationFrame(frame); cancelAnimationFrame(focusFrame); };
  }, [location.pathname, location.search]);
  useEffect(() => { if (navRef.current) navRef.current.inert = hidden; }, [hidden]);
  useLayoutEffect(() => {
    const measure = () => {
      if (navRef.current) document.documentElement.style.setProperty('--tm-bottom-nav-height', `${navRef.current.getBoundingClientRect().height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navRef.current);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--tm-bottom-nav-height'); };
  }, []);
  return <nav ref={navRef} className={`mobile-bottom-nav${hidden ? ' is-scroll-hidden' : ''}`} aria-label="Navegación principal" aria-hidden={hidden || undefined} onFocus={() => setHidden(false)}>
    {[
      ['/', 'home', 'Inicio'], ['/categorias', 'grid', 'Categorías'],
      ['/registrar', 'plus', 'Publicar'], ['/mis-solicitudes', 'chat', 'Mensajes'], ['/mi-perfil', 'user', 'Perfil'],
    ].map(([to, icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => `${isActive ? "active " : ""}${to === "/registrar" ? "nav-publish" : ""}`} end={to === '/'}>
      {({ isActive }) => <><AppIcon name={icon} size={22} filled={isActive && icon === 'home'} /><span>{label}</span></>}
    </NavLink>)}
  </nav>;
}
