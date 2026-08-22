import { Link } from 'react-router-dom';

export function Logo({ large = false }) {
  return (
    <Link to="/" className={`tm-logo ${large ? 'tm-logo-large' : ''}`}>
      <img src="/logo-tumarana.jpeg" alt="TuMaraña.com — Conectamos necesidades con habilidades" className="tm-logo-img" />
    </Link>
  );
}
