/**
 * Linear Search — instrumented
 */
export function linearSearch(inputArr, target) {
  const arr = [...inputArr];
  const steps = [];

  for (let i = 0; i < arr.length; i++) {
    steps.push({ type: 'check', indices: [i], array: [...arr], target, found: false });
    if (arr[i] === target) {
      steps.push({ type: 'found', indices: [i], array: [...arr], target, found: true, foundAt: i });
      steps.push({ type: 'done', indices: [i], array: [...arr], target, found: true, foundAt: i });
      return steps;
    }
  }

  steps.push({ type: 'not-found', indices: [], array: [...arr], target, found: false, foundAt: -1 });
  steps.push({ type: 'done', indices: [], array: [...arr], target, found: false, foundAt: -1 });
  return steps;
}

export const linearSearchCode = `function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    // Check each element one by one
    if (arr[i] === target) {
      return i; // Found at index i
    }
  }
  return -1; // Not found
}`;

/**
 * Binary Search — instrumented (requires sorted array)
 */
export function binarySearch(inputArr, target) {
  const arr = [...inputArr].sort((a, b) => a - b);
  const steps = [];
  let low = 0, high = arr.length - 1;

  steps.push({ type: 'init', indices: [], array: [...arr], target, low, high, mid: -1, found: false });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    steps.push({ type: 'check', indices: [mid], array: [...arr], target, low, high, mid, found: false });

    if (arr[mid] === target) {
      steps.push({ type: 'found', indices: [mid], array: [...arr], target, low, high, mid, found: true, foundAt: mid });
      steps.push({ type: 'done', indices: [mid], array: [...arr], target, found: true, foundAt: mid });
      return steps;
    } else if (arr[mid] < target) {
      steps.push({ type: 'go-right', indices: [mid], array: [...arr], target, low, high, mid, found: false });
      low = mid + 1;
    } else {
      steps.push({ type: 'go-left', indices: [mid], array: [...arr], target, low, high, mid, found: false });
      high = mid - 1;
    }
  }

  steps.push({ type: 'not-found', indices: [], array: [...arr], target, found: false, foundAt: -1 });
  steps.push({ type: 'done', indices: [], array: [...arr], target, found: false, foundAt: -1 });
  return steps;
}

export const binarySearchCode = `function binarySearch(arr, target) {
  // Array must be sorted first
  let low = 0, high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (arr[mid] === target) {
      return mid; // Found!
    } else if (arr[mid] < target) {
      low = mid + 1; // Search right half
    } else {
      high = mid - 1; // Search left half
    }
  }
  return -1; // Not found
}`;
