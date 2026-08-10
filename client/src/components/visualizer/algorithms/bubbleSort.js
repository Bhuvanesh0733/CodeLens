/**
 * Bubble Sort — instrumented to emit steps
 * Returns an array of step objects for the visualizer
 */
export function bubbleSort(inputArr) {
  const arr = [...inputArr];
  const steps = [];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({ type: 'compare', indices: [j, j + 1], array: [...arr], sorted: [] });
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
        steps.push({ type: 'swap', indices: [j, j + 1], array: [...arr], sorted: [] });
      }
    }
    steps.push({ type: 'sorted', indices: [n - i - 1], array: [...arr], sorted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k) });
    if (!swapped) break; // Early termination
  }

  steps.push({ type: 'done', indices: [], array: [...arr], sorted: arr.map((_, i) => i) });
  return steps;
}

export const bubbleSortCode = `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      // Compare adjacent elements
      if (arr[j] > arr[j + 1]) {
        // Swap if out of order
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    // Early termination optimization
    if (!swapped) break;
  }
  return arr;
}`;
