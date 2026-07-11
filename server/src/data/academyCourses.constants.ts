import type { AcademyCourse } from "../types/models.types"

export const academyCourses: AcademyCourse[] = [
  // Degrees with prerequisites
  { n: 'HS Diploma', m: 1, c: 200, type: 'degree', prereq: null, icon: '📚' , subcategory: 'Academic Degrees' },
  { n: 'Trade Cert', m: 3, c: 800, type: 'degree', prereq: 'HS Diploma', icon: '🔧' , subcategory: 'Academic Degrees' },
  { n: 'Bachelors Degree', m: 24, c: 1200, type: 'degree', prereq: 'HS Diploma', icon: '🎓' , subcategory: 'Academic Degrees' },
  { n: 'Masters Degree', m: 9, c: 2400, type: 'degree', prereq: 'Bachelors Degree', icon: '🎩' , subcategory: 'Academic Degrees' },
  { n: 'PhD', m: 20, c: 4200, type: 'degree', prereq: 'Masters Degree', icon: '🧑‍🎓' , subcategory: 'Academic Degrees' },
  { n: 'Medical School', m: 24, c: 10000, type: 'degree', prereq: 'Bachelors Degree', icon: '🏥' , subcategory: 'Health Degrees' },
  { n: 'Dental School', m: 24, c: 9500, type: 'degree', prereq: 'Bachelors Degree', icon: '🦷' , subcategory: 'Health Degrees' },
  { n: 'Pharmacy School', m: 18, c: 8500, type: 'degree', prereq: 'Bachelors Degree', icon: '💊' , subcategory: 'Health Degrees' },
  { n: 'Veterinary School', m: 24, c: 9000, type: 'degree', prereq: 'Bachelors Degree', icon: '🐾' , subcategory: 'Health Degrees' },
  { n: 'Flight School', m: 6, c: 6000, type: 'degree', prereq: 'Bachelors Degree', icon: '✈️' , subcategory: 'Service Degrees' },
  { n: 'Law School', m: 36, c: 15000, type: 'degree', prereq: 'Bachelors Degree', icon: '⚖️' , subcategory: 'Law Degrees' },
  { n: 'MBA', m: 12, c: 4000, type: 'degree', prereq: 'Bachelors Degree', icon: '💼' , subcategory: 'Career Degrees' },
  { n: 'Military Academy', m: 36, c: 0, type: 'degree', prereq: 'HS Diploma', icon: '🎖️' , subcategory: 'Service Degrees' },
  { n: 'Coding Bootcamp', m: 6, c: 2000, type: 'degree', prereq: 'HS Diploma', icon: '💻' , subcategory: 'Career Degrees' },
  { n: 'Culinary School', m: 12, c: 8000, type: 'degree', prereq: 'Culinary Arts', icon: '🍳' , subcategory: 'Academic Degrees' },

  // Certifications (alphabetical)
  
  { n: 'Auto Service', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚗' , subcategory: 'Trades' },
  { n: 'Commercial Drivers License', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '🚛' , subcategory: 'General Skills' },
  { n: 'Truck Driver', m: 4, c: 500, type: 'cert', prereq: 'Commercial Drivers License', icon: '🚚' , subcategory: 'General Skills' },
   
  
  //Finance certs
  { n: 'Certified Personal Finance Counselor', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💰' , subcategory: 'Business' },
  { n: 'Certified Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📊' , subcategory: 'Business' },
  { n: 'Certified Supply Chain Professional', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📦' , subcategory: 'Business' },
  { n: 'Financial Analysis', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📈' , subcategory: 'Business' },
  { n: 'Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📊' , subcategory: 'Business' },
  { n: 'Certified Financial Planner', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '💼' , subcategory: 'Business' },
  { n: 'Certified Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Certified Financial Planner', icon: '📊' , subcategory: 'Business' },
  { n: 'Project Management Professional', m: 4, c: 550, type: 'cert', prereq: 'HS Diploma', icon: '📊' , subcategory: 'Business' },
  { n: 'Tax Preparation', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💰' , subcategory: 'Business' },
  { n: 'Personal Finance', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💰' , subcategory: 'Business' },
  { n: 'Financial Advisor', m: 6, c: 700, type: 'cert', prereq: 'Personal Finance', icon: '💼' , subcategory: 'Business' },
  { n: 'Financial Planning', m: 6, c: 700, type: 'cert', prereq: 'Personal Finance', icon: '📊' , subcategory: 'Business' },
  
  //Computer/IT certs
  
  { n: 'AWS Certified Solutions Architect', m: 4, c: 600, type: 'cert', prereq: 'Coding Bootcamp', icon: '☁️' , subcategory: 'Technology' },
  { n: 'AWS Certified Cloud Practitioner', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '☁️' , subcategory: 'Technology' },
  { n: 'AWS Certified Developer', m: 4, c: 600, type: 'cert', prereq: 'AWS Certified Solutions Architect', icon: '☁️' , subcategory: 'Technology' },
  { n: 'Architectural Drafter', m: 6, c: 600, type: 'cert', prereq: 'AutoCAD', icon: '📐' , subcategory: 'Technology' },
  { n: 'AutoCAD', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🖌️' , subcategory: 'General Skills' },
  { n: 'Adobe Certified Professional', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🖌️' , subcategory: 'General Skills' },
  { n: 'Certified Ethical Hacker', m: 4, c: 600, type: 'cert', prereq: 'CompTIA Security+', icon: '🕵️‍♂️' , subcategory: 'General Skills' },
  { n: 'Certified Professional Coder', m: 4, c: 500, type: 'cert', prereq: 'Software Development', icon: '📋' , subcategory: 'General Skills' },
  { n: 'Certified Scrum Master', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '📈' , subcategory: 'General Skills' },
  { n: 'Cloud Computing', m: 3, c: 400, type: 'cert', prereq: 'AWS Certified Cloud Practitioner', icon: '☁️' , subcategory: 'Technology' },
  { n: 'CompTIA A+', m: 3, c: 400, type: 'cert', prereq: 'Cybersecurity', icon: '💻' , subcategory: 'Technology' },
  { n: 'CompTIA Network+', m: 4, c: 500, type: 'cert', prereq: 'CompTIA A+', icon: '💻' , subcategory: 'Technology' },
  { n: 'CompTIA Security+', m: 4, c: 600, type: 'cert', prereq: 'CompTIA Network+', icon: '🔐' , subcategory: 'Technology' },
  { n: 'Cybersecurity', m: 4, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🔐' , subcategory: 'Technology' },
  { n: 'Data Science', m: 4, c: 600, type: 'cert', prereq: 'Google Data Analytics', icon: '📊' , subcategory: 'Technology' },
  { n: 'Google Data Analytics', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '📈' , subcategory: 'Technology' },
  { n: 'Google IT Support', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💻' , subcategory: 'Technology' },
  { n: 'Graphic Design', m: 4, c: 500, type: 'cert', prereq: 'Adobe Certified Professional', icon: '🎨' , subcategory: 'General Skills' },
  { n: 'Microsoft Certified Azure Fundamentals', m: 3, c: 400, type: 'cert', prereq: 'Cloud Computing', icon: '☁️' , subcategory: 'General Skills' },
  { n: 'Microsoft Certified Azure Solutions Architect', m: 4, c: 600, type: 'cert', prereq: 'Microsoft Certified Azure Fundamentals', icon: '☁️' , subcategory: 'Technology' },
  { n: 'Software Development', m: 4, c: 600, type: 'cert', prereq: 'Software Testing', icon: '💻' , subcategory: 'Technology' },
  { n: 'Software Testing', m: 4, c: 500, type: 'cert', prereq: 'Google IT Support', icon: '🧪' , subcategory: 'Technology' },
  { n: 'Web Developer', m: 4, c: 600, type: 'cert', prereq: 'Software Development', icon: '🌐' , subcategory: 'Technology' },

  //Healthcare certs
  { n: 'Certified Nursing Assistant', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🩺' , subcategory: 'Healthcare' },
  { n: 'Computed Tomography', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔬' , subcategory: 'General Skills' },
  { n: 'Medical Assist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🩺' , subcategory: 'Healthcare' },
  { n: 'Medical Billing', m: 4, c: 450, type: 'cert', prereq: 'HS Diploma', icon: '📋' , subcategory: 'Healthcare' },
  { n: 'Medical Laboratory Scientist', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🧪' , subcategory: 'Healthcare' },
  { n: 'Dental Assistant', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦷' , subcategory: 'Healthcare' },
  { n: 'Emergency Medical Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🚑' , subcategory: 'Healthcare' },
  { n: 'Pharmacy Technician', m: 6, c: 650, type: 'cert', prereq: 'HS Diploma', icon: '💊' , subcategory: 'Healthcare' },
  { n: 'X-Ray Technician', m: 6, c: 650, type: 'cert', prereq: 'HS Diploma', icon: '🩻' , subcategory: 'Healthcare' },
  { n: 'Registered Nurse', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '🩺' , subcategory: 'General Skills' },
  { n: 'Respiratory Therapist', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🫁' , subcategory: 'General Skills' },
  { n: 'Sonographer', m: 12, c: 1000, type: 'cert', prereq: 'HS Diploma', icon: '🫀' , subcategory: 'General Skills' },
  { n: 'Surgical Technician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔪' , subcategory: 'Healthcare' },
  { n: 'Veterinary Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐾' , subcategory: 'Healthcare' },
  { n: 'Surgery Certificate', m: 12, c: 1500, type: 'cert', prereq: 'Medical School', icon: '🔪' , subcategory: 'General Skills' },

  // Construction certs
  { n: 'Construction Management', m: 6, c: 700, type: 'cert', prereq: 'Construction Project Management', icon: '🏗️' , subcategory: 'Trades' },
  { n: 'Construction Project Management', m: 6, c: 700, type: 'cert', prereq: 'Construction Estimating', icon: '🏗️' , subcategory: 'Business' },
  { n: 'Construction Estimating', m: 4, c: 500, type: 'cert', prereq: 'Construction Supervision', icon: '📐' , subcategory: 'Trades' },
  { n: 'Construction Supervision', m: 4, c: 500, type: 'cert', prereq: 'Construction Safety', icon: '👷' , subcategory: 'Trades' },
  { n: 'Construction Safety', m: 1, c: 200, type: 'cert', prereq: 'HS Diploma', icon: '⛑️' , subcategory: 'Trades' },
  { n: 'Electrician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '💡' , subcategory: 'Trades' },
  { n: 'HVAC', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '❄️' , subcategory: 'Trades' },
  { n: 'OSHA 10/30 Safety Cards', m: 1, c: 150, type: 'cert', prereq: 'HS Diploma', icon: '🦺' , subcategory: 'Trades' },
  { n: 'Welder', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🔥' , subcategory: 'Trades' },
  { n: 'Welding Inspector', m: 6, c: 700, type: 'cert', prereq: 'Welder', icon: '🕵️' , subcategory: 'General Skills' },
  { n: 'Plumbing Design', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚰' , subcategory: 'Trades' },

  { n: 'Court Reporter', m: 8, c: 800, type: 'cert', prereq: 'HS Diploma', icon: '📝' , subcategory: 'Legal & Public Safety' },
  { n: 'Culinary Arts', m: 6, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🍳' , subcategory: 'General Skills' },
  { n: 'Customer Service', m: 2, c: 250, type: 'cert', prereq: 'Help Desk', icon: '📞' , subcategory: 'General Skills' },
  
  //Education certs
  { n: 'Early Childhood Education', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🧸' , subcategory: 'Education & Counseling' },
  { n: 'Special Education', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '♿' , subcategory: 'Education & Counseling' },
  { n: 'Teaching English as a Second Language', m: 4, c: 500, type: 'cert', prereq: 'Bachelors Degree', icon: '🌎' , subcategory: 'General Skills' },
  { n: 'Teaching Certificate', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📚' , subcategory: 'General Skills' },

  //Real Estate
  { n: 'Real Estate', m: 3, c: 400, type: 'cert', prereq: null, icon: '🏠' , subcategory: 'General Skills' },
  { n: 'Real Estate Appraiser', m: 4, c: 500, type: 'cert', prereq: 'Real Estate', icon: '🏠' , subcategory: 'General Skills' },
  { n: 'Real Estate Broker', m: 6, c: 700, type: 'cert', prereq: 'Real Estate Appraiser', icon: '🏠' , subcategory: 'General Skills' },
  { n: 'Certified Financial Planner', m: 6, c: 700, type: 'cert', prereq: 'Financial Planning', icon: '💼' , subcategory: 'Business' },
  { n: 'Certified Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Financial Planning', icon: '📊' , subcategory: 'Business' },

  //Counseling
  { n: 'Substance Abuse Counselor', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '🩺' , subcategory: 'Education & Counseling' },
  { n: 'Social Work Case Manager', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '👩‍⚕️' , subcategory: 'General Skills' },
  { n: 'Mental Health Counselor', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '🧠' , subcategory: 'Education & Counseling' },
  { n: 'Marriage and Family Therapist', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '💑' , subcategory: 'General Skills' },
  { n: 'Rehabilitation Counselor', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '♿' , subcategory: 'Technology' },
  { n: 'Career Counselor', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '💼' , subcategory: 'Education & Counseling' },
  { n: 'School Counselor', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '🏫' , subcategory: 'Education & Counseling' },
  { n: 'Grief Counselor', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '🕊️' , subcategory: 'Education & Counseling' },


  //Business
  { n: 'Entrepreneurship', m: 3, c: 400, type: 'cert', prereq: 'Project Management', icon: '🚀' , subcategory: 'General Skills' },
  { n: 'Project Management', m: 4, c: 550, type: 'cert', prereq: 'Quality Control', icon: '📊' , subcategory: 'Business' },
  { n: 'Quality Control', m: 3, c: 350, type: 'cert', prereq: 'Supply Chain', icon: '✅' , subcategory: 'Technology' },
  { n: 'Retail Management', m: 4, c: 500, type: 'cert', prereq: 'Quality Control', icon: '🛍️' , subcategory: 'General Skills' },
  { n: 'Supply Chain', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📦' , subcategory: 'Business' },
  { n: 'Human Resources', m: 4, c: 500, type: 'cert', prereq: 'Help Desk', icon: '👥' , subcategory: 'Business' },
  { n: 'Sales', m: 2, c: 250, type: 'cert', prereq: 'HS Diploma', icon: '💰' , subcategory: 'Business' },
  { n: 'Food and Beverage', m: 2, c: 250, type: 'cert', prereq: null, icon: '🍽️' , subcategory: 'General Skills' },
  { n: 'Help Desk', m: 2, c: 300, type: 'cert', prereq: 'Sales', icon: '💻' , subcategory: 'General Skills' },
  { n: 'Telecommunications', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📞' , subcategory: 'General Skills' },
  { n: 'Paralegal', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '⚖️' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Secretary', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '🖋️' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Assistant', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '🖋️' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Research', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '🔍' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Writing', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '🖋️' , subcategory: 'Technology' },
  { n: 'Legal Ethics', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '⚖️' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Technology', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '💻', subcategory: 'Legal & Public Safety' },
  { n: 'Legal Project Management', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '📊' , subcategory: 'Business' },
  { n: 'Legal Compliance', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '✅' , subcategory: 'Legal & Public Safety' },
  { n: 'Legal Writing', m: 4, c: 500, type: 'cert', prereq: 'Paralegal', icon: '🖋️' , subcategory: 'Technology' },
  
  { n: 'Personal Training', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💪' , subcategory: 'General Skills' },
  { n: 'Yoga Instructor', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🧘' , subcategory: 'General Skills' },
  { n: 'Pilates Instructor', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🤸' , subcategory: 'General Skills' },
  { n: 'Massage Therapist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '💆' , subcategory: 'General Skills' },
  { n: 'Physical Therapy Assistant', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🩺' , subcategory: 'Healthcare' },
  { n: 'Occupational Therapy Assistant', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🩺' , subcategory: 'Healthcare' },
  { n: 'Athletic Trainer', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🏋️' , subcategory: 'General Skills' },
  

  { n: 'Rotorcraft Category Rating', m: 36, c: 650, type: 'cert', prereq: 'Bachelors Degree', icon: '✈️' , subcategory: 'Aviation' },
  { n: 'Commercial Pilot License', m: 36, c: 650, type: 'cert', prereq: 'Bachelors Degree', icon: '✈️' , subcategory: 'Aviation' },
  { n: 'Zoological Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦓' , subcategory: 'General Skills' },
  { n: 'Cosmetology Operator License', m: 6, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💇' , subcategory: 'General Skills' },
  { n: 'Air Traffic Control', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🛫' , subcategory: 'Aviation' },
  { n: 'Veterinary Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐾' , subcategory: 'Healthcare' },
  { n: 'Radiologic Technology', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🩻' , subcategory: 'Healthcare' },
  { n: 'Respiratory Therapy', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🫁' , subcategory: 'Healthcare' },
  { n: 'Dental Assist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦷' , subcategory: 'Healthcare' },
  { n: 'Optician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👓' , subcategory: 'General Skills' },
  { n: 'Mortuary Science', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '⚰️' , subcategory: 'General Skills' },
  { n: 'Criminal Justice', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👮' , subcategory: 'Legal & Public Safety' },
  { n: 'Forensic Science', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔬' , subcategory: 'General Skills' },
  { n: 'Criminal Justice', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👮' , subcategory: 'Legal & Public Safety' },
  { n: 'Pest Control', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐜' , subcategory: 'General Skills' },
  { n: 'Public Relations', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📢' , subcategory: 'General Skills' },
  { n: 'Event Planning', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🎉' , subcategory: 'General Skills' },
  
  
  
  








  //Military certs
  { n: 'Six Sigma Green Belt', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '✅' , subcategory: 'General Skills' },
  { n: 'Six Sigma Black Belt', m: 12, c: 700, type: 'cert', prereq: 'Six Sigma Green Belt', icon: '✅' , subcategory: 'General Skills' },
  { n: 'Infantry', m: 36, c: 0, type: 'cert', prereq: 'Military Academy', icon: '🎖️' , subcategory: 'Military' },
  { n: 'Special Forces', m: 36, c: 0, type: 'cert', prereq: 'Infantry', icon: '🪖' , subcategory: 'Military' },
  { n: 'Cyber Warfare', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '💻' , subcategory: 'Technology' },
  { n: 'Intelligence Analyst', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '🧠' , subcategory: 'General Skills' },
  { n: 'Logistics', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '📦' , subcategory: 'General Skills' },
  { n: 'Military Intelligence', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '🧠' , subcategory: 'Technology' },
  { n: 'Military Police', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '👮' , subcategory: 'Technology' },
  { n: 'Combat Medic', m: 12, c: 600, type: 'cert', prereq: 'Medical Assist', icon: '🩺' , subcategory: 'Military' },
  { n: 'Military Pilot', m: 36, c: 0, type: 'cert', prereq: 'Flight School', icon: '✈️' , subcategory: 'Technology' },
  { n: 'ASVAB Test', m: 1, c: 0, type: 'cert', prereq: 'Military Academy', icon: '🎖️' , subcategory: 'Military' },
  { n: 'Aviation Maintenance Technician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '✈️' , subcategory: 'General Skills' },
  { n: 'Combat Engineer', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '🏗️' , subcategory: 'Military' },
  { n: 'Military Communications', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '📡' , subcategory: 'Technology' },
  { n: 'Military Logistics', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '📦' , subcategory: 'Technology' },
 
  



]
