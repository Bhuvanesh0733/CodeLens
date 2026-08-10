import { useState, useCallback } from 'react';
import SortVisualizer from '../components/visualizer/SortVisualizer';
import CodeEditor from '../components/editor/CodeEditor';
import { bubbleSort, bubbleSortCode } from '../components/visualizer/algorithms/bubbleSort';
import { quickSort, quickSortCode } from '../components/visualizer/algorithms/quickSort';
import { mergeSort, mergeSortCode } from '../components/visualizer/algorithms/mergeSort';
import { linearSearch, linearSearchCode, binarySearch, binarySearchCode } from '../components/visualizer/algorithms/search';
import './Visualizer.css';

const ALGORITHMS = [
  { id: 'bubble', label: 'Bubble Sort', complexity: 'O(n²)', space: 'O(1)', type: 'sort', code: bubbleSortCode },
  { id: 'quick',  label: 'Quick Sort',  complexity: 'O(n log n)', space: 'O(log n)', type: 'sort', code: quickSortCode },
  { id: 'merge',  label: 'Merge Sort',  complexity: 'O(n log n)', space: 'O(n)', type: 'sort', code: mergeSortCode },
  { id: 'linear', label: 'Linear Search', complexity: 'O(n)', space: 'O(1)', type: 'search', code: linearSearchCode },
  { id: 'binary', label: 'Binary Search', complexity: 'O(log n)', space: 'O(1)', type: 'search', code: binarySearchCode },
];

function generateArray(size, min = 5, max = 95) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

export default function Visualizer() {
  const [selectedAlgo, setSelectedAlgo] = useState('bubble');
  const [arraySize, setArraySize] = useState(16);
  const [arr, setArr] = useState(() => generateArray(16));
  const [steps, setSteps] = useState([]);
  const [target, setTarget] = useState(42);
  const [hasGenerated, setHasGenerated] = useState(false);

  const algo = ALGORITHMS.find(a => a.id === selectedAlgo);
  const isSearch = algo?.type === 'search';

  const handleGenerate = useCallback(() => {
    const newArr = generateArray(arraySize);
    setArr(newArr);
    setSteps([]);
    setHasGenerated(false);
  }, [arraySize]);

  const handleRun = useCallback(() => {
    let newSteps = [];
    const t = isSearch ? (typeof target === 'string' ? parseInt(target) : target) : null;

    switch (selectedAlgo) {
      case 'bubble': newSteps = bubbleSort(arr); break;
      case 'quick':  newSteps = quickSort(arr);  break;
      case 'merge':  newSteps = mergeSort(arr);  break;
      case 'linear': newSteps = linearSearch(arr, t || arr[Math.floor(arr.length / 2)]); break;
      case 'binary': newSteps = binarySearch(arr, t || arr[Math.floor(arr.length / 2)]); break;
      default: break;
    }

    setSteps(newSteps);
    setHasGenerated(true);
  }, [selectedAlgo, arr, target, isSearch]);

  const handleAlgoSelect = (id) => {
    setSelectedAlgo(id);
    setSteps([]);
    setHasGenerated(false);
  };

  return (
    <div className="vis-page page-wrapper">
      <div className="vis-page__inner">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="vis-sidebar">
          <div className="vis-sidebar__header">
            <span className="section-label">ALGORITHMS</span>
          </div>

          {/* Algorithm list */}
          <div className="vis-algo-list">
            {['sort', 'search'].map(type => (
              <div key={type} className="vis-algo-group">
                <span className="vis-algo-group__label">{type === 'sort' ? 'Sorting' : 'Searching'}</span>
                {ALGORITHMS.filter(a => a.type === type).map(algo => (
                  <button
                    key={algo.id}
                    className={`vis-algo-btn ${selectedAlgo === algo.id ? 'vis-algo-btn--active' : ''}`}
                    onClick={() => handleAlgoSelect(algo.id)}
                  >
                    <div className="vis-algo-btn__name">{algo.label}</div>
                    <div className="vis-algo-btn__complexity">{algo.complexity}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="vis-controls">
            <div className="vis-control-group">
              <label className="vis-label">Array Size: <span className="vis-label-val">{arraySize}</span></label>
              <input
                type="range"
                min={6}
                max={40}
                value={arraySize}
                onChange={e => { setArraySize(+e.target.value); setSteps([]); setHasGenerated(false); }}
                className="vis-range"
              />
            </div>

            {isSearch && (
              <div className="vis-control-group">
                <label className="vis-label">Search Target</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(+e.target.value)}
                  className="vis-input"
                  placeholder="Target value"
                />
                <span className="vis-hint">The array will be sorted first (binary search).</span>
              </div>
            )}

            <button className="btn btn-ghost vis-btn-generate" onClick={handleGenerate}>
              ↺ New Array
            </button>
            <button className="btn btn-primary vis-btn-run" onClick={handleRun}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Generate Steps
            </button>
          </div>

          {/* Complexity info */}
          {algo && (
            <div className="vis-complexity">
              <div className="vis-complexity__row">
                <span>Time</span>
                <span className="vis-complexity__val">{algo.complexity}</span>
              </div>
              <div className="vis-complexity__row">
                <span>Space</span>
                <span className="vis-complexity__val">{algo.space}</span>
              </div>
              <div className="vis-complexity__row">
                <span>Steps</span>
                <span className="vis-complexity__val">{steps.length || '—'}</span>
              </div>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="vis-main">
          {/* Header strip */}
          <div className="vis-main__header">
            <div className="vis-main__title">
              <span className="vis-running-indicator">
                {hasGenerated && <span className="pulse-dot" />}
              </span>
              <h1 className="vis-main__algo-name">{algo?.label}</h1>
              <span className="label label-muted">{algo?.complexity}</span>
            </div>
            <div className="vis-main__breadcrumb section-label">
              CODELENS · VISUALIZER
            </div>
          </div>

          {/* Visualizer + Code split */}
          <div className="vis-content-grid">
            {/* Visualizer */}
            <div className="vis-canvas-wrap">
              <SortVisualizer
                steps={steps}
                isSearch={isSearch}
                target={target}
              />
            </div>

            {/* Algorithm code */}
            <div className="vis-code-wrap">
              <div className="vis-code-header">
                <span className="section-label">SOURCE CODE</span>
                <span className="label label-accent">{algo?.id}.js</span>
              </div>
              <CodeEditor
                value={algo?.code || ''}
                readOnly={true}
                height="100%"
              />
            </div>
          </div>

          {/* If no steps yet */}
          {!hasGenerated && (
            <div className="vis-empty-hint">
              <span>Configure the array above, then click</span>
              <strong> Generate Steps </strong>
              <span>to instrument the algorithm and build the step trace.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
