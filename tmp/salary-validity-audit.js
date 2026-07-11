const fs = require('fs');

const path = 'server/src/data/jobBoard.constants.ts';
const text = fs.readFileSync(path, 'utf8');

const lineRegex = /\{\s*title:\s*'([^']+)'\s*,\s*base:\s*(\d+)\s*,[\s\S]*?cat:\s*'([^']+)'\s*,\s*subcat:\s*'([^']+)'\s*\}/g;
const jobs = [];
let m;
while ((m = lineRegex.exec(text)) !== null) {
  jobs.push({
    title: m[1],
    baseMonthly: Number(m[2]),
    annual: Number(m[2]) * 12,
    cat: m[3],
    subcat: m[4],
  });
}

const baselineAnnualByCategory = {
  Entry: 36000,
  Military: 50000,
  Trades: 60000,
  Healthcare: 80000,
  Technology: 110000,
  Finance: 85000,
  Service: 45000,
  Education: 60000,
  Legal: 75000,
  Sales: 70000,
  HR: 80000,
  Creative: 65000,
  Executive: 130000,
  'Easter Egg': 180000,
};

const rows = jobs.map((j) => {
  const baseline = baselineAnnualByCategory[j.cat] ?? 70000;
  const ratio = j.annual / baseline;
  let band = 'VALID';
  if (ratio < 0.7) band = 'LOW';
  if (ratio > 1.5) band = 'HIGH';
  return { ...j, baseline, ratio, band };
});

const byBand = rows.reduce((acc, r) => {
  acc[r.band] = (acc[r.band] || 0) + 1;
  return acc;
}, {});

const byCategory = Object.entries(
  rows.reduce((acc, r) => {
    const key = r.cat;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {}),
)
  .map(([cat, arr]) => {
    const annuals = arr.map((r) => r.annual).sort((a, b) => a - b);
    const median = annuals[Math.floor(annuals.length / 2)];
    const baseline = baselineAnnualByCategory[cat] ?? 70000;
    return { cat, count: arr.length, median, baseline, ratio: median / baseline };
  })
  .sort((a, b) => a.cat.localeCompare(b.cat));

const lows = rows
  .filter((r) => r.band === 'LOW')
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 20);

const highs = rows
  .filter((r) => r.band === 'HIGH')
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 20);

function fmtMoney(n) {
  return `$${n.toLocaleString('en-US')}`;
}

console.log('TOTAL_JOBS', rows.length);
console.log('BANDS', JSON.stringify(byBand));

console.log('\nCATEGORY_MEDIAN_CHECK');
for (const c of byCategory) {
  console.log(
    `${c.cat.padEnd(12)} count=${String(c.count).padStart(3)} median=${fmtMoney(c.median).padStart(11)} baseline=${fmtMoney(c.baseline).padStart(11)} ratio=${c.ratio.toFixed(2)}`,
  );
}

console.log('\nLOW_OUTLIERS_TOP20');
for (const r of lows) {
  console.log(
    `${r.title} | ${r.cat}/${r.subcat} | annual=${fmtMoney(r.annual)} baseline=${fmtMoney(r.baseline)} ratio=${r.ratio.toFixed(2)}`,
  );
}

console.log('\nHIGH_OUTLIERS_TOP20');
for (const r of highs) {
  console.log(
    `${r.title} | ${r.cat}/${r.subcat} | annual=${fmtMoney(r.annual)} baseline=${fmtMoney(r.baseline)} ratio=${r.ratio.toFixed(2)}`,
  );
}
