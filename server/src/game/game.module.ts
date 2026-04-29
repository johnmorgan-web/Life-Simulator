import { Module } from '@nestjs/common';
import { GameService } from './logic/game.service';
import { UtilitiesService } from './logic/utilities.service';
import { CreditService } from './logic/credit.service';
import { VehicleService } from './logic/vehicle.service';
import { RealEstateService } from './logic/realEstate.service';
import { MarketService } from './logic/market.service';
import { EntertainmentService } from './logic/entertainment.service';
import { JobService } from './logic/job.service';
import { LedgerService } from './logic/ledger.service';
import { GameController } from './game.controller';

@Module({
  controllers: [GameController],
  providers: [
    GameService,
    UtilitiesService,
    CreditService,
    VehicleService,
    RealEstateService,
    MarketService,
    EntertainmentService,
    JobService,
    LedgerService,
  ],
  exports: [
    GameService,
    UtilitiesService,
    CreditService,
    VehicleService,
    RealEstateService,
    MarketService,
    EntertainmentService,
    JobService,
    LedgerService,
  ],
})
export class GameModule {}
