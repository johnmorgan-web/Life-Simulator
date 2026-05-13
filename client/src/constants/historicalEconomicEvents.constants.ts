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
]

export function findHistoricalScenarioById(id: string) {
  return historicalEconomicEventScenarios.find((scenario) => scenario.id === id) || null
}
