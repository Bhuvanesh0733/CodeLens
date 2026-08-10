import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './History.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TYPE_LABELS = {
  review: 'AI Review',
  execute: 'Run',
  visualize: 'Visualize',
};

function ScoreBadge({ score }) {
  const cls = score >= 70 ? 'score--good' : score >= 40 ? 'score--mid' : 'score--low';
  return <span className={`history-score ${cls}`}>{score}</span>;
}

function StatusBadge({ hasError }) {
  return (
    <span className={`label ${hasError ? 'label-error' : 'label-accent'}`}>
      {hasError ? 'Error' : 'Success'}
    </span>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/history`);
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        setHistory(data.history || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const reviewEntries = history.filter((h) => h.type === 'review' || h.overallScore !== undefined);

  return (
    <div className="history-page page-wrapper">
      <div className="history-inner container">
        {/* Header */}
        <div className="history-header">
          <div className="history-header__left reveal">
            <span className="section-label">03 — HISTORY</span>
            <h1 className="history-title">Review History</h1>
            <p className="history-sub">
              Everything you've run, visualized, or had reviewed by AI.
            </p>
          </div>
          <div className="history-header__right reveal">
            <Link to="/studio" className="btn btn-primary">
              Open Studio →
            </Link>
          </div>
        </div>

        <div className="line-h reveal" />

        {/* Loading */}
        {loading && (
          <div className="history-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="history-skeleton shimmer" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="history-error reveal">
            <span className="label label-error">Server unreachable</span>
            <p>Could not load history from <code>localhost:3001</code>.</p>
            <p className="history-error__hint">Make sure the CodeLens server is running.</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && history.length === 0 && (
          <div className="history-empty reveal">
            <div className="history-empty__icon">◎</div>
            <h2 className="history-empty__title">No activity yet</h2>
            <p className="history-empty__sub">
              Head to Studio and run, visualize, or review some code. It will appear here.
            </p>
            <Link to="/studio" className="btn btn-ghost">Open Studio →</Link>
          </div>
        )}

        {/* History list */}
        {!loading && history.length > 0 && (
          <div className="history-list reveal">
            <div className="history-list__header">
              <span>ANALYSIS</span>
              <span>TYPE</span>
              <span>RESULT</span>
              <span>TIME</span>
            </div>

            {history.map((item, i) => (
              <Link
                key={item.id}
                to="/studio"
                className="history-item fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="history-item__main">
                  <div className="history-item__name">{item.filename || 'snippet'}</div>
                  <div className="history-item__summary">{item.summary}</div>
                  <div className="history-item__code-preview">
                    {item.code ? item.code.slice(0, 80) : ''}…
                  </div>
                </div>
                <div className="history-item__type">
                  <span className="label label-muted">{TYPE_LABELS[item.type] || 'Review'}</span>
                </div>
                <div className="history-item__issues">
                  {item.type === 'review' || item.overallScore !== undefined ? (
                    <ScoreBadge score={item.overallScore ?? 0} />
                  ) : (
                    <StatusBadge hasError={item.hasError} />
                  )}
                </div>
                <div className="history-item__time">
                  {formatTime(item.timestamp)}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats row */}
        {!loading && history.length > 0 && (
          <div className="history-stats reveal">
            <div className="history-stat">
              <span className="history-stat__val">{history.length}</span>
              <span className="history-stat__label">Total Activity</span>
            </div>
            <div className="history-stat">
              <span className="history-stat__val">
                {reviewEntries.length > 0
                  ? Math.round(reviewEntries.reduce((a, b) => a + (b.overallScore || 0), 0) / reviewEntries.length)
                  : '—'}
              </span>
              <span className="history-stat__label">Avg Review Score</span>
            </div>
            <div className="history-stat">
              <span className="history-stat__val">
                {history.filter((h) => !h.hasError).length}
              </span>
              <span className="history-stat__label">Successful Runs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
