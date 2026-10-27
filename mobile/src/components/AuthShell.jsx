import { Link } from 'react-router-dom';

export function AuthShell({ children, footer, onExit }) {
  return (
    <section className="mobile-auth" aria-label="Acceso a TuMaraÃ±a">
      <Link to="/" className="auth-home-back" onClick={onExit}>← Volver al inicio</Link>
      <Link to="/" className="auth-brand" aria-label="TuMaraÃ±a, ir al inicio">
        <img src="/brand-logo-transparent.png" alt="TuMaraÃ±a.com. Conectamos necesidades con habilidades" />
      </Link>
      <div className="auth-content">{children}</div>
      {footer && <footer className="auth-footer">{footer}</footer>}
    </section>
  );
}

export function FieldIcon({ kind }) {
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M10 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.8M6 6.2A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5-1M10 10a3 3 0 0 0 4 4" /></>,
  };
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind] || paths.lock}</svg>;
}
