
import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { LedgerService } from './logic/ledger.service';
import { RewardService } from './logic/reward.service';
import { ApplicationService } from './logic/application.service';
import { cityData } from '../data/cityData.constants';
import { academyCourses } from '../data/academyCourses.constants';
import jobBoard from '../data/jobBoard.constants';
import lifeEvents from '../data/lifeEvents.constants';
import { rewardWheelPrizePools } from '../data/achievements.constants';

function getCareerLinkedAcademyCourses() {
  const courseByName = new Map(
    academyCourses.map((course: any) => [String(course?.n || '').trim(), course]),
  );
  const relevantCourseNames = new Set<string>();

  for (const job of jobBoard as any[]) {
    for (const requirement of [job?.req, job?.certReq]) {
      const name = String(requirement || '').trim();
      if (name && courseByName.has(name)) relevantCourseNames.add(name);
    }
  }

  const stack = Array.from(relevantCourseNames);
  while (stack.length > 0) {
    const currentName = stack.pop()!;
    const course = courseByName.get(currentName);
    const prereq = String(course?.prereq || '').trim();
    if (!prereq || relevantCourseNames.has(prereq) || !courseByName.has(prereq)) continue;
    relevantCourseNames.add(prereq);
    stack.push(prereq);
  }

  return academyCourses.filter((course: any) =>
    relevantCourseNames.has(String(course?.n || '').trim()),
  );
}

@Controller('game')
export class GameController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rewardService: RewardService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Get('life-events')
  getLifeEvents() {
    // Return deduped life events (if needed, but list is already unique)
    return lifeEvents;
  }

  @Get('academy-courses')
  getAcademyCourses() {
    const seen = new Set<string>();
    return getCareerLinkedAcademyCourses().filter((course: any) => {
      const name = String(course?.n || '').trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  @Get('catalog')
  getCatalog() {
    return {
      cities: cityData,
      jobs: jobBoard,
      academyCourses: this.getAcademyCourses(),
      rewardPrizePools: rewardWheelPrizePools,
    };
  }

  @Post('build-ledger')
  buildLedger(
    @Body() body: { state: any; paySave?: number; payDebt?: number },
  ): { ledger: any[]; events: any[] } {
    const { state, paySave = 0, payDebt = 0 } = body;
    const ledger = this.ledgerService.buildLedger(state, paySave, payDebt);
    const events = this.ledgerService.extractStatementEvents(state);
    return { ledger, events };
  }

  @Post(':id/spin-reward')
  async spinRewardWheel(@Param('id') id: string) {
    return this.rewardService.spinRewardWheelForUser(id);
  }

  @Post('evaluate-applications')
  evaluateApplications(@Body() body: { state: any }) {
    return this.applicationService.evaluateApplications(body?.state || {});
  }

  @Post('apply-job')
  applyForJob(@Body() body: { state: any; jobTitle: string }) {
    return this.applicationService.applyForJob(body?.state || {}, body?.jobTitle || '');
  }
}
