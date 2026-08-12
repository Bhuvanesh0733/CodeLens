import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saveAuth, getAuth } from '../utils/auth';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  // Already signed in? No need to show the login page again.
  useEffect(() => {
    if (getAuth()) navigate('/', { replace: true });
  }, [navigate]);

  // Load Google's Identity Services script once, on demand (not in
  // index.html) so it only loads for people who actually visit /login.
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('Could not load Google Sign-In. Check your connection and try again.');
    document.head.appendChild(script);
    return () => {
      // leave the script cached — no need to remove it on unmount
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sign-in failed');
      }

      saveAuth(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong signing in.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      width: 300,
      text: 'continue_with',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  return (
    <div className="login-page page-wrapper">
      <div className="login-card reveal">
        <span className="section-label">CODELENS · SIGN IN</span>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">
          Sign in with Google to continue — this covers both sign-in and sign-up, there's nothing separate to fill out.
        </p>

        <div className="login-google-wrap">
          {!GOOGLE_CLIENT_ID && (
            <div className="login-error">
              Google Sign-In isn't configured yet. Add <code>VITE_GOOGLE_CLIENT_ID</code> to the client environment.
            </div>
          )}
          {GOOGLE_CLIENT_ID && !scriptReady && !error && (
            <div className="login-loading">
              <span className="studio-btn__spinner" />
              Loading Google Sign-In…
            </div>
          )}
          {isLoading && (
            <div className="login-loading">
              <span className="studio-btn__spinner" />
              Signing you in…
            </div>
          )}
          <div ref={buttonRef} className="login-google-btn" style={{ display: isLoading ? 'none' : 'block' }} />
        </div>

        {error && <div className="login-error">{error}</div>}

        <Link to="/" className="login-back">← Back to CodeLens</Link>
      </div>
    </div>
  );
}