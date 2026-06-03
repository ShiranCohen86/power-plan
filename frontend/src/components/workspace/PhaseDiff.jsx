import { useMemo } from 'react';

/**
 * Sprint 103: Simple line-based diff view.
 * Shows added lines (green) and removed lines (red) between previousContent and currentContent.
 */
export default function PhaseDiff({ previous, current }) {
  const diff = useMemo(() => computeDiff(previous || '', current || ''), [previous, current]);

  if (!previous) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No previous version to compare.</p>;
  }

  return (
    <div className="phase-diff" aria-label="Phase content diff">
      <p className="phase-diff__legend">
        <span className="phase-diff__added-label">+ Added</span>
        <span className="phase-diff__removed-label">- Removed</span>
      </p>
      <pre className="phase-diff__pre">
        {diff.map((line, i) => (
          <div
            key={i}
            className={`phase-diff__line${
              line.type === 'added'   ? ' phase-diff__line--added'   :
              line.type === 'removed'? ' phase-diff__line--removed'  : ''
            }`}
          >
            <span className="phase-diff__marker">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}

function computeDiff(before, after) {
  const aLines = before.split('\n');
  const bLines = after.split('\n');
  const result = [];

  // Simple LCS-based diff (O(n*m) — fine for ≤500 lines)
  const lcs = computeLCS(aLines, bLines);
  let ai = 0, bi = 0, li = 0;

  while (ai < aLines.length || bi < bLines.length) {
    if (ai < aLines.length && bi < bLines.length && li < lcs.length && aLines[ai] === lcs[li] && bLines[bi] === lcs[li]) {
      result.push({ type: 'same', text: aLines[ai] });
      ai++; bi++; li++;
    } else if (bi < bLines.length && (li >= lcs.length || bLines[bi] !== lcs[li])) {
      result.push({ type: 'added', text: bLines[bi] });
      bi++;
    } else {
      result.push({ type: 'removed', text: aLines[ai] });
      ai++;
    }
  }
  return result;
}

function computeLCS(a, b) {
  const MAX = 200;
  const aT = a.slice(0, MAX), bT = b.slice(0, MAX);
  const m = aT.length, n = bT.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aT[i - 1] === bT[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (aT[i - 1] === bT[j - 1]) { lcs.unshift(aT[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return lcs;
}
