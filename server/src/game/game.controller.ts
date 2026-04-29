import { Controller, Post, Body, Param } from '@nestjs/common';
import { LedgerService } from './logic/ledger.service';
import { RewardService } from './logic/reward.service';

@Controller('game')
export class GameController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rewardService: RewardService,
  ) {}

  @Post('build-ledger')
  buildLedger(
    @Body() body: { state: any; paySave?: number; payDebt?: number },
  ): { ledger: any[] } {
    const { state, paySave = 0, payDebt = 0 } = body;
    const ledger = this.ledgerService.buildLedger(state, paySave, payDebt);
    return { ledger };
  }

  @Post(':id/spin-reward')
  async spinRewardWheel(@Param('id') id: string) {
    return this.rewardService.spinRewardWheelForUser(id);
  }
}
