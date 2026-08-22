import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Logo large />
        <span>© {new Date().getFullYear()} TuMaraña.com</span>
      </div>
      <div className="footer-credit">by techdatasync.com</div>
    </footer>
  );
}
