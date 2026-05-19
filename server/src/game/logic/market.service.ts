import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { stockMarketAssets, autoInvestProfiles } from '../../data/stockMarket.constants';

const BASE_FLOAT_SHARES_AT_77_USERS: Record<string, number> = {
  AAPL: 32340,
  MSFT: 32340,
  NVDA: 27720,
  AMZN: 32340,
  KO: 38500,
  JPM: 38500,
  XOM: 38500,
  VTI: 50050,
  TSLA: 27720,
  GOOGL: 32340,
  META: 27720,
  NFLX: 27720,
  DIS: 38500,
  MCD: 38500,
  WMT: 38500,
  NKE: 32340,
  SBUX: 32340,
  HAS: 27720,
  MAT: 27720,
  EA: 32340,
  RBLX: 27720,
  SPY: 50050,
  QQQ: 50050,
  DIA: 50050,
};

@Injectable()
export class MarketService {
  constructor(private utilitiesService: UtilitiesService) {}

  normalizeEconomyOverrides(raw: any): {
    recessionSeverity: number;
    inflationPressure: number;
    jobAvailability: number;
    marketVolatility: number;
    nextMonthStockShock: number;
  } {
    if (!raw || typeof raw !== 'object') {
      return {
        recessionSeverity: 0,
        inflationPressure: 0,
        jobAvailability: 100,
        marketVolatility: 100,
        nextMonthStockShock: 0,
      };
    }

    return {
      recessionSeverity: Math.max(0, Math.min(100, Math.round(Number(raw?.recessionSeverity || 0)))),
      inflationPressure: Math.max(0, Math.min(100, Math.round(Number(raw?.inflationPressure || 0)))),
      jobAvailability: 100,
      marketVolatility: Math.max(50, Math.min(220, Math.round(Number(raw?.marketVolatility || 100)))),
      nextMonthStockShock: Math.max(-0.7, Math.min(0.7, Number(raw?.nextMonthStockShock || 0))),
    };
  }

  normalizeHistoricalEconomicEvent(raw: any): { effects: { monthlyStockShock: number }; monthsRemaining: number } | null {
    if (!raw || typeof raw !== 'object') return null;

    const id = String(raw?.id || '').trim();
    const title = String(raw?.title || '').trim();
    if (!id || !title) return null;

    const effectsRaw = raw?.effects && typeof raw.effects === 'object' ? raw.effects : {};
    const monthsRemaining = Math.max(
      0,
      Math.min(36, Math.floor(Number(raw?.monthsRemaining || raw?.totalMonths || 1))),
    );

    return {
      monthsRemaining,
      effects: {
        monthlyStockShock: Math.max(-0.7, Math.min(0.7, Number(effectsRaw?.monthlyStockShock || 0))),
      },
    };
  }

  deriveStockEconomyOverridesForMonth(state: any): {
    economyOverrides: {
      recessionSeverity: number;
      inflationPressure: number;
      jobAvailability: number;
      marketVolatility: number;
      nextMonthStockShock: number;
    };
    appliedShock: number;
  } {
    const baseEconomy = this.normalizeEconomyOverrides(state?.economyOverrides);
    const shouldResetHistoricalEventNextMonth = Boolean(state?.historicalEventResetNextMonth);
    const activeHistoricalEvent = shouldResetHistoricalEventNextMonth
      ? null
      : this.normalizeHistoricalEconomicEvent(state?.historicalEconomicEvent);

    let mergedShock = Number(baseEconomy.nextMonthStockShock || 0);
    if (activeHistoricalEvent && Number(activeHistoricalEvent.monthsRemaining || 0) > 0) {
      const forcedShock = Math.max(
        -0.7,
        Math.min(0.7, Number(activeHistoricalEvent.effects?.monthlyStockShock || 0)),
      );
      if (Math.abs(forcedShock) > 0.001) {
        mergedShock = Math.max(-0.7, Math.min(0.7, mergedShock + forcedShock));
      }
    }

    return {
      economyOverrides: {
        ...baseEconomy,
        nextMonthStockShock: mergedShock,
      },
      appliedShock: mergedShock,
    };
  }

  private roundShareQuantity(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private formatShareQuantity(value: number): string {
    return this.roundShareQuantity(value)
      .toFixed(3)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*[1-9])0+$/, '$1');
  }

  normalizeMarketPrices(prices: any): Record<string, number> {
    const base = this.initializeMarketPrices();
    if (!prices || typeof prices !== 'object') return base;
    for (const asset of stockMarketAssets) {
      const n = Number(prices[asset.ticker]);
      if (Number.isFinite(n) && n > 0) {
        base[asset.ticker] = this.utilitiesService.round2(n);
      }
    }
    return base;
  }

  initializeMarketPrices(): Record<string, number> {
    const prices: Record<string, number> = {};
    for (const asset of stockMarketAssets) {
      prices[asset.ticker] = this.utilitiesService.round2(asset.basePrice);
    }
    return prices;
  }

  advanceMarketPrices(currentPrices: any, year: number, month: number, overrides?: any): Record<string, number> {
    const base = this.normalizeMarketPrices(currentPrices);
    const economy = this.normalizeEconomyOverrides(overrides);
    const next: Record<string, number> = {};
    const driftPenalty = (economy.recessionSeverity * 0.0014) + (economy.inflationPressure * 0.0008);
    const volatilityMultiplier = Math.max(
      0.5,
      (economy.marketVolatility / 100) * (1 + economy.recessionSeverity * 0.006),
    );
    const shock = Number(economy.nextMonthStockShock || 0);

    for (const asset of stockMarketAssets) {
      const seed = this.utilitiesService.hashString(`${asset.ticker}-${year}-${month}`);
      const noise = (this.utilitiesService.mulberry32(seed)() - 0.5) * 2;
      const monthlyMove = (asset.drift - driftPenalty) + (noise * asset.volatility * volatilityMultiplier) + shock;
      const boundedMove = Math.max(-0.45, Math.min(0.45, monthlyMove));
      const updated = Math.max(1, base[asset.ticker] * (1 + boundedMove));
      next[asset.ticker] = this.utilitiesService.round2(updated);
    }
    return next;
  }

  appendMarketPriceHistory(
    history: any,
    prices: any,
    month: number,
    year: number,
    maxPoints = 24,
  ): any[] {
    const normalizedPrices = this.normalizeMarketPrices(prices);
    const normalizedMonth = Math.max(1, Math.min(12, Math.floor(Number(month || 1))));
    const normalizedYear = Math.max(1, Math.floor(Number(year || 2026)));

    const list = Array.isArray(history)
      ? history
          .filter((entry: any) => entry && typeof entry === 'object')
          .map((entry: any) => ({
            month: Math.max(1, Math.min(12, Math.floor(Number(entry.month || normalizedMonth)))),
            year: Math.max(1, Math.floor(Number(entry.year || normalizedYear))),
            prices: this.normalizeMarketPrices(entry.prices),
          }))
      : [];

    const last = list[list.length - 1];
    if (last && Number(last.month) === normalizedMonth && Number(last.year) === normalizedYear) {
      list[list.length - 1] = {
        month: normalizedMonth,
        year: normalizedYear,
        prices: normalizedPrices,
      };
    } else {
      list.push({
        month: normalizedMonth,
        year: normalizedYear,
        prices: normalizedPrices,
      });
    }

    return list.slice(Math.max(0, list.length - maxPoints));
  }

  calculateDynamicMarketCaps(prices: any, registeredUsers: number): {
    marketCapsByTicker: Record<string, number>;
    floatSharesByTicker: Record<string, number>;
  } {
    const normalizedPrices = this.normalizeMarketPrices(prices);
    const effectiveUsers = Math.max(1, Number(registeredUsers || 0));
    const userScale = effectiveUsers / 77;

    const marketCapsByTicker: Record<string, number> = {};
    const floatSharesByTicker: Record<string, number> = {};
    for (const asset of stockMarketAssets) {
      const baselineFloat = Number(BASE_FLOAT_SHARES_AT_77_USERS[asset.ticker] || 25000);
      const scaledFloat = Math.max(100, Math.round(baselineFloat * userScale));
      const price = Number(normalizedPrices[asset.ticker] || asset.basePrice || 0);
      floatSharesByTicker[asset.ticker] = scaledFloat;
      marketCapsByTicker[asset.ticker] = this.utilitiesService.round2(Math.max(0, price * scaledFloat));
    }

    return {
      marketCapsByTicker,
      floatSharesByTicker,
    };
  }

  normalizeAutoInvestConfig(config: any): any {
    const fallback = { enabled: false, monthlyAmount: 0, profileId: 'balanced' };
    if (!config || typeof config !== 'object') return fallback;
    const profileExists = autoInvestProfiles.some((p) => p.id === config.profileId);
    return {
      enabled: !!config.enabled,
      monthlyAmount: Math.max(0, this.utilitiesService.round2(Number(config.monthlyAmount || 0))),
      profileId: profileExists ? config.profileId : fallback.profileId,
    };
  }

  executionPriceWithSlippage(
    referencePrice: number,
    seedText: string,
    maxSlippage = 0.02,
  ): number {
    const seed = this.utilitiesService.hashString(seedText);
    const noise = (this.utilitiesService.mulberry32(seed)() - 0.5) * 2;
    const pct = Math.max(-maxSlippage, Math.min(maxSlippage, noise * maxSlippage));
    return this.utilitiesService.round2(Math.max(0.01, referencePrice * (1 + pct)));
  }

  slippageLabel(fillPrice: number, referencePrice: number): string {
    if (fillPrice >= referencePrice * 1.005) return 'ceiling fill';
    if (fillPrice <= referencePrice * 0.995) return 'floor fill';
    return 'mid fill';
  }

  portfolioMarketValue(portfolio: any[], prices: Record<string, number>): number {
    return this.utilitiesService.round2(
      (Array.isArray(portfolio) ? portfolio : []).reduce((sum: number, h: any) => {
        const shares = Number(h?.shares || 0);
        const price = Number(prices[h?.ticker] || 0);
        return sum + shares * price;
      }, 0),
    );
  }

  portfolioCostBasis(portfolio: any[]): number {
    return this.utilitiesService.round2(
      (Array.isArray(portfolio) ? portfolio : []).reduce((sum: number, h: any) => {
        const shares = Number(h?.shares || 0);
        const avgCost = Number(h?.avgCost || 0);
        return sum + shares * avgCost;
      }, 0),
    );
  }

  scoreStockSignal(
    asset: any,
    price: number,
    prevPrice: number,
    portfolioValue: number,
    positionValue: number,
  ): { recommendation: 'Buy' | 'Hold' | 'Sell'; score: number } {
    const momentumPct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    const premiumToBasePct = asset.basePrice > 0 ? ((price - asset.basePrice) / asset.basePrice) * 100 : 0;
    const isETF = asset.sector === 'ETF';
    const concentrationPct = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : 0;

    let score = 0;

    if (asset.drift >= 0.01) score += 1.1;
    else if (asset.drift >= 0.006) score += 0.6;
    else if (asset.drift <= 0.004) score -= 0.35;

    if (momentumPct <= -4 && asset.drift >= 0.007) score += 0.9;
    else if (momentumPct >= 6) score -= 0.7;
    else if (momentumPct >= 2) score -= 0.2;

    if (momentumPct >= 9 && asset.drift >= 0.008) score += 0.35;
    else if (momentumPct <= -9) score -= 0.45;

    if (premiumToBasePct <= -8) score += 0.8;
    else if (premiumToBasePct >= 18) score -= 0.9;
    else if (premiumToBasePct >= 8) score -= 0.35;

    if (asset.volatility >= 0.12) score -= 0.45;
    else if (asset.volatility <= 0.055) score += 0.2;

    if (isETF) score += 0.35;

    if (concentrationPct >= 35) score -= 1;
    else if (concentrationPct >= 20) score -= 0.45;
    else if (concentrationPct > 0 && concentrationPct <= 8 && score > 0.5) score += 0.15;

    let recommendation: 'Buy' | 'Hold' | 'Sell' = 'Hold';
    if (score >= 1.35) recommendation = 'Buy';
    else if (score <= -0.75) recommendation = 'Sell';

    return { recommendation, score };
  }

  addOrUpdateHolding(portfolio: any[], ticker: string, shares: number, price: number): any[] {
    const next = Array.isArray(portfolio) ? portfolio.map((h: any) => ({ ...h })) : [];
    const idx = next.findIndex((h: any) => h.ticker === ticker);
    const totalCost = this.utilitiesService.round2(shares * price);
    if (idx >= 0) {
      const existing = next[idx];
      const existingShares = Number(existing.shares || 0);
      const existingAvg = Number(existing.avgCost || price);
      const totalShares = existingShares + shares;
      const avgCost =
        totalShares > 0
          ? this.utilitiesService.round2((existingShares * existingAvg + totalCost) / totalShares)
          : this.utilitiesService.round2(price);
      next[idx] = { ...existing, shares: totalShares, avgCost };
    } else {
      next.push({ ticker, shares, avgCost: this.utilitiesService.round2(price) });
    }
    return next;
  }

  applyAutoInvestCycle(
    checkBalance: number,
    portfolio: any[],
    marketPrices: Record<string, number>,
    previousPrices: Record<string, number>,
    autoInvest: any,
    logs: any[],
    month: number,
    year: number,
  ): { checkBalance: number; portfolio: any[]; logs: any[]; investedAmount: number } {
    const config = this.normalizeAutoInvestConfig(autoInvest);
    if (!config.enabled || config.monthlyAmount <= 0) {
      return { checkBalance, portfolio, logs, investedAmount: 0 };
    }

    const profile = autoInvestProfiles.find((p) => p.id === config.profileId);
    if (!profile) return { checkBalance, portfolio, logs, investedAmount: 0 };

    const maxInvest = Math.min(checkBalance, config.monthlyAmount);
    if (maxInvest <= 0) return { checkBalance, portfolio, logs, investedAmount: 0 };

    let newCheck = checkBalance;
    let investedAmount = 0;
    const nextPortfolio = Array.isArray(portfolio) ? portfolio.map((h: any) => ({ ...h })) : [];
    const tradeSummary: string[] = [];
    const startingPortfolioValue = this.portfolioMarketValue(nextPortfolio, marketPrices);

    const baseAllocEntries = Object.entries(profile.allocations || {}) as Array<[string, number]>;
    const adjustedAllocEntries = baseAllocEntries.map(([ticker, baseWeight]) => {
      const asset = stockMarketAssets.find((a) => a.ticker === ticker);
      const marketPrice = Number(marketPrices[ticker] || 0);
      const prevPrice = Number(previousPrices[ticker] || marketPrice);
      const holding = nextPortfolio.find((h: any) => h.ticker === ticker);
      const positionValue = Number(holding?.shares || 0) * marketPrice;

      let multiplier = 1;
      if (asset && marketPrice > 0) {
        const signal = this.scoreStockSignal(
          asset,
          marketPrice,
          prevPrice,
          startingPortfolioValue,
          positionValue,
        );
        if (signal.recommendation === 'Buy') multiplier = 1.4;
        else if (signal.recommendation === 'Sell') multiplier = 0.4;
      }

      return [ticker, Number(baseWeight || 0) * multiplier] as [string, number];
    });
    const adjustedWeightTotal = adjustedAllocEntries.reduce(
      (sum, [, w]) => sum + Number(w || 0),
      0,
    );

    for (const [ticker, adjustedWeight] of adjustedAllocEntries) {
      const allocation =
        adjustedWeightTotal > 0 ? (maxInvest * Number(adjustedWeight || 0)) / adjustedWeightTotal : 0;
      const marketPrice = Number(marketPrices[ticker] || 0);
      if (marketPrice <= 0 || allocation <= 0 || newCheck <= 0) continue;
      const price = this.executionPriceWithSlippage(
        marketPrice,
        `${ticker}-${month}-${year}-${profile.id}-auto`,
      );
      if (price <= 0) continue;

      const budget = Math.min(allocation, newCheck);
      const shares = this.roundShareQuantity(budget / price);
      if (shares <= 0) continue;

      const cost = this.utilitiesService.round2(shares * price);
      if (cost > newCheck || cost <= 0) continue;

      const idx = nextPortfolio.findIndex((h: any) => h.ticker === ticker);
      if (idx >= 0) {
        const existing = nextPortfolio[idx];
        const existingShares = Number(existing.shares || 0);
        const existingAvg = Number(existing.avgCost || price);
        const totalShares = this.roundShareQuantity(existingShares + shares);
        const avgCost =
          totalShares > 0
            ? this.utilitiesService.round2(
                (existingShares * existingAvg + cost) / totalShares,
              )
            : this.utilitiesService.round2(price);
        nextPortfolio[idx] = { ...existing, shares: totalShares, avgCost };
      } else {
        nextPortfolio.push({ ticker, shares, avgCost: this.utilitiesService.round2(price) });
      }

      newCheck = this.utilitiesService.round2(newCheck - cost);
      investedAmount = this.utilitiesService.round2(investedAmount + cost);
      tradeSummary.push(`${this.formatShareQuantity(shares)} ${ticker} @ ${price.toFixed(2)}`);
    }

    if (tradeSummary.length > 0) {
      logs = [
        ...logs,
        {
          date: `${month}/${year}`,
          msg: `🤖 Auto-invest (${profile.name}, signal-biased) executed: ${tradeSummary.join(', ')}`,
        },
      ];
    }

    return { checkBalance: newCheck, portfolio: nextPortfolio, logs, investedAmount };
  }
}
