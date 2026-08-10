import { useState, useEffect, useRef, useCallback } from 'react';
import './SortVisualizer.css';

const BAR_COUNT_DEFAULT = 20;

export default function SortVisualizer({ steps = [], isSearch = false, target = null }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(300); // ms per step
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const step = steps[currentStep] || steps[0];

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [steps]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (timestamp) => {
      if (timestamp - lastTimeRef.current >= speed) {
        lastTimeRef.current = timestamp;
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= steps.length) {
            setIsPlaying(false);
            return steps.length - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, steps.length]);

  const play = () => {
    if (currentStep >= steps.length - 1) setCurrentStep(0);
    setIsPlaying(true);
  };
  const pause = () => setIsPlaying(false);
  const reset = () => { setIsPlaying(false); setCurrentStep(0); };
  const stepForward = () => {
    setIsPlaying(false);
    setCurrentStep((p) => Math.min(p + 1, steps.length - 1));
  };
  const stepBack = () => {
    setIsPlaying(false);
    setCurrentStep((p) => Math.max(p - 1, 0));
  };

  if (!steps.length || !step) {
    return (
      <div className="sort-vis sort-vis--empty">
        <div className="sort-vis__empty-msg">
          <span className="sort-vis__empty-icon">{isSearch ? '◎' : '⊞'}</span>
          <span>Select an algorithm and generate array</span>
        </div>
      </div>
    );
  }

  const arr = step.array || [];
  const maxVal = Math.max(...arr, 1);
  const activeIndices = new Set(step.indices || []);
  const sortedIndices = new Set(step.sorted || []);
  const isDone = step.type === 'done';

  const getBarClass = (i, val) => {
    if (isDone || sortedIndices.has(i)) return 'bar--sorted';
    if (step.type === 'found' && activeIndices.has(i)) return 'bar--found';
    if (step.type === 'not-found' && activeIndices.has(i)) return 'bar--not-found';
    if (activeIndices.has(i)) {
      return step.type === 'swap' ? 'bar--swap' : step.type === 'pivot' ? 'bar--pivot' : 'bar--compare';
    }
    // Search: highlight range
    if (isSearch && step.low !== undefined && i >= step.low && i <= step.high) return 'bar--range';
    return 'bar--default';
  };

  const getStatusText = () => {
    if (!step) return '';
    switch (step.type) {
      case 'compare':  return `Comparing indices ${step.indices?.join(' ↔ ')}`;
      case 'swap':     return `Swapping indices ${step.indices?.join(' ↔ ')}`;
      case 'sorted':   return `Element settled in place`;
      case 'pivot':    return `Pivot selected at index ${step.pivot ?? step.indices?.[0]}`;
      case 'place':    return `Placing element at index ${step.indices?.[0]}`;
      case 'check':    return isSearch ? `Checking index ${step.indices?.[0]} (value: ${arr[step.indices?.[0]]})` : '';
      case 'found':    return `Found ${step.target} at index ${step.foundAt}!`;
      case 'not-found':return `${step.target} not in array`;
      case 'go-right': return `Target > mid — search right half`;
      case 'go-left':  return `Target < mid — search left half`;
      case 'done':     return isDone ? `Complete! ${step.found !== undefined ? (step.found ? '✓ Found' : '✗ Not found') : 'Sorted.'}` : '';
      default:         return '';
    }
  };

  return (
    <div className="sort-vis">
      {/* Status strip */}
      <div className="sort-vis__status">
        <div className="sort-vis__status-left">
          <span className={`sort-vis__type-badge ${step.type}`}>
            {step.type?.toUpperCase()}
          </span>
          <span className="sort-vis__status-text">{getStatusText()}</span>
        </div>
        <div className="sort-vis__step-counter">
          <span className="sort-vis__step-num">{currentStep + 1}</span>
          <span className="sort-vis__step-sep">/</span>
          <span className="sort-vis__step-total">{steps.length}</span>
        </div>
      </div>

      {/* Bar canvas */}
      <div className="sort-vis__canvas">
        <div className="sort-vis__bars">
          {arr.map((val, i) => (
            <div key={i} className="sort-vis__bar-wrapper">
              <div
                className={`sort-vis__bar ${getBarClass(i, val)}`}
                style={{ height: `${(val / maxVal) * 100}%` }}
              >
                {arr.length <= 20 && (
                  <span className="sort-vis__bar-val">{val}</span>
                )}
              </div>
              {/* Index label */}
              {arr.length <= 24 && (
                <span className="sort-vis__bar-idx">{i}</span>
              )}
            </div>
          ))}
        </div>

        {/* Binary search range brackets */}
        {isSearch && step.low !== undefined && step.high !== undefined && !isDone && (
          <div className="sort-vis__range-label">
            <span>low: {step.low}</span>
            {step.mid !== undefined && <span>mid: {step.mid}</span>}
            <span>high: {step.high}</span>
          </div>
        )}
      </div>

      {/* Timeline scrubber */}
      <div className="sort-vis__scrubber">
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={currentStep}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentStep(+e.target.value);
          }}
          className="sort-vis__range"
        />
      </div>

      {/* Controls */}
      <div className="sort-vis__controls">
        <div className="sort-vis__btns">
          <button className="sort-vis__btn" onClick={reset} title="Reset">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.4"/></svg>
          </button>
          <button className="sort-vis__btn" onClick={stepBack} disabled={currentStep === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
          </button>
          <button className="sort-vis__btn sort-vis__btn--play" onClick={isPlaying ? pause : play}>
            {isPlaying
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
          <button className="sort-vis__btn" onClick={stepForward} disabled={currentStep >= steps.length - 1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>

        <div className="sort-vis__speed">
          <span className="sort-vis__speed-label">Speed</span>
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={1050 - speed}
            onChange={(e) => setSpeed(1050 - +e.target.value)}
            className="sort-vis__speed-range"
          />
          <span className="sort-vis__speed-val">{speed}ms</span>
        </div>
      </div>

      {/* Legend */}
      <div className="sort-vis__legend">
        <span className="legend-item"><span className="legend-dot dot-compare" />Compare</span>
        <span className="legend-item"><span className="legend-dot dot-swap" />Swap</span>
        <span className="legend-item"><span className="legend-dot dot-pivot" />Pivot</span>
        <span className="legend-item"><span className="legend-dot dot-sorted" />Sorted</span>
      </div>
    </div>
  );
}
