import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Logo large />
        <span>© {new Date().getFullYear()} TuMaraña.com</span>
      </div>
      <div className="footer-credit">by <a href="https://techdatasync.com" target="_blank" rel="noopener noreferrer">techdatasync.com</a></div>
    </footer>
  );
}
