// In-memory history store (persists while server runs)
const history = [];
const MAX_HISTORY = 50;

function addToHistory(entry) {
  history.unshift(entry); // newest first
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
}

function getHistory() {
  return [...history];
}

function getHistoryEntry(id) {
  return history.find((h) => h.id === id) || null;
}

module.exports = { addToHistory, getHistory, getHistoryEntry };
