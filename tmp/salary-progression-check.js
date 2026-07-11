const fs = require('fs');

const text = fs.readFileSync('server/src/data/jobBoard.constants.ts', 'utf8');
const rx = /\{\s*title:\s*'([^']+)'\s*,\s*base:\s*(\d+)\s*,[\s\S]*?cat:\s*'([^']+)'\s*,\s*subcat:\s*'([^']+)'\s*\}/g;

const jobs = [];
let m;
while ((m = rx.exec(text)) !== null) {
  jobs.push({ title: m[1], base: Number(m[2]), cat: m[3], subcat: m[4] });
}

const groups = new Map();
for (const j of jobs) {
  const key = `${j.cat}::${j.subcat}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(j);
}

const findings = [];

for (const [key, group] of groups.entries()) {
  const sorted = group.slice().sort((a, b) => a.base - b.base);

  // Compression check: top vs bottom too close for progression feel.
  const min = sorted[0].base;
  const max = sorted[sorted.length - 1].base;
  const spread = max / Math.max(1, min);
  if (group.length >= 3 && spread < 1.8) {
    findings.push({
      severity: 'medium',
      type: 'compressed-track',
      key,
      detail: `Spread ${spread.toFixed(2)}x is tight for ${group.length} roles (${min} -> ${max}).`,
    });
  }

  // Adjacent progression check: very small jumps can feel flat.
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const jumpPct = ((cur.base - prev.base) / Math.max(1, prev.base)) * 100;
    if (jumpPct < 5 && sorted.length >= 3) {
      findings.push({
        severity: 'low',
        type: 'flat-jump',
        key,
        detail: `${prev.title} -> ${cur.title} is only +${jumpPct.toFixed(1)}% (${prev.base} -> ${cur.base}).`,
      });
    }
  }
}

// Category progression feel: compare medians by category for rough ladder sanity.
const categoryMedians = {};
for (const j of jobs) {
  if (!categoryMedians[j.cat]) categoryMedians[j.cat] = [];
  categoryMedians[j.cat].push(j.base);
}
for (const cat of Object.keys(categoryMedians)) {
  const arr = categoryMedians[cat].sort((a,b)=>a-b);
  categoryMedians[cat] = arr[Math.floor(arr.length / 2)];
}

console.log('TOTAL_JOBS', jobs.length);
console.log('TOTAL_GROUPS', groups.size);
console.log('TOTAL_FINDINGS', findings.length);

const counts = findings.reduce((acc, f) => {
  acc[f.type] = (acc[f.type] || 0) + 1;
  return acc;
}, {});
console.log('FINDING_COUNTS', JSON.stringify(counts));

console.log('\nCATEGORY_MEDIANS_MONTHLY');
for (const [cat, median] of Object.entries(categoryMedians).sort((a,b)=>a[0].localeCompare(b[0]))) {
  console.log(`${cat}: ${median}`);
}

console.log('\nTOP_FINDINGS');
for (const f of findings.slice(0, 40)) {
  console.log(`[${f.severity}] ${f.type} | ${f.key} | ${f.detail}`);
}
