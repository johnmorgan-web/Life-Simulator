import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { stockMarketAssets, autoInvestProfiles } from '../../data/stockMarket.constants';

@Injectable()
export class MarketService {
  constructor(private utilitiesService: UtilitiesService) {}

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

  advanceMarketPrices(currentPrices: any, year: number, month: number): Record<string, number> {
    const base = this.normalizeMarketPrices(currentPrices);
    const next: Record<string, number> = {};
    for (const asset of stockMarketAssets) {
      const seed = this.utilitiesService.hashString(`${asset.ticker}-${year}-${month}`);
      const noise = (this.utilitiesService.mulberry32(seed)() - 0.5) * 2;
      const monthlyMove = asset.drift + noise * asset.volatility;
      const boundedMove = Math.max(-0.25, Math.min(0.25, monthlyMove));
      const updated = Math.max(1, base[asset.ticker] * (1 + boundedMove));
      next[asset.ticker] = this.utilitiesService.round2(updated);
    }
    return next;
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
