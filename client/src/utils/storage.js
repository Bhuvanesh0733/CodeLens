// ─────────────────────────────────────────────────────────
//  CodeLens — Client-side storage via localStorage
//  Persists across server restarts, no database needed
// ─────────────────────────────────────────────────────────

const STUDIO_KEY = 'codelens_studio';
const HISTORY_KEY = 'codelens_history';
const MAX_HISTORY = 50;

// ── Studio code (cross-page sharing) ────────────────────

export function saveStudioCode(code, language) {
  try {
    localStorage.setItem(STUDIO_KEY, JSON.stringify({ code, language, timestamp: Date.now() }));
  } catch (_) {}
}

export function getStudioCode() {
  try {
    const raw = localStorage.getItem(STUDIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ── History ─────────────────────────────────────────────

export function addHistory(entry) {
  try {
    const history = getHistory();
    history.unshift({
      ...entry,
      id: entry.id || `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: entry.timestamp || Date.now(),
    });
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function getHistoryEntry(id) {
  return getHistory().find(h => h.id === id) || null;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (_) {}
}
