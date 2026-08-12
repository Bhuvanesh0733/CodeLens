// ─────────────────────────────────────────────────────────
//  CodeLens — Client-side auth session storage
//  Stores the session token issued by our own backend after
//  it verifies a Google Sign-In credential.
// ─────────────────────────────────────────────────────────

const AUTH_KEY = 'codelens_auth';
const AUTH_EVENT = 'codelens_auth_changed';

export function saveAuth(token, user) {
    try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user, timestamp: Date.now() }));
        window.dispatchEvent(new Event(AUTH_EVENT));
    } catch (_) {}
}

export function getAuth() {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

export function clearAuth() {
    try {
        localStorage.removeItem(AUTH_KEY);
        window.dispatchEvent(new Event(AUTH_EVENT));
    } catch (_) {}
}

// Nav is mounted once and persists across route changes (it's outside
// <Routes>), so it needs to be told explicitly when auth state changes
// elsewhere (e.g. right after the Login page saves a new session) — a
// plain useEffect-on-mount wouldn't catch that. Subscribe with this.
export function onAuthChange(callback) {
    window.addEventListener(AUTH_EVENT, callback);
    return () => window.removeEventListener(AUTH_EVENT, callback);
}