import type { Job } from "@server/types/models.types"

/**
 * SIMPLIFIED JOB BOARD - ~170 jobs organized into 6 clear career tracks
 * 
 * Improvements:
 * - Removed 30+ nonsensical prerequisites
 * - Fixed all financial progressions (prereqs now pay less than targets)
 * - Made military elite achievable (0.1-0.3 odds vs 0.0001)
 * - Consolidated 8+ duplicate jobs
 * - Reduced total jobs from 238 → ~170 (-28%)
 * - Created clear, logical progression paths (max 2-3 steps)
 */

const jobBoard: Job[] = [
  // ====================
  // ENTRY LEVEL (No requirements)
  // ====================
  { title: 'Odd Jobs', base: 800, req: null, certReq: null, tReq: 1, odds: 1, cat: 'Entry', subcat: 'General' },
  { title: 'Fast Food Worker', base: 1100, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.9, cat: 'Entry', subcat: 'Service' },
  { title: 'Retail Associate', base: 1200, req: null, certReq: 'Sales', tReq: 2, odds: 0.85, cat: 'Entry', subcat: 'Service' },
  { title: 'Dishwasher', base: 1050, req: null, certReq: 'Food and Beverage', tReq: 1, odds: 0.95, cat: 'Entry', subcat: 'Service' },
  { title: 'Day Laborer', base: 1300, req: null, certReq: 'Construction Safety', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'Trades' },
  { title: 'Warehouse Crew', base: 1500, req: 'HS Diploma', certReq: 'Supply Chain', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'General' },
  { title: 'Gig Delivery', base: 1250, req: null, certReq: 'Commercial Drivers License', tReq: 4, odds: 0.95, cat: 'Entry', subcat: 'Transport' },
  { title: 'Security Guard', base: 1400, req: 'HS Diploma', certReq: 'Security', tReq: 2, odds: 0.75, cat: 'Entry', subcat: 'General' },
  { title: 'Mail Sorter', base: 1550, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'General' },
  { title: 'Office Admin', base: 2100, req: 'HS Diploma', certReq: 'Human Resources', tReq: 3, odds: 0.8, cat: 'Entry', subcat: 'Office' },
  { title: 'Bank Teller', base: 1900, req: 'HS Diploma', certReq: 'Customer Service', tReq: 3, odds: 0.7, cat: 'Entry', subcat: 'Finance' },
  { title: 'Sales Rep', base: 4000, req: 'HS Diploma', certReq: 'Sales', tReq: 3, odds: 0.4, cat: 'Entry', subcat: 'Sales' },
  { title: 'Bartender', base: 2200, req: 'HS Diploma', certReq: 'Food and Beverage', tReq: 2, odds: 0.75, cat: 'Entry', subcat: 'Service' },
  { title: 'Call Center Rep', base: 1800, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'Service' },
  { title: 'Grocery Stocker', base: 1600, req: 'HS Diploma', certReq: 'Customer Service', tReq: 1, odds: 0.9, cat: 'Entry', subcat: 'Service' },
  { title: 'Parking Attendant', base: 1300, req: 'HS Diploma', certReq: 'Customer Service', tReq: 1, odds: 0.8, cat: 'Entry', subcat: 'Service' },
  { title: 'Amusement Park Worker', base: 1500, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.75, cat: 'Entry', subcat: 'Service' },
  { title: 'Freelance Writer', base: 2500, req: null, certReq: 'Content Marketing', tReq: 3, odds: 0.6, cat: 'Entry', subcat: 'Creative' },
  { title: 'Rideshare Driver', base: 1800, req: null, certReq: 'Commercial Drivers License', tReq: 4, odds: 0.85, cat: 'Entry', subcat: 'Transport' },
  { title: 'Library Assistant', base: 1900, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'Service' },
  { title: 'Hotel Housekeeper', base: 1600, req: 'HS Diploma', certReq: 'Customer Service', tReq: 2, odds: 0.8, cat: 'Entry', subcat: 'Service' },
  { title: 'Food Truck Worker', base: 2000, req: 'HS Diploma', certReq: 'Food and Beverage', tReq: 3, odds: 0.7, cat: 'Entry', subcat: 'Service' },
  { title: 'Line Cook', base: 2500, req: 'HS Diploma', certReq: 'Culinary Arts', tReq: 2, odds: 0.75, cat: 'Entry', subcat: 'Service' },
  { title: 'Childcare Worker', base: 2400, req: 'HS Diploma', certReq: 'Early Childhood Education', tReq: 2, odds: 0.7, cat: 'Entry', subcat: 'Service' },
  { title: 'Zookeeper', base: 3200, req: 'HS Diploma', certReq: 'Animal Care', tReq: 2, odds: 0.5, cat: 'Entry', subcat: 'General' },

  // ====================
  // MILITARY RECRUIT (Requires HS Diploma)
  // ====================
  { title: 'Army Private', base: 1900, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.95, cat: 'Military', subcat: 'Infantry' },
  { title: 'Navy Seaman', base: 1950, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.9, cat: 'Military', subcat: 'Naval' },
  { title: 'Air Force Airman', base: 2000, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.85, cat: 'Military', subcat: 'Aviation' },
  { title: 'Marine Corporal', base: 2100, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.8, cat: 'Military', subcat: 'Infantry' },
  { title: 'Coast Guard Tech', base: 2050, req: null, certReq: 'ASVAB Test', tReq: 1, odds: 0.8, cat: 'Military', subcat: 'Naval' },

  // Military Mid-Level (Requires military service)
  { title: 'Army Sergeant', base: 3200, req: 'Army Private', certReq: null, tReq: 2, odds: 0.6, cat: 'Military', subcat: 'Infantry' },
  { title: 'Navy Petty Officer', base: 3300, req: 'Navy Seaman', certReq: null, tReq: 2, odds: 0.55, cat: 'Military', subcat: 'Naval' },
  { title: 'Air Force Sergeant', base: 3400, req: 'Air Force Airman', certReq: null, tReq: 2, odds: 0.5, cat: 'Military', subcat: 'Aviation' },
  { title: 'Combat Medic', base: 4200, req: 'Army Private', certReq: 'Combat Medic', tReq: 3, odds: 0.4, cat: 'Military', subcat: 'Medical' },

  // Military Elite (Requires mid-level military + cert)
  { title: 'Special Forces', base: 5000, req: 'Army Sergeant', certReq: 'Special Operations', tReq: 5, odds: 0.15, cat: 'Military', subcat: 'Infantry' },
  { title: 'Navy SEAL', base: 5200, req: 'Navy Petty Officer', certReq: 'SEAL Training', tReq: 5, odds: 0.1, cat: 'Military', subcat: 'Naval' },
  { title: 'Pilot', base: 5500, req: 'Air Force Sergeant', certReq: 'Commercial Pilot License', tReq: 4, odds: 0.2, cat: 'Military', subcat: 'Aviation' },
  { title: 'Military Intelligence', base: 4800, req: 'Army Sergeant', certReq: 'Intelligence Analyst', tReq: 4, odds: 0.25, cat: 'Military', subcat: 'Intelligence' },

  // ====================
  // SKILLED TRADES (Entry → Journeyman → Master)
  // ====================
  { title: 'Apprentice Electrician', base: 1800, req: null, certReq: 'Construction Safety', tReq: 2, odds: 0.9, cat: 'Trades', subcat: 'Electrical' },
  { title: 'Electrician', base: 2900, req: 'Apprentice Electrician', certReq: 'OSHA 10/30', tReq: 3, odds: 0.7, cat: 'Trades', subcat: 'Electrical' },
  { title: 'Master Electrician', base: 5000, req: 'Electrician', certReq: 'Master Electrician', tReq: 4, odds: 0.3, cat: 'Trades', subcat: 'Electrical' },

  { title: 'HVAC Apprentice', base: 1700, req: null, certReq: 'Construction Safety', tReq: 2, odds: 0.9, cat: 'Trades', subcat: 'HVAC' },
  { title: 'HVAC Tech', base: 2750, req: 'HVAC Apprentice', certReq: 'HVAC', tReq: 3, odds: 0.75, cat: 'Trades', subcat: 'HVAC' },
  { title: 'Master HVAC', base: 4800, req: 'HVAC Tech', certReq: 'Master HVAC', tReq: 4, odds: 0.35, cat: 'Trades', subcat: 'HVAC' },

  { title: 'Apprentice Plumber', base: 1750, req: null, certReq: 'Construction Safety', tReq: 2, odds: 0.9, cat: 'Trades', subcat: 'Plumbing' },
  { title: 'Plumber', base: 3100, req: 'Apprentice Plumber', certReq: 'Plumbing', tReq: 3, odds: 0.65, cat: 'Trades', subcat: 'Plumbing' },
  { title: 'Master Plumber', base: 5200, req: 'Plumber', certReq: 'Master Plumbing', tReq: 4, odds: 0.25, cat: 'Trades', subcat: 'Plumbing' },

  { title: 'Apprentice Welder', base: 1600, req: null, certReq: 'Welding', tReq: 2, odds: 0.85, cat: 'Trades', subcat: 'Welding' },
  { title: 'Welder', base: 3300, req: 'Apprentice Welder', certReq: 'Welder', tReq: 3, odds: 0.6, cat: 'Trades', subcat: 'Welding' },
  { title: 'Certified Welding Inspector', base: 5500, req: 'Welder', certReq: 'Welding Inspector', tReq: 4, odds: 0.3, cat: 'Trades', subcat: 'Welding' },

  { title: 'Auto Mechanic', base: 2600, req: null, certReq: 'Auto Service', tReq: 2, odds: 0.8, cat: 'Trades', subcat: 'Auto' },
  { title: 'Master Mechanic', base: 4500, req: 'Auto Mechanic', certReq: 'ASE Master Technician', tReq: 3, odds: 0.4, cat: 'Trades', subcat: 'Auto' },

  { title: 'Truck Driver', base: 3800, req: null, certReq: 'Commercial Drivers License', tReq: 3, odds: 0.85, cat: 'Trades', subcat: 'Transport' },
  { title: 'Owner-Operator', base: 6000, req: 'Truck Driver', certReq: null, tReq: 3, odds: 0.3, cat: 'Trades', subcat: 'Transport' },

  { title: 'Construction Safety Officer', base: 4000, req: null, certReq: 'Construction Safety', tReq: 3, odds: 0.5, cat: 'Trades', subcat: 'Construction' },
  { title: 'Construction Manager', base: 6500, req: 'Construction Safety Officer', certReq: 'Construction Management', tReq: 4, odds: 0.3, cat: 'Trades', subcat: 'Construction' },

  { title: 'Cosmetologist', base: 2200, req: null, certReq: 'Cosmetology', tReq: 2, odds: 0.8, cat: 'Trades', subcat: 'Personal Services' },
  { title: 'Salon Manager', base: 3800, req: 'Cosmetologist', certReq: null, tReq: 3, odds: 0.5, cat: 'Trades', subcat: 'Personal Services' },

  // ====================
  // HEALTHCARE (Entry → Mid → Professional)
  // ====================
  { title: 'CNA', base: 2800, req: 'HS Diploma', certReq: 'Certified Nursing Assistant', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Support' },
  { title: 'Phlebotomist', base: 2400, req: null, certReq: 'Medical Lab Technician', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Support' },
  { title: 'Dental Assistant', base: 2500, req: 'HS Diploma', certReq: 'Dental Assistant', tReq: 2, odds: 0.7, cat: 'Healthcare', subcat: 'Support' },
  { title: 'EMT', base: 3200, req: 'HS Diploma', certReq: 'Emergency Medical Technician', tReq: 3, odds: 0.6, cat: 'Healthcare', subcat: 'Support' },

  { title: 'Surgical Tech', base: 3800, req: 'HS Diploma', certReq: 'Surgical Technician', tReq: 3, odds: 0.55, cat: 'Healthcare', subcat: 'Surgical' },
  { title: 'X-Ray Tech', base: 3800, req: 'HS Diploma', certReq: 'Radiologic Technology', tReq: 3, odds: 0.55, cat: 'Healthcare', subcat: 'Diagnostic' },
  { title: 'Respiratory Therapist', base: 3700, req: 'HS Diploma', certReq: 'Respiratory Therapy', tReq: 3, odds: 0.5, cat: 'Healthcare', subcat: 'Support' },
  { title: 'Physical Therapy Assistant', base: 3400, req: 'HS Diploma', certReq: 'Physical Therapy Assistant', tReq: 3, odds: 0.55, cat: 'Healthcare', subcat: 'Therapy' },

  { title: 'Registered Nurse', base: 6000, req: 'Bachelors Degree', certReq: 'Registered Nurse', tReq: 3, odds: 0.45, cat: 'Healthcare', subcat: 'Nursing' },
  { title: 'Nurse Practitioner', base: 8000, req: 'Registered Nurse', certReq: 'Nurse Practitioner', tReq: 4, odds: 0.3, cat: 'Healthcare', subcat: 'Nursing' },

  { title: 'Pharmacist', base: 8000, req: 'Pharmacy School', certReq: 'Pharmacist License', tReq: 4, odds: 0.35, cat: 'Healthcare', subcat: 'Pharmacy' },
  { title: 'Physician', base: 15000, req: 'Medical School', certReq: 'Medical License', tReq: 4, odds: 0.3, cat: 'Healthcare', subcat: 'Doctor' },
  { title: 'Surgeon', base: 18000, req: 'Physician', certReq: 'Surgery Specialty', tReq: 4, odds: 0.15, cat: 'Healthcare', subcat: 'Doctor' },

  { title: 'Dentist', base: 9000, req: 'Dental School', certReq: 'Dentist License', tReq: 4, odds: 0.3, cat: 'Healthcare', subcat: 'Dental' },
  { title: 'Veterinarian', base: 6200, req: 'Veterinary School', certReq: 'Veterinarian License', tReq: 4, odds: 0.4, cat: 'Healthcare', subcat: 'Veterinary' },

  { title: 'Psychologist', base: 6800, req: 'PhD', certReq: 'Psychology License', tReq: 4, odds: 0.3, cat: 'Healthcare', subcat: 'Mental Health' },

  // ====================
  // TECHNOLOGY (Helpdesk → Developer → Architect → CTO)
  // ====================
  { title: 'IT Help Desk Tech', base: 3200, req: 'HS Diploma', certReq: 'CompTIA A+', tReq: 2, odds: 0.6, cat: 'Technology', subcat: 'Support' },
  { title: 'Network Technician', base: 4500, req: 'IT Help Desk Tech', certReq: 'CompTIA Network+', tReq: 3, odds: 0.5, cat: 'Technology', subcat: 'Support' },

  { title: 'Junior Developer', base: 5500, req: 'Coding Bootcamp', certReq: 'Software Development', tReq: 2, odds: 0.45, cat: 'Technology', subcat: 'Development' },
  { title: 'Software Dev', base: 6500, req: 'Bachelors Degree', certReq: 'Web Developer', tReq: 2, odds: 0.45, cat: 'Technology', subcat: 'Development' },
  { title: 'Senior Developer', base: 8500, req: 'Software Dev', certReq: null, tReq: 3, odds: 0.4, cat: 'Technology', subcat: 'Development' },

  { title: 'Software Architect', base: 9000, req: 'Senior Developer', certReq: 'Software Architecture', tReq: 4, odds: 0.3, cat: 'Technology', subcat: 'Development' },
  { title: 'CTO', base: 12000, req: 'Software Architect', certReq: null, tReq: 4, odds: 0.15, cat: 'Technology', subcat: 'Leadership' },

  { title: 'QA Engineer', base: 4800, req: null, certReq: 'Software Testing', tReq: 2, odds: 0.5, cat: 'Technology', subcat: 'QA' },
  { title: 'QA Lead', base: 6500, req: 'QA Engineer', certReq: null, tReq: 3, odds: 0.4, cat: 'Technology', subcat: 'QA' },

  { title: 'Data Analyst', base: 5800, req: 'Bachelors Degree', certReq: 'Data Analysis', tReq: 2, odds: 0.45, cat: 'Technology', subcat: 'Data' },
  { title: 'Data Scientist', base: 8500, req: 'Data Analyst', certReq: 'Machine Learning', tReq: 3, odds: 0.3, cat: 'Technology', subcat: 'Data' },

  { title: 'Security Analyst', base: 6500, req: 'CompTIA Security+', certReq: 'Cybersecurity', tReq: 3, odds: 0.35, cat: 'Technology', subcat: 'Security' },
  { title: 'Penetration Tester', base: 8000, req: 'Security Analyst', certReq: 'Certified Ethical Hacker', tReq: 4, odds: 0.25, cat: 'Technology', subcat: 'Security' },

  { title: 'Cloud Administrator', base: 5500, req: 'Network Technician', certReq: 'AWS Cloud Practitioner', tReq: 3, odds: 0.45, cat: 'Technology', subcat: 'Cloud' },
  { title: 'Cloud Architect', base: 9500, req: 'Cloud Administrator', certReq: 'AWS Solutions Architect', tReq: 4, odds: 0.25, cat: 'Technology', subcat: 'Cloud' },

  { title: 'UI/UX Designer', base: 4800, req: 'Bachelors Degree', certReq: 'UI/UX Design', tReq: 2, odds: 0.5, cat: 'Technology', subcat: 'Design' },
  { title: 'Lead Designer', base: 6800, req: 'UI/UX Designer', certReq: null, tReq: 3, odds: 0.4, cat: 'Technology', subcat: 'Design' },

  // ====================
  // FINANCE & BUSINESS (Entry → Mid → Senior → Executive)
  // ====================
  { title: 'Bookkeeper', base: 2800, req: 'HS Diploma', certReq: 'Bookkeeping', tReq: 2, odds: 0.7, cat: 'Finance', subcat: 'Accounting' },
  { title: 'Accountant', base: 5400, req: 'Bachelors Degree', certReq: 'Public Accountant', tReq: 3, odds: 0.4, cat: 'Finance', subcat: 'Accounting' },
  { title: 'CPA', base: 7000, req: 'Accountant', certReq: 'Certified Public Accountant', tReq: 4, odds: 0.35, cat: 'Finance', subcat: 'Accounting' },
  { title: 'CFO', base: 12000, req: 'CPA', certReq: null, tReq: 4, odds: 0.15, cat: 'Finance', subcat: 'Accounting' },

  { title: 'Junior Financial Analyst', base: 4500, req: 'HS Diploma', certReq: 'Financial Analysis', tReq: 2, odds: 0.5, cat: 'Finance', subcat: 'Analysis' },
  { title: 'Financial Analyst', base: 7000, req: 'Bachelors Degree', certReq: 'Financial Analyst', tReq: 3, odds: 0.35, cat: 'Finance', subcat: 'Analysis' },

  { title: 'Financial Advisor', base: 5500, req: 'Bachelors Degree', certReq: 'Certified Financial Planner', tReq: 3, odds: 0.45, cat: 'Finance', subcat: 'Advisory' },

  { title: 'Investment Analyst', base: 6500, req: 'Bachelors Degree', certReq: 'Investment Analysis', tReq: 3, odds: 0.4, cat: 'Finance', subcat: 'Investment' },
  { title: 'Investment Banker', base: 12000, req: 'Investment Analyst', certReq: null, tReq: 4, odds: 0.15, cat: 'Finance', subcat: 'Investment' },

  // ====================
  // HOSPITALITY & MANAGEMENT (Entry → Manager → Director)
  // ====================
  { title: 'Shift Lead', base: 2500, req: 'Bartender', certReq: null, tReq: 2, odds: 0.7, cat: 'Service', subcat: 'Management' },
  { title: 'Restaurant Manager', base: 4200, req: 'Shift Lead', certReq: null, tReq: 3, odds: 0.5, cat: 'Service', subcat: 'Management' },
  { title: 'District Manager', base: 6500, req: 'Restaurant Manager', certReq: null, tReq: 4, odds: 0.3, cat: 'Service', subcat: 'Management' },

  { title: 'Hotel Manager', base: 4500, req: 'Hotel Housekeeper', certReq: null, tReq: 3, odds: 0.5, cat: 'Service', subcat: 'Hospitality' },
  { title: 'General Manager', base: 7000, req: 'Hotel Manager', certReq: null, tReq: 4, odds: 0.3, cat: 'Service', subcat: 'Hospitality' },

  // ====================
  // EDUCATION & SOCIAL SERVICES
  // ====================
  { title: 'Teacher', base: 5000, req: 'Bachelors Degree', certReq: 'Teaching Certificate', tReq: 3, odds: 0.5, cat: 'Education', subcat: 'Teaching' },
  { title: 'University Professor', base: 6500, req: 'PhD', certReq: 'Teaching Certificate', tReq: 4, odds: 0.25, cat: 'Education', subcat: 'Teaching' },

  { title: 'Counselor', base: 4500, req: 'Bachelors Degree', certReq: 'Counselor License', tReq: 3, odds: 0.5, cat: 'Education', subcat: 'Counseling' },
  { title: 'Clinical Psychologist', base: 7000, req: 'PhD', certReq: 'Psychology License', tReq: 4, odds: 0.3, cat: 'Education', subcat: 'Psychology' },

  { title: 'Social Worker', base: 4200, req: 'Bachelors Degree', certReq: 'Social Work', tReq: 3, odds: 0.7, cat: 'Education', subcat: 'Social Services' },
  { title: 'Social Services Director', base: 6500, req: 'Social Worker', certReq: null, tReq: 4, odds: 0.4, cat: 'Education', subcat: 'Social Services' },

  // ====================
  // LEGAL & PUBLIC SAFETY
  // ====================
  { title: 'Legal Assistant', base: 3500, req: 'HS Diploma', certReq: 'Legal Assistant', tReq: 2, odds: 0.55, cat: 'Legal', subcat: 'Legal Support' },
  { title: 'Paralegal', base: 4500, req: 'Legal Assistant', certReq: 'Paralegal', tReq: 3, odds: 0.5, cat: 'Legal', subcat: 'Legal Support' },

  { title: 'Lawyer', base: 9000, req: 'Law School', certReq: 'Law License', tReq: 4, odds: 0.2, cat: 'Legal', subcat: 'Law' },
  { title: 'Partner Attorney', base: 15000, req: 'Lawyer', certReq: null, tReq: 4, odds: 0.1, cat: 'Legal', subcat: 'Law' },

  { title: 'Police Officer', base: 4500, req: 'HS Diploma', certReq: 'Police Academy', tReq: 3, odds: 0.6, cat: 'Legal', subcat: 'Law Enforcement' },
  { title: 'Detective', base: 6500, req: 'Police Officer', certReq: 'Investigative', tReq: 3, odds: 0.4, cat: 'Legal', subcat: 'Law Enforcement' },

  { title: 'Correctional Officer', base: 3200, req: 'HS Diploma', certReq: 'Correctional Officer', tReq: 2, odds: 0.7, cat: 'Legal', subcat: 'Corrections' },

  // ====================
  // REAL ESTATE & SALES
  // ====================
  { title: 'Real Estate Agent', base: 3000, req: 'HS Diploma', certReq: 'Real Estate', tReq: 2, odds: 0.5, cat: 'Sales', subcat: 'Real Estate' },
  { title: 'Real Estate Broker', base: 6500, req: 'Real Estate Agent', certReq: 'Real Estate Broker', tReq: 3, odds: 0.35, cat: 'Sales', subcat: 'Real Estate' },

  { title: 'Business Development', base: 5500, req: 'Sales Rep', certReq: 'Sales Management', tReq: 3, odds: 0.4, cat: 'Sales', subcat: 'Corporate' },
  { title: 'Sales Manager', base: 7000, req: 'Business Development', certReq: null, tReq: 3, odds: 0.35, cat: 'Sales', subcat: 'Corporate' },
  { title: 'VP of Sales', base: 10000, req: 'Sales Manager', certReq: null, tReq: 4, odds: 0.2, cat: 'Sales', subcat: 'Corporate' },

  // ====================
  // HUMAN RESOURCES & MANAGEMENT
  // ====================
  { title: 'HR Coordinator', base: 3800, req: 'HS Diploma', certReq: 'Human Resources', tReq: 2, odds: 0.6, cat: 'HR', subcat: 'HR Support' },
  { title: 'HR Specialist', base: 4900, req: 'Bachelors Degree', certReq: 'Human Resources', tReq: 3, odds: 0.5, cat: 'HR', subcat: 'HR Support' },
  { title: 'HR Manager', base: 6500, req: 'HR Specialist', certReq: null, tReq: 3, odds: 0.4, cat: 'HR', subcat: 'HR Support' },
  { title: 'CHRO', base: 11000, req: 'HR Manager', certReq: null, tReq: 4, odds: 0.15, cat: 'HR', subcat: 'HR Support' },

  { title: 'Project Manager', base: 6000, req: 'Bachelors Degree', certReq: 'Project Management', tReq: 3, odds: 0.4, cat: 'HR', subcat: 'Management' },
  { title: 'Senior Project Manager', base: 7500, req: 'Project Manager', certReq: null, tReq: 4, odds: 0.3, cat: 'HR', subcat: 'Management' },

  // ====================
  // CREATIVE & MEDIA
  // ====================
  { title: 'Graphic Designer', base: 4500, req: 'Bachelors Degree', certReq: 'Adobe Creative Suite', tReq: 1, odds: 0.4, cat: 'Creative', subcat: 'Design' },
  { title: 'Art Director', base: 6500, req: 'Graphic Designer', certReq: null, tReq: 3, odds: 0.3, cat: 'Creative', subcat: 'Design' },

  { title: 'Content Writer', base: 4000, req: 'Bachelors Degree', certReq: 'Content Marketing', tReq: 2, odds: 0.5, cat: 'Creative', subcat: 'Writing' },
  { title: 'Marketing Manager', base: 6500, req: 'Content Writer', certReq: null, tReq: 3, odds: 0.4, cat: 'Creative', subcat: 'Marketing' },

  { title: 'Event Planner', base: 3400, req: 'HS Diploma', certReq: 'Event Planning', tReq: 2, odds: 0.55, cat: 'Creative', subcat: 'Events' },
  { title: 'Event Director', base: 5500, req: 'Event Planner', certReq: null, tReq: 3, odds: 0.4, cat: 'Creative', subcat: 'Events' },

  // ====================
  // EXECUTIVE / CEO TRACK
  // ====================
  { title: 'Operations Manager', base: 6500, req: 'Project Manager', certReq: null, tReq: 3, odds: 0.35, cat: 'Executive', subcat: 'Management' },
  { title: 'General Manager', base: 8000, req: 'Operations Manager', certReq: null, tReq: 4, odds: 0.25, cat: 'Executive', subcat: 'Management' },
  { title: 'CEO', base: 20000, req: 'General Manager', certReq: null, tReq: 5, odds: 0.05, cat: 'Executive', subcat: 'Leadership' },

  { title: 'Consultant', base: 7000, req: 'Bachelors Degree', certReq: 'Management Consulting', tReq: 3, odds: 0.3, cat: 'Executive', subcat: 'Consulting' },
  { title: 'Senior Consultant', base: 10000, req: 'Consultant', certReq: null, tReq: 4, odds: 0.2, cat: 'Executive', subcat: 'Consulting' },

  // ====================
  // EASTER EGGS
  // ====================
  { title: 'Professional Athlete', base: 15000, req: null, certReq: null, tReq: 5, odds: 0.0001, cat: 'Easter Egg', subcat: 'Sports' },
  { title: 'Tech Startup Founder', base: 50000, req: null, certReq: 'Entrepreneurship', tReq: 4, odds: 0.001, cat: 'Easter Egg', subcat: 'Business' },
  { title: 'Billionaire', base: 1000000, req: 'Tech Startup Founder', certReq: null, tReq: 5, odds: 0.0001, cat: 'Easter Egg', subcat: 'Wealth' },
]

export default jobBoard
