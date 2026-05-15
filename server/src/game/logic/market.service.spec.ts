import { MarketService } from './market.service';
import { UtilitiesService } from './utilities.service';

describe('MarketService stock advance', () => {
  let marketService: MarketService;

  beforeEach(() => {
    marketService = new MarketService(new UtilitiesService());
  });

  it('merges historical monthlyStockShock with economy nextMonthStockShock', () => {
    const result = marketService.deriveStockEconomyOverridesForMonth({
      economyOverrides: {
        recessionSeverity: 25,
        inflationPressure: 30,
        marketVolatility: 120,
        nextMonthStockShock: 0.1,
      },
      historicalEconomicEvent: {
        id: 'evt-1',
        title: 'Scenario',
        monthsRemaining: 4,
        effects: {
          monthlyStockShock: -0.15,
        },
      },
      historicalEventResetNextMonth: false,
    });

    expect(result.economyOverrides.nextMonthStockShock).toBeCloseTo(-0.05, 6);
    expect(result.appliedShock).toBeCloseTo(-0.05, 6);
  });

  it('resets historical contribution when reset flag is set', () => {
    const result = marketService.deriveStockEconomyOverridesForMonth({
      economyOverrides: {
        recessionSeverity: 15,
        inflationPressure: 10,
        marketVolatility: 110,
        nextMonthStockShock: 0.07,
      },
      historicalEconomicEvent: {
        id: 'evt-2',
        title: 'Scenario',
        monthsRemaining: 6,
        effects: {
          monthlyStockShock: -0.2,
        },
      },
      historicalEventResetNextMonth: true,
    });

    expect(result.economyOverrides.nextMonthStockShock).toBeCloseTo(0.07, 6);
    expect(result.appliedShock).toBeCloseTo(0.07, 6);
  });

  it('produces deterministic prices for the same month/year/inputs', () => {
    const currentPrices = marketService.initializeMarketPrices();
    const overrides = {
      recessionSeverity: 20,
      inflationPressure: 35,
      marketVolatility: 140,
      nextMonthStockShock: -0.03,
    };

    const first = marketService.advanceMarketPrices(
      currentPrices,
      2026,
      5,
      overrides,
    );
    const second = marketService.advanceMarketPrices(
      currentPrices,
      2026,
      5,
      overrides,
    );

    expect(second).toEqual(first);
  });

  it('appends market history with bounded length', () => {
    const prices = marketService.initializeMarketPrices();
    const history = marketService.appendMarketPriceHistory(
      [],
      prices,
      2,
      2026,
      2,
    );
    const history2 = marketService.appendMarketPriceHistory(
      history,
      prices,
      3,
      2026,
      2,
    );
    const history3 = marketService.appendMarketPriceHistory(
      history2,
      prices,
      4,
      2026,
      2,
    );

    expect(history3).toHaveLength(2);
    expect(history3[0].month).toBe(3);
    expect(history3[1].month).toBe(4);
  });
});
