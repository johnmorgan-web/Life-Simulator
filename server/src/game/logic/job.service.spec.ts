import { JobService } from './job.service';

describe('JobService wealth gate eligibility', () => {
  let service: JobService;

  beforeEach(() => {
    service = new JobService();
  });

  it('counts wealth correctly for gate checks using compatible asset field names', () => {
    const job = {
      title: 'Millionaire',
      base: 9000,
      tReq: 1,
      req: null,
      certReq: null,
    } as any;

    const state = {
      month: 5,
      year: 2026,
      city: { name: 'Chicago, US' },
      cityUserCount: 1,
      credentials: [],
      transit: { level: 1 },
      check: '250000',
      savings: '150000',
      debt: '50000',
      portfolio: [{ ticker: 'SPY', shares: '100', avgCost: '1000' }],
      garage: [{ marketValue: '60000' }],
      investmentProperties: [{ marketValue: '300000', mortgageBalance: '260000' }],
      applications: [],
      jobMarket: {
        Millionaire: { capacity: 100, occupied: 0 },
      },
      economyOverrides: {
        recessionSeverity: 0,
        inflationPressure: 0,
        jobAvailability: 100,
      },
    } as any;

    const eligibility = service.getJobEligibility(state, job);

    expect(eligibility.wealthRequirement).toBe(500000);
    expect(eligibility.netWorth).toBe(550000);
    expect(eligibility.wealthMet).toBe(true);
    expect(eligibility.canApply).toBe(true);
  });

  it('keeps net worth finite when malformed values are present', () => {
    const job = {
      title: 'Tech Startup Founder',
      base: 7000,
      tReq: 1,
      req: null,
      certReq: null,
    } as any;

    const state = {
      month: 5,
      year: 2026,
      city: { name: 'Chicago, US' },
      cityUserCount: 1,
      credentials: [],
      transit: { level: 1 },
      check: 'not-a-number',
      savings: 120000,
      debt: undefined,
      portfolio: [{ ticker: 'SPY', shares: 'oops', avgCost: 500 }],
      garage: [{ currentValue: null, purchasePrice: '50000' }],
      investmentProperties: [{ askingPrice: 200000, loan: 'bad-value' }],
      applications: [],
      jobMarket: {
        'Tech Startup Founder': { capacity: 100, occupied: 0 },
      },
      economyOverrides: {
        recessionSeverity: 0,
        inflationPressure: 0,
        jobAvailability: 100,
      },
    } as any;

    const eligibility = service.getJobEligibility(state, job);

    expect(Number.isFinite(eligibility.netWorth)).toBe(true);
    expect(eligibility.netWorth).toBe(355000);
    expect(eligibility.wealthRequirement).toBe(250000);
    expect(eligibility.wealthMet).toBe(true);
  });
});
