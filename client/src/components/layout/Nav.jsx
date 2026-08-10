import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Nav.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Nav() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [reviewsToday, setReviewsToday] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Subscribe to live stats via SSE
  useEffect(() => {
    let es;
    try {
      es = new EventSource(`${API_BASE}/api/events`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setReviewsToday(data.reviewsToday);
        } catch (_) {}
      };
    } catch (_) {}
    return () => es?.close();
  }, []);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/studio', label: 'Studio' },
    { to: '/review', label: 'AI Review' },
    { to: '/history', label: 'History' },
  ];

  return (
    <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="nav__inner">
        {/* Logo */}
        <Link to="/" className="nav__logo" onClick={() => setMenuOpen(false)}>
          <span className="nav__logo-bracket">&lt;/&gt;</span>
          <span className="nav__logo-text">CodeLens</span>
        </Link>

        {/* Desktop links */}
        <div className="nav__links">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav__link ${location.pathname === to ? 'nav__link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="nav__right">
          {reviewsToday !== null && (
            <div className="nav__stat">
              <span className="pulse-dot" style={{ width: 5, height: 5 }} />
              <span className="nav__stat-text">{reviewsToday} today</span>
            </div>
          )}
          <Link to="/review" className="btn btn-primary btn-sm nav__cta">
            Launch
          </Link>
          <button
            className={`nav__hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav__mobile">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="nav__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
