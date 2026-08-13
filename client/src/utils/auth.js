// ─────────────────────────────────────────────────────────
//  CodeLens — Client-side auth session storage
//  Stores the session token issued by our own backend after
//  it verifies a Google Sign-In credential.
// ─────────────────────────────────────────────────────────

const AUTH_KEY = 'codelens_auth';
const AUTH_EVENT = 'codelens_auth_changed';
const API_BASE =
    import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

// PATCH /api/users/me — updates the display name. The backend re-issues a
// session token with the new name baked in (the old token still carries
// the stale one), so we save that fresh token here too — this is what
// makes the new name show up immediately everywhere, not just after the
// old token eventually expires.
export async function updateDisplayName(name) {
    const auth = getAuth();
    if (!auth ? .token) throw new Error('Not signed in');

    const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not update your name');

    saveAuth(data.token, data.user);
    return data.user;
}

// DELETE /api/users/me — permanently deletes the account server-side, then
// clears the local session so the UI reflects being signed out right away.
// There's nothing left on the backend to sign back into afterward.
export async function deleteAccount() {
    const auth = getAuth();
    if (!auth ? .token) throw new Error('Not signed in');

    const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not delete your account');
    }

    clearAuth();
}