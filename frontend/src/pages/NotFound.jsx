import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="account">
      <div>
        <span className="kicker">404</span>
        <h1>No encontramos esta página.</h1>
        <p><Link to="/">← Volver al inicio</Link></p>
      </div>
    </section>
  );
}
