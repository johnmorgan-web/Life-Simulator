import { GameController } from './game.controller';
import { MarketService } from './logic/market.service';
import { UtilitiesService } from './logic/utilities.service';

describe('GameController stocks/advance', () => {
  let controller: GameController;
  let marketService: MarketService;
  let userRepoMock: { find: jest.Mock };

  beforeEach(() => {
    marketService = new MarketService(new UtilitiesService());
    userRepoMock = {
      find: jest.fn().mockResolvedValue([]),
    };

    controller = new GameController(
      { buildLedger: jest.fn(), extractStatementEvents: jest.fn() } as any,
      { spinRewardWheelForUser: jest.fn() } as any,
      { evaluateApplications: jest.fn(), applyForJob: jest.fn() } as any,
      { syncSharedRealEstateMarket: jest.fn(), normalizeRealEstateStateFromShared: jest.fn(), setSharedRealEstateMarket: jest.fn() } as any,
      marketService,
      userRepoMock as any,
    );
  });

  it('returns normalized stock advance payload and clears nextMonthStockShock for next cycle', async () => {
    const initialPrices = marketService.initializeMarketPrices();

    const response = await controller.advanceStockMarket({
      state: {
        month: 12,
        year: 2026,
        marketPrices: initialPrices,
        marketPriceHistory: [],
        economyOverrides: {
          recessionSeverity: 25,
          inflationPressure: 20,
          marketVolatility: 135,
          nextMonthStockShock: 0.1,
        },
        historicalEconomicEvent: {
          id: 'evt-1',
          title: 'Scenario',
          monthsRemaining: 4,
          effects: {
            monthlyStockShock: -0.05,
          },
        },
      },
    });

    expect(response).toBeDefined();
    expect(response.marketPricesPrevious).toBeDefined();
    expect(response.marketPrices).toBeDefined();
    expect(Array.isArray(response.marketPriceHistory)).toBe(true);
    expect(response.marketPriceHistory.length).toBeGreaterThan(0);

    const last = response.marketPriceHistory[response.marketPriceHistory.length - 1];
    expect(last.month).toBe(1);
    expect(last.year).toBe(2027);

    expect(response.appliedShock).toBeCloseTo(0.05, 6);
    expect(response.economyOverrides.nextMonthStockShock).toBe(0);
    expect(response.registeredUsers).toBe(0);
    expect(response.marketCapsByTicker).toBeDefined();
    expect(response.floatSharesByTicker).toBeDefined();
    expect(Number(response.marketCapsByTicker.AAPL || 0)).toBeGreaterThan(0);
    expect(Number(response.floatSharesByTicker.AAPL || 0)).toBeGreaterThan(0);
  });

  it('is deterministic for the same month/year and input snapshot', async () => {
    const initialPrices = marketService.initializeMarketPrices();
    const state = {
      month: 5,
      year: 2026,
      marketPrices: initialPrices,
      marketPriceHistory: [],
      economyOverrides: {
        recessionSeverity: 40,
        inflationPressure: 35,
        marketVolatility: 150,
        nextMonthStockShock: -0.02,
      },
      historicalEconomicEvent: null,
    };

    const first = await controller.advanceStockMarket({ state });
    const second = await controller.advanceStockMarket({ state });

    expect(second.marketPricesPrevious).toEqual(first.marketPricesPrevious);
    expect(second.marketPrices).toEqual(first.marketPrices);
    expect(second.appliedShock).toEqual(first.appliedShock);
    expect(second.economyOverrides).toEqual(first.economyOverrides);
  });

  it('scales market cap metadata with registered user count without changing prices', async () => {
    const initialPrices = marketService.initializeMarketPrices();
    const state = {
      month: 4,
      year: 2026,
      marketPrices: initialPrices,
      marketPriceHistory: [],
      economyOverrides: {
        recessionSeverity: 0,
        inflationPressure: 0,
        marketVolatility: 100,
        nextMonthStockShock: 0,
      },
      historicalEconomicEvent: null,
    };

    userRepoMock.find.mockResolvedValueOnce(new Array(10).fill({ state: {}, id: 'u', username: 'u' }));
    const lowUsers = await controller.advanceStockMarket({ state });

    userRepoMock.find.mockResolvedValueOnce(new Array(100).fill({ state: {}, id: 'u', username: 'u' }));
    const highUsers = await controller.advanceStockMarket({ state });

    expect(highUsers.marketPrices).toEqual(lowUsers.marketPrices);
    expect(Number(highUsers.marketCapsByTicker.AAPL || 0)).toBeGreaterThan(Number(lowUsers.marketCapsByTicker.AAPL || 0));
    expect(Number(highUsers.floatSharesByTicker.AAPL || 0)).toBeGreaterThan(Number(lowUsers.floatSharesByTicker.AAPL || 0));
  });
});
