import { Controller, Post, Body } from '@nestjs/common';
import { LedgerService } from './logic/ledger.service';

@Controller('game')
export class GameController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('build-ledger')
  buildLedger(
    @Body() body: { state: any; paySave?: number; payDebt?: number },
  ): { ledger: any[] } {
    const { state, paySave = 0, payDebt = 0 } = body;
    const ledger = this.ledgerService.buildLedger(state, paySave, payDebt);
    return { ledger };
  }
}
