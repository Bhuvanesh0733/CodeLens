import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import CodeEditor from '../components/editor/CodeEditor';
import { saveStudioCode, addHistory } from '../utils/storage';
import './CodeStudio.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js', comment: '//' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', comment: '//' },
  { id: 'python',     label: 'Python',     ext: 'py', comment: '#' },
  { id: 'java',       label: 'Java',       ext: 'java', comment: '//' },
  { id: 'c',          label: 'C',          ext: 'c', comment: '//' },
  { id: 'cpp',        label: 'C++',        ext: 'cpp', comment: '//' },
  { id: 'csharp',     label: 'C#',         ext: 'cs', comment: '//' },
  { id: 'go',         label: 'Go',         ext: 'go', comment: '//' },
  { id: 'rust',       label: 'Rust',       ext: 'rs', comment: '//' },
  { id: 'ruby',       label: 'Ruby',       ext: 'rb', comment: '#' },
  { id: 'php',        label: 'PHP',        ext: 'php', comment: '//' },
  { id: 'swift',      label: 'Swift',      ext: 'swift', comment: '//' },
  { id: 'kotlin',     label: 'Kotlin',     ext: 'kt', comment: '//' },
  { id: 'bash',       label: 'Bash',       ext: 'sh', comment: '#' },
  { id: 'r',          label: 'R',          ext: 'r', comment: '#' },
  { id: 'lua',        label: 'Lua',        ext: 'lua', comment: '--' },
  { id: 'perl',       label: 'Perl',       ext: 'pl', comment: '#' },
];

// ── Mode: normal | running | error | success | visualizing ──

function OutputPanel({ mode, output, stderr, exitCode, aiPhase, aiStream, aiInsights, onAIReview }) {
  if (mode === 'idle') {
    return (
      <div className="output-empty">
        <div className="output-empty__icon">⊡</div>
        <p>Write some code and hit <strong>Run</strong></p>
        <p className="output-empty__sub">Supports 17 languages · Powered by Piston</p>
      </div>
    );
  }

  if (mode === 'running') {
    return (
      <div className="output-running">
        <div className="output-running__spinner" />
        <span>Executing…</span>
      </div>
    );
  }

  return (
    <div className="output-result">
      {/* Status header */}
      <div className={`output-status ${mode}`}>
        <div className="output-status__left">
          <span className={`output-status__dot ${mode}`} />
          <span className="output-status__label">
            {mode === 'error' ? `Error — exit code ${exitCode}` : `Success — exit code 0`}
          </span>
        </div>
        {mode === 'error' && !aiPhase && (
          <button className="btn btn-outline-accent btn-sm" onClick={onAIReview}>
            ◈ Explain with AI
          </button>
        )}
      </div>

      {/* stdout */}
      {output && output.trim() && (
        <div className="output-section">
          <span className="output-section__label">STDOUT</span>
          <pre className="output-pre output-pre--stdout">{output}</pre>
        </div>
      )}

      {/* stderr */}
      {stderr && stderr.trim() && (
        <div className="output-section">
          <span className="output-section__label output-section__label--error">STDERR</span>
          <pre className="output-pre output-pre--stderr">{stderr}</pre>
        </div>
      )}

      {/* AI analysis */}
      {(aiPhase || aiInsights) && (
        <div className="output-ai">
          <div className="output-ai__header">
            <span className="output-ai__icon">◈</span>
            <span>CODELENS AI</span>
            {aiPhase && aiPhase !== 'complete' && (
              <span className="output-ai__phase">{aiPhase === 'parsing' ? 'Parsing…' : aiPhase === 'analyzing' ? 'Analyzing…' : 'Reviewing…'}</span>
            )}
          </div>

          {aiStream && !aiInsights && (
            <div className="output-ai__stream">
              <pre className="output-ai__text">{aiStream}<span className="ai-cursor">▊</span></pre>
            </div>
          )}

          {aiInsights && (
            <div className="output-ai__insights">
              {aiInsights.summary && (
                <p className="output-ai__summary">{aiInsights.summary}</p>
              )}
              {aiInsights.insights && aiInsights.insights.map((ins, i) => (
                <div key={i} className={`ai-insight ai-insight--${ins.severity}`}>
                  <div className="ai-insight__header">
                    <span className={`label label-${ins.type === 'bug' ? 'error' : ins.type === 'performance' ? 'info' : 'accent'}`}>
                      {ins.type}
                    </span>
                    {ins.line > 0 && <span className="ai-insight__line">LINE {ins.line}</span>}
                  </div>
                  <p className="ai-insight__title">{ins.title}</p>
                  <p className="ai-insight__msg">{ins.message}</p>
                  {ins.fix && (
                    <div className="ai-insight__fix">
                      <span className="ai-insight__fix-label">FIX →</span>
                      <span>{ins.fix}</span>
                    </div>
                  )}
                </div>
              ))}
              {aiInsights.improvedCode && (
                <div className="ai-improved">
                  <div className="ai-improved__label">IMPROVED CODE</div>
                  <pre className="ai-improved__code">{aiInsights.improvedCode}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compare two flat var objects and return the set of keys whose value changed
function diffVars(prevVars, curVars) {
  const changed = new Set();
  if (!prevVars) return changed;
  for (const k of Object.keys(curVars || {})) {
    if (!(k in prevVars) || prevVars[k] !== curVars[k]) changed.add(k);
  }
  return changed;
}

function VarRow({ name, value, changed }) {
  return (
    <div className={`vis-var-row ${changed ? 'vis-var-row--changed' : ''}`}>
      <span className="vis-var-name">{name}</span>
      <span className="vis-var-eq">=</span>
      <span className="vis-var-val">{value}</span>
    </div>
  );
}

function VisualizerOverlay({ steps, currentStep, onStep, onPlay, onPause, onReset, isPlaying, speed, onSpeedChange, language }) {
  const step = steps[currentStep];
  const prevStep = currentStep > 0 ? steps[currentStep - 1] : null;
  if (!step) return null;

  const hasStack = Array.isArray(step.stack) && step.stack.length > 0;
  const vars = step.vars || {};
  const hasVars = Object.keys(vars).length > 0;

  return (
    <div className="vis-overlay">
      {/* Call stack (Python) — one frame per active function call, innermost last */}
      {hasStack && (
        <div className="vis-frames">
          <div className="vis-vars__header section-label">CALL STACK</div>
          <div className="vis-frames__list">
            {step.stack.map((frame, i) => {
              const isInnermost = i === step.stack.length - 1;
              const prevFrame = prevStep && Array.isArray(prevStep.stack) ? prevStep.stack[i] : null;
              const changed = diffVars(prevFrame ? prevFrame.vars : null, frame.vars);
              return (
                <div key={i} className={`vis-frame ${isInnermost ? 'vis-frame--active' : ''}`}>
                  <div className="vis-frame__header">
                    <span className="vis-frame__name">{frame.name}</span>
                    <span className="vis-frame__line">line {frame.line}</span>
                  </div>
                  <div className="vis-frame__vars">
                    {Object.keys(frame.vars).length > 0 ? (
                      Object.entries(frame.vars).map(([k, v]) => (
                        <VarRow key={k} name={k} value={v} changed={changed.has(k)} />
                      ))
                    ) : (
                      <span className="vis-vars__empty">no locals</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Flat variable tracker — used for JS (no call stack) or as fallback */}
      {!hasStack && (
        <div className="vis-vars">
          <div className="vis-vars__header section-label">VARIABLES</div>
          {hasVars ? (
            <div className="vis-vars__list">
              {Object.entries(vars).map(([k, v]) => {
                const changed = diffVars(prevStep ? prevStep.vars : null, vars).has(k);
                return <VarRow key={k} name={k} value={v} changed={changed} />;
              })}
            </div>
          ) : (
            <span className="vis-vars__empty">No local variables yet</span>
          )}
        </div>
      )}

      {/* Output so far */}
      {step.output && (
        <div className="vis-output">
          <div className="vis-output__label section-label">OUTPUT SO FAR</div>
          <pre className="vis-output__text">{step.output}</pre>
        </div>
      )}

      {/* Current line info */}
      <div className="vis-step-info">
        <div className="vis-step-info__line">
          <span className="section-label">LINE</span>
          <span className="vis-step-info__num">{step.line}</span>
        </div>
        {step.error && (
          <div className="vis-step-info__error">
            <span className="label label-error">ERROR</span>
            <span>{step.error}</span>
          </div>
        )}
        {step.final && !step.error && (
          <div className="vis-step-info__done">
            <span className="label label-success">DONE</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="vis-controls">
        <div className="vis-progress">
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={currentStep}
            onChange={e => { onPause(); onStep(+e.target.value); }}
            className="vis-scrubber"
          />
          <div className="vis-progress__nums">
            <span>{currentStep + 1} / {steps.length}</span>
          </div>
        </div>

        <div className="vis-btns">
          <button className="vis-btn" onClick={onReset} title="Reset">↺</button>
          <button className="vis-btn" onClick={() => onStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>‹</button>
          <button className="vis-btn vis-btn--play" onClick={isPlaying ? onPause : onPlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="vis-btn" onClick={() => onStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep >= steps.length - 1}>›</button>
        </div>

        <div className="vis-speed">
          <span className="section-label">SPEED</span>
          <input
            type="range" min={80} max={1500} step={80}
            value={1580 - speed}
            onChange={e => onSpeedChange(1580 - +e.target.value)}
            className="vis-speed-range"
          />
        </div>
      </div>

      {!['javascript', 'python'].includes(language) && (
        <div className="vis-note">
          <span className="label label-warning">NOTE</span>
          <span>Line-level variable tracking is available for JavaScript and Python. Sequential line highlight shown for {language}.</span>
        </div>
      )}
    </div>
  );
}

export default function CodeStudio() {
  const location = useLocation();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('idle');

  // Only prefill the editor when arriving from an explicit choice — i.e.
  // History's "Open in Studio" link, which passes code via route state. A
  // plain visit/refresh of Studio always starts blank, on purpose.
  useEffect(() => {
    if (location.state && location.state.code) {
      setCode(location.state.code);
      if (location.state.language) setLanguage(location.state.language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Still save code to storage as you type — AI Review's "Retrieve from
  // Studio" button depends on this being available, even though Studio
  // itself no longer auto-loads it back in on a plain visit.
  const handleCodeChange = (val) => {
    setCode(val);
    saveStudioCode(val, language);
  };
  const [output, setOutput] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState(0);

  // AI state
  const [aiPhase, setAiPhase] = useState(null);
  const [aiStream, setAiStream] = useState('');
  const [aiInsights, setAiInsights] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Visualizer state
  const [isVisMode, setIsVisMode] = useState(false);
  const [visSteps, setVisSteps] = useState([]);
  const [visStep, setVisStep] = useState(0);
  const [isVisPlaying, setIsVisPlaying] = useState(false);
  const [visSpeed, setVisSpeed] = useState(500);
  const [isVisFetching, setIsVisFetching] = useState(false);
  const [filenameBase, setFilenameBase] = useState('main');

  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const abortRef = useRef(null);

  const lang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

  // ── Run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!code.trim() || mode === 'running') return;
    setMode('running');
    setOutput(''); setStderr(''); setExitCode(0);
    setAiPhase(null); setAiStream(''); setAiInsights(null);
    setIsVisMode(false); setVisSteps([]);

    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();

      if (data.error && !data.stdout) {
        setMode('error'); setStderr(data.error); setExitCode(-1);
        return;
      }

      setOutput(data.stdout || '');
      setStderr(data.stderr || '');
      setExitCode(data.exitCode !== undefined ? data.exitCode : 0);

      const isError = data.hasError || data.exitCode !== 0 || (!data.stdout && data.stderr);
      setMode(isError ? 'error' : 'success');

      // Save to history
      addHistory({
        type: 'run',
        language,
        code: code.slice(0, 20000),
        filename: `${filenameBase}.${lang.ext}`,
        output: (data.stdout || '').slice(0, 300),
        stderr: (data.stderr || '').slice(0, 300),
        exitCode: data.exitCode ?? 0,
        hasError: isError,
        summary: isError ? `Error — exit code ${data.exitCode}` : `Success`,
      });

      // Auto-trigger AI if there's an error
      if (isError) {
        triggerAIReview(data.stderr || data.stdout, true);
      }
    } catch (err) {
      setMode('error');
      setStderr(`Could not connect to CodeLens server.\n\nMake sure the server is running:\ncd codelens/server && node index.js\n\nDetails: ${err.message}`);
    }
  };

  // ── AI Review ────────────────────────────────────────────────────────────
  const triggerAIReview = async (errorContext = '', autoTriggered = false) => {
    if (isAiLoading || !code.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAiLoading(true);
    setAiPhase('parsing');
    setAiStream('');
    setAiInsights(null);

    const codeToReview = errorContext
      ? `${code}\n\n// Runtime error:\n// ${errorContext.split('\n').slice(0, 5).join('\n// ')}`
      : code;

    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToReview, language, filename: `${filenameBase}.${lang.ext}` }),
        signal: controller.signal,
      });

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
            if (evt.phase) setAiPhase(evt.phase);
            else if (evt.text !== undefined) setAiStream(p => p + evt.text);
            else if (evt.insights) { setAiInsights(evt); setAiPhase('complete'); }
            else if (evt.message && !evt.insights) setAiPhase('error');
          } catch (e) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setAiPhase('error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Visualize ─────────────────────────────────────────────────────────────
  const handleVisualize = async () => {
    if (!code.trim() || isVisFetching) return;
    setIsVisFetching(true);
    setIsVisMode(false);
    setVisSteps([]);
    setVisStep(0);
    setIsVisPlaying(false);

    try {
      const res = await fetch(`${API_BASE}/api/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();

      if (data.error) {
        setStderr(data.error);
        setMode('error');
        return;
      }

      setVisSteps(data.steps || []);
      setIsVisMode(true);
      setVisStep(0);
      if (data.finalOutput) setOutput(data.finalOutput);
      if (data.stderr) setStderr(data.stderr);
      setMode(data.hasError ? 'error' : 'success');
    } catch (err) {
      setStderr(`Visualization failed: ${err.message}`);
    } finally {
      setIsVisFetching(false);
    }
  };

  // ── Visualizer animation loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!isVisPlaying || !isVisMode) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = (ts) => {
      if (ts - lastTimeRef.current >= visSpeed) {
        lastTimeRef.current = ts;
        setVisStep(prev => {
          if (prev >= visSteps.length - 1) { setIsVisPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisPlaying, isVisMode, visSpeed, visSteps.length]);

  // Current highlighted lines for the editor
  const highlightedLines = (aiInsights && aiInsights.insights
    ? aiInsights.insights.map(ins => ({
        line: ins.line,
        type: ins.severity === 'critical' || ins.severity === 'high' ? 'error' : ins.severity === 'medium' ? 'warning' : 'info',
        message: ins.title,
      })).filter(h => h.line > 0)
    : []);

  const visActiveLine = isVisMode && visSteps.length > 0 && visSteps[visStep] ? visSteps[visStep].line : null;

  return (
    <div className="studio page-wrapper">
      {/* ── TOP BAR ── */}
      <div className="studio-bar">
        <div className="studio-bar__left">
          <div className="studio-bar__logo section-label">CODELENS · STUDIO</div>

          {/* Language selector */}
          <div className="lang-select-wrap">
            <select
              className="lang-select"
              value={language}
              onChange={e => { setLanguage(e.target.value); setMode('idle'); setIsVisMode(false); }}
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <span className="lang-select__arrow">▾</span>
          </div>

          <input
            className="studio-bar__filename studio-bar__filename--input"
            value={filenameBase}
            onChange={e => {
              // strip anything that isn't safe in a filename, no spaces/slashes
              const clean = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
              setFilenameBase(clean); // allow it to be empty WHILE the person is still typing
            }}
            onBlur={() => {
              // only fall back to a default once they're done editing and
              // actually left it empty — not on every keystroke
              if (!filenameBase.trim()) setFilenameBase('main');
            }}
            spellCheck={false}
            title="Click to rename — this name is used when saved to History"
          />
          <span className="studio-bar__ext">.{lang.ext}</span>
        </div>

        <div className="studio-bar__right">
          {/* Visualize */}
          <button
            className={`studio-btn studio-btn--vis ${isVisFetching ? 'loading' : ''} ${isVisMode ? 'active' : ''}`}
            onClick={isVisMode ? () => { setIsVisMode(false); } : handleVisualize}
            disabled={!code.trim() || isVisFetching}
            title="Step through code line by line"
          >
            {isVisFetching ? (
              <><span className="studio-btn__spinner" />Tracing…</>
            ) : isVisMode ? (
              <>⊠ Exit Visualizer</>
            ) : (
              <>⊞ Visualize</>
            )}
          </button>

          {/* Run */}
          <button
            className={`studio-btn studio-btn--run ${mode === 'running' ? 'loading' : ''}`}
            onClick={handleRun}
            disabled={!code.trim() || mode === 'running'}
          >
            {mode === 'running' ? (
              <><span className="studio-btn__spinner" />Running…</>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className={`studio-workspace ${isVisMode && visSteps.length > 0 ? 'studio-workspace--vis' : ''}`}>
        {/* Editor column — always just the code, full height */}
        <div className="studio-editor-col">
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language={language}
            highlightedLines={highlightedLines}
            activeLine={visActiveLine}
            height="100%"
            placeholder={`// Write your ${lang.label} code here…\n// Hit Run to execute · Hit Visualize to step through line by line`}
          />
        </div>

        {/* Right column — Visualizer panel while stepping through code, Output otherwise */}
        {isVisMode && visSteps.length > 0 ? (
          <div className="studio-vis-col">
            <div className="studio-vis-col__header">
              <span className="section-label">VISUALIZER</span>
              <span className="label label-muted">{visStep + 1} / {visSteps.length}</span>
            </div>
            <div className="studio-vis-col__body thin-scroll">
              <VisualizerOverlay
                steps={visSteps}
                currentStep={visStep}
                onStep={setVisStep}
                onPlay={() => { if (visStep >= visSteps.length - 1) setVisStep(0); setIsVisPlaying(true); }}
                onPause={() => setIsVisPlaying(false)}
                onReset={() => { setIsVisPlaying(false); setVisStep(0); }}
                isPlaying={isVisPlaying}
                speed={visSpeed}
                onSpeedChange={setVisSpeed}
                language={language}
              />
            </div>
          </div>
        ) : (
          <div className="studio-output-col">
            <div className="studio-output-header">
              <span className="section-label">OUTPUT</span>
              {mode !== 'idle' && mode !== 'running' && (
                <div className="studio-output-actions">
                  <button
                    className="studio-output-action-btn"
                    onClick={() => triggerAIReview('', false)}
                    disabled={isAiLoading}
                    title="Ask AI to review this code"
                  >
                    {isAiLoading ? <><span className="studio-btn__spinner" />Reviewing…</> : <>◈ AI Review</>}
                  </button>
                </div>
              )}
            </div>
            <div className="studio-output-body thin-scroll">
              <OutputPanel
                mode={mode}
                output={output}
                stderr={stderr}
                exitCode={exitCode}
                aiPhase={aiPhase}
                aiStream={aiStream}
                aiInsights={aiInsights}
                onAIReview={() => triggerAIReview(stderr || output, false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
