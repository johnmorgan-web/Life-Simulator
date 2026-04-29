import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './logic/game.service';
import { UtilitiesService } from './logic/utilities.service';
import { CreditService } from './logic/credit.service';
import { VehicleService } from './logic/vehicle.service';
import { RealEstateService } from './logic/realEstate.service';
import { MarketService } from './logic/market.service';
import { EntertainmentService } from './logic/entertainment.service';
import { JobService } from './logic/job.service';
import { LedgerService } from './logic/ledger.service';
import { RewardService } from './logic/reward.service';
import { GameController } from './game.controller';
import { UserStateEntity } from '../users/entities/user-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserStateEntity])],
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
    RewardService,
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
    RewardService,
  ],
})
export class GameModule {}
