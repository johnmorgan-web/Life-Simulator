import type { Job } from "../types/models.types"

/**
 * SIMPLIFIED JOB BOARD - LIFE SIMULATOR
 * 
 * Design Principles:
 * 1. Clear 2-3 step progression paths per career track
 * 2. Logical prerequisites that make sense for each role
 * 3. Financial progression: prerequisites always pay less than next step
 * 4. ~170 jobs (down from 238), removing redundancy
 * 5. Elite/military jobs at achievable odds (0.1-0.3, not 0.0001)
 * 6. Career tracks organized: Entry → Mid → Senior → Specialist/Executive
 * 
 * Career Tracks (6 main + military):
 * - Service & Hospitality (restaurant/bar)
 * - Retail & Sales (retail/commission sales)
 * - Trades (construction/maintenance/engineering)
 * - Healthcare (medical/nursing)
 * - Technology (IT/software)
 * - Finance & Business (accounting/banking/management)
 * - Military (combat/support roles)
 */

export const simplifiedJobBoard: Job[] = [
  
  // ============================================================================
  // ENTRY-LEVEL JOBS (No prerequisites, HS Diploma optional)
  // ============================================================================
  
  // General Labor Entry
  { title: 'Odd Jobs', base: 800, req: null, certReq: null, tReq: 1, odds: 1, cat: 'Entry', subcat: 'General Labor' },
  { title: 'Day Laborer', base: 1300, req: null, certReq: 'Construction Safety', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'General Labor' },
  { title: 'Warehouse Crew', base: 1500, req: null, certReq: 'Supply Chain', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'General Labor' },
  
  // Service & Hospitality Entry
  { title: 'Fast Food Worker', base: 1100, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.9, cat: 'Entry', subcat: 'Service & Hospitality' },
  { title: 'Dishwasher', base: 1050, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.95, cat: 'Entry', subcat: 'Service & Hospitality' },
  { title: 'Hotel Housekeeper', base: 1600, req: null, certReq: 'Customer Service', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'Service & Hospitality' },
  { title: 'Laundry Attendant', base: 1200, req: null, certReq: 'Customer Service', tReq: 1, odds: 0.85, cat: 'Entry', subcat: 'Service & Hospitality' },
  { title: 'Parking Attendant', base: 1300, req: null, certReq: 'Customer Service', tReq: 1, odds: 0.8, cat: 'Entry', subcat: 'Service & Hospitality' },
  
  // Retail Entry
  { title: 'Retail Associate', base: 1200, req: null, certReq: 'Sales', tReq: 2, odds: 0.85, cat: 'Entry', subcat: 'Retail & Commerce' },
  { title: 'Grocery Stocker', base: 1600, req: null, certReq: 'Customer Service', tReq: 1, odds: 0.9, cat: 'Entry', subcat: 'Retail & Commerce' },
  
  // Transport Entry (High Transit)
  { title: 'Gig Delivery', base: 1250, req: null, certReq: 'Commercial Drivers License', tReq: 4, odds: 0.95, cat: 'Entry', subcat: 'Logistics & Transport' },
  { title: 'Rideshare Driver', base: 1800, req: null, certReq: 'Commercial Drivers License', tReq: 4, odds: 0.85, cat: 'Entry', subcat: 'Logistics & Transport' },
  
  // Security/Custodial Entry
  { title: 'Security Guard', base: 1400, req: null, certReq: 'Personal Training', tReq: 2, odds: 0.75, cat: 'Entry', subcat: 'Security & Safety' },
  { title: 'Janitor', base: 1350, req: null, certReq: 'Customer Service', tReq: 2, odds: 0.9, cat: 'Entry', subcat: 'General Labor' },
  
  // Administrative Entry
  { title: 'Office Admin', base: 2100, req: 'HS Diploma', certReq: 'Human Resources', tReq: 3, odds: 0.8, cat: 'Entry', subcat: 'Administrative' },
  { title: 'Mail Sorter', base: 1550, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'Administrative' },
  
  // Financial Services Entry
  { title: 'Bank Teller', base: 1900, req: 'HS Diploma', certReq: 'Customer Service', tReq: 3, odds: 0.7, cat: 'Entry', subcat: 'Finance' },
  
  // Creative/Remote Entry
  { title: 'Freelance Writer', base: 2500, req: null, certReq: 'Content Marketing', tReq: 3, odds: 0.6, cat: 'Entry', subcat: 'Creative' },
  { title: 'Pet Sitter', base: 2000, req: null, certReq: null, tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'General Labor' },

  // Healthcare Entry
  { title: 'Vet Assistant', base: 1850, req: 'HS Diploma', certReq: 'Medical Assist', tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'Healthcare' },
  
  // ============================================================================
  // MID-LEVEL JOBS (Require Trade Cert or entry job experience)
  // ============================================================================
  
  // Service & Hospitality Mid
  { title: 'Bartender', base: 2200, req: null, certReq: 'Food and Beverage', tReq: 2, odds: 0.75, cat: 'Service', subcat: 'Service & Hospitality' },
  { title: 'Call Center Rep', base: 1800, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.8, cat: 'Service', subcat: 'Service & Hospitality' },
  { title: 'Line Cook', base: 2500, req: 'HS Diploma', certReq: 'Culinary Arts', tReq: 2, odds: 0.75, cat: 'Service', subcat: 'Service & Hospitality' },
  { title: 'Food Truck Worker', base: 2000, req: 'HS Diploma', certReq: 'Food and Beverage', tReq: 3, odds: 0.7, cat: 'Service', subcat: 'Service & Hospitality' },
  
  // Retail & Sales Mid
  { title: 'Sales Rep', base: 4000, req: 'HS Diploma', certReq: 'Sales', tReq: 3, odds: 0.4, cat: 'Sales', subcat: 'Retail & Commerce' },
  
  // Trades - Electrician Path
  { title: 'Apprentice Electrician', base: 2200, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 3, odds: 0.8, cat: 'Trades', subcat: 'Electrical' },
  { title: 'Electrician', base: 2900, req: 'Apprentice Electrician', certReq: 'OSHA 10/30 Safety Cards', tReq: 3, odds: 0.7, cat: 'Trades', subcat: 'Electrical' },
  { title: 'Master Electrician', base: 4200, req: 'Electrician', certReq: 'Electrical Supervisor', tReq: 4, odds: 0.4, cat: 'Trades', subcat: 'Electrical' },
  
  // Trades - Plumbing Path
  { title: 'Apprentice Plumber', base: 2100, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 3, odds: 0.8, cat: 'Trades', subcat: 'Plumbing' },
  { title: 'Plumber', base: 3100, req: 'Apprentice Plumber', certReq: 'Plumbing Design', tReq: 3, odds: 0.65, cat: 'Trades', subcat: 'Plumbing' },
  { title: 'Master Plumber', base: 4300, req: 'Plumber', certReq: 'Plumbing Supervision', tReq: 4, odds: 0.4, cat: 'Trades', subcat: 'Plumbing' },
  
  // Trades - HVAC Path
  { title: 'Apprentice HVAC', base: 2000, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 3, odds: 0.8, cat: 'Trades', subcat: 'HVAC' },
  { title: 'HVAC Tech', base: 2750, req: 'Apprentice HVAC', certReq: 'HVAC', tReq: 3, odds: 0.75, cat: 'Trades', subcat: 'HVAC' },
  { title: 'HVAC Supervisor', base: 3800, req: 'HVAC Tech', certReq: 'HVAC Management', tReq: 4, odds: 0.5, cat: 'Trades', subcat: 'HVAC' },
  
  // Trades - Welding Path
  { title: 'Apprentice Welder', base: 2000, req: 'HS Diploma', certReq: 'Construction Safety', tReq: 3, odds: 0.85, cat: 'Trades', subcat: 'Welding' },
  { title: 'Welder', base: 3300, req: 'Apprentice Welder', certReq: 'Welder', tReq: 3, odds: 0.6, cat: 'Trades', subcat: 'Welding' },
  { title: 'Welding Inspector', base: 4500, req: 'Welder', certReq: 'Welding Inspector', tReq: 4, odds: 0.45, cat: 'Trades', subcat: 'Welding' },
  
  // Trades - Auto Mechanic Path
  { title: 'Auto Mechanic', base: 2600, req: 'HS Diploma', certReq: 'Auto Service', tReq: 2, odds: 0.8, cat: 'Trades', subcat: 'Mechanical' },
  { title: 'Master Mechanic', base: 3600, req: 'Auto Mechanic', certReq: 'Advanced Auto Service', tReq: 3, odds: 0.6, cat: 'Trades', subcat: 'Mechanical' },
  
  // Trades - Truck Driver
  { title: 'Truck Driver', base: 3800, req: 'HS Diploma', certReq: 'Commercial Drivers License', tReq: 3, odds: 0.85, cat: 'Trades', subcat: 'Logistics & Transport' },
  { title: 'Long Haul Trucker', base: 4500, req: 'Truck Driver', certReq: 'Advanced Truck Driving', tReq: 3, odds: 0.7, cat: 'Trades', subcat: 'Logistics & Transport' },
  
  // Trades - Other
  { title: 'CNC Operator', base: 2400, req: 'HS Diploma', certReq: 'Quality Control', tReq: 2, odds: 0.7, cat: 'Trades', subcat: 'Manufacturing' },
  { title: 'Cosmetologist', base: 2200, req: 'HS Diploma', certReq: 'Cosmetology Operator License', tReq: 3, odds: 0.8, cat: 'Trades', subcat: 'Service & Hospitality' },
  
  // Healthcare Mid
  { title: 'Dental Assistant', base: 2500, req: 'HS Diploma', certReq: 'Dental Assist', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Medical Assistant', base: 2800, req: 'HS Diploma', certReq: 'Medical Assist', tReq: 3, odds: 0.6, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Phlebotomist', base: 2400, req: 'HS Diploma', certReq: 'Medical Assist', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'CNA', base: 2800, req: 'HS Diploma', certReq: 'Certified Nursing Assistant', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'EMT', base: 3200, req: 'HS Diploma', certReq: 'Emergency Medical Technician', tReq: 3, odds: 0.6, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Pharmacy Tech', base: 2000, req: 'HS Diploma', certReq: 'Pharmacy Technician', tReq: 3, odds: 0.75, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'X-Ray Tech', base: 3800, req: 'HS Diploma', certReq: 'X-Ray Technician', tReq: 3, odds: 0.55, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Surgical Tech', base: 3800, req: 'HS Diploma', certReq: 'Surgical Technician', tReq: 3, odds: 0.55, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Massage Therapist', base: 2700, req: 'HS Diploma', certReq: 'Massage Therapy', tReq: 3, odds: 0.65, cat: 'Healthcare', subcat: 'Healthcare' },
  { title: 'Vet Tech', base: 2900, req: 'HS Diploma', certReq: 'Veterinary Technician', tReq: 3, odds: 0.6, cat: 'Healthcare', subcat: 'Healthcare' },
  
  // Technology Mid
  { title: 'IT Help Desk', base: 3200, req: 'HS Diploma', certReq: 'Google IT Support', tReq: 2, odds: 0.6, cat: 'Technology', subcat: 'Technology' },
  { title: 'PC Technician', base: 3500, req: 'HS Diploma', certReq: 'CompTIA A+', tReq: 2, odds: 0.6, cat: 'Technology', subcat: 'Technology' },
  { title: 'Junior Developer', base: 5500, req: 'HS Diploma', certReq: 'Software Development', tReq: 3, odds: 0.45, cat: 'Technology', subcat: 'Technology' },
  { title: 'Web Designer', base: 4200, req: 'HS Diploma', certReq: 'Web Developer', tReq: 1, odds: 0.55, cat: 'Technology', subcat: 'Technology' },
  
  // Finance & Business Mid
  { title: 'Accounting Clerk', base: 2800, req: 'HS Diploma', certReq: 'Accounting Basics', tReq: 3, odds: 0.65, cat: 'Finance', subcat: 'Finance' },
  { title: 'Paralegal', base: 2800, req: 'HS Diploma', certReq: 'Paralegal', tReq: 3, odds: 0.6, cat: 'Finance', subcat: 'Legal' },
  { title: 'Tax Preparer', base: 3200, req: 'HS Diploma', certReq: 'Tax Preparation', tReq: 2, odds: 0.6, cat: 'Finance', subcat: 'Finance' },
  
  // Administrative & Professional Services Mid
  { title: 'Real Estate Agent', base: 3000, req: 'HS Diploma', certReq: 'Real Estate', tReq: 3, odds: 0.5, cat: 'Professional', subcat: 'Sales & Services' },
  { title: 'Personal Trainer', base: 2800, req: 'HS Diploma', certReq: 'Personal Training', tReq: 4, odds: 0.75, cat: 'Professional', subcat: 'Fitness' },
  
  // Construction & Supervisory
  { title: 'Construction Crew Lead', base: 3200, req: 'Day Laborer', certReq: 'Construction Safety', tReq: 3, odds: 0.7, cat: 'Trades', subcat: 'Construction' },
  
  // ============================================================================
  // PROFESSIONAL LEVEL (Degree or Advanced Cert Required)
  // ============================================================================
  
  // Healthcare Professional
  { title: 'Registered Nurse', base: 6000, req: 'Bachelors Degree', certReq: 'Registered Nurse', tReq: 4, odds: 0.45, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'RN Floor Nurse', base: 6500, req: 'Registered Nurse', certReq: 'Medical Assist', tReq: 4, odds: 0.45, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Dental Hygienist', base: 3500, req: 'HS Diploma', certReq: 'Dental Hygienist', tReq: 4, odds: 0.5, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Veterinarian', base: 6200, req: 'Veterinary School', certReq: 'Veterinary Technician', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Dentist', base: 9000, req: 'Dental School', certReq: 'Dental Hygienist', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Physician', base: 15000, req: 'Medical School', certReq: 'Medical Billing', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Surgeon', base: 18000, req: 'Medical School', certReq: 'Surgery Certificate', tReq: 4, odds: 0.2, cat: 'Professional', subcat: 'Healthcare' },
  { title: 'Pharmacist', base: 8000, req: 'Pharmacy School', certReq: 'Pharmacy Technician', tReq: 4, odds: 0.35, cat: 'Professional', subcat: 'Healthcare' },
  
  // Technology Professional
  { title: 'Software Developer', base: 6500, req: 'Bachelors Degree', certReq: 'Web Developer', tReq: 1, odds: 0.45, cat: 'Professional', subcat: 'Technology' },
  { title: 'Mid-Level Developer', base: 7500, req: 'Software Developer', certReq: 'Advanced Web Development', tReq: 2, odds: 0.5, cat: 'Professional', subcat: 'Technology' },
  { title: 'Senior Developer', base: 9500, req: 'Mid-Level Developer', certReq: 'Software Architecture', tReq: 3, odds: 0.35, cat: 'Professional', subcat: 'Technology' },
  { title: 'Data Analyst', base: 5800, req: 'Bachelors Degree', certReq: 'Cloud Computing', tReq: 3, odds: 0.45, cat: 'Professional', subcat: 'Technology' },
  { title: 'Data Scientist', base: 8500, req: 'Bachelors Degree', certReq: 'Data Science', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Technology' },
  { title: 'Solutions Architect', base: 9000, req: 'Senior Developer', certReq: 'AWS Certified Solutions Architect', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Technology' },
  { title: 'IT Security Officer', base: 7500, req: 'Bachelors Degree', certReq: 'Cybersecurity', tReq: 4, odds: 0.35, cat: 'Professional', subcat: 'Technology' },
  { title: 'Penetration Tester', base: 8000, req: 'IT Security Officer', certReq: 'Certified Ethical Hacker', tReq: 4, odds: 0.25, cat: 'Professional', subcat: 'Technology' },
  
  // Finance & Accounting Professional
  { title: 'Accountant', base: 5400, req: 'Bachelors Degree', certReq: 'Public Accountant', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Finance' },
  { title: 'Financial Analyst', base: 7000, req: 'Bachelors Degree', certReq: 'Financial Analyst', tReq: 4, odds: 0.35, cat: 'Professional', subcat: 'Finance' },
  { title: 'CPA', base: 7000, req: 'Accountant', certReq: 'Certified Public Accountant', tReq: 4, odds: 0.35, cat: 'Professional', subcat: 'Finance' },
  { title: 'Financial Advisor', base: 5500, req: 'Bachelors Degree', certReq: 'Financial Advisor', tReq: 4, odds: 0.45, cat: 'Professional', subcat: 'Finance' },
  { title: 'Investment Banker', base: 12000, req: 'Bachelors Degree', certReq: 'Financial Analyst', tReq: 4, odds: 0.15, cat: 'Professional', subcat: 'Finance' },
  
  // Law & Legal
  { title: 'Lawyer', base: 9000, req: 'Law School', certReq: 'Paralegal', tReq: 4, odds: 0.2, cat: 'Professional', subcat: 'Legal' },
  { title: 'Corporate Lawyer', base: 13000, req: 'Lawyer', certReq: 'Corporate Law Specialist', tReq: 4, odds: 0.15, cat: 'Professional', subcat: 'Legal' },
  
  // Engineering
  { title: 'Civil Engineer', base: 6200, req: 'Bachelors Degree', certReq: 'Architectural Drafter', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Engineering' },
  { title: 'Architect', base: 7500, req: 'Bachelors Degree', certReq: 'Architectural Drafter', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Engineering' },
  
  // Management & Leadership
  { title: 'Project Manager', base: 6000, req: 'Bachelors Degree', certReq: 'Project Management', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Management' },
  { title: 'Senior Project Manager', base: 7500, req: 'Project Manager', certReq: 'Project Management Professional', tReq: 4, odds: 0.35, cat: 'Professional', subcat: 'Management' },
  { title: 'Business Manager', base: 5800, req: 'Bachelors Degree', certReq: 'Business Management', tReq: 4, odds: 0.45, cat: 'Professional', subcat: 'Management' },
  { title: 'Department Manager', base: 7000, req: 'Business Manager', certReq: 'Management', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Management' },
  { title: 'Operations Director', base: 9500, req: 'Department Manager', certReq: 'Advanced Management', tReq: 4, odds: 0.25, cat: 'Professional', subcat: 'Management' },
  { title: 'VP Operations', base: 12000, req: 'Operations Director', certReq: 'Executive Leadership', tReq: 4, odds: 0.15, cat: 'Professional', subcat: 'Management' },
  
  // Sales & Marketing
  { title: 'Marketing Analyst', base: 5200, req: 'Bachelors Degree', certReq: 'Sales', tReq: 4, odds: 0.5, cat: 'Professional', subcat: 'Sales & Marketing' },
  { title: 'Marketing Manager', base: 6500, req: 'Marketing Analyst', certReq: 'Marketing Management', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'Sales & Marketing' },
  { title: 'Brand Director', base: 8500, req: 'Marketing Manager', certReq: 'Brand Strategy', tReq: 4, odds: 0.25, cat: 'Professional', subcat: 'Sales & Marketing' },
  
  // Human Resources
  { title: 'HR Specialist', base: 4900, req: 'Bachelors Degree', certReq: 'Human Resources', tReq: 4, odds: 0.45, cat: 'Professional', subcat: 'HR' },
  { title: 'HR Manager', base: 6500, req: 'HR Specialist', certReq: 'HR Management', tReq: 4, odds: 0.4, cat: 'Professional', subcat: 'HR' },
  
  // Creative & Design
  { title: 'Graphic Designer', base: 4500, req: 'Bachelors Degree', certReq: 'Adobe Certified Professional', tReq: 1, odds: 0.4, cat: 'Professional', subcat: 'Creative' },
  { title: 'Senior Designer', base: 6000, req: 'Graphic Designer', certReq: 'Advanced Design', tReq: 2, odds: 0.35, cat: 'Professional', subcat: 'Creative' },
  { title: 'Creative Director', base: 8500, req: 'Senior Designer', certReq: 'Design Leadership', tReq: 3, odds: 0.2, cat: 'Professional', subcat: 'Creative' },
  { title: 'Film Director', base: 11000, req: 'Bachelors Degree', certReq: 'Filmmaking', tReq: 4, odds: 0.05, cat: 'Professional', subcat: 'Creative' },
  
  // Education
  { title: 'Teacher', base: 4500, req: 'Bachelors Degree', certReq: 'Teaching Certificate', tReq: 4, odds: 0.5, cat: 'Professional', subcat: 'Education' },
  { title: 'University Professor', base: 6500, req: 'PhD', certReq: 'Teaching Certificate', tReq: 4, odds: 0.2, cat: 'Professional', subcat: 'Education' },
  { title: 'Research Scientist', base: 7200, req: 'PhD', certReq: 'Research Methodology', tReq: 4, odds: 0.25, cat: 'Professional', subcat: 'Education' },
  
  // Consulting & Advisory
  { title: 'Management Consultant', base: 7000, req: 'Bachelors Degree', certReq: 'Project Management', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Consulting' },
  { title: 'Principal Consultant', base: 9500, req: 'Management Consultant', certReq: 'Consulting Excellence', tReq: 4, odds: 0.2, cat: 'Professional', subcat: 'Consulting' },
  
  // Entrepreneurship
  { title: 'Small Business Owner', base: 6000, req: 'Bachelors Degree', certReq: 'Entrepreneurship', tReq: 3, odds: 0.3, cat: 'Professional', subcat: 'Entrepreneurship' },
  { title: 'Serial Entrepreneur', base: 10000, req: 'Small Business Owner', certReq: 'Business Growth', tReq: 4, odds: 0.15, cat: 'Professional', subcat: 'Entrepreneurship' },
  
  // Pilot & Aviation
  { title: 'Commercial Pilot', base: 8000, req: 'Flight School', certReq: 'Commercial Pilot License', tReq: 4, odds: 0.3, cat: 'Professional', subcat: 'Aviation' },
  { title: 'Airline Pilot', base: 8500, req: 'Commercial Pilot', certReq: 'Airline Transport Pilot', tReq: 4, odds: 0.25, cat: 'Professional', subcat: 'Aviation' },
  
  // ============================================================================
  // EXECUTIVE / C-SUITE LEVEL
  // ============================================================================
  
  { title: 'Chief Technology Officer', base: 15000, req: 'Senior Developer', certReq: 'Executive Leadership', tReq: 4, odds: 0.1, cat: 'Executive', subcat: 'Leadership' },
  { title: 'Chief Financial Officer', base: 16000, req: 'CPA', certReq: 'Executive Leadership', tReq: 4, odds: 0.1, cat: 'Executive', subcat: 'Leadership' },
  { title: 'Chief Executive Officer', base: 20000, req: 'VP Operations', certReq: 'Strategic Leadership', tReq: 4, odds: 0.05, cat: 'Executive', subcat: 'Leadership' },
  
  // ============================================================================
  // MILITARY TRACK (Logical Progression)
  // ============================================================================
  
  // Entry Military
  { title: 'Army Recruit', base: 1900, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.95, cat: 'Military', subcat: 'Combat' },
  { title: 'Navy Recruit', base: 1950, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.9, cat: 'Military', subcat: 'Naval' },
  { title: 'Air Force Recruit', base: 2000, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.85, cat: 'Military', subcat: 'Aviation' },
  { title: 'Marine Recruit', base: 2100, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.8, cat: 'Military', subcat: 'Combat' },
  
  // Mid Military
  { title: 'Army Sergeant', base: 3200, req: 'Army Recruit', certReq: null, tReq: 3, odds: 0.6, cat: 'Military', subcat: 'Combat' },
  { title: 'Navy Petty Officer', base: 3300, req: 'Navy Recruit', certReq: null, tReq: 3, odds: 0.6, cat: 'Military', subcat: 'Naval' },
  { title: 'Air Force Staff Sergeant', base: 3400, req: 'Air Force Recruit', certReq: null, tReq: 3, odds: 0.6, cat: 'Military', subcat: 'Aviation' },
  { title: 'Marine Sergeant', base: 3500, req: 'Marine Recruit', certReq: null, tReq: 3, odds: 0.55, cat: 'Military', subcat: 'Combat' },
  
  // Elite Military Units (Rare, Achievable)
  { title: 'Army Ranger', base: 3700, req: 'Army Sergeant', certReq: null, tReq: 5, odds: 0.15, cat: 'Military', subcat: 'Elite' },
  { title: 'Navy SEAL', base: 4000, req: 'Navy Petty Officer', certReq: 'SEAL Qualification', tReq: 5, odds: 0.1, cat: 'Military', subcat: 'Elite' },
  { title: 'Air Force Combat Controller', base: 3800, req: 'Air Force Staff Sergeant', certReq: 'Air Combat Control', tReq: 5, odds: 0.15, cat: 'Military', subcat: 'Elite' },
  { title: 'Marine Recon', base: 3600, req: 'Marine Sergeant', certReq: null, tReq: 5, odds: 0.2, cat: 'Military', subcat: 'Elite' },
  
  // Military Support Specialists (High Pay, Good Odds)
  { title: 'Combat Medic', base: 4200, req: 'Army Recruit', certReq: 'Combat Medic', tReq: 4, odds: 0.3, cat: 'Military', subcat: 'Support' },
  { title: 'Military Intelligence Officer', base: 4500, req: 'Army Sergeant', certReq: 'Intelligence Analysis', tReq: 4, odds: 0.25, cat: 'Military', subcat: 'Support' },
  { title: 'Cyber Operations Specialist', base: 5000, req: 'Air Force Staff Sergeant', certReq: 'Cybersecurity', tReq: 4, odds: 0.2, cat: 'Military', subcat: 'Support' },
  
  // Senior Military Command
  { title: 'Military Colonel', base: 7500, req: 'Army Ranger', certReq: 'Military Command', tReq: 4, odds: 0.08, cat: 'Military', subcat: 'Command' },
  { title: 'Admiral', base: 8000, req: 'Navy SEAL', certReq: 'Naval Command', tReq: 4, odds: 0.08, cat: 'Military', subcat: 'Command' },
  
  // ============================================================================
  // RARE/SPECIAL ACHIEVEMENTS (Very Low Odds)
  // ============================================================================
  
  { title: 'Professional Athlete', base: 15000, req: null, certReq: 'Athletic Excellence', tReq: 5, odds: 0.02, cat: 'Special', subcat: 'Sports' },
  { title: 'Tech Startup Founder', base: 20000, req: 'Senior Developer', certReq: 'Entrepreneurship', tReq: 5, odds: 0.05, cat: 'Special', subcat: 'Entrepreneurship' },
  { title: 'Ultra-Wealthy Entrepreneur', base: 500000, req: 'Serial Entrepreneur', certReq: 'Business Mastery', tReq: 5, odds: 0.02, cat: 'Special', subcat: 'Easter Egg' },
  { title: 'Billionaire CEO', base: 1000000, req: 'Ultra-Wealthy Entrepreneur', certReq: 'Legacy Building', tReq: 5, odds: 0.01, cat: 'Special', subcat: 'Easter Egg' },
]
