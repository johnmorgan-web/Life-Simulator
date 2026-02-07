import type { AcademyCourse } from "../types/models.types"

const academyCourses: AcademyCourse[] = [
  // Degrees with prerequisites
  { n: 'HS Diploma', m: 1, c: 200, type: 'degree', prereq: null, icon: '📚' },
  { n: 'Trade Cert', m: 3, c: 800, type: 'degree', prereq: 'HS Diploma', icon: '🔧' },
  { n: 'Bachelors Degree', m: 24, c: 1200, type: 'degree', prereq: 'HS Diploma', icon: '🎓' },
  { n: 'Masters Degree', m: 12, c: 3000, type: 'degree', prereq: 'Bachelors Degree', icon: '🎩' },
  { n: 'PhD', m: 30, c: 5000, type: 'degree', prereq: 'Masters Degree', icon: '🧑‍🎓' },
  { n: 'Medical School', m: 24, c: 10000, type: 'degree', prereq: 'Bachelors Degree', icon: '🏥' },

  // Certifications (alphabetical)
  { n: 'Adobe Certified Professional', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🖌️' },
  { n: 'Architectural Drafter', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '📐' },
  { n: 'Auto Service', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚗' }, 
  { n: 'Cloud Computing', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '☁️' },
  { n: 'Cosmetology Operator License', m: 6, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💇' },
  { n: 'Commercial Drivers License', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '🚛' },
  { n: 'Computed Tomography', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔬' },
  { n: 'Construction Safety', m: 1, c: 200, type: 'cert', prereq: 'HS Diploma', icon: '⛑️' },
  { n: 'Court Reporter', m: 8, c: 800, type: 'cert', prereq: 'HS Diploma', icon: '📝' },
  { n: 'Cybersecurity', m: 4, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🔐' },
  { n: 'Food and Beverage', m: 2, c: 250, type: 'cert', prereq: null, icon: '🍽️' },
  { n: 'Help Desk', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '💻' },
  { n: 'HVAC', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '❄️' },
  { n: 'Human Resources', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '👥' },
  { n: 'Medical Assist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🩺' },
  { n: 'Medical Billing', m: 4, c: 450, type: 'cert', prereq: 'HS Diploma', icon: '📋' },
  { n: 'Medical Laboratory Scientist', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🧪' },
  { n: 'OSHA 10/30 Safety Cards', m: 1, c: 150, type: 'cert', prereq: 'HS Diploma', icon: '🦺' },
  { n: 'Paralegal', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '⚖️' },
  { n: 'Personal Training', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💪' },
  { n: 'Pharmacy Technician', m: 6, c: 650, type: 'cert', prereq: 'HS Diploma', icon: '💊' },
  { n: 'Plumbing Design', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚰' },
  { n: 'Project Management', m: 4, c: 550, type: 'cert', prereq: 'HS Diploma', icon: '📊' },
  { n: 'Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📊' },
  { n: 'Quality Control', m: 3, c: 350, type: 'cert', prereq: 'HS Diploma', icon: '✅' },
  { n: 'Real Estate', m: 3, c: 400, type: 'cert', prereq: null, icon: '🏠' },
  { n: 'Sales', m: 2, c: 250, type: 'cert', prereq: null, icon: '💰' },
  { n: 'Social Work Case Manager', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '👩‍⚕️' },
  { n: 'Sonographer', m: 12, c: 1000, type: 'cert', prereq: 'HS Diploma', icon: '🫀' },
  { n: 'Supply Chain', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📦' },
  { n: 'Web Developer', m: 4, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🌐' },
  { n: 'Welder', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🔥' },
]

export default academyCourses
