import { Injectable } from '@nestjs/common';

@Injectable()
export class JobService {
  private CERT_ALIASES: Record<string, string> = {
    'Content Marketing': 'Public Relations',
    'Special Operations': 'Special Forces',
    'Civil Engineering': 'Construction Management',
    'Welding': 'Welder',
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

  private REQUIREMENT_ALIASES: Record<string, string> = {
    'Veterinary School': 'Bachelors Degree',
    'Pharmacy School': 'Bachelors Degree',
    'Dental School': 'Bachelors Degree',
  };

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

  capacityForJob(job: any, rankInTrack: number): number {
    const baseByCategory: Record<string, number> = {
      Entry: 60,
      Skilled: 35,
      Military: 25,
      Pro: 15,
    };
    const base = baseByCategory[job.cat || 'Pro'] || 80;
    const drop = Math.min(55, rankInTrack * 12);
    return Math.max(3, base - drop);
  }

  getJobOpenings(state: any, job: any): number {
    const slot = state.jobMarket?.[job.title];
    const baseCapacity = job.capacity ?? slot?.capacity ?? 1;
    const dynamicCapacity = Math.max(1, Math.round(baseCapacity * 1)); // Scale would go here

    const storedCapacity = slot?.capacity ?? dynamicCapacity;
    const storedOccupied = slot?.occupied ?? Math.floor(dynamicCapacity * 0.75);
    const occupiedRatio = storedCapacity > 0 ? storedOccupied / storedCapacity : 0.75;
    const dynamicOccupied = Math.min(dynamicCapacity, Math.max(0, Math.round(dynamicCapacity * occupiedRatio)));

    return Math.max(0, dynamicCapacity - dynamicOccupied);
  }

  getJobEligibility(state: any, job: any): any {
    const resolvedReq = job.req ? (this.REQUIREMENT_ALIASES[job.req] ?? job.req) : null;
    const educationMet = !resolvedReq || state.credentials.includes(resolvedReq);
    const resolvedCertReq = job.certReq ? (this.CERT_ALIASES[job.certReq] ?? job.certReq) : null;
    const certificationMet = !resolvedCertReq || state.credentials.includes(resolvedCertReq);
    const transitMet = state.transit.level >= job.tReq;
    const openings = this.getJobOpenings(state, job);
    const capacityMet = openings > 0;

    let experienceMet = true;
    let experienceDetail = '';
    if (job.expReq && job.expReq.roles.length > 0) {
      const reqMonths = job.expReq.minMonths || 0;
      const actualMonths = job.expReq.roles.reduce((max: number, role: string) => {
        return Math.max(max, this.getRoleExperienceMonths(state, role));
      }, 0);
      experienceMet = actualMonths >= reqMonths;
      experienceDetail = `${actualMonths}/${reqMonths} months`;
    }

    return {
      canApply: educationMet && certificationMet && transitMet && experienceMet && capacityMet,
      educationMet,
      certificationMet,
      transitMet,
      experienceMet,
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
      market[job.title] = {
        capacity: job.capacity ?? 1,
        occupied: Math.floor((job.capacity ?? 1) * 0.75),
      };
    }
    return market;
  }
}
