import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAuth, clearAuth, onAuthChange, updateDisplayName, deleteAccount } from '../../utils/auth';
import './Nav.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Nav() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [reviewsToday, setReviewsToday] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [auth, setAuth] = useState(() => getAuth());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Nav is mounted once for the whole app and never remounts on route
  // changes, so it needs to be told explicitly when sign-in/sign-out
  // happens elsewhere (e.g. the Login page).
  useEffect(() => {
    return onAuthChange(() => setAuth(getAuth()));
  }, []);

  const handleSignOut = () => {
    clearAuth();
    setUserMenuOpen(false);
  };

  // Reset any half-finished edit/delete state whenever the dropdown
  // closes, so reopening it always starts fresh instead of showing
  // whatever was left over from last time.
  useEffect(() => {
    if (!userMenuOpen) {
      setEditingName(false);
      setNameError('');
      setConfirmDelete(false);
      setDeleteError('');
    }
  }, [userMenuOpen]);

  const startEditName = () => {
    setNameDraft(auth?.user?.name || '');
    setNameError('');
    setEditingName(true);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty');
      return;
    }
    setSavingName(true);
    setNameError('');
    try {
      await updateDisplayName(trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setSavingName(false);
    }
  };

  // Two-step delete: first click just asks for confirmation, second click
  // (with the button now reading "Click again to confirm") actually does
  // it — a full modal felt heavy for this, but a single accidental click
  // shouldn't be able to delete an account.
  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      // deleteAccount() clears the session and fires onAuthChange, which
      // flips `auth` to null and unmounts this whole dropdown — no need
      // to manually close it here.
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  // Close the user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e) => {
      if (!e.target.closest('.nav__user')) setUserMenuOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [userMenuOpen]);

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

          {/* Auth state */}
          {auth?.user ? (
            <div className="nav__user">
              <button className="nav__user-trigger" onClick={() => setUserMenuOpen(v => !v)}>
                {auth.user.picture ? (
                  <img src={auth.user.picture} alt={auth.user.name} className="nav__user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <span className="nav__user-avatar nav__user-avatar--fallback">
                    {(auth.user.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="nav__user-name">{auth.user.name?.split(' ')[0]}</span>
              </button>
              {userMenuOpen && (
                <div className="nav__user-menu">
                  <div className="nav__user-menu-email">{auth.user.email}</div>

                  {editingName ? (
                    <form className="nav__user-name-form" onSubmit={handleSaveName}>
                      <input
                        className="nav__user-name-input"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        maxLength={80}
                        autoFocus
                      />
                      <div className="nav__user-name-actions">
                        <button type="submit" className="nav__user-name-save" disabled={savingName}>
                          {savingName ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="nav__user-name-cancel" onClick={() => setEditingName(false)}>
                          Cancel
                        </button>
                      </div>
                      {nameError && <div className="nav__user-menu-error">{nameError}</div>}
                    </form>
                  ) : (
                    <button className="nav__user-menu-edit-name" onClick={startEditName}>
                      Edit name
                    </button>
                  )}

                  <button className="nav__user-menu-signout" onClick={handleSignOut}>Sign out</button>

                  <button
                    className={`nav__user-menu-delete ${confirmDelete ? 'nav__user-menu-delete--confirm' : ''}`}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : confirmDelete ? 'Click again to confirm' : 'Delete account'}
                  </button>
                  {deleteError && <div className="nav__user-menu-error">{deleteError}</div>}
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm nav__signin">
              Sign In
            </Link>
          )}

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