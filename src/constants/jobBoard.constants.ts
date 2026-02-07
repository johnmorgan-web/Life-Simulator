import type { Job } from "../types/models.types"

const jobBoard: Job[] = [
  // Entry Level (No Education)
  { title: 'Odd Jobs', base: 800, req: null, certReq: null, tReq: 1, odds: 1, cat: 'Entry' },
  { title: 'Fast Food Worker', base: 1100, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.9, cat: 'Entry' },
  { title: 'Retail Associate', base: 1200, req: null, certReq: 'Sales', tReq: 1, odds: 0.85, cat: 'Entry' },
  { title: 'Dishwasher', base: 1050, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.95, cat: 'Entry' },
  { title: 'Day Laborer', base: 1300, req: null, certReq: 'Construction Safety', tReq: 1, odds: 0.8, cat: 'Entry' },
  { title: 'Warehouse Crew', base: 1500, req: 'HS Diploma', certReq: 'Supply Chain', tReq: 2, odds: 0.8, cat: 'Entry' },
  { title: 'Gig Delivery', base: 1250, req: null, certReq: 'Commercial Drivers License', tReq: 3, odds: 0.95, cat: 'Entry' },
  { title: 'Security Guard', base: 1400, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 1, odds: 0.75, cat: 'Entry' },
  { title: 'Janitor', base: 1350, req: null, certReq: 'Construction Safety', tReq: 1, odds: 0.9, cat: 'Entry' },
  { title: 'Mail Sorter', base: 1550, req: 'HS Diploma', certReq: null, tReq: 2, odds: 0.7, cat: 'Entry' },
  { title: 'Office Admin', base: 2100, req: 'HS Diploma', certReq: 'Human Resources', tReq: 2, odds: 0.8, cat: 'Entry' },
  { title: 'Bank Teller', base: 1900, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.7, cat: 'Entry' },
  { title: 'Vet Assistant', base: 1850, req: 'HS Diploma', certReq: 'Medical Assist', tReq: 2, odds: 0.7, cat: 'Entry' },
  { title: 'Sales Rep', base: 4000, req: 'HS Diploma', certReq: 'Sales', tReq: 3, odds: 0.4, cat: 'Entry' },

  // Military (Requires HS)
  { title: 'Army Private', base: 1900, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.95, cat: 'Military' },
  { title: 'Navy Seaman', base: 1950, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.9, cat: 'Military' },
  { title: 'Air Force Airman', base: 2000, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.85, cat: 'Military' },
  { title: 'Marine Corporal', base: 2100, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.8, cat: 'Military' },
  { title: 'Coast Guard Tech', base: 2050, req: 'HS Diploma', certReq: null, tReq: 1, odds: 0.8, cat: 'Military' },

  // Skilled Trades (Trade Cert or specific certs)
  { title: 'Electrician', base: 2900, req: 'Trade Cert', certReq: 'OSHA 10/30 Safety Cards', tReq: 3, odds: 0.7, cat: 'Skilled' },
  { title: 'HVAC Tech', base: 2750, req: 'Trade Cert', certReq: 'HVAC', tReq: 3, odds: 0.75, cat: 'Skilled' },
  { title: 'Plumber', base: 3100, req: 'Trade Cert', certReq: 'Plumbing Design', tReq: 3, odds: 0.65, cat: 'Skilled' },
  { title: 'Welder', base: 3300, req: 'Trade Cert', certReq: 'Welder', tReq: 2, odds: 0.6, cat: 'Skilled' },
  { title: 'Dental Hygienist', base: 3500, req: 'Trade Cert', certReq: 'Sonographer', tReq: 2, odds: 0.55, cat: 'Skilled' },
  { title: 'Auto Mechanic', base: 2600, req: 'Trade Cert', certReq: 'Auto Service', tReq: 2, odds: 0.8, cat: 'Skilled' },
  { title: 'Truck Driver', base: 3800, req: 'Trade Cert', certReq: 'Commercial Drivers License', tReq: 3, odds: 0.85, cat: 'Skilled' },
  { title: 'Phlebotomist', base: 2400, req: 'Trade Cert', certReq: 'Medical Assist', tReq: 2, odds: 0.7, cat: 'Skilled' },
  { title: 'Paralegal', base: 2800, req: 'Trade Cert', certReq: 'Paralegal', tReq: 2, odds: 0.6, cat: 'Skilled' },
  { title: 'Cosmetologist', base: 2200, req: 'Trade Cert', certReq: 'Cosmetology Operator License', tReq: 1, odds: 0.8, cat: 'Skilled' },
  { title: 'Apprentice Mason', base: 1800, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 3, odds: 0.8, cat: 'Skilled' },
  { title: 'CNC Operator', base: 2400, req: 'Trade Cert', certReq: 'Quality Control', tReq: 2, odds: 0.7, cat: 'Skilled' },
  { title: 'Landscape Lead', base: 2200, req: 'Trade Cert', certReq: 'Construction Safety', tReq: 3, odds: 0.9, cat: 'Skilled' },
  { title: 'Pharmacy Tech', base: 2000, req: 'Trade Cert', certReq: 'Pharmacy Technician', tReq: 2, odds: 0.75, cat: 'Skilled' },
  { title: 'Real Estate Agent', base: 3000, req: 'Trade Cert', certReq: 'Real Estate', tReq: 3, odds: 0.5, cat: 'Skilled' },
  { title: 'Chef de Partie', base: 3100, req: 'Trade Cert', certReq: 'Food and Beverage', tReq: 1, odds: 0.5, cat: 'Skilled' },

  // Professional (Degree Required)
  { title: 'Software Dev', base: 6500, req: 'Bachelors Degree', certReq: 'Web Developer', tReq: 1, odds: 0.45, cat: 'Pro' },
  { title: 'Data Analyst', base: 5800, req: 'Bachelors Degree', certReq: 'Cloud Computing', tReq: 1, odds: 0.5, cat: 'Pro' },
  { title: 'Registered Nurse', base: 6000, req: 'Bachelors Degree', certReq: 'Medical Assist', tReq: 3, odds: 0.65, cat: 'Pro' },
  { title: 'Accountant', base: 5400, req: 'Bachelors Degree', certReq: 'Public Accountant', tReq: 2, odds: 0.55, cat: 'Pro' },
  { title: 'Civil Engineer', base: 6200, req: 'Bachelors Degree', certReq: 'Architectural Drafter', tReq: 3, odds: 0.4, cat: 'Pro' },
  { title: 'Graphic Designer', base: 4500, req: 'Bachelors Degree', certReq: 'Adobe Certified Professional', tReq: 1, odds: 0.6, cat: 'Pro' },
  { title: 'HR Specialist', base: 4900, req: 'Bachelors Degree', certReq: 'Human Resources', tReq: 2, odds: 0.55, cat: 'Pro' },
  { title: 'Marketing Coord.', base: 4700, req: 'Bachelors Degree', certReq: 'Sales', tReq: 2, odds: 0.5, cat: 'Pro' },
  { title: 'Lab Researcher', base: 5100, req: 'Bachelors Degree', certReq: 'Medical Laboratory Scientist', tReq: 2, odds: 0.4, cat: 'Pro' },
  { title: 'Social Worker', base: 4200, req: 'Bachelors Degree', certReq: 'Social Work Case Manager', tReq: 2, odds: 0.7, cat: 'Pro' },
  { title: 'IT Support', base: 3200, req: 'Trade Cert', certReq: 'Help Desk', tReq: 1, odds: 0.6, cat: 'Pro' },
  { title: 'Event Planner', base: 3400, req: 'Bachelors Degree', certReq: 'Project Management', tReq: 2, odds: 0.45, cat: 'Pro' },
  { title: 'Supply Chain Manager', base: 5600, req: 'Bachelors Degree', certReq: 'Supply Chain', tReq: 3, odds: 0.4, cat: 'Pro' },
  { title: 'Web Designer', base: 4200, req: 'Trade Cert', certReq: 'Web Developer', tReq: 1, odds: 0.55, cat: 'Pro' },
  { title: 'Publicist', base: 4800, req: 'Bachelors Degree', certReq: 'Sales', tReq: 2, odds: 0.35, cat: 'Pro' },
  { title: 'Physician', base: 15000, req: 'Medical School', certReq: 'Medical Billing', tReq: 3, odds: 0.8, cat: 'Pro' },
  { title: 'Surgeon', base: 18000, req: 'Medical School', certReq: null, tReq: 3, odds: 0.6, cat: 'Pro' },
  { title: 'Security Officer', base: 3500, req: 'HS Diploma', certReq: 'Cybersecurity', tReq: 2, odds: 0.7, cat: 'Pro' },
  { title: 'Court Reporter', base: 4500, req: 'Bachelors Degree', certReq: 'Court Reporter', tReq: 2, odds: 0.5, cat: 'Pro' },
  { title: 'Personal Trainer', base: 2800, req: 'HS Diploma', certReq: 'Personal Training', tReq: 1, odds: 0.75, cat: 'Pro' },
]

export default jobBoard
