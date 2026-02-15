import type { AcademyCourse } from "../types/models.types"

const academyCourses: AcademyCourse[] = [
  // Degrees with prerequisites
  { n: 'HS Diploma', m: 1, c: 200, type: 'degree', prereq: null, icon: '📚' },
  { n: 'Trade Cert', m: 3, c: 800, type: 'degree', prereq: 'HS Diploma', icon: '🔧' },
  { n: 'Bachelors Degree', m: 24, c: 1200, type: 'degree', prereq: 'HS Diploma', icon: '🎓' },
  { n: 'Masters Degree', m: 12, c: 3000, type: 'degree', prereq: 'Bachelors Degree', icon: '🎩' },
  { n: 'PhD', m: 30, c: 5000, type: 'degree', prereq: 'Masters Degree', icon: '🧑‍🎓' },
  { n: 'Medical School', m: 24, c: 10000, type: 'degree', prereq: 'Bachelors Degree', icon: '🏥' },
  { n: 'Flight School', m: 6, c: 6000, type: 'degree', prereq: 'Bachelors Degree', icon: '✈️' },
  { n: 'Law School', m: 36, c: 15000, type: 'degree', prereq: 'Bachelors Degree', icon: '⚖️' },
  { n: 'MBA', m: 12, c: 4000, type: 'degree', prereq: 'Bachelors Degree', icon: '💼' },
  { n: 'Military Academy', m: 36, c: 0, type: 'degree', prereq: 'HS Diploma', icon: '🎖️' },
  { n: 'Coding Bootcamp', m: 6, c: 2000, type: 'degree', prereq: 'HS Diploma', icon: '💻' },
  { n: 'Culinary School', m: 12, c: 8000, type: 'degree', prereq: 'Culinary Arts', icon: '🍳' },

  // Certifications (alphabetical)
  
  { n: 'Auto Service', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚗' },
  { n: 'Commercial Drivers License', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '🚛' },
  { n: 'Truck Driver', m: 4, c: 500, type: 'cert', prereq: 'Commercial Drivers License', icon: '🚚' },
   
  
  //Finance certs
  { n: 'Certified Personal Finance Counselor', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💰' },
  { n: 'Certified Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📊' },
  { n: 'Certified Supply Chain Professional', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📦' },
  { n: 'Financial Analysis', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📈' },  
  { n: 'Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📊' },
  { n: 'Certified Financial Planner', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '💼' },
  { n: 'Certified Public Accountant', m: 6, c: 700, type: 'cert', prereq: 'Certified Financial Planner', icon: '📊' }, 
  { n: 'Project Management Professional', m: 4, c: 550, type: 'cert', prereq: 'HS Diploma', icon: '📊' },
  { n: 'Tax Preparation', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💰' },
  
  //Computer/IT certs
  
  { n: 'AWS Certified Solutions Architect', m: 4, c: 600, type: 'cert', prereq: 'Coding Bootcamp', icon: '☁️' },
  { n: 'AWS Certified Cloud Practitioner', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '☁️' },
  { n: 'AWS Certified Developer', m: 4, c: 600, type: 'cert', prereq: 'AWS Certified Solutions Architect', icon: '☁️' },
  { n: 'Architectural Drafter', m: 6, c: 600, type: 'cert', prereq: 'AutoCAD', icon: '📐' },
  { n: 'AutoCAD', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🖌️' },
  { n: 'Adobe Certified Professional', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🖌️' },
  { n: 'Certified Ethical Hacker', m: 4, c: 600, type: 'cert', prereq: 'CompTIA Security+', icon: '🕵️‍♂️' },
  { n: 'Certified Professional Coder', m: 4, c: 500, type: 'cert', prereq: 'Software Development', icon: '📋' },
  { n: 'Certified Scrum Master', m: 2, c: 300, type: 'cert', prereq: 'HS Diploma', icon: '📈' },  
  { n: 'Cloud Computing', m: 3, c: 400, type: 'cert', prereq: 'AWS Certified Cloud Practitioner', icon: '☁️' },
  { n: 'CompTIA A+', m: 3, c: 400, type: 'cert', prereq: 'Cybersecurity', icon: '💻' },
  { n: 'CompTIA Network+', m: 4, c: 500, type: 'cert', prereq: 'CompTIA A+', icon: '💻' },
  { n: 'CompTIA Security+', m: 4, c: 600, type: 'cert', prereq: 'CompTIA Network+', icon: '🔐' },
  { n: 'Cybersecurity', m: 4, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🔐' },  
  { n: 'Data Science', m: 4, c: 600, type: 'cert', prereq: 'Google Data Analytics', icon: '📊' },
  { n: 'Google Data Analytics', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '📈' },
  { n: 'Google IT Support', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💻' },
  { n: 'Graphic Design', m: 4, c: 500, type: 'cert', prereq: 'Adobe Certified Professional', icon: '🎨' }, 
  { n: 'Microsoft Certified Azure Fundamentals', m: 3, c: 400, type: 'cert', prereq: 'Cloud Computing', icon: '☁️' },
  { n: 'Microsoft Certified Azure Solutions Architect', m: 4, c: 600, type: 'cert', prereq: 'Microsoft Certified Azure Fundamentals', icon: '☁️' },
  { n: 'Software Development', m: 4, c: 600, type: 'cert', prereq: 'Software Testing', icon: '💻' },
  { n: 'Software Testing', m: 4, c: 500, type: 'cert', prereq: 'Google IT Support', icon: '🧪' },
  { n: 'Web Developer', m: 4, c: 600, type: 'cert', prereq: 'Software Development', icon: '🌐' },

  //Healthcare certs
  { n: 'Certified Nursing Assistant', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🩺' },
  { n: 'Computed Tomography', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔬' },
  { n: 'Medical Assist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🩺' },
  { n: 'Medical Billing', m: 4, c: 450, type: 'cert', prereq: 'HS Diploma', icon: '📋' },
  { n: 'Medical Laboratory Scientist', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🧪' },
  { n: 'Dental Assistant', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦷' },
  { n: 'Emergency Medical Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🚑' },
  { n: 'Pharmacy Technician', m: 6, c: 650, type: 'cert', prereq: 'HS Diploma', icon: '💊' },
  { n: 'X-Ray Technician', m: 6, c: 650, type: 'cert', prereq: 'HS Diploma', icon: '🩻' },
  { n: 'Registered Nurse', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '🩺' },
  { n: 'Respiratory Therapist', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🫁' },
  { n: 'Sonographer', m: 12, c: 1000, type: 'cert', prereq: 'HS Diploma', icon: '🫀' },
  { n: 'Surgical Technician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔪' },
  { n: 'Veterinary Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐾' },
  { n: 'Surgery Certificate', m: 12, c: 1500, type: 'cert', prereq: 'Medical School', icon: '🔪' },

  // Construction certs
  { n: 'Construction Management', m: 6, c: 700, type: 'cert', prereq: 'Construction Project Management', icon: '🏗️' },
  { n: 'Construction Project Management', m: 6, c: 700, type: 'cert', prereq: 'Construction Estimating', icon: '🏗️' },
  { n: 'Construction Estimating', m: 4, c: 500, type: 'cert', prereq: 'Construction Supervision', icon: '📐' },
  { n: 'Construction Supervision', m: 4, c: 500, type: 'cert', prereq: 'Construction Safety', icon: '👷' },
  { n: 'Construction Safety', m: 1, c: 200, type: 'cert', prereq: 'HS Diploma', icon: '⛑️' },
  { n: 'Electrician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '💡' },
  { n: 'HVAC', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '❄️' },
  { n: 'OSHA 10/30 Safety Cards', m: 1, c: 150, type: 'cert', prereq: 'HS Diploma', icon: '🦺' },
  { n: 'Welder', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🔥' },
  { n: 'Welding Inspector', m: 6, c: 700, type: 'cert', prereq: 'Welder', icon: '🕵️' },
  { n: 'Plumbing Design', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🚰' },

  { n: 'Court Reporter', m: 8, c: 800, type: 'cert', prereq: 'HS Diploma', icon: '📝' },
  { n: 'Culinary Arts', m: 6, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '🍳' },
  { n: 'Customer Service', m: 2, c: 250, type: 'cert', prereq: 'Help Desk', icon: '📞' },
  
  //Education certs
  { n: 'Early Childhood Education', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🧸' },
  { n: 'Special Education', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '♿' },
  { n: 'Teaching English as a Second Language', m: 4, c: 500, type: 'cert', prereq: 'Bachelors Degree', icon: '🌎' },
  { n: 'Teaching Certificate', m: 6, c: 700, type: 'cert', prereq: 'Bachelors Degree', icon: '📚' },

  //Real Estate
  { n: 'Real Estate', m: 3, c: 400, type: 'cert', prereq: null, icon: '🏠' },
  { n: 'Real Estate Appraiser', m: 4, c: 500, type: 'cert', prereq: 'Real Estate', icon: '🏠' },
  { n: 'Real Estate Broker', m: 6, c: 700, type: 'cert', prereq: 'Real Estate Appraiser', icon: '🏠' },

  //Counseling
  { n: 'Substance Abuse Counselor', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '🩺' },
  { n: 'Social Work Case Manager', m: 6, c: 600, type: 'cert', prereq: 'Bachelors Degree', icon: '👩‍⚕️' },


  //Business
  { n: 'Entrepreneurship', m: 3, c: 400, type: 'cert', prereq: 'Project Management', icon: '🚀' },
  { n: 'Project Management', m: 4, c: 550, type: 'cert', prereq: 'Quality Control', icon: '📊' },
  { n: 'Quality Control', m: 3, c: 350, type: 'cert', prereq: 'Supply Chain', icon: '✅' },
  { n: 'Retail Management', m: 4, c: 500, type: 'cert', prereq: 'Quality Control', icon: '🛍️' },
  { n: 'Supply Chain', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📦' },
  { n: 'Human Resources', m: 4, c: 500, type: 'cert', prereq: 'Help Desk', icon: '👥' },
  { n: 'Sales', m: 2, c: 250, type: 'cert', prereq: 'HS Diploma', icon: '💰' },
  { n: 'Food and Beverage', m: 2, c: 250, type: 'cert', prereq: null, icon: '🍽️' },
  { n: 'Help Desk', m: 2, c: 300, type: 'cert', prereq: 'Sales', icon: '💻' },
  { n: 'Telecommunications', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📞' },
  { n: 'Paralegal', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '⚖️' },
  
  
  { n: 'Personal Training', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '💪' },
  { n: 'Yoga Instructor', m: 3, c: 400, type: 'cert', prereq: 'HS Diploma', icon: '🧘' },
  

  { n: 'Rotorcraft Category Rating', m: 36, c: 650, type: 'cert', prereq: 'Bachelors Degree', icon: '✈️' },
  { n: 'Commercial Pilot License', m: 36, c: 650, type: 'cert', prereq: 'Bachelors Degree', icon: '✈️' },  
  { n: 'Zoological Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦓' },
  { n: 'Cosmetology Operator License', m: 6, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '💇' },
  { n: 'Air Traffic Control', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🛫' },
  { n: 'Veterinary Technician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐾' },
  { n: 'Radiologic Technology', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🩻' },
  { n: 'Respiratory Therapy', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🫁' },
  { n: 'Dental Assist', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🦷' },
  { n: 'Optician', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👓' },
  { n: 'Mortuary Science', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '⚰️' },
  { n: 'Criminal Justice', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👮' },
  { n: 'Forensic Science', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '🔬' },
  { n: 'Criminal Justice', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '👮' },
  { n: 'Pest Control', m: 6, c: 600, type: 'cert', prereq: 'HS Diploma', icon: '🐜' },
  { n: 'Public Relations', m: 4, c: 500, type: 'cert', prereq: 'HS Diploma', icon: '📢' },
  








  //Military certs
  { n: 'Six Sigma Green Belt', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '✅' },
  { n: 'Six Sigma Black Belt', m: 12, c: 700, type: 'cert', prereq: 'Six Sigma Green Belt', icon: '✅' },
  { n: 'Infantry', m: 36, c: 0, type: 'cert', prereq: 'Military Academy', icon: '🎖️' },
  { n: 'Special Forces', m: 36, c: 0, type: 'cert', prereq: 'Infantry', icon: '🪖' },
  { n: 'Cyber Warfare', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '💻' },
  { n: 'Intelligence Analyst', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '🧠' },
  { n: 'Logistics', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '📦' },
  { n: 'Military Intelligence', m: 12, c: 600, type: 'cert', prereq: 'Infantry', icon: '🧠' },
  { n: 'Military Police', m: 12, c: 500, type: 'cert', prereq: 'Infantry', icon: '👮' },
  { n: 'Combat Medic', m: 12, c: 600, type: 'cert', prereq: 'Medical Assist', icon: '🩺' },
  { n: 'Military Pilot', m: 36, c: 0, type: 'cert', prereq: 'Flight School', icon: '✈️' },
  { n: 'ASVAB Test', m: 1, c: 0, type: 'cert', prereq: 'Military Academy', icon: '🎖️' },
  { n: 'Aviation Maintenance Technician', m: 6, c: 700, type: 'cert', prereq: 'HS Diploma', icon: '✈️' },


]

export default academyCourses
