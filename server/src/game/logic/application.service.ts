import { Injectable } from '@nestjs/common';
import { JobService } from './job.service';
import jobBoard from '../../data/jobBoard.constants';

@Injectable()
export class ApplicationService {
  constructor(private readonly jobService: JobService) {}

  private isDecisionDue(decisionMonth: number, decisionYear: number, currentMonth: number, currentYear: number): boolean {
    if (decisionYear < currentYear) return true;
    if (decisionYear > currentYear) return false;
    return decisionMonth <= currentMonth;
  }

  getJobEligibilityMap(state: any, jobTitles?: string[]): { eligibilities: Record<string, any> } {
    const requestedTitles = Array.isArray(jobTitles)
      ? Array.from(new Set(jobTitles.map((title: any) => String(title || '').trim()).filter(Boolean)))
      : [];
    const jobs = (requestedTitles.length > 0 ? requestedTitles : jobBoard.map((job: any) => String(job?.title || '').trim()))
      .map((title) => jobBoard.find((job: any) => String(job?.title || '').trim() === title))
      .filter(Boolean);

    const eligibilities = jobs.reduce((acc: Record<string, any>, job: any) => {
      acc[job.title] = this.jobService.getJobEligibility(state, job);
      return acc;
    }, {});

    return { eligibilities };
  }

  private scoreApplication(state: any, job: any): number {
    let score = 50;
    const eligibility = this.jobService.getJobEligibility(state, job);

    if (eligibility.resolvedReq) {
      if (Array.isArray(state.credentials) && state.credentials.includes(eligibility.resolvedReq)) score += 20;
      else score -= 15;
    } else score += 10;

    if (eligibility.resolvedCertReq) {
      if (Array.isArray(state.credentials) && state.credentials.includes(eligibility.resolvedCertReq)) score += 15;
      else score -= 10;
    } else score += 5;

    if ((state.credit || 0) >= 740) score += 10;
    else if ((state.credit || 0) >= 670) score += 5;
    else if ((state.credit || 0) < 580) score -= 10;

    if ((state.tenure || 0) >= 12) score += 15;
    else if ((state.tenure || 0) >= 6) score += 10;
    else if ((state.tenure || 0) >= 3) score += 5;

    if (job.expReq) {
      if (eligibility.experienceMet) score += 20;
      else score -= 20;
    }

    if (eligibility.openings <= 0) score -= 10;
    else if (eligibility.openings <= 3) score += 2;
    else score += 6;

    const history = Array.isArray(state.careerHistory) ? state.careerHistory : [];
    if (history.length > 3) score += 10;
    else if (history.length > 0) score += 5;

    if (Array.isArray(state.credentials) && state.credentials.length > 0) score += 10;

    score = Math.max(0, Math.min(100, score));
    score += Math.random() * 20 - 10;
    return Math.round(score);
  }

  applyForJob(state: any, jobTitle: string): {
    applications: any[];
    logs: any[];
    logEntries: any[];
    applied: boolean;
    reason?: string;
  } {
    const title = String(jobTitle || '').trim();
    const applications = Array.isArray(state?.applications)
      ? state.applications.map((app: any) => ({ ...app }))
      : [];
    const logs = Array.isArray(state?.logs) ? [...state.logs] : [];
    const logEntries: any[] = [];

    if (!title) {
      return { applications, logs, logEntries, applied: false, reason: 'invalid-job' };
    }

    const job = jobBoard.find((j: any) => String(j?.title || '') === title);
    if (!job) {
      const entry = { date: `${state?.month || 0}/${state?.year || 0}`, msg: `Application blocked for ${title}: job not found` };
      logs.push(entry);
      logEntries.push(entry);
      return { applications, logs, logEntries, applied: false, reason: 'job-not-found' };
    }

    const existingPending = applications.some(
      (app: any) => app?.job?.title === job.title && app?.status === 'pending',
    );
    if (existingPending) {
      const entry = { date: `${state?.month || 0}/${state?.year || 0}`, msg: `Already applied: ${job.title}` };
      logs.push(entry);
      logEntries.push(entry);
      return { applications, logs, logEntries, applied: false, reason: 'already-applied' };
    }

    const eligibility = this.jobService.getJobEligibility(state, job);
    if (!eligibility.canApply) {
      const blocks: string[] = [];
      if (!eligibility.educationMet) blocks.push(`education (${eligibility.resolvedReq ?? job.req})`);
      if (!eligibility.certificationMet) blocks.push(`certification (${eligibility.resolvedCertReq ?? job.certReq})`);
      if (!eligibility.transitMet) blocks.push(`transit level ${job.tReq}`);
      if (!eligibility.experienceMet) blocks.push(`experience (${eligibility.experienceDetail})`);
      if (!eligibility.wealthMet) {
        const required = Number(eligibility.wealthRequirement || 0);
        const current = Number(eligibility.netWorth || 0);
        blocks.push(`net worth ($${Math.round(current).toLocaleString()} / $${Math.round(required).toLocaleString()})`);
      }
      if (!eligibility.capacityMet) blocks.push('no openings');
      if (blocks.length === 0) blocks.push('requirements not met');
      const entry = {
        date: `${state?.month || 0}/${state?.year || 0}`,
        msg: `Application blocked for ${job.title}: ${blocks.join(', ')}`,
      };
      logs.push(entry);
      logEntries.push(entry);
      return { applications, logs, logEntries, applied: false, reason: 'ineligible' };
    }

    const score = this.scoreApplication(state, job);
    const appliedMonth = Number(state?.month || 0);
    const appliedYear = Number(state?.year || 0);
    const decisionMonthRaw = appliedMonth + 1 + Math.floor(Math.random() * 3);
    let decisionMonth = decisionMonthRaw;
    let decisionYear = appliedYear;
    if (decisionMonth > 12) {
      decisionYear += Math.floor(decisionMonth / 12);
      decisionMonth = decisionMonth % 12 || 12;
    }

    const variability = Number(job.base || 0) * 0.05;
    const adjustedBase = Number(job.base || 0) + (Math.random() * variability * 2 - variability);
    const offeredJob = { ...job, base: adjustedBase };

    applications.push({
      id: `app_${Date.now()}`,
      job: offeredJob,
      appliedMonth,
      appliedYear,
      decisionMonth,
      decisionYear,
      score,
      status: 'pending',
    });

    const appliedEntry = { date: `${appliedMonth}/${appliedYear}`, msg: `Applied for ${job.title}` };
    logs.push(appliedEntry);
    logEntries.push(appliedEntry);
    return { applications, logs, logEntries, applied: true };
  }

  unapplyForJob(state: any, jobTitle: string): {
    applications: any[];
    logs: any[];
    logEntries: any[];
    unapplied: boolean;
    reason?: string;
  } {
    const title = String(jobTitle || '').trim();
    const applications = Array.isArray(state?.applications)
      ? state.applications.map((app: any) => ({ ...app }))
      : [];
    const logs = Array.isArray(state?.logs) ? [...state.logs] : [];
    const logEntries: any[] = [];

    if (!title) {
      return { applications, logs, logEntries, unapplied: false, reason: 'invalid-job' };
    }

    const pendingIndex = applications.findIndex(
      (app: any) => app?.job?.title === title && String(app?.status || '') === 'pending',
    );

    if (pendingIndex < 0) {
      const entry = { date: `${state?.month || 0}/${state?.year || 0}`, msg: `Unapply skipped for ${title}: no pending application found` };
      logs.push(entry);
      logEntries.push(entry);
      return { applications, logs, logEntries, unapplied: false, reason: 'not-pending' };
    }

    applications.splice(pendingIndex, 1);
    const entry = { date: `${state?.month || 0}/${state?.year || 0}`, msg: `Application withdrawn for ${title}` };
    logs.push(entry);
    logEntries.push(entry);
    return { applications, logs, logEntries, unapplied: true };
  }

  evaluateApplications(state: any): {
    applications: any[];
    applicationResults: any[];
    logs: any[];
    logEntries: any[];
  } {
    const applications = Array.isArray(state?.applications)
      ? state.applications.map((app: any) => ({ ...app }))
      : [];
    const results: any[] = [];
    const logs = Array.isArray(state?.logs) ? [...state.logs] : [];
    const logEntries: any[] = [];

    const month = Number(state?.month || 0);
    const year = Number(state?.year || 0);

    for (const app of applications) {
      const isPending = String(app?.status || '') === 'pending';
      const decisionMonth = Number(app?.decisionMonth || 0);
      const decisionYear = Number(app?.decisionYear || 0);
      if (!isPending || !this.isDecisionDue(decisionMonth, decisionYear, month, year)) continue;

      const eligibility = this.jobService.getJobEligibility(state, app.job);
      if (!eligibility?.canApply) {
        app.status = 'rejected';
        results.push({ id: app.id, status: 'rejected', title: app?.job?.title, job: app.job });
        const entry = {
          date: `${month}/${year}`,
          msg: `Application rejected for ${app?.job?.title} (requirements changed or no openings)`,
        };
        logs.push(entry);
        logEntries.push(entry);
        continue;
      }

      const score = Number(app?.score || 0);
      let accepted = false;
      if (score >= 75) accepted = Math.random() < 0.95;
      else if (score >= 60) accepted = Math.random() < 0.65;
      else if (score >= 50) accepted = Math.random() < 0.4;
      else accepted = Math.random() < 0.15;

      if (accepted) {
        app.status = 'accepted';
        results.push({ id: app.id, status: 'accepted', title: app?.job?.title, job: app.job });
        const entry = { date: `${month}/${year}`, msg: `Hired for ${app?.job?.title}` };
        logs.push(entry);
        logEntries.push(entry);
      } else {
        app.status = 'rejected';
        results.push({ id: app.id, status: 'rejected', title: app?.job?.title, job: app.job });
        const entry = { date: `${month}/${year}`, msg: `Application rejected for ${app?.job?.title}` };
        logs.push(entry);
        logEntries.push(entry);
      }
    }

    return {
      applications,
      applicationResults: results,
      logs,
      logEntries,
    };
  }
}
