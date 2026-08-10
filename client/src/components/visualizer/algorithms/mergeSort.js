/**
 * Merge Sort — instrumented
 */
export function mergeSort(inputArr) {
  const arr = [...inputArr];
  const steps = [];

  function merge(left, mid, right) {
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      steps.push({ type: 'compare', indices: [left + i, mid + 1 + j], array: [...arr], sorted: [], range: [left, right] });
      if (leftArr[i] <= rightArr[j]) {
        arr[k] = leftArr[i]; i++;
      } else {
        arr[k] = rightArr[j]; j++;
      }
      steps.push({ type: 'place', indices: [k], array: [...arr], sorted: [], range: [left, right] });
      k++;
    }
    while (i < leftArr.length) {
      arr[k] = leftArr[i];
      steps.push({ type: 'place', indices: [k], array: [...arr], sorted: [], range: [left, right] });
      i++; k++;
    }
    while (j < rightArr.length) {
      arr[k] = rightArr[j];
      steps.push({ type: 'place', indices: [k], array: [...arr], sorted: [], range: [left, right] });
      j++; k++;
    }
  }

  function sort(left, right) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      sort(left, mid);
      sort(mid + 1, right);
      merge(left, mid, right);
    }
  }

  sort(0, arr.length - 1);
  steps.push({ type: 'done', indices: [], array: [...arr], sorted: arr.map((_, i) => i) });
  return steps;
}

export const mergeSortCode = `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left  = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}`;
