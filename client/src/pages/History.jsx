import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory, saveStudioCode } from '../utils/storage';
import './History.css';

function ScoreBadge({ score }) {
  if (score === undefined || score === null) return null;
  const cls = score >= 70 ? 'score--good' : score >= 40 ? 'score--mid' : 'score--low';
  return <span className={`history-score ${cls}`}>{score}</span>;
}

function TypeIcon({ type }) {
  if (type === 'run') return <span className="history-type-icon history-type-icon--run" title="Code Run">▶</span>;
  if (type === 'review') return <span className="history-type-icon history-type-icon--review" title="AI Review">◈</span>;
  return <span className="history-type-icon">•</span>;
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleClear = () => {
    if (window.confirm('Clear all history? This cannot be undone.')) {
      clearHistory();
      setHistory([]);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

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
            {history.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleClear}>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="line-h reveal" />

        {/* Empty */}
        {history.length === 0 && (
          <div className="history-empty reveal">
            <div className="history-empty__icon">◎</div>
            <h2 className="history-empty__title">No history yet</h2>
            <p className="history-empty__sub">
              Run code in Studio or use AI Review — every action is recorded here automatically.
            </p>
            <Link to="/studio" className="btn btn-ghost">Open Studio →</Link>
          </div>
        )}

        {/* History list */}
        {history.length > 0 && (
          <div className="history-list reveal">
            <div className="history-list__header">
              <span>TYPE</span>
              <span>DETAILS</span>
              <span>SCORE</span>
              <span>STATUS</span>
              <span>TIME</span>
            </div>

            {history.map((item, i) => (
              <div key={item.id} className="history-entry fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div
                  className={`history-item ${expandedId === item.id ? 'history-item--expanded' : ''}`}
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="history-item__type">
                    <TypeIcon type={item.type} />
                  </div>
                  <div className="history-item__main">
                    <div className="history-item__name">
                      {item.filename || 'snippet'}
                      <span className="history-item__lang">{item.language}</span>
                    </div>
                    <div className="history-item__summary">{item.summary || '—'}</div>
                  </div>
                  <div className="history-item__score">
                    {item.type === 'review' ? <ScoreBadge score={item.overallScore} /> : <span className="history-score-na">—</span>}
                  </div>
                  <div className="history-item__status">
                    {item.hasError ? (
                      <span className="label label-error">Error</span>
                    ) : item.type === 'review' ? (
                      <span className="label label-accent">{item.insightCount || 0} issues</span>
                    ) : (
                      <span className="label label-success">OK</span>
                    )}
                  </div>
                  <div className="history-item__time">
                    {formatTime(item.timestamp)}
                  </div>
                </div>

                {/* Expanded code preview */}
                {expandedId === item.id && item.code && (
                  <div className="history-expanded">
                    <div className="history-expanded__header">
                      <span className="section-label">CODE PREVIEW</span>
                      <Link
                        to={item.type === 'review' ? '/review' : '/studio'}
                        state={{ code: item.code, language: item.language }}
                        onClick={() => saveStudioCode(item.code, item.language)}
                        className="btn btn-ghost btn-sm"
                      >
                        Open in {item.type === 'review' ? 'AI Review' : 'Studio'} →
                      </Link>
                    </div>
                    <pre className="history-expanded__code">{item.code}</pre>
                    {item.output && (
                      <>
                        <span className="section-label">OUTPUT</span>
                        <pre className="history-expanded__output">{item.output}</pre>
                      </>
                    )}
                    {item.stderr && (
                      <>
                        <span className="section-label" style={{ color: 'var(--error)' }}>STDERR</span>
                        <pre className="history-expanded__stderr">{item.stderr}</pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        {history.length > 0 && (
          <div className="history-stats reveal">
            <div className="history-stat">
              <span className="history-stat__val">{history.length}</span>
              <span className="history-stat__label">Total Actions</span>
            </div>
            <div className="history-stat">
              <span className="history-stat__val">{history.filter(h => h.type === 'run').length}</span>
              <span className="history-stat__label">Code Runs</span>
            </div>
            <div className="history-stat">
              <span className="history-stat__val">{history.filter(h => h.type === 'review').length}</span>
              <span className="history-stat__label">AI Reviews</span>
            </div>
            <div className="history-stat">
              <span className="history-stat__val">
                {(() => {
                  const reviews = history.filter(h => h.type === 'review' && h.overallScore);
                  return reviews.length ? Math.round(reviews.reduce((a, b) => a + b.overallScore, 0) / reviews.length) : '—';
                })()}
              </span>
              <span className="history-stat__label">Avg Score</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}