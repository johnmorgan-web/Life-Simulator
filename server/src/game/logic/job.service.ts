import { Injectable } from '@nestjs/common';
import { academyCourses } from '../../data/academyCourses.constants';
import jobBoard from '../../data/jobBoard.constants';

@Injectable()
export class JobService {
  private normalizeCredential(value: any): string {
    return String(value || '').trim().toLowerCase();
  }
  private WEALTH_NET_WORTH_REQUIREMENTS: Record<string, number> = {
    'Tech Startup Founder': 250000,
    Millionaire: 500000,
    Billionaire: 50000000,
  };

  private academyCredentialSet = new Set(academyCourses.map((course) => String(course?.n || '').trim()));
  private jobTitleSet = new Set(jobBoard.map((job) => String(job?.title || '').trim()));

  private normalizeEconomyOverrides(raw: any): {
    recessionSeverity: number;
    inflationPressure: number;
    jobAvailability: number;
  } {
    // jobAvailability is always 100, not event/admin modifiable
    if (!raw || typeof raw !== 'object') {
      return { recessionSeverity: 0, inflationPressure: 0, jobAvailability: 100 };
    }
    return {
      recessionSeverity: Math.max(0, Math.min(100, Math.round(Number(raw?.recessionSeverity || 0)))),
      inflationPressure: Math.max(0, Math.min(100, Math.round(Number(raw?.inflationPressure || 0)))),
      jobAvailability: 100,
    };
  }

  private CERT_ALIASES: Record<string, string> = {
    Security: 'Cybersecurity',
    'Content Marketing': 'Public Relations',
    'Animal Care': 'Veterinary Technician',
    'Special Operations': 'Special Forces',
    'SEAL Training': 'Special Forces',
    'Civil Engineering': 'Construction Management',
    'OSHA 10/30': 'OSHA 10/30 Safety Cards',
    'Welding': 'Welder',
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
    'Psychology': 'Mental Health Counselor',
    'Artificial Intelligence': 'Data Science',
  };

  private REQUIREMENT_ALIASES: Record<string, string> = {};

  private explicitExperienceRequirement(jobTitle: string): any {
    const ladders: Record<string, { roles: string[]; minMonths: number }> = {
      'Pilot': { roles: ['Air Traffic Controller', 'Military Pilot'], minMonths: 24 },
      'Airline Pilot': { roles: ['Pilot', 'Military Pilot'], minMonths: 36 },
      'Military Pilot': { roles: ['Air Force Airman', 'Navy Seaman'], minMonths: 18 },
      'Surgeon': { roles: ['Physician', 'Registered Nurse'], minMonths: 36 },
      'Physician': { roles: ['Registered Nurse', 'Medical Assistant'], minMonths: 36 },
      'Lawyer': { roles: ['Paralegal', 'Court Clerk'], minMonths: 24 },
      'Corporate Lawyer': { roles: ['Lawyer'], minMonths: 48 },
      'Software Architect': { roles: ['Software Dev', 'Software Tester'], minMonths: 24 },
      'Data Scientist': { roles: ['Data Analyst'], minMonths: 18 },
      'AI Researcher': { roles: ['Data Scientist', 'Research Scientist'], minMonths: 18 },
      'Investment Banker': { roles: ['Financial Analyst', 'Accountant'], minMonths: 18 },
      'University Professor': { roles: ['Lab Researcher', 'Research Scientist'], minMonths: 36 },
    };
    return ladders[jobTitle] || null;
  }

  private hasAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private roleFamilyKeywords(title: string): string[] {
    const t = title.toLowerCase();
    if (this.hasAnyKeyword(t, ['pilot', 'air']))
      return ['pilot', 'air traffic controller', 'military pilot', 'airman', 'seaman'];
    if (this.hasAnyKeyword(t, ['doctor', 'surgeon', 'nurse', 'physician']))
      return ['physician', 'nurse', 'medical assistant', 'surgeon'];
    if (this.hasAnyKeyword(t, ['lawyer', 'court', 'legal']))
      return ['lawyer', 'paralegal', 'court clerk', 'legal'];
    if (this.hasAnyKeyword(t, ['software', 'data', 'ai', 'architect']))
      return ['software', 'data', 'ai', 'architect', 'developer', 'scientist'];
    if (this.hasAnyKeyword(t, ['finance', 'bank', 'account', 'advisor']))
      return ['accountant', 'financial analyst', 'investment banker', 'finance'];
    if (this.hasAnyKeyword(t, ['engineer', 'architect']))
      return ['engineer', 'architect', 'construction'];
    return [];
  }

  private inferBaseCapacity(job: any): number {
    const category = String(job?.cat || 'Pro');
    const salary = Number(job?.base || 0);
    if (category === 'Entry') return 24;
    if (category === 'Military') return 12;
    if (category === 'Trades') return 14;
    if (category === 'Healthcare') return 10;
    if (category === 'Technology') return 10;
    if (salary >= 10000) return 4;
    if (salary >= 7000) return 6;
    return 8;
  }

  private normalizeJobRequirements(job: any): {
    resolvedReq: string | null;
    resolvedCertReq: string | null;
    roleReqFromReq: string | null;
  } {
    const rawReq = String(job?.req || '').trim();
    const rawCertReq = String(job?.certReq || '').trim();

    const aliasedReq = rawReq ? (this.REQUIREMENT_ALIASES[rawReq] ?? rawReq) : '';
    const aliasedCertReq = rawCertReq ? (this.CERT_ALIASES[rawCertReq] ?? rawCertReq) : '';

    const resolvedReq = aliasedReq && this.academyCredentialSet.has(aliasedReq) ? aliasedReq : null;
    const roleReqFromReq = aliasedReq && !resolvedReq && this.jobTitleSet.has(aliasedReq) ? aliasedReq : null;
    const resolvedCertReq = aliasedCertReq && this.academyCredentialSet.has(aliasedCertReq) ? aliasedCertReq : null;

    return {
      resolvedReq,
      resolvedCertReq,
      roleReqFromReq,
    };
  }

  getRoleExperienceMonths(state: any, roleTitle: string): number {
    let months = 0;
    if (state.job?.title === roleTitle) months += state.tenure || 0;
    const history = Array.isArray(state.careerHistory) ? state.careerHistory : [];
    for (const role of history) {
      if (role?.title === roleTitle) {
        months += Number(role?.months || 0);
      }
    }
    return months;
  }

  private titleSeed(title: string): number {
    let h = 0;
    for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    return h;
  }

  private estimatePortfolioCostBasis(state: any): number {
    const portfolio = Array.isArray(state?.portfolio) ? state.portfolio : [];
    return portfolio.reduce((sum: number, holding: any) => {
      const shares = Number(holding?.shares || 0);
      const avgCost = Number(holding?.avgCost || 0);
      return sum + (shares * avgCost);
    }, 0);
  }

  private estimateVehicleAssets(state: any): number {
    const garage = Array.isArray(state?.garage) ? state.garage : [];
    return garage.reduce((sum: number, vehicle: any) => {
      const currentValue = Number(vehicle?.currentValue || 0);
      if (currentValue > 0) return sum + currentValue;
      const purchasePrice = Number(vehicle?.purchasePrice || 0);
      return purchasePrice > 0 ? sum + purchasePrice * 0.7 : sum;
    }, 0);
  }

  private estimateRealEstateEquity(state: any): number {
    const properties = Array.isArray(state?.investmentProperties) ? state.investmentProperties : [];
    return properties.reduce((sum: number, property: any) => {
      const value = Number(property?.propertyValue || 0);
      const loan = Number(property?.loanBalance || 0);
      return sum + Math.max(0, value - loan);
    }, 0);
  }

  private computeNetWorth(state: any): number {
    const checking = Number(state?.check || 0);
    const savings = Number(state?.savings || 0);
    const prices: Record<string, number> = state?.marketPrices && typeof state.marketPrices === 'object' ? state.marketPrices : {};
    const portfolio = (Array.isArray(state?.portfolio) ? state.portfolio : []).reduce((sum: number, holding: any) => {
      const shares = Number(holding?.shares || 0);
      const ticker = String(holding?.ticker || '');
      const price = Number(prices[ticker] || 0) || Number(holding?.avgCost || 0);
      return sum + (shares * price);
    }, 0);
    const vehicles = this.estimateVehicleAssets(state);
    const realEstateEquity = this.estimateRealEstateEquity(state);
    const debt = Math.abs(Number(state?.debt || 0));
    return checking + savings + portfolio + vehicles + realEstateEquity - debt;
  }

  capacityForJob(job: any, rankInTrack: number): number {
    const baseByCategory: Record<string, number> = {
      Entry: 36,
      Skilled: 20,
      Military: 14,
      Pro: 8,
    };
    const base = baseByCategory[job.cat || 'Pro'] || 24;
    const drop = Math.min(30, rankInTrack * 6);
    const salaryPressure = Math.max(0, (Number(job.base || 0) - 5000) / 10000);
    const scarcityCut = Math.round(salaryPressure * 6);
    return Math.max(1, base - drop - scarcityCut);
  }

  private inferTrackIndex(job: any): number {
    const targetTitle = String(job?.title || '').trim();
    const targetCat = String(job?.cat || '').trim();
    const targetSubcat = String(job?.subcat || '').trim();
    if (!targetTitle) return -1;

    const sameTrack = jobBoard
      .filter((candidate: any) =>
        String(candidate?.cat || '').trim() === targetCat
        && String(candidate?.subcat || '').trim() === targetSubcat,
      )
      .sort((a: any, b: any) => Number(a?.base || 0) - Number(b?.base || 0));

    return sameTrack.findIndex((candidate: any) => String(candidate?.title || '').trim() === targetTitle);
  }

  private inferTrackExperienceMonths(job: any): number {
    const idx = this.inferTrackIndex(job);
    if (idx < 0) return 6;
    if (idx >= 4) return 12;
    if (idx >= 2) return 6;
    return 3;
  }

  getJobOpenings(state: any, job: any): number {
    const slot = state.jobMarket?.[job.title];
    const economy = this.normalizeEconomyOverrides(state?.economyOverrides);
    const inferredCapacity = this.inferBaseCapacity(job);
    const baseCapacity = Math.max(
      1,
      Number(slot?.capacity || 0),
      Number(job?.capacity || 0),
      Number(inferredCapacity || 1),
    );
    const demandMultiplier = Math.max(0.35, Math.min(1.9,
      (1) // jobAvailability is always 100, so this is 1
      * (1 - economy.recessionSeverity * 0.004)
      * (1 - economy.inflationPressure * 0.0015),
    ));
    const dynamicCapacity = Math.max(1, Math.round(baseCapacity * demandMultiplier));
    const cityUsers = Math.max(1, Number(state?.cityUserCount || 1));

    const storedCapacity = Math.max(1, Number(slot?.capacity || 0), dynamicCapacity);
    const storedOccupied = slot?.occupied ?? Math.floor(dynamicCapacity * 0.68);
    const occupiedRatio = storedCapacity > 0 ? storedOccupied / storedCapacity : 0.75;
    const salaryPressure = Math.max(0, Math.min(0.2, (Number(job.base || 0) - 4000) / 40000));
    const month = Number(state?.month || 1);
    const year = Number(state?.year || 2026);
    const monthlyPulseSeed = this.titleSeed(`${job.title}-${month}-${year}`);
    const monthlyPulse = ((monthlyPulseSeed % 9) - 4) / 100;
    const cityCompetitionPressure = (() => {
      const extraUsers = Math.max(0, cityUsers - 1);
      if ((job.cat || 'Pro') === 'Entry') return Math.min(0.05, extraUsers * 0.01);
      return Math.min(0.28, 0.03 + extraUsers * 0.025);
    })();
    const macroPressure = Math.max(0, Math.min(0.35,
      economy.recessionSeverity * 0.003
      + economy.inflationPressure * 0.0018
      // jobAvailability is always 100, so this term is always 0
      // - (economy.jobAvailability - 100) * 0.0015
    ));
    const marketPressure = Math.max(0, Math.min(0.45, salaryPressure + monthlyPulse + cityCompetitionPressure + macroPressure));
    const pressuredRatio = Math.max(0.6, Math.min(0.98, occupiedRatio + marketPressure));
    const dynamicOccupied = Math.min(dynamicCapacity, Math.max(0, Math.round(dynamicCapacity * pressuredRatio)));

    return Math.max(0, dynamicCapacity - dynamicOccupied);
  }

  getJobEligibility(state: any, job: any): any {
    const normalized = this.normalizeJobRequirements(job);
    const resolvedReq = normalized.resolvedReq;
    const resolvedCertReq = normalized.resolvedCertReq;
    const roleReqFromReq = normalized.roleReqFromReq;

    const credentials = Array.isArray(state?.credentials) ? state.credentials : [];
    const normalizedCredentials = new Set(
      credentials.map((value: any) => this.normalizeCredential(value)).filter(Boolean),
    );
    const educationMet = !resolvedReq || normalizedCredentials.has(this.normalizeCredential(resolvedReq));
    const certificationMet = !resolvedCertReq || normalizedCredentials.has(this.normalizeCredential(resolvedCertReq));
    const transitMet = state.transit.level >= job.tReq;
    const netWorth = this.computeNetWorth(state);
    const wealthRequirement = Number(this.WEALTH_NET_WORTH_REQUIREMENTS[job.title] || 0);
    const wealthMet = wealthRequirement <= 0 || netWorth >= wealthRequirement;
    const openings = this.getJobOpenings(state, job);
    const capacityMet = openings > 0;

    let experienceMet = true;
    let experienceDetail = '';
    if (job.expReq && Array.isArray(job.expReq.roles) && job.expReq.roles.length > 0) {
      const reqMonths = job.expReq.minMonths || 0;
      const actualMonths = job.expReq.roles.reduce((max: number, role: string) => {
        return Math.max(max, this.getRoleExperienceMonths(state, role));
      }, 0);
      experienceMet = actualMonths >= reqMonths;
      experienceDetail = `${actualMonths}/${reqMonths} months`;
    } else if (roleReqFromReq) {
      const explicit = this.explicitExperienceRequirement(String(job?.title || ''));
      const reqMonths = Number(explicit?.minMonths || this.inferTrackExperienceMonths(job));
      const actualMonths = this.getRoleExperienceMonths(state, roleReqFromReq);
      experienceMet = actualMonths >= reqMonths;
      experienceDetail = `${actualMonths}/${reqMonths} months in ${roleReqFromReq}`;
    }

    return {
      canApply: educationMet && certificationMet && transitMet && experienceMet && capacityMet && wealthMet,
      educationMet,
      certificationMet,
      transitMet,
      experienceMet,
      wealthMet,
      wealthRequirement,
      netWorth,
      capacityMet,
      experienceDetail,
      openings,
      resolvedReq,
      resolvedCertReq,
    };
  }

  initializeJobMarket(jobs: any[]): Record<string, any> {
    const market: Record<string, any> = {};
    for (const job of jobs) {
      const capacity = Math.max(1, Number(job?.capacity ?? this.inferBaseCapacity(job)));
      market[job.title] = {
        capacity,
        occupied: Math.min(capacity - 1, Math.max(0, Math.floor(capacity * 0.68))),
      };
    }
    return market;
  }
}
