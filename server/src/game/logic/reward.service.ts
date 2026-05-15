import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  private getAccessibleLiquidity(state: any): number {
    return this.round2(Number(state?.check || 0) + Number(state?.savings || 0));
  }

  private getRewardTierByLiquidity(
    state: any,
  ): 'starter' | 'growth' | 'established' | 'elite' {
    const liquidity = this.getAccessibleLiquidity(state);
    if (liquidity < 10_000) return 'starter';
    if (liquidity < 50_000) return 'growth';
    if (liquidity < 250_000) return 'established';
    return 'elite';
  }

  private getTierCaps(tier: 'starter' | 'growth' | 'established' | 'elite') {
    if (tier === 'starter') {
      return { maxCash: 600, maxStockShares: 1, allowVehicle: false };
    }
    if (tier === 'growth') {
      return { maxCash: 1200, maxStockShares: 3, allowVehicle: false };
    }
    if (tier === 'established') {
      return { maxCash: 3000, maxStockShares: 6, allowVehicle: true };
    }
    return {
      maxCash: Number.POSITIVE_INFINITY,
      maxStockShares: Number.POSITIVE_INFINITY,
      allowVehicle: true,
    };
  }

  private applyTierFilterToPool(
    state: any,
    pool: RewardPrize[],
  ): RewardPrize[] {
    const tier = this.getRewardTierByLiquidity(state);
    const caps = this.getTierCaps(tier);

    return pool.filter((prize) => {
      if ((prize as any).kind === 'theme') return true;
      if ((prize as any).kind === 'vehicle') return caps.allowVehicle;
      if ((prize as any).kind === 'cash') {
        return Number((prize as any).value || 0) <= caps.maxCash;
      }
      if ((prize as any).kind === 'stock') {
        return Number((prize as any).shares || 0) <= caps.maxStockShares;
      }
      return true;
    });
  }

  private hasAnyCredential(state: any, requiredCredentials: string[]): boolean {
    const credentials = new Set(
      Array.isArray(state?.credentials)
        ? state.credentials.map((c: any) => String(c))
        : [],
    );
    return requiredCredentials.some((cred) => credentials.has(cred));
  }

  private requiredCredentialsForVehicle(vehicle: any): string[] {
    if (!Array.isArray(vehicle?.requiredCredentials)) return [];
    return vehicle.requiredCredentials
      .map((cred: any) => String(cred))
      .filter((cred: string) => !!cred);
  }

  private canOperateVehicle(state: any, vehicle: any): boolean {
    const requiredCredentials = this.requiredCredentialsForVehicle(vehicle);
    if (requiredCredentials.length === 0) return true;
    return this.hasAnyCredential(state, requiredCredentials);
  }

  private eligibleRewardVehicleIds(state: any): string[] {
    return rewardWheelVehicleGrantPool.filter((vehicleId) => {
      const vehicle = vehicleDatabase.vehicles.find(
        (v: any) => v.id === vehicleId,
      );
      if (!vehicle) return false;
      return this.canOperateVehicle(state, vehicle);
    });
  }

  private applyVehicleLicenseFilterToPool(
    state: any,
    pool: RewardPrize[],
  ): RewardPrize[] {
    const eligibleVehicleIds = this.eligibleRewardVehicleIds(state);

    return pool.filter((prize) => {
      if ((prize as any).kind !== 'vehicle') return true;

      const explicitVehicleId = (prize as any).vehicleId;
      if (explicitVehicleId) {
        const vehicle = vehicleDatabase.vehicles.find(
          (v: any) => v.id === explicitVehicleId,
        );
        if (!vehicle) return false;
        return this.canOperateVehicle(state, vehicle);
      }

      // Generic vehicle prize is only valid if at least one eligible vehicle can be granted.
      return eligibleVehicleIds.length > 0;
    });
  }

  private buildHydratedState(
    state: Record<string, any> = {},
    usernameFallback?: string | null,
  ): Partial<GameState> {
    const { name: _legacyName, ...stateWithoutName } = state;
    const resolvedName = String(
      stateWithoutName.username ||
        stateWithoutName.currentUser ||
        usernameFallback ||
        'Player',
    );
    return {
      ...this.gameService.getInitialState(),
      ...stateWithoutName,
      name: resolvedName,
    };
  }

  private buildPersistedState(state: Partial<GameState>): Record<string, any> {
    const normalizedState = {
      ...state,
    } as Record<string, any>;

    const persistedState: Record<string, any> = {};
    for (const [key, value] of Object.entries(normalizedState)) {
      if (NON_PERSISTED_STATE_KEYS.has(key)) continue;
      if (key === 'name') continue;
      if (value === undefined) continue;
      persistedState[key] = value;
    }

    return persistedState;
  }

  private addOrUpdateHolding(
    portfolio: any[],
    ticker: string,
    shares: number,
    price: number,
  ) {
    const next = Array.isArray(portfolio)
      ? portfolio.map((h: any) => ({ ...h }))
      : [];
    const idx = next.findIndex((h: any) => h.ticker === ticker);
    const totalCost = this.round2(shares * price);

    if (idx >= 0) {
      const existing = next[idx];
      const existingShares = Number(existing.shares || 0);
      const existingAvg = Number(existing.avgCost || price);
      const totalShares = existingShares + shares;
      const avgCost =
        totalShares > 0
          ? this.round2(
              (existingShares * existingAvg + totalCost) / totalShares,
            )
          : this.round2(price);
      next[idx] = { ...existing, shares: totalShares, avgCost };
    } else {
      next.push({ ticker, shares, avgCost: this.round2(price) });
    }

    return next;
  }

  private chooseWeightedPrize(pool: RewardPrize[]): RewardPrize {
    const totalWeight = pool.reduce(
      (sum, p) => sum + Number((p as any).weight || 1),
      0,
    );
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
    const queue = Array.isArray(state.rewardCategoryQueue)
      ? state.rewardCategoryQueue
      : [];
    const category = queue[0] || state.lastAchievementCategory || 'wealth';
    const pool =
      rewardWheelPrizePools[category] || rewardWheelPrizePools.default;
    const tierFilteredPool = this.applyTierFilterToPool(state, pool);
    const licenseFilteredPool = this.applyVehicleLicenseFilterToPool(
      state,
      tierFilteredPool,
    );
    const fallbackNonVehiclePool = tierFilteredPool.filter(
      (p: any) => p.kind !== 'vehicle',
    );
    const effectivePool =
      licenseFilteredPool.length > 0
        ? licenseFilteredPool
        : fallbackNonVehiclePool.length > 0
          ? fallbackNonVehiclePool
          : pool;
    const chosen = this.chooseWeightedPrize(effectivePool);

    if ((chosen as any).kind === 'vehicle') {
      const explicitVehicleId = (chosen as any).vehicleId;
      if (explicitVehicleId) {
        return chosen;
      }

      const eligibleVehicleIds = this.eligibleRewardVehicleIds(state);
      if (eligibleVehicleIds.length === 0) {
        const nonVehiclePool = effectivePool.filter(
          (p: any) => p.kind !== 'vehicle',
        );
        if (nonVehiclePool.length > 0) {
          return this.chooseWeightedPrize(nonVehiclePool);
        }
        return {
          kind: 'cash',
          value: 250,
          weight: 1,
          label: '$250 fallback bonus',
        } as RewardPrize;
      }

      const randomVehicleId =
        eligibleVehicleIds[
          Math.floor(Math.random() * eligibleVehicleIds.length)
        ];
      return { ...(chosen as any), vehicleId: randomVehicleId } as RewardPrize;
    }

    return chosen;
  }

  private applyPrizeToState(
    state: any,
    prize: RewardPrize,
  ): Partial<GameState> {
    let check = Number(state.check || 0);
    let portfolio = Array.isArray(state.portfolio) ? [...state.portfolio] : [];
    const garage = Array.isArray(state.garage) ? [...state.garage] : [];
    let ownsVehicle = state.ownsVehicle;
    const unlockedThemes = Array.isArray(state.unlockedThemes)
      ? [...state.unlockedThemes]
      : ['default'];
    const logs = Array.isArray(state.logs) ? [...state.logs] : [];
    const rewardHistory = Array.isArray(state.rewardHistory)
      ? [...state.rewardHistory]
      : [];
    const rewardCategoryQueue = Array.isArray(state.rewardCategoryQueue)
      ? [...state.rewardCategoryQueue]
      : [];
    const consumedCategory =
      rewardCategoryQueue.length > 0
        ? String(rewardCategoryQueue.shift() || 'general')
        : String(state.lastAchievementCategory || 'general');

    if ((prize as any).kind === 'cash') {
      check = this.round2(check + Number((prize as any).value || 0));
      logs.push({
        date: `${state.month}/${state.year}`,
        msg: `🎁 Reward wheel: ${(prize as any).label}`,
      });
    } else if ((prize as any).kind === 'theme') {
      if (!unlockedThemes.includes((prize as any).value))
        unlockedThemes.push((prize as any).value);
      logs.push({
        date: `${state.month}/${state.year}`,
        msg: `🎨 Reward wheel: unlocked theme ${(prize as any).value}`,
      });
    } else if ((prize as any).kind === 'stock') {
      const marketPrice = Number(
        state.marketPrices?.[(prize as any).ticker] || 0,
      );
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
      const vehicle = vehicleDatabase.vehicles.find(
        (v: any) => v.id === (prize as any).vehicleId,
      );
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
      category: consumedCategory,
    });

    return {
      ...state,
      check,
      portfolio,
      garage,
      ownsVehicle,
      unlockedThemes: Array.from(new Set(unlockedThemes)),
      rewardTokens: Math.max(0, Number(state.rewardTokens || 0) - 1),
      rewardCategoryQueue,
      lastAchievementCategory:
        rewardCategoryQueue.length > 0
          ? String(rewardCategoryQueue[0])
          : state.lastAchievementCategory || null,
      rewardHistory: rewardHistory.slice(0, 40),
      logs,
    };
  }

  async spinRewardWheelForUser(id: string): Promise<{
    user: Partial<GameState> & { id: string };
    prize: RewardPrize;
  }> {
    const entity = await this.userStateRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');

    const hydratedState = this.buildHydratedState(
      entity.state || {},
      entity.username,
    );
    if (Number((hydratedState as any).rewardTokens || 0) <= 0) {
      throw new BadRequestException('No reward tokens available');
    }

    const prize = this.spinRewardPrize(hydratedState);
    const nextState = this.applyPrizeToState(hydratedState, prize);

    entity.state = this.buildPersistedState(nextState);
    entity.updatedAt = new Date();
    const saved = await this.userStateRepository.save(entity);

    const hydratedSaved = this.buildHydratedState(
      saved.state || {},
      saved.username,
    );
    return {
      user: {
        ...hydratedSaved,
        id: saved.id,
        username: saved.username,
        name: String((hydratedSaved as any).name || saved.username || 'Player'),
      } as Partial<GameState> & { id: string },
      prize,
    };
  }
}
