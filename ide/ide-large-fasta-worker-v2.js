'use strict';

importScripts('./ide-large-fasta-worker.js?v=1');

const figureloomBaseMakeTransform = makeTransform;

makeTransform = function figureloomMakeTransform(action, values, lineNumber) {
  if (action !== 'uniqueNames') {
    return figureloomBaseMakeTransform(action, values, lineNumber);
  }

  const counts = new Map();
  const used = new Set();
  return (record) => {
    const base = record.name;
    const key = base.toLowerCase();
    let number = (counts.get(key) || 0) + 1;
    let candidate = number === 1 ? base : `${base}-${number}`;
    while (used.has(candidate.toLowerCase())) {
      number += 1;
      candidate = `${base}-${number}`;
    }
    counts.set(key, number);
    record.name = candidate;
    used.add(candidate.toLowerCase());
    return record;
  };
};
