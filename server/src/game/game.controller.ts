import { Controller, Post, Body, Param } from '@nestjs/common';
import { LedgerService } from './logic/ledger.service';
import { RewardService } from './logic/reward.service';
import { ApplicationService } from './logic/application.service';

@Controller('game')
export class GameController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rewardService: RewardService,
    private readonly applicationService: ApplicationService,
  ) {}

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
