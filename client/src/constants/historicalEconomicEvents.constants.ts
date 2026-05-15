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
  realWorldImpact?: string
  keyStatistics?: string[]
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
    realWorldImpact: 'Households faced mass unemployment, wage collapse, and widespread loss of savings during prolonged economic contraction.',
    keyStatistics: [
      'Labor: US unemployment peaked near 25% in 1933',
      'Output: US real GDP fell by about 30% from 1929 to 1933',
      'Finance: More than 9,000 US banks failed during the early 1930s',
    ],
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
    realWorldImpact: 'Families paid more for fuel and essentials while wages lagged, combining weak growth with persistent inflation pressure.',
    keyStatistics: [
      'Prices: Global oil prices rose roughly 4x between late 1973 and 1974',
      'Inflation: US CPI inflation reached about 12.3% in 1974',
      'Labor: US unemployment rose to about 9.0% by 1975',
    ],
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
    realWorldImpact: 'Workers in technology and adjacent sectors faced layoffs and hiring pullbacks as speculative valuations reset sharply.',
    keyStatistics: [
      'Markets: NASDAQ Composite fell about 78% from peak to trough (2000-2002)',
      'Investment: US business investment in equipment and software declined in 2001-2002',
      'Labor: US unemployment rose from around 4.0% in 2000 to about 6.3% in 2003',
    ],
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
    realWorldImpact: 'Foreclosures, tighter credit, and layoffs disrupted household finances and forced many workers into lower-paying roles.',
    keyStatistics: [
      'Labor: US unemployment peaked at 10.0% in October 2009',
      'Markets: S&P 500 fell about 57% from 2007 peak to 2009 trough',
      'Housing: US home prices fell roughly 20-30% nationally from peak levels',
    ],
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
    realWorldImpact: 'Service workers and small businesses were hit hardest, with sudden job loss, income volatility, and disrupted spending patterns.',
    keyStatistics: [
      'Labor: US unemployment spiked to 14.7% in April 2020',
      'Output: Global GDP contracted about 3.1% in 2020',
      'Markets: S&P 500 dropped about 34% in early 2020 before recovering later',
    ],
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
    realWorldImpact: 'Many households experienced rising wages, suburban home ownership growth, and more stable long-term employment.',
    keyStatistics: [
      'Output: US real GDP grew around 4% per year on average in the 1950s',
      'Labor: US unemployment was often near or below 5% during much of the decade',
      'Households: US homeownership rose from about 55% in 1950 to around 62% by 1960',
    ],
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
    realWorldImpact: 'Currency stability and coordinated policy reduced uncertainty for trade, jobs, and long-horizon household planning.',
    keyStatistics: [
      'Policy: Bretton Woods fixed exchange-rate framework operated broadly from 1944 to 1971',
      'Trade: World merchandise trade expanded strongly in the 1950s and 1960s',
      'Volatility: Advanced economies generally saw lower macro volatility than in interwar periods',
    ],
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
    realWorldImpact: 'Families and firms benefited from steadier inflation and output, making budgeting and credit management feel more predictable.',
    keyStatistics: [
      'Inflation: US inflation was generally lower and less volatile than in the 1970s',
      'Cycles: US recessions were less frequent/severe before the 2008 crisis compared with prior decades',
      'Growth: Long expansions in the 1990s and mid-2000s reinforced perceived economic stability',
    ],
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
    realWorldImpact: 'Productivity gains helped raise living standards, supported job creation, and boosted retirement/investment balances.',
    keyStatistics: [
      'Productivity: US labor productivity growth accelerated in the late 1990s versus early 1990s',
      'Labor: US unemployment fell to about 4.0% by 2000',
      'Markets: S&P 500 delivered strong cumulative gains across most of the decade',
    ],
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
    realWorldImpact: 'Households gradually rebuilt employment and balance sheets, though wage gains were uneven across sectors and regions.',
    keyStatistics: [
      'Labor: US unemployment fell from about 9.6% (2010) to about 4.9% (2016)',
      'Output: US real GDP growth was moderate, roughly around 2% annually in much of the period',
      'Balance Sheets: US household net worth recovered and surpassed pre-crisis highs during the expansion',
    ],
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
    realWorldImpact: 'Rising consumer credit and fast industrial growth improved near-term living standards but increased vulnerability to a sharp reversal.',
    keyStatistics: [
      'Output: US real GDP grew strongly through most of the 1920s',
      'Industry: US industrial production rose substantially across the decade',
      'Markets: Stock valuations and margin speculation climbed sharply before 1929',
    ],
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
    realWorldImpact: 'Resource exporters and related industries saw income gains, while households in many regions benefited from robust growth and credit access.',
    keyStatistics: [
      'Output: Global GDP growth averaged roughly 4-5% across 2003-2007',
      'Commodities: Many commodity benchmarks rose strongly before the 2008 downturn',
      'Trade: Global trade volumes expanded rapidly in the pre-crisis years',
    ],
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
    realWorldImpact: 'Businesses improved efficiency through cloud adoption, and workers in digital-adjacent roles saw stronger demand and mobility.',
    keyStatistics: [
      'Technology Spend: Global cloud infrastructure spending grew rapidly throughout the late 2010s',
      'Investment Mix: Software and IT services shares of business investment increased in many advanced economies',
      'Adoption: Digital-platform adoption expanded across retail, media, logistics, and finance',
    ],
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
