export type HistoricalEventEffects = {
  jobLossChance: number
  forcedDowngradeChance: number
  payCutPercent: number
  monthlyStockShock: number
  essentialCostIncreasePercent: number
  creditDragPerMonth: number
  jobSearchBlocked: boolean
}

export type HistoricalEconomicEventScenario = {
  id: string
  title: string
  era: string
  summary: string
  defaultDurationMonths: number
  economyOverrides: {
    recessionSeverity: number
    inflationPressure: number
    jobAvailability: number
    marketVolatility: number
    nextMonthStockShock: number
  }
  effects: HistoricalEventEffects
  affectedValues: string[]
}

export const historicalEconomicEventScenarios: HistoricalEconomicEventScenario[] = [
  {
    id: 'great-depression-1929',
    title: 'Great Depression (1929)',
    era: '1929-1939',
    summary: 'Severe, prolonged unemployment and contraction with deep financial stress.',
    defaultDurationMonths: 12,
    economyOverrides: {
      recessionSeverity: 92,
      inflationPressure: 18,
      jobAvailability: 48,
      marketVolatility: 170,
      nextMonthStockShock: -0.2,
    },
    effects: {
      jobLossChance: 0.28,
      forcedDowngradeChance: 0.4,
      payCutPercent: 0.22,
      monthlyStockShock: -0.11,
      essentialCostIncreasePercent: 0.06,
      creditDragPerMonth: 9,
      jobSearchBlocked: true,
    },
    affectedValues: [
      'Potential layoff into lower-paying work',
      'Temporary hiring freeze when applying for jobs',
      'Monthly paycheck reduction',
      'Recurring market drawdown',
      'Higher essential living costs',
      'Monthly credit score drag',
    ],
  },
  {
    id: 'oil-shock-1973',
    title: 'Oil Shock and Stagflation (1973)',
    era: '1973-1975',
    summary: 'Energy shock and inflation pressure reduced real purchasing power.',
    defaultDurationMonths: 8,
    economyOverrides: {
      recessionSeverity: 60,
      inflationPressure: 84,
      jobAvailability: 76,
      marketVolatility: 145,
      nextMonthStockShock: -0.08,
    },
    effects: {
      jobLossChance: 0.12,
      forcedDowngradeChance: 0.18,
      payCutPercent: 0.1,
      monthlyStockShock: -0.05,
      essentialCostIncreasePercent: 0.14,
      creditDragPerMonth: 4,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Inflation-driven essential cost squeeze',
      'Moderate layoff or downgrade risk',
      'Mild recurring stock weakness',
      'Small monthly credit pressure',
    ],
  },
  {
    id: 'dot-com-bust-2000',
    title: 'Dot-Com Bust (2000)',
    era: '2000-2002',
    summary: 'Tech-heavy valuation collapse with elevated equity volatility.',
    defaultDurationMonths: 6,
    economyOverrides: {
      recessionSeverity: 48,
      inflationPressure: 35,
      jobAvailability: 86,
      marketVolatility: 190,
      nextMonthStockShock: -0.16,
    },
    effects: {
      jobLossChance: 0.08,
      forcedDowngradeChance: 0.12,
      payCutPercent: 0.07,
      monthlyStockShock: -0.12,
      essentialCostIncreasePercent: 0.03,
      creditDragPerMonth: 2,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Large recurring stock drawdowns',
      'Tech-adjacent salary compression',
      'Moderate downgrade risk',
      'Minor essential cost increase',
    ],
  },
  {
    id: 'great-recession-2008',
    title: 'Great Recession (2008)',
    era: '2008-2010',
    summary: 'Housing and credit crisis with broad labor-market weakness.',
    defaultDurationMonths: 10,
    economyOverrides: {
      recessionSeverity: 82,
      inflationPressure: 40,
      jobAvailability: 62,
      marketVolatility: 175,
      nextMonthStockShock: -0.18,
    },
    effects: {
      jobLossChance: 0.2,
      forcedDowngradeChance: 0.3,
      payCutPercent: 0.16,
      monthlyStockShock: -0.09,
      essentialCostIncreasePercent: 0.05,
      creditDragPerMonth: 6,
      jobSearchBlocked: true,
    },
    affectedValues: [
      'Elevated unemployment and hiring freezes',
      'Forced re-entry into lower-paying jobs',
      'Repeated market shocks',
      'Pay cuts and tighter credit profile',
    ],
  },
  {
    id: 'pandemic-shock-2020',
    title: 'Pandemic Shock (2020)',
    era: '2020-2021',
    summary: 'Rapid demand shock, service disruption, and extreme market swings.',
    defaultDurationMonths: 7,
    economyOverrides: {
      recessionSeverity: 76,
      inflationPressure: 68,
      jobAvailability: 70,
      marketVolatility: 210,
      nextMonthStockShock: -0.22,
    },
    effects: {
      jobLossChance: 0.16,
      forcedDowngradeChance: 0.22,
      payCutPercent: 0.13,
      monthlyStockShock: -0.07,
      essentialCostIncreasePercent: 0.1,
      creditDragPerMonth: 5,
      jobSearchBlocked: true,
    },
    affectedValues: [
      'Temporary labor market freeze',
      'Pay compression in disrupted sectors',
      'Market crash and volatility spikes',
      'Higher recurring essential spending',
    ],
  },
  {
    id: 'post-war-expansion-1950s',
    title: 'Post-War Expansion (1950s)',
    era: '1948-1966',
    summary: 'Reconstruction, industrial expansion, and broad wage growth supported steady prosperity.',
    defaultDurationMonths: 9,
    economyOverrides: {
      recessionSeverity: 14,
      inflationPressure: 22,
      jobAvailability: 126,
      marketVolatility: 88,
      nextMonthStockShock: 0.04,
    },
    effects: {
      jobLossChance: 0.01,
      forcedDowngradeChance: 0.02,
      payCutPercent: 0.01,
      monthlyStockShock: 0.03,
      essentialCostIncreasePercent: 0.01,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Strong labor market with low disruption risk',
      'Smoother market conditions with modest upside drift',
      'Mild wage pressure instead of large pay cuts',
      'Lower stress on monthly budgeting decisions',
    ],
  },
  {
    id: 'bretton-woods-stability',
    title: 'Bretton Woods Stability',
    era: '1950s-1960s',
    summary: 'Policy coordination and fixed-rate discipline produced a relatively calm macro environment.',
    defaultDurationMonths: 8,
    economyOverrides: {
      recessionSeverity: 18,
      inflationPressure: 18,
      jobAvailability: 120,
      marketVolatility: 82,
      nextMonthStockShock: 0.03,
    },
    effects: {
      jobLossChance: 0.01,
      forcedDowngradeChance: 0.02,
      payCutPercent: 0.01,
      monthlyStockShock: 0.025,
      essentialCostIncreasePercent: 0.01,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Low month-to-month financial whiplash',
      'Predictable household cashflow planning',
      'Smaller downside tails for diversified portfolios',
      'More forgiving debt-service environment',
    ],
  },
  {
    id: 'great-moderation-era',
    title: 'Great Moderation',
    era: '1985-2007',
    summary: 'Lower inflation volatility and longer expansions created a perception of macro stability.',
    defaultDurationMonths: 10,
    economyOverrides: {
      recessionSeverity: 22,
      inflationPressure: 24,
      jobAvailability: 116,
      marketVolatility: 90,
      nextMonthStockShock: 0.035,
    },
    effects: {
      jobLossChance: 0.015,
      forcedDowngradeChance: 0.03,
      payCutPercent: 0.015,
      monthlyStockShock: 0.028,
      essentialCostIncreasePercent: 0.015,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Lower recession frequency in normal play',
      'Softer employment shocks',
      'Constructive equity drift with moderate volatility',
      'Improved runway for building emergency savings',
    ],
  },
  {
    id: 'nineties-productivity-boom',
    title: '1990s Productivity Boom',
    era: '1991-2000',
    summary: 'Technology adoption and productivity gains supported strong growth and rising confidence.',
    defaultDurationMonths: 7,
    economyOverrides: {
      recessionSeverity: 16,
      inflationPressure: 20,
      jobAvailability: 124,
      marketVolatility: 96,
      nextMonthStockShock: 0.05,
    },
    effects: {
      jobLossChance: 0.012,
      forcedDowngradeChance: 0.02,
      payCutPercent: 0.01,
      monthlyStockShock: 0.04,
      essentialCostIncreasePercent: 0.012,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Healthy hiring momentum and mobility',
      'Higher probability of portfolio growth',
      'Reduced chance of forced job downgrades',
      'Good environment for debt reduction and reserve building',
    ],
  },
  {
    id: 'early-2010s-recovery',
    title: 'Post-Crisis Recovery (Early 2010s)',
    era: '2010-2016',
    summary: 'Gradual recovery with improving jobs, moderate growth, and mostly supportive policy backdrop.',
    defaultDurationMonths: 8,
    economyOverrides: {
      recessionSeverity: 26,
      inflationPressure: 22,
      jobAvailability: 112,
      marketVolatility: 102,
      nextMonthStockShock: 0.025,
    },
    effects: {
      jobLossChance: 0.02,
      forcedDowngradeChance: 0.035,
      payCutPercent: 0.02,
      monthlyStockShock: 0.02,
      essentialCostIncreasePercent: 0.018,
      creditDragPerMonth: 1,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Slow-but-steady improvement in household finances',
      'Moderate market upside with periodic pullbacks',
      'Manageable labor risk compared to crisis regimes',
      'Encourages balanced strategy: savings plus investing',
    ],
  },
  {
    id: 'roaring-twenties-expansion',
    title: 'Roaring Twenties Expansion',
    era: '1922-1928',
    summary: 'Rapid growth and risk appetite drove strong markets, alongside rising speculative behavior.',
    defaultDurationMonths: 6,
    economyOverrides: {
      recessionSeverity: 20,
      inflationPressure: 28,
      jobAvailability: 118,
      marketVolatility: 122,
      nextMonthStockShock: 0.06,
    },
    effects: {
      jobLossChance: 0.018,
      forcedDowngradeChance: 0.03,
      payCutPercent: 0.015,
      monthlyStockShock: 0.045,
      essentialCostIncreasePercent: 0.02,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Fast gains possible but with elevated speculation risk',
      'Lower layoff odds than recession scenarios',
      'Higher confidence can tempt over-investing',
      'Good testbed for discussing diversification discipline',
    ],
  },
  {
    id: 'commodity-supercycle-calm-phase',
    title: 'Commodity Supercycle Calm Phase',
    era: '2003-2007 (select regions)',
    summary: 'Strong global demand supported employment and asset growth before later instability emerged.',
    defaultDurationMonths: 6,
    economyOverrides: {
      recessionSeverity: 24,
      inflationPressure: 34,
      jobAvailability: 114,
      marketVolatility: 108,
      nextMonthStockShock: 0.03,
    },
    effects: {
      jobLossChance: 0.022,
      forcedDowngradeChance: 0.032,
      payCutPercent: 0.018,
      monthlyStockShock: 0.022,
      essentialCostIncreasePercent: 0.03,
      creditDragPerMonth: 1,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Generally favorable growth backdrop',
      'Some inflation pressure on essentials remains',
      'Portfolio growth opportunities with moderate swings',
      'Useful scenario for practicing inflation-aware budgeting',
    ],
  },
  {
    id: 'digital-infrastructure-expansion',
    title: 'Digital Infrastructure Expansion',
    era: 'Late 2010s',
    summary: 'Cloud, software, and platform scaling created broad productivity tailwinds across sectors.',
    defaultDurationMonths: 7,
    economyOverrides: {
      recessionSeverity: 21,
      inflationPressure: 26,
      jobAvailability: 119,
      marketVolatility: 98,
      nextMonthStockShock: 0.04,
    },
    effects: {
      jobLossChance: 0.016,
      forcedDowngradeChance: 0.028,
      payCutPercent: 0.014,
      monthlyStockShock: 0.03,
      essentialCostIncreasePercent: 0.018,
      creditDragPerMonth: 0,
      jobSearchBlocked: false,
    },
    affectedValues: [
      'Broadly supportive labor conditions',
      'Constructive market backdrop for long-term investors',
      'Lower income shock frequency than crisis regimes',
      'Reinforces emergency-fund plus diversified-investing playbook',
    ],
  },
]

export function findHistoricalScenarioById(id: string) {
  return historicalEconomicEventScenarios.find((scenario) => scenario.id === id) || null
}
