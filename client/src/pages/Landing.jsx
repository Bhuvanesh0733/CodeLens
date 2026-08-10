import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

// Animated code preview for hero
function AnimatedCode() {
  const lines = [
    { tokens: [{ t: 'function ', c: 'kw' }, { t: 'bubbleSort', c: 'fn' }, { t: '(arr) {', c: '' }] },
    { tokens: [{ t: '  for ', c: 'kw' }, { t: '(let i = 0; i < n; i++) {', c: '' }] },
    { tokens: [{ t: '    ', c: '' }, { t: 'compare', c: 'fn' }, { t: '(arr[j], arr[j+1])', c: '' }], highlight: 'compare' },
    { tokens: [{ t: '    if', c: 'kw' }, { t: ' (arr[j] > arr[j+1])', c: '' }] },
    { tokens: [{ t: '      swap', c: 'fn' }, { t: '(arr, j, j+1)', c: '' }], highlight: 'swap' },
    { tokens: [{ t: '  }', c: '' }] },
    { tokens: [{ t: '}', c: '' }] },
  ];

  return (
    <div className="hero-code">
      <div className="hero-code__header">
        <span className="hero-code__dot" style={{ background: '#FF6B6B' }} />
        <span className="hero-code__dot" style={{ background: '#FFB347' }} />
        <span className="hero-code__dot" style={{ background: '#B8F552' }} />
        <span className="hero-code__filename">bubbleSort.js</span>
      </div>
      <div className="hero-code__body">
        {lines.map((line, i) => (
          <div key={i} className={`hero-code__line ${line.highlight ? `line-hl-${line.highlight}` : ''}`}
            style={{ animationDelay: `${i * 120}ms` }}>
            <span className="hero-code__ln">{i + 1}</span>
            <span className="hero-code__content">
              {line.tokens.map((tok, j) => (
                <span key={j} className={`tok-${tok.c}`}>{tok.t}</span>
              ))}
            </span>
            {line.highlight && (
              <span className={`hero-code__marker marker-${line.highlight}`}>
                {line.highlight === 'compare' ? '→ compare' : '→ swap'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated bar preview
function AnimatedBars() {
  const bars = [3, 7, 1, 8, 4, 9, 2, 6, 5];
  const maxVal = 9;

  return (
    <div className="hero-bars">
      <div className="hero-bars__label">ARRAY STATE</div>
      <div className="hero-bars__bars">
        {bars.map((v, i) => (
          <div key={i} className="hero-bars__bar-wrap">
            <div
              className={`hero-bars__bar ${i === 1 || i === 3 ? 'bar-active' : ''}`}
              style={{ height: `${(v / maxVal) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="hero-bars__footer">
        <span className="hero-bars__op">COMPARE 7 ↔ 8</span>
      </div>
    </div>
  );
}

// Scroll reveal hook
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Feature data
const features = [
  {
    num: '01',
    title: 'Code Studio',
    desc: 'Write code in any language — JavaScript, Python, Java, C++, Go, Rust and more. Hit Run to execute. Hit Visualize to step through every line.',
    tag: 'Callbacks · requestAnimationFrame · Piston API',
    link: '/studio',
    cta: 'Open Studio',
  },
  {
    num: '02',
    title: 'AI Code Review',
    desc: "Paste your code, hit Review. Claude streams back bugs, performance issues, and fixes — typed out live as SSE chunks.",
    tag: 'Buffers · Streams · SSE',
    link: '/review',
    cta: 'Try Review',
  },
  {
    num: '03',
    title: 'Review History',
    desc: 'Every analysis is stored. Browse past reviews, compare scores, and reopen any session to revisit the insights.',
    tag: 'JSON · LocalStorage',
    link: '/history',
    cta: 'View History',
  },
];

// Architecture diagram component
function ArchDiagram() {
  return (
    <div className="arch-diagram">
      <div className="arch-title section-label">SYSTEM ARCHITECTURE</div>
      <div className="arch-flow">
        <div className="arch-node arch-node--browser">
          <span className="arch-node__label">Browser</span>
          <span className="arch-node__detail">fetch() · EventSource</span>
        </div>
        <div className="arch-arrow">
          <span className="arch-arrow__line" />
          <span className="arch-arrow__label">HTTP POST</span>
        </div>
        <div className="arch-node arch-node--server">
          <span className="arch-node__label">CodeLens Server</span>
          <div className="arch-node__sub">
            <span>Buffer.concat(chunks)</span>
            <span>EventEmitter</span>
            <span>SSE stream</span>
          </div>
        </div>
        <div className="arch-arrow">
          <span className="arch-arrow__line" />
          <span className="arch-arrow__label">API call</span>
        </div>
        <div className="arch-node arch-node--ai">
          <span className="arch-node__label">Claude AI</span>
          <span className="arch-node__detail">streaming response</span>
        </div>
        <div className="arch-arrow arch-arrow--back">
          <span className="arch-arrow__line" />
          <span className="arch-arrow__label">SSE chunks → browser</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useScrollReveal();

  return (
    <div className="landing">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__inner container">
          <div className="hero__text">
            <div className="hero__eyebrow reveal">
              <span className="pulse-dot" />
              <span className="section-label">AI-Powered Code Analysis Platform</span>
            </div>

            <h1 className="hero__headline reveal reveal-delay-1">
              <span className="hero__headline-line">CODE HAS</span>
              <span className="hero__headline-line hero__headline-accent">A STORY.</span>
            </h1>

            <p className="hero__sub reveal reveal-delay-2">
              Watch algorithms animate step by step. Stream AI insights live as your code
              is analyzed. See what your code does — not just what it outputs.
            </p>

            <div className="hero__actions reveal reveal-delay-3">
              <Link to="/studio" className="btn btn-primary btn-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Open Studio
              </Link>
              <Link to="/review" className="btn btn-ghost btn-lg">
                AI Review →
              </Link>
            </div>

            <div className="hero__stack reveal reveal-delay-4">
              {['React', 'Node.js', 'Buffers', 'SSE', 'EventEmitter', 'Claude AI'].map((t) => (
                <span key={t} className="hero__stack-tag">{t}</span>
              ))}
            </div>
          </div>

          <div className="hero__visual reveal reveal-delay-2">
            <AnimatedCode />
            <AnimatedBars />
          </div>
        </div>

        {/* Subtle grid lines */}
        <div className="hero__grid" aria-hidden="true" />
      </section>

      {/* ── SECTION DIVIDER ─────────────────────────────────────────── */}
      <div className="container">
        <div className="landing-divider reveal">
          <span className="section-label">02 — CAPABILITIES</span>
          <div className="line-h" />
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="features container">
        {features.map((f, i) => (
          <div key={f.num} className={`feature reveal ${i % 2 === 1 ? 'feature--flip' : ''}`} style={{ '--delay': `${i * 100}ms` }}>
            <div className="feature__num">{f.num}</div>
            <div className="feature__body">
              <h2 className="feature__title">{f.title}</h2>
              <p className="feature__desc">{f.desc}</p>
              <div className="feature__tag">{f.tag}</div>
              <Link to={f.link} className="feature__link">
                {f.cta} <span className="feature__arrow">→</span>
              </Link>
            </div>
            <div className="feature__visual">
              {i === 0 && <StudioPreview />}
              {i === 1 && <ReviewPreview />}
              {i === 2 && <HistoryPreview />}
            </div>
          </div>
        ))}
      </section>

      {/* ── ARCHITECTURE ─────────────────────────────────────────────── */}
      <section className="arch-section container">
        <div className="reveal">
          <div className="landing-divider">
            <span className="section-label">03 — ARCHITECTURE</span>
            <div className="line-h" />
          </div>
        </div>
        <div className="arch-header reveal">
          <h2 className="arch-heading">Every chunk travels end to end.</h2>
          <p className="arch-sub">
            The AI response never lands in memory all at once. It streams chunk by chunk
            from Claude, through your Node server, to your browser — live.
          </p>
        </div>
        <div className="reveal reveal-delay-2">
          <ArchDiagram />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="cta-section container">
        <div className="cta-block reveal">
          <h2 className="cta-heading">
            Ready to see your code in motion?
          </h2>
          <div className="cta-actions">
            <Link to="/studio" className="btn btn-primary btn-lg">Open Studio</Link>
            <Link to="/review" className="btn btn-ghost btn-lg">Start AI Review</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Small preview components ── */
function StudioPreview() {
  const codeLines = [
    { txt: 'def greet(name):', c: '' },
    { txt: '  return f"Hello, {name}"', c: '' },
    { txt: '', c: '' },
    { txt: 'print(greet("World"))', c: 'active' },
  ];
  return (
    <div className="fp-studio">
      <div className="fp-studio__top">
        <div className="fp-studio__bar">
          <span className="fp-studio__lang">Python</span>
          <span className="fp-studio__btns">
            <span className="fp-studio__run-btn">▶ Run</span>
            <span className="fp-studio__vis-btn">⊞ Vis</span>
          </span>
        </div>
        <div className="fp-studio__code">
          {codeLines.map((l, i) => (
            <div key={i} className={`fp-studio__line ${l.c === 'active' ? 'fp-studio__line--active' : ''}`}>
              <span className="fp-studio__ln">{i + 1}</span>
              <span>{l.txt}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fp-studio__output">
        <span className="fp-studio__out-label">OUTPUT</span>
        <span className="fp-studio__out-text">Hello, World!</span>
      </div>
    </div>
  );
}

function ReviewPreview() {
  return (
    <div className="fp-review">
      <div className="fp-review__header">
        <span className="fp-review__icon">◈</span>
        <span>CODELENS AI</span>
      </div>
      <div className="fp-review__items">
        {['Performance: O(n²) complexity detected', 'Bug: var in closure — use let', 'Suggestion: early termination'].map((t, i) => (
          <div key={i} className="fp-review__item">
            <span className={`fp-review__badge badge-${i}`}>{['PERF', 'BUG', 'TIP'][i]}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
      <div className="fp-review__cursor" aria-hidden="true">▊</div>
    </div>
  );
}

function HistoryPreview() {
  const items = [
    { name: 'Bubble Sort', count: '3 issues', time: '2m ago' },
    { name: 'Binary Search', count: '1 warning', time: '15m ago' },
    { name: 'Fibonacci', count: '2 perf issues', time: '1h ago' },
  ];
  return (
    <div className="fp-history">
      {items.map((it, i) => (
        <div key={i} className="fp-history__item">
          <div>
            <div className="fp-history__name">{it.name}</div>
            <div className="fp-history__count">{it.count}</div>
          </div>
          <span className="fp-history__time">{it.time}</span>
        </div>
      ))}
    </div>
  );
}
