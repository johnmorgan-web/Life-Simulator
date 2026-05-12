import { Injectable } from '@nestjs/common';
import { JobService } from './job.service';
import jobBoard from '../../data/jobBoard.constants';

@Injectable()
export class ApplicationService {
  constructor(private readonly jobService: JobService) {}

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
      if (!eligibility.capacityMet) blocks.push('no openings');
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
      if (!isPending || decisionMonth !== month || decisionYear !== year) continue;

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

    const currentMonthResults = applications
      .filter((app: any) => {
        const decisionMonth = Number(app?.decisionMonth || 0);
        const decisionYear = Number(app?.decisionYear || 0);
        const status = String(app?.status || '');
        return decisionMonth === month && decisionYear === year && status !== 'pending';
      })
      .map((app: any) => ({
        id: app.id,
        status: app.status,
        title: app?.job?.title,
        job: app.job,
      }));

    return {
      applications,
      applicationResults: currentMonthResults.length ? currentMonthResults : results,
      logs,
      logEntries,
    };
  }
}
