import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from './game.service';
import { GameState } from '../types/game.types';
import { UserStateEntity } from '../../users/entities/user-state.entity';
import {
  rewardWheelPrizePools,
  rewardWheelVehicleGrantPool,
  RewardPrize,
} from '../../data/achievements.constants';
import { vehicleDatabase } from '../../data/vehicleDatabase.constants';

const NON_PERSISTED_STATE_KEYS = new Set<string>([
  'jobMarket',
  'realEstateMarket',
  'realEstateMarketMeta',
]);

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(UserStateEntity)
    private readonly userStateRepository: Repository<UserStateEntity>,
    private readonly gameService: GameService,
  ) {}

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private buildHydratedState(name: string, state: Record<string, any> = {}): Partial<GameState> {
    return {
      ...this.gameService.getInitialState(name),
      ...state,
      name,
    };
  }

  private buildPersistedState(name: string, state: Partial<GameState>): Record<string, any> {
    const normalizedState = {
      ...state,
      name,
    } as Record<string, any>;

    const persistedState: Record<string, any> = {};
    for (const [key, value] of Object.entries(normalizedState)) {
      if (NON_PERSISTED_STATE_KEYS.has(key)) continue;
      if (value === undefined) continue;
      persistedState[key] = value;
    }

    return persistedState;
  }

  private addOrUpdateHolding(portfolio: any[], ticker: string, shares: number, price: number) {
    const next = Array.isArray(portfolio) ? portfolio.map((h: any) => ({ ...h })) : [];
    const idx = next.findIndex((h: any) => h.ticker === ticker);
    const totalCost = this.round2(shares * price);

    if (idx >= 0) {
      const existing = next[idx];
      const existingShares = Number(existing.shares || 0);
      const existingAvg = Number(existing.avgCost || price);
      const totalShares = existingShares + shares;
      const avgCost =
        totalShares > 0
          ? this.round2((existingShares * existingAvg + totalCost) / totalShares)
          : this.round2(price);
      next[idx] = { ...existing, shares: totalShares, avgCost };
    } else {
      next.push({ ticker, shares, avgCost: this.round2(price) });
    }

    return next;
  }

  private chooseWeightedPrize(pool: RewardPrize[]): RewardPrize {
    const totalWeight = pool.reduce((sum, p) => sum + Number((p as any).weight || 1), 0);
    let roll = Math.random() * totalWeight;
    let chosen: RewardPrize = pool[pool.length - 1];

    for (const p of pool) {
      roll -= Number((p as any).weight || 1);
      if (roll <= 0) {
        chosen = p;
        break;
      }
    }

    return chosen;
  }

  private spinRewardPrize(state: any): RewardPrize {
    const category = state.lastAchievementCategory || 'wealth';
    const pool = rewardWheelPrizePools[category] || rewardWheelPrizePools.default;
    const chosen = this.chooseWeightedPrize(pool as RewardPrize[]);

    if ((chosen as any).kind === 'vehicle') {
      const randomVehicleId =
        rewardWheelVehicleGrantPool[
          Math.floor(Math.random() * rewardWheelVehicleGrantPool.length)
        ];
      return { ...(chosen as any), vehicleId: randomVehicleId } as RewardPrize;
    }

    return chosen;
  }

  private applyPrizeToState(state: any, prize: RewardPrize): Partial<GameState> {
    let check = Number(state.check || 0);
    let portfolio = Array.isArray(state.portfolio) ? [...state.portfolio] : [];
    let garage = Array.isArray(state.garage) ? [...state.garage] : [];
    let ownsVehicle = state.ownsVehicle;
    let unlockedThemes = Array.isArray(state.unlockedThemes)
      ? [...state.unlockedThemes]
      : ['default'];
    const logs = Array.isArray(state.logs) ? [...state.logs] : [];
    const rewardHistory = Array.isArray(state.rewardHistory) ? [...state.rewardHistory] : [];

    if ((prize as any).kind === 'cash') {
      check = this.round2(check + Number((prize as any).value || 0));
      logs.push({
        date: `${state.month}/${state.year}`,
        msg: `🎁 Reward wheel: ${(prize as any).label}`,
      });
    } else if ((prize as any).kind === 'theme') {
      if (!unlockedThemes.includes((prize as any).value)) unlockedThemes.push((prize as any).value);
      logs.push({
        date: `${state.month}/${state.year}`,
        msg: `🎨 Reward wheel: unlocked theme ${(prize as any).value}`,
      });
    } else if ((prize as any).kind === 'stock') {
      const marketPrice = Number(state.marketPrices?.[(prize as any).ticker] || 0);
      if (marketPrice > 0 && Number((prize as any).shares || 0) > 0) {
        portfolio = this.addOrUpdateHolding(
          portfolio,
          (prize as any).ticker,
          Number((prize as any).shares),
          marketPrice,
        );
        logs.push({
          date: `${state.month}/${state.year}`,
          msg: `🎁 Reward wheel: granted ${(prize as any).shares} ${(prize as any).ticker} shares`,
        });
      }
    } else if ((prize as any).kind === 'vehicle') {
      const vehicle = vehicleDatabase.vehicles.find((v: any) => v.id === (prize as any).vehicleId);
      if (vehicle) {
        const rewardCar = {
          id: `reward-${(prize as any).vehicleId}-${Date.now()}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          purchasePrice: vehicle.newPrice,
          currentValue: vehicle.newPrice,
          condition: 'new',
          financed: false,
          monthsRemaining: 0,
          monthlyPayment: 0,
          purchaseMonth: state.month,
          purchaseYear: state.year,
          for_sale: false,
        };
        garage.push(rewardCar);
        if (!ownsVehicle) ownsVehicle = rewardCar;
        logs.push({
          date: `${state.month}/${state.year}`,
          msg: `🎁 Reward wheel: gifted vehicle ${vehicle.name}`,
        });
      }
    }

    rewardHistory.unshift({
      month: state.month,
      year: state.year,
      label: (prize as any).label || (prize as any).kind,
      category: state.lastAchievementCategory || 'general',
    });

    return {
      ...state,
      check,
      portfolio,
      garage,
      ownsVehicle,
      unlockedThemes: Array.from(new Set(unlockedThemes)),
      rewardTokens: Math.max(0, Number(state.rewardTokens || 0) - 1),
      rewardHistory: rewardHistory.slice(0, 40),
      logs,
    };
  }

  async spinRewardWheelForUser(id: string): Promise<{ user: Partial<GameState> & { id: string }; prize: RewardPrize }> {
    const entity = await this.userStateRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');

    const hydratedState = this.buildHydratedState(entity.name, entity.state || {});
    if (Number((hydratedState as any).rewardTokens || 0) <= 0) {
      throw new BadRequestException('No reward tokens available');
    }

    const prize = this.spinRewardPrize(hydratedState);
    const nextState = this.applyPrizeToState(hydratedState, prize);

    entity.state = this.buildPersistedState(entity.name, nextState);
    entity.updatedAt = new Date();
    const saved = await this.userStateRepository.save(entity);

    const hydratedSaved = this.buildHydratedState(saved.name, saved.state || {});
    return {
      user: {
        ...hydratedSaved,
        id: saved.id,
        username: saved.username,
        name: saved.name,
      } as Partial<GameState> & { id: string },
      prize,
    };
  }
}
