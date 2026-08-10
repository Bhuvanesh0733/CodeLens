import { useState, useRef, useEffect } from 'react';
import CodeEditor from '../components/editor/CodeEditor';
import './AIReview.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';


const SNIPPET_EXAMPLES = [
  { label: 'var closure bug', tag: 'Bug' },
  { label: 'Bubble sort', tag: 'Algo' },
  { label: 'Async/await', tag: 'Async' },
  { label: 'Array methods', tag: 'Perf' },
];

const PHASE_ORDER = ['parsing', 'analyzing', 'reviewing', 'complete'];
const PHASE_LABELS = {
  parsing:   'Parsing structure…',
  analyzing: 'Detecting patterns…',
  reviewing: 'Generating insights…',
  complete:  'Analysis complete',
};

function SeverityBadge({ severity }) {
  const map = { critical: 'error', high: 'error', medium: 'warning', low: 'info' };
  return <span className={`label label-${map[severity] || 'muted'}`}>{severity}</span>;
}

function TypeBadge({ type }) {
  const map = { bug: 'error', performance: 'info', suggestion: 'accent', warning: 'warning' };
  return <span className={`label label-${map[type] || 'muted'}`}>{type}</span>;
}

function InsightPanel({ insights, onLineClick, activeLine }) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="insights">
      {insights.map((ins, i) => (
        <div
          key={ins.id || i}
          className={`insight ${activeLine === ins.line ? 'insight--active' : ''}`}
          onClick={() => onLineClick?.(ins.line)}
        >
          <div className="insight__header">
            <span className="insight__num">
              {String(i + 1).padStart(2, '0')}
            </span>
            <TypeBadge type={ins.type} />
            <SeverityBadge severity={ins.severity} />
            {ins.line > 0 && (
              <button className="insight__line-ref" onClick={() => onLineClick?.(ins.line)}>
                LINE {ins.line}
              </button>
            )}
          </div>
          <h3 className="insight__title">{ins.title}</h3>
          <p className="insight__msg">{ins.message}</p>
          {ins.fix && (
            <div className="insight__fix">
              <span className="insight__fix-label">FIX</span>
              <p className="insight__fix-text">{ins.fix}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SystemDiagram({ phase }) {
  const nodes = [
    { id: 'browser', label: 'Browser', sub: 'fetch() POST', active: ['parsing', 'analyzing', 'reviewing', 'complete'] },
    { id: 'buffer',  label: 'Buffer',  sub: 'req.on(data)', active: ['parsing', 'analyzing', 'reviewing', 'complete'] },
    { id: 'emitter', label: 'EventEmitter', sub: 'review:started', active: ['analyzing', 'reviewing', 'complete'] },
    { id: 'ai',      label: 'Claude AI', sub: 'stream chunks', active: ['reviewing', 'complete'] },
    { id: 'sse',     label: 'SSE',   sub: 'text/event-stream', active: ['reviewing', 'complete'] },
  ];

  return (
    <div className="sys-diagram">
      <div className="sys-diagram__label section-label">DATA FLOW</div>
      <div className="sys-diagram__nodes">
        {nodes.map((n, i) => (
          <div key={n.id} className={`sys-node ${n.active.includes(phase) ? 'sys-node--active' : ''}`}>
            <div className="sys-node__label">{n.label}</div>
            <div className="sys-node__sub">{n.sub}</div>
            {i < nodes.length - 1 && (
              <div className={`sys-node__arrow ${n.active.includes(phase) ? 'sys-node__arrow--active' : ''}`}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIReview() {
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLine, setActiveLine] = useState(null);
  const [snippetOpen, setSnippetOpen] = useState(false);

  const abortRef = useRef(null);
  const streamRef = useRef(null);

  const highlightedLines = result?.insights?.map(ins => ({
    line: ins.line,
    type: ins.severity === 'critical' || ins.severity === 'high' ? 'error'
          : ins.severity === 'medium' ? 'warning' : 'info',
    message: ins.title,
  })).filter(h => h.line > 0) || [];

  const handleReview = async () => {
    if (!code.trim() || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setPhase('parsing');
    setStreamText('');
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'javascript', filename: 'snippet.js' }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;

          try {
            const evt = JSON.parse(raw);

            if (line.startsWith('event: status') || evt.phase) {
              setPhase(evt.phase);
            } else if (evt.text !== undefined) {
              setStreamText(prev => prev + evt.text);
            } else if (evt.insights) {
              // Full result
              setResult(evt);
              setPhase('complete');
            } else if (evt.message && !evt.insights) {
              // Error
              setError(evt);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError({ message: err.message || 'Connection failed', code: 'NETWORK' });
      setPhase(null);
    } finally {
      setIsLoading(false);
      if (!result) setPhase(prev => prev === 'complete' ? prev : null);
    }
  };

  // jQuery-style snippet loader (demonstrates $.ajax pattern with a fetch polyfill)
  const loadSnippet = (label) => {
    const snippets = {
      'var closure bug': DEFAULT_CODE,
      'Bubble sort': `function bubbleSort(arr) {\n  for (var i = 0; i < arr.length; i++) {\n    for (var j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        var temp = arr[j];\n        arr[j] = arr[j + 1];\n        arr[j + 1] = temp;\n      }\n    }\n  }\n  return arr;\n}`,
      'Async/await': `async function fetchUser(id) {\n  const res = await fetch('/api/users/' + id);\n  const data = await res.json();\n  return data;\n}\n\n// Missing error handling\nfetchUser(1).then(user => console.log(user));`,
      'Array methods': `// Inefficient data processing\nconst data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n// Using a for loop where map/filter would be cleaner\nvar result = [];\nfor (var i = 0; i < data.length; i++) {\n  if (data[i] % 2 === 0) {\n    result.push(data[i] * 2);\n  }\n}\nconsole.log(result);`,
    };
    setCode(snippets[label] || '');
    setSnippetOpen(false);
    setResult(null);
    setStreamText('');
    setPhase(null);
    setError(null);
  };

  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const overallScore = result?.overallScore;

  return (
    <div className="review-page page-wrapper">
      {/* ── TOP BAR ── */}
      <div className="review-topbar">
        <div className="review-topbar__left">
          <h1 className="review-topbar__title">AI Code Review</h1>
          <span className="section-label">Powered by Claude · Streamed via SSE</span>
        </div>
        <div className="review-topbar__right">
          {/* jQuery-style snippet gallery */}
          <div className="snippet-gallery">
            <button
              className="btn btn-ghost btn-sm snippet-gallery__trigger"
              onClick={() => setSnippetOpen(!snippetOpen)}
            >
              Examples ↓
            </button>
            {snippetOpen && (
              <div className="snippet-gallery__dropdown">
                <div className="snippet-gallery__header section-label">EXAMPLE SNIPPETS</div>
                {SNIPPET_EXAMPLES.map(s => (
                  <button key={s.label} className="snippet-item" onClick={() => loadSnippet(s.label)}>
                    <span className={`label label-${s.tag === 'Bug' ? 'error' : s.tag === 'Perf' ? 'warning' : 'muted'}`}>
                      {s.tag}
                    </span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary review-submit-btn"
            onClick={handleReview}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? (
              <>
                <span className="review-spinner" />
                Analyzing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Review Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="review-split">
        {/* Left — editor */}
        <div className="review-editor-panel">
          <div className="review-panel-header">
            <span className="section-label">EDITOR</span>
            <span className="label label-muted">snippet.js</span>
          </div>
          <div className="review-editor-wrap">
            <CodeEditor
              value={code}
              onChange={setCode}
              highlightedLines={highlightedLines}
              activeLine={activeLine}
              height="100%"
            />
          </div>
        </div>

        {/* Right — results */}
        <div className="review-results-panel">
          {/* Score bar */}
          {result && (
            <div className="review-score-bar">
              <div className="review-score-bar__left">
                <span className="section-label">CODE SCORE</span>
                <span className="review-score-num">{overallScore}<span>/100</span></span>
              </div>
              <div className="review-score-track">
                <div
                  className="review-score-fill"
                  style={{
                    width: `${overallScore}%`,
                    background: overallScore >= 70 ? 'var(--accent)' : overallScore >= 40 ? 'var(--warning)' : 'var(--error)',
                  }}
                />
              </div>
              <span className="review-summary">{result.summary}</span>
            </div>
          )}

          {/* Status phases */}
          {isLoading && (
            <div className="review-phases">
              {PHASE_ORDER.slice(0, 3).map((p, i) => (
                <div key={p} className={`review-phase ${i <= phaseIdx ? 'review-phase--done' : ''} ${i === phaseIdx ? 'review-phase--active' : ''}`}>
                  <span className="review-phase__dot" />
                  <span className="review-phase__label">{PHASE_LABELS[p]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Streaming raw text (before result parsed) */}
          {isLoading && streamText && !result && (
            <div className="review-stream-panel">
              <div className="review-stream-label section-label">STREAMING RESPONSE</div>
              <div className="review-stream-text thin-scroll">{streamText}<span className="review-cursor">▊</span></div>
            </div>
          )}

          {/* Full result insights */}
          {result && (
            <div className="review-insights-wrap thin-scroll">
              <div className="review-insights-header">
                <span className="section-label">INSIGHTS</span>
                <div className="review-insight-counts">
                  {['bug','performance','suggestion','warning'].map(type => {
                    const count = result.insights?.filter(i => i.type === type).length || 0;
                    if (!count) return null;
                    return (
                      <span key={type} className={`label label-${type === 'bug' ? 'error' : type === 'performance' ? 'info' : type === 'warning' ? 'warning' : 'accent'}`}>
                        {count} {type}
                      </span>
                    );
                  })}
                </div>
              </div>
              <InsightPanel
                insights={result.insights}
                onLineClick={setActiveLine}
                activeLine={activeLine}
              />
              {result.improvedCode && (
                <div className="review-improved">
                  <div className="review-improved__header">
                    <span className="section-label">IMPROVED CODE</span>
                    <span className="label label-accent">AI fix</span>
                  </div>
                  <div className="review-improved__code">
                    <CodeEditor
                      value={result.improvedCode}
                      readOnly={true}
                      height="320px"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="review-error">
              <div className="review-error__header">
                <span className="label label-error">REVIEW UNAVAILABLE</span>
              </div>
              <p className="review-error__msg">{error.message}</p>
              {error.hint && <p className="review-error__hint">{error.hint}</p>}
              <button className="btn btn-ghost btn-sm" onClick={handleReview}>Try Again</button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !result && !error && (
            <div className="review-empty">
              <div className="review-empty__icon">◈</div>
              <p className="review-empty__title">Nothing to review yet</p>
              <p className="review-empty__sub">Write something interesting. Your first analysis will appear here.</p>
            </div>
          )}
        </div>

        {/* System architecture sidebar */}
        <div className="review-arch-panel">
          <SystemDiagram phase={phase || 'idle'} />

          {result && (
            <div className="review-meta">
              <div className="review-meta__row">
                <span>Language</span>
                <span>{result.language}</span>
              </div>
              <div className="review-meta__row">
                <span>Complexity</span>
                <span>{result.complexity}</span>
              </div>
              <div className="review-meta__row">
                <span>Issues</span>
                <span>{result.insights?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
