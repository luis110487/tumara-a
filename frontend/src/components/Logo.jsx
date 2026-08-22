import { Link } from 'react-router-dom';

export function Logo({ withTagline = false }) {
  return (
    <Link to="/" className="tm-logo">
      <img src="/icon-tumarana.png" alt="" className="tm-logo-icon" />
      <span className="tm-logo-text">
        <span className="tm-logo-word">
          <b className="tm-logo-tu">Tu</b>
          <b className="tm-logo-marana">Maraña</b>
          <span className="tm-logo-com">.com</span>
        </span>
        {withTagline && <small className="tm-logo-tagline">Conectamos necesidades con habilidades</small>}
      </span>
    </Link>
  );
}
