const fs = require('fs');

const jobText = fs.readFileSync('server/src/data/jobBoard.constants.ts', 'utf8');
const academyText = fs.readFileSync('server/src/data/academyCourses.constants.ts', 'utf8');

const jobRx = /\{\s*title:\s*'([^']+)'\s*,\s*base:\s*(\d+)\s*,\s*req:\s*([^,]+),\s*certReq:\s*([^,]+),\s*tReq:\s*(\d+)\s*,\s*odds:\s*([0-9.]+)\s*,\s*cat:\s*'([^']+)'\s*,\s*subcat:\s*'([^']+)'\s*\}/g;
const courseRx = /\{\s*n:\s*'([^']+)'\s*,\s*m:\s*(\d+)\s*,\s*c:\s*(\d+)\s*,\s*type:\s*'([^']+)'\s*,\s*prereq:\s*([^,]+),/g;

const jobs = [];
let m;
while ((m = jobRx.exec(jobText)) !== null) {
  const parseNullable = (v) => {
    const s = String(v).trim();
    if (s === 'null') return null;
    return s.replace(/^'|'$/g, '');
  };
  jobs.push({
    title: m[1],
    base: Number(m[2]),
    req: parseNullable(m[3]),
    certReq: parseNullable(m[4]),
    tReq: Number(m[5]),
    odds: Number(m[6]),
    cat: m[7],
    subcat: m[8],
  });
}

const courses = [];
while ((m = courseRx.exec(academyText)) !== null) {
  const prereqRaw = String(m[5]).trim();
  const prereq = prereqRaw === 'null' ? null : prereqRaw.replace(/^'|'$/g, '');
  courses.push({
    n: m[1],
    m: Number(m[2]),
    type: m[4],
    prereq,
  });
}

const courseByName = new Map(courses.map((c) => [c.n, c]));
const jobByTitle = new Map(jobs.map((j) => [j.title, j]));

const CERT_ALIASES = {
  Security: 'Cybersecurity',
  'Content Marketing': 'Public Relations',
  'Animal Care': 'Veterinary Technician',
  'Special Operations': 'Special Forces',
  'SEAL Training': 'Special Forces',
  'Civil Engineering': 'Construction Management',
  'OSHA 10/30': 'OSHA 10/30 Safety Cards',
  Welding: 'Welder',
  'Master Electrician': 'Electrician',
  'Master HVAC': 'HVAC',
  Plumbing: 'Plumbing Design',
  'Master Plumbing': 'Plumbing Design',
  'ASE Master Technician': 'Auto Service',
  Cosmetology: 'Massage Therapist',
  'Medical Lab Technician': 'Medical Laboratory Scientist',
  'Nurse Practitioner': 'Registered Nurse',
  'Pharmacist License': 'Pharmacy Technician',
  'Medical License': 'Medical School',
  'Surgery Specialty': 'Surgery Certificate',
  'Dentist License': 'Dental Assistant',
  'Veterinarian License': 'Veterinary Technician',
  'Psychology License': 'Mental Health Counselor',
  'Software Architecture': 'Software Development',
  'Data Analysis': 'Google Data Analytics',
  'Machine Learning': 'Data Science',
  'AWS Cloud Practitioner': 'AWS Certified Cloud Practitioner',
  'AWS Solutions Architect': 'AWS Certified Solutions Architect',
  'UI/UX Design': 'Graphic Design',
  Bookkeeping: 'Tax Preparation',
  'Investment Analysis': 'Financial Analysis',
  'Counselor License': 'Mental Health Counselor',
  'Social Work': 'Social Work Case Manager',
  'Law License': 'Paralegal',
  'Police Academy': 'Cybersecurity',
  Investigative: 'Intelligence Analyst',
  'Correctional Officer': 'Cybersecurity',
  'Sales Management': 'Sales',
  'Adobe Creative Suite': 'Adobe Certified Professional',
  'Management Consulting': 'Project Management',
  'Massage Therapy': 'Massage Therapist',
  'Physical Therapy': 'Physical Therapy Assistant',
  'Occupational Therapy': 'Occupational Therapy Assistant',
  'Personal Care Aide': 'Certified Nursing Assistant',
  'Home Health Aide': 'Certified Nursing Assistant',
  'Nursing Assistant': 'Certified Nursing Assistant',
  'Dental Hygienist': 'Dental Assist',
  'Radiologic Tech': 'Radiologic Technology',
  'Business Analysis': 'Project Management',
  'Financial Analyst': 'Financial Analysis',
  'Medical Research': 'Medical Laboratory Scientist',
  Psychology: 'Mental Health Counselor',
  'Artificial Intelligence': 'Data Science',
};

function normalizeReq(req, certReq) {
  const resolvedReq = req && courseByName.has(req) ? req : null;
  const certAliased = certReq ? (CERT_ALIASES[certReq] || certReq) : null;
  const resolvedCertReq = certAliased && courseByName.has(certAliased) ? certAliased : null;
  return { resolvedReq, resolvedCertReq };
}

function courseMonthsToUnlock(courseName, memo = new Map(), stack = new Set()) {
  if (!courseName) return 0;
  if (memo.has(courseName)) return memo.get(courseName);
  if (stack.has(courseName)) return Number.POSITIVE_INFINITY;
  stack.add(courseName);

  const c = courseByName.get(courseName);
  if (!c) {
    stack.delete(courseName);
    memo.set(courseName, Number.POSITIVE_INFINITY);
    return Number.POSITIVE_INFINITY;
  }

  const prereqMonths = c.prereq ? courseMonthsToUnlock(c.prereq, memo, stack) : 0;
  const total = prereqMonths + c.m;
  memo.set(courseName, total);
  stack.delete(courseName);
  return total;
}

function minimumCareerMonthsForJob(job, resolvedReq) {
  const salary = Number(job.base || 0);
  const category = String(job.cat || '').trim();
  const title = String(job.title || '').trim();
  const requirement = String(resolvedReq || '').trim();

  const explicitFloorByTitle = {
    'Operations Manager': 12,
    'General Manager': 16,
    'Restaurant Manager': 12,
    'District Manager': 18,
    'Hotel Manager': 12,
    'Hospitality General Manager': 18,
    'Social Services Director': 16,
    'Event Director': 14,
    'Marketing Manager': 14,
    'HR Manager': 14,
    'Senior Project Manager': 16,
    'VP of Sales': 18,
    CHRO: 18,
    CFO: 18,
    CTO: 18,
    CEO: 24,
  };

  if (Number.isFinite(explicitFloorByTitle[title])) return explicitFloorByTitle[title];

  if (category === 'Entry') return 0;
  if (salary >= 14000) return 42;
  if (salary >= 11000) return 30;
  if (salary >= 9000) return 24;
  if (salary >= 7000) return 16;

  if (requirement === 'PhD') return 30;
  if (requirement === 'Masters Degree') return 20;
  if (requirement === 'Medical School' || requirement === 'Law School') return 24;
  if (category === 'Healthcare' || category === 'Technology' || category === 'Finance' || category === 'Legal') return 12;
  return 6;
}

const candidates = jobs
  .filter((j) => j.base >= 9000 || ['Executive', 'Healthcare', 'Technology', 'Finance', 'Legal', 'Education'].includes(j.cat))
  .sort((a, b) => b.base - a.base || a.title.localeCompare(b.title));

const rows = candidates.map((job) => {
  const { resolvedReq, resolvedCertReq } = normalizeReq(job.req, job.certReq);
  const reqMonths = resolvedReq ? courseMonthsToUnlock(resolvedReq) : 0;
  const certMonths = resolvedCertReq ? courseMonthsToUnlock(resolvedCertReq) : 0;
  const trainingMonths = Math.max(reqMonths, certMonths);
  const careerMonths = minimumCareerMonthsForJob(job, resolvedReq);
  const earliest = Math.max(trainingMonths, careerMonths);

  return {
    title: job.title,
    cat: job.cat,
    subcat: job.subcat,
    monthlyPay: job.base,
    req: resolvedReq || '-',
    cert: resolvedCertReq || '-',
    trainingMonths,
    careerMonths,
    earliestMonth: earliest,
  };
});

console.log('HIGH_TIER_ROLE_AUDIT_COUNT', rows.length);
console.log('Columns: role | cat/subcat | pay | req | cert | trainingM | careerM | earliestM');
for (const r of rows) {
  console.log(`${r.title} | ${r.cat}/${r.subcat} | ${r.monthlyPay} | ${r.req} | ${r.cert} | ${r.trainingMonths} | ${r.careerMonths} | ${r.earliestMonth}`);
}

const bucket = { le12: 0, m13_24: 0, m25_36: 0, m37_48: 0, gt48: 0 };
for (const r of rows) {
  if (r.earliestMonth <= 12) bucket.le12 += 1;
  else if (r.earliestMonth <= 24) bucket.m13_24 += 1;
  else if (r.earliestMonth <= 36) bucket.m25_36 += 1;
  else if (r.earliestMonth <= 48) bucket.m37_48 += 1;
  else bucket.gt48 += 1;
}
console.log('\nEARLIEST_MONTH_BUCKETS', JSON.stringify(bucket));
