/**
 * Quick Sort — instrumented to emit steps
 */
export function quickSort(inputArr) {
  const arr = [...inputArr];
  const steps = [];
  const sorted = new Set();

  function partition(low, high) {
    const pivot = arr[high];
    let i = low - 1;
    steps.push({ type: 'pivot', indices: [high], array: [...arr], sorted: [...sorted], pivot: high });

    for (let j = low; j < high; j++) {
      steps.push({ type: 'compare', indices: [j, high], array: [...arr], sorted: [...sorted], pivot: high });
      if (arr[j] <= pivot) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({ type: 'swap', indices: [i, j], array: [...arr], sorted: [...sorted], pivot: high });
        }
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    steps.push({ type: 'swap', indices: [i + 1, high], array: [...arr], sorted: [...sorted], pivot: i + 1 });
    sorted.add(i + 1);
    return i + 1;
  }

  function sort(low, high) {
    if (low < high) {
      const pi = partition(low, high);
      sort(low, pi - 1);
      sort(pi + 1, high);
    } else if (low === high) {
      sorted.add(low);
    }
  }

  sort(0, arr.length - 1);
  steps.push({ type: 'done', indices: [], array: [...arr], sorted: arr.map((_, i) => i) });
  return steps;
}

export const quickSortCode = `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high]; // Last element as pivot
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i+1], arr[high]] = [arr[high], arr[i+1]];
  return i + 1;
}`;
