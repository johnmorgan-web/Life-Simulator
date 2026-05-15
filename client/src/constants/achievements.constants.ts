export type AchievementRule = {
  id: string
  title: string
  description: string
  category: 'vehicles' | 'calculation' | 'relocation' | 'lifestyle' | 'stocks' | 'tenure' | 'education' | 'wealth' | 'household' | 'entertainment'
  metric:
    | 'vehiclesOwned'
    | 'calculationStreak'
    | 'relocationCount'
    | 'lifestyleServices'
    | 'stockUnrealizedGain'
    | 'tenureMonths'
    | 'credentialsCount'
    | 'netWorth'
    | 'tickerShares'
    | 'singleStockShares'
    | 'lifetimeGasPaid'
    | 'lifetimeUtilitiesPaid'
    | 'ticketStubCount'
    | 'monthlyLuxuryEventSpend'
  threshold: number
  tokenReward: number
  ticker?: string
}

export const achievementRules: AchievementRule[] = [
  { id: 'veh-1', title: 'First Set of Keys', description: 'Own 1 vehicle.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 1, tokenReward: 1 },
  { id: 'veh-3', title: 'Family Fleet', description: 'Own 3 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 3, tokenReward: 1 },
  { id: 'veh-6', title: 'Motor Mogul', description: 'Own 6 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 6, tokenReward: 2 },
  { id: 'veh-10', title: 'Garage Goals', description: 'Own 10 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 10, tokenReward: 3 },
  { id: 'veh-20', title: 'Car Collector', description: 'Own 20 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 20, tokenReward: 5 },
  { id: 'veh-50', title: 'Automotive Aficionado', description: 'Own 50 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 50, tokenReward: 8 },

  { id: 'calc-10', title: 'Ledger Sharp', description: 'Reach a 10-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 10, tokenReward: 1 },
  { id: 'calc-25', title: 'Human Calculator', description: 'Reach a 25-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 25, tokenReward: 2 },
  { id: 'calc-50', title: 'Mental Math Master', description: 'Reach a 50-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 50, tokenReward: 3 },
  { id: 'calc-100', title: 'Arithmetic Ace', description: 'Reach a 100-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 100, tokenReward: 5 },
  { id: 'calc-200', title: 'Numerical Ninja', description: 'Reach a 200-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 200, tokenReward: 8 },

  { id: 'rel-1', title: 'Fresh Start', description: 'Relocate once.', category: 'relocation', metric: 'relocationCount', threshold: 1, tokenReward: 1 },
  { id: 'rel-3', title: 'City Hopper', description: 'Relocate 3 times.', category: 'relocation', metric: 'relocationCount', threshold: 3, tokenReward: 2 },
  { id: 'rel-5', title: 'Globe Trotter', description: 'Relocate 5 times.', category: 'relocation', metric: 'relocationCount', threshold: 5, tokenReward: 3 },
  { id: 'rel-10', title: 'World Explorer', description: 'Relocate 10 times.', category: 'relocation', metric: 'relocationCount', threshold: 10, tokenReward: 5 },
  { id: 'rel-20', title: 'Ultimate Nomad', description: 'Relocate 20 times.', category: 'relocation', metric: 'relocationCount', threshold: 20, tokenReward: 8 },
  { id: 'rel-50', title: 'Relocation Legend', description: 'Relocate 50 times.', category: 'relocation', metric: 'relocationCount', threshold: 50, tokenReward: 13 },

  { id: 'life-1', title: 'Luxury Tester', description: 'Run 1 active lifestyle service.', category: 'lifestyle', metric: 'lifestyleServices', threshold: 1, tokenReward: 1 },
  { id: 'life-3', title: 'Luxury Lite', description: 'Run 3 active lifestyle services.', category: 'lifestyle', metric: 'lifestyleServices', threshold: 3, tokenReward: 1 },
  { id: 'life-6', title: 'Concierge Class', description: 'Run all 6 lifestyle services.', category: 'lifestyle', metric: 'lifestyleServices', threshold: 6, tokenReward: 2 },

  { id: 'stk-1k', title: 'Market Green', description: 'Reach $1,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 1000, tokenReward: 1 },
  { id: 'stk-10k', title: 'Bull Runner', description: 'Reach $10,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 10000, tokenReward: 2 },
  { id: 'stk-50k', title: 'Stock Star', description: 'Reach $50,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 50000, tokenReward: 3 },
  { id: 'stk-100k', title: 'Equity Elite', description: 'Reach $100,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 100000, tokenReward: 5 },
  { id: 'stk-500k', title: 'Portfolio Powerhouse', description: 'Reach $500,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 500000, tokenReward: 8 },
  { id: 'stk-1m', title: 'Market Mogul', description: 'Reach $1,000,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 1000000, tokenReward: 13 },
  { id: 'stk-5m', title: 'Equity Emperor', description: 'Reach $5,000,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 5000000, tokenReward: 21 },
  { id: 'stk-10m', title: 'Stock Titan', description: 'Reach $10,000,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 10000000, tokenReward: 34 },
  
  { id: 'stk-aapl-5', title: 'Apple Starter Lot', description: 'Own 5 shares of AAPL.', category: 'stocks', metric: 'tickerShares', ticker: 'AAPL', threshold: 5, tokenReward: 1 },
  { id: 'stk-aapl-20', title: 'Apple Core Position', description: 'Own 20 shares of AAPL.', category: 'stocks', metric: 'tickerShares', ticker: 'AAPL', threshold: 20, tokenReward: 2 },
  { id: 'stk-aapl-50', title: 'Apple Whale', description: 'Own 50 shares of AAPL.', category: 'stocks', metric: 'tickerShares', ticker: 'AAPL', threshold: 50, tokenReward: 3 },
  { id: 'stk-vti-10', title: 'ETF Enthusiast', description: 'Own 10 shares of VTI.', category: 'stocks', metric: 'tickerShares', ticker: 'VTI', threshold: 10, tokenReward: 1 },
  { id: 'stk-vti-50', title: 'ETF Investor', description: 'Own 50 shares of VTI.', category: 'stocks', metric: 'tickerShares', ticker: 'VTI', threshold: 50, tokenReward: 2 },
  { id: 'stk-vti-200', title: 'ETF Strategist', description: 'Own 200 shares of VTI.', category: 'stocks', metric: 'tickerShares', ticker: 'VTI', threshold: 200, tokenReward: 3 },
  { id: 'stk-tsla-3', title: 'EV Curiosity', description: 'Own 3 shares of TSLA.', category: 'stocks', metric: 'tickerShares', ticker: 'TSLA', threshold: 3, tokenReward: 1 },
  { id: 'stk-tsla-12', title: 'EV Conviction', description: 'Own 12 shares of TSLA.', category: 'stocks', metric: 'tickerShares', ticker: 'TSLA', threshold: 12, tokenReward: 2 },
  { id: 'stk-tsla-30', title: 'EV Heavyweight', description: 'Own 30 shares of TSLA.', category: 'stocks', metric: 'tickerShares', ticker: 'TSLA', threshold: 30, tokenReward: 3 },
  { id: 'stk-single-25', title: 'Focused Bet', description: 'Hold 25 shares in one stock.', category: 'stocks', metric: 'singleStockShares', threshold: 25, tokenReward: 1 },
  { id: 'stk-single-75', title: 'Concentrated Conviction', description: 'Hold 75 shares in one stock.', category: 'stocks', metric: 'singleStockShares', threshold: 75, tokenReward: 2 },
  { id: 'stk-single-150', title: 'Single-Name Titan', description: 'Hold 150 shares in one stock.', category: 'stocks', metric: 'singleStockShares', threshold: 150, tokenReward: 3 },
  
  { id: 'ten-1', title: 'Stepping Stone', description: 'Hold a position for 1 month.', category: 'tenure', metric: 'tenureMonths', threshold: 1, tokenReward: 1 },
  { id: 'ten-6', title: 'Half-Year Hold', description: 'Hold a position for 6 months.', category: 'tenure', metric: 'tenureMonths', threshold: 6, tokenReward: 1 },
  { id: 'ten-12', title: 'One-Year Anchor', description: 'Hold a position for 12 months.', category: 'tenure', metric: 'tenureMonths', threshold: 12, tokenReward: 1 },
  { id: 'ten-36', title: 'Career Pillar', description: 'Hold a position for 36 months.', category: 'tenure', metric: 'tenureMonths', threshold: 36, tokenReward: 2 },
  { id: 'ten-60', title: 'Loyalist', description: 'Hold a position for 60 months.', category: 'tenure', metric: 'tenureMonths', threshold: 60, tokenReward: 3 },
  { id: 'ten-120', title: 'Veteran', description: 'Hold a position for 120 months.', category: 'tenure', metric: 'tenureMonths', threshold: 120, tokenReward: 5 },

  { id: 'edu-1', title: 'Credential Starter', description: 'Earn 1 credential.', category: 'education', metric: 'credentialsCount', threshold: 1, tokenReward: 1 },
  { id: 'edu-3', title: 'Credential Stack', description: 'Earn 3 credentials.', category: 'education', metric: 'credentialsCount', threshold: 3, tokenReward: 1 },
  { id: 'edu-5', title: 'Credential Collector', description: 'Earn 5 credentials.', category: 'education', metric: 'credentialsCount', threshold: 5, tokenReward: 2 },
  { id: 'edu-8', title: 'Academic Arsenal', description: 'Earn 8 credentials.', category: 'education', metric: 'credentialsCount', threshold: 8, tokenReward: 2 },
  { id: 'edu-12', title: 'Education Empire', description: 'Earn 12 credentials.', category: 'education', metric: 'credentialsCount', threshold: 12, tokenReward: 3 },
  { id: 'edu-20', title: 'Lifelong Learner', description: 'Earn 20 credentials.', category: 'education', metric: 'credentialsCount', threshold: 20, tokenReward: 5 },
  { id: 'edu-30', title: 'Master of All Trades', description: 'Earn 30 credentials.', category: 'education', metric: 'credentialsCount', threshold: 30, tokenReward: 8 },
  { id: 'edu-50', title: 'Renaissance Scholar', description: 'Earn 50 credentials.', category: 'education', metric: 'credentialsCount', threshold: 50, tokenReward: 13 },

  { id: 'net-10k', title: 'Financial Footing', description: 'Reach $10,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 10000, tokenReward: 1 },
  { id: 'net-25k', title: 'Quarter-Century Climber', description: 'Reach $25,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 25000, tokenReward: 1 },
  { id: 'net-50k', title: 'Half-Century Climber', description: 'Reach $50,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 50000, tokenReward: 2 },
  { id: 'net-100k', title: 'Six-Figure Climber', description: 'Reach $100,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 100000, tokenReward: 1 },
  { id: 'net-250k', title: 'Quarter-Million Milestone', description: 'Reach $250,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 250000, tokenReward: 2 },
  { id: 'net-1m', title: 'Millionaire Mile', description: 'Reach $1,000,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 1000000, tokenReward: 3 },
  { id: 'net-5m', title: 'Multi-Million Milestone', description: 'Reach $5,000,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 5000000, tokenReward: 5 },
  { id: 'net-10m', title: 'Deca-Millionaire', description: 'Reach $10,000,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 10000000, tokenReward: 8 },
  { id: 'net-50m', title: 'Centimillionaire', description: 'Reach $50,000,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 50000000, tokenReward: 13 },

  { id: 'house-gas-1k', title: 'Fueling Up', description: 'Pay $1,000 total in gas.', category: 'household', metric: 'lifetimeGasPaid', threshold: 1000, tokenReward: 1 },
  { id: 'house-gas-5k', title: 'Road Budget Veteran', description: 'Pay $5,000 total in gas.', category: 'household', metric: 'lifetimeGasPaid', threshold: 5000, tokenReward: 2 },
  { id: 'house-gas-15k', title: 'Fuel Mogul', description: 'Pay $15,000 total in gas.', category: 'household', metric: 'lifetimeGasPaid', threshold: 15000, tokenReward: 3 },
  { id: 'house-gas-50k', title: 'Gas Giant', description: 'Pay $50,000 total in gas.', category: 'household', metric: 'lifetimeGasPaid', threshold: 50000, tokenReward: 5 },
  { id: 'house-gas-100k', title: 'Petrol Powerhouse', description: 'Pay $100,000 total in gas.', category: 'household', metric: 'lifetimeGasPaid', threshold: 100000, tokenReward: 8 },

  { id: 'house-util-500', title: 'Utility User', description: 'Pay $500 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 500, tokenReward: 1 },
  { id: 'house-util-2k', title: 'Lights On', description: 'Pay $2,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 2000, tokenReward: 1 },
  { id: 'house-util-10k', title: 'Household Backbone', description: 'Pay $10,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 10000, tokenReward: 2 },
  { id: 'house-util-20k', title: 'Energy Enthusiast', description: 'Pay $20,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 20000, tokenReward: 3 },
  { id: 'house-util-30k', title: 'Grid Sponsor', description: 'Pay $30,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 30000, tokenReward: 3 },
  { id: 'house-util-50k', title: 'Utility Tycoon', description: 'Pay $50,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 50000, tokenReward: 5 },
  { id: 'house-util-100k', title: 'Power Baron', description: 'Pay $100,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 100000, tokenReward: 8 },
  { id: 'house-util-250k', title: 'Energy Emperor', description: 'Pay $250,000 total in utilities.', category: 'household', metric: 'lifetimeUtilitiesPaid', threshold: 250000, tokenReward: 13 },

  { id: 'ent-stub-1', title: 'Event Explorer', description: 'Collect 1 ticket stub from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 1, tokenReward: 1 },
  { id: 'ent-stub-3', title: 'Weekend Host', description: 'Collect 3 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 3, tokenReward: 1 },
  { id: 'ent-stub-6', title: 'Social Butterfly', description: 'Collect 6 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 6, tokenReward: 2 },
  { id: 'ent-stub-12', title: 'Venue Favorite', description: 'Collect 12 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 12, tokenReward: 2 },
  { id: 'ent-stub-18', title: 'Event Enthusiast', description: 'Collect 18 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 18, tokenReward: 3 },
  { id: 'ent-stub-24', title: 'Event Legend', description: 'Collect 24 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 24, tokenReward: 3 },
  { id: 'ent-stub-36', title: 'Socialite', description: 'Collect 36 ticket stubs from hosted events.', category: 'entertainment', metric: 'ticketStubCount', threshold: 36, tokenReward: 5 },

  { id: 'ent-luxe-500', title: 'Social Spark', description: 'Reach $500 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 500, tokenReward: 1 },
  { id: 'ent-luxe-1500', title: 'Event Aficionado', description: 'Reach $1,500 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 1500, tokenReward: 2 },
  { id: 'ent-luxe-2500', title: 'Curated Nights', description: 'Reach $2,500 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 2500, tokenReward: 2 },
  { id: 'ent-luxe-5000', title: 'Luxury Event Connoisseur', description: 'Reach $5,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 5000, tokenReward: 3 },
  { id: 'ent-luxe-7500', title: 'High Society Host', description: 'Reach $7,500 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 7500, tokenReward: 3 },
  { id: 'ent-luxe-10000', title: 'Galactic Gala Planner', description: 'Reach $10,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 10000, tokenReward: 3 },
  { id: 'ent-luxe-25000', title: 'Extravaganza Expert', description: 'Reach $25,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 25000, tokenReward: 5 },
  { id: 'ent-luxe-50000', title: 'Luxury Legend', description: 'Reach $50,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 50000, tokenReward: 8 },
  { id: 'ent-luxe-100000', title: 'Opulence Overlord', description: 'Reach $100,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 100000, tokenReward: 13},
  { id: 'ent-luxe-250000', title: 'Galactic Gala Planner', description: 'Reach $250,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 250000, tokenReward: 21 },
  { id: 'ent-luxe-500000', title: 'Extravaganza Expert', description: 'Reach $500,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 500000, tokenReward: 34 },
  { id: 'ent-luxe-1m', title: 'Luxury Legend', description: 'Reach $1,000,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 1000000, tokenReward: 55 },
  { id: 'ent-luxe-5m', title: 'Opulence Overlord', description: 'Reach $5,000,000 in monthly luxury-event spending.', category: 'entertainment', metric: 'monthlyLuxuryEventSpend', threshold: 5000000, tokenReward: 89 },

]

export type CosmeticTheme = {
  name: string
  accent: string
  bg: string
  gradient: string
  pattern: string
  glassBg: string
  glassBorder: string
}

export const cosmeticThemes: Record<string, CosmeticTheme> = {
  default: {
    name: 'Crimson Ledger',
    accent: '#dc2626',
    bg: '#fef2f2',
    gradient: 'radial-gradient(circle at 16% 20%, #fee2e2 0%, transparent 34%), radial-gradient(circle at 85% 8%, #fecaca 0%, transparent 28%), linear-gradient(135deg, #fff5f5 0%, #fff1f2 45%, #fef3f2 100%)',
    pattern: 'repeating-linear-gradient(45deg, rgba(220,38,38,0.07) 0 2px, transparent 2px 14px)',
    glassBg: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(239, 68, 68, 0.28)'
  },
  emerald: {
    name: 'Emerald Canopy',
    accent: '#059669',
    bg: '#ecfdf5',
    gradient: 'radial-gradient(circle at 12% 12%, #d1fae5 0%, transparent 34%), radial-gradient(circle at 90% 0%, #a7f3d0 0%, transparent 26%), linear-gradient(150deg, #f0fdf4 0%, #dcfce7 50%, #ecfdf5 100%)',
    pattern: 'radial-gradient(circle at 1px 1px, rgba(16,185,129,0.18) 1.1px, transparent 0)',
    glassBg: 'rgba(244, 255, 250, 0.84)',
    glassBorder: 'rgba(5, 150, 105, 0.3)'
  },
  ocean: {
    name: 'Ocean Current',
    accent: '#0284c7',
    bg: '#ecfeff',
    gradient: 'radial-gradient(circle at 18% 20%, #cffafe 0%, transparent 36%), radial-gradient(circle at 88% 6%, #bae6fd 0%, transparent 28%), linear-gradient(155deg, #f0f9ff 0%, #e0f2fe 42%, #ecfeff 100%)',
    pattern: 'repeating-linear-gradient(-35deg, rgba(14,165,233,0.09) 0 2px, transparent 2px 16px)',
    glassBg: 'rgba(240, 249, 255, 0.82)',
    glassBorder: 'rgba(2, 132, 199, 0.28)'
  },
  sunset: {
    name: 'Sunset Circuit',
    accent: '#ea580c',
    bg: '#fff7ed',
    gradient: 'radial-gradient(circle at 9% 10%, #ffedd5 0%, transparent 35%), radial-gradient(circle at 86% 6%, #fed7aa 0%, transparent 26%), linear-gradient(160deg, #fff7ed 0%, #ffedd5 48%, #fffbeb 100%)',
    pattern: 'repeating-linear-gradient(0deg, rgba(249,115,22,0.08) 0 1px, transparent 1px 13px), repeating-linear-gradient(90deg, rgba(249,115,22,0.08) 0 1px, transparent 1px 13px)',
    glassBg: 'rgba(255, 250, 240, 0.84)',
    glassBorder: 'rgba(234, 88, 12, 0.3)'
  },
  graphite: {
    name: 'Graphite Grid',
    accent: '#334155',
    bg: '#e2e8f0',
    gradient: 'radial-gradient(circle at 20% 16%, #cbd5e1 0%, transparent 36%), radial-gradient(circle at 86% 10%, #94a3b8 0%, transparent 27%), linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 52%, #cbd5e1 100%)',
    pattern: 'repeating-linear-gradient(45deg, rgba(51,65,85,0.1) 0 2px, transparent 2px 10px)',
    glassBg: 'rgba(248, 250, 252, 0.8)',
    glassBorder: 'rgba(71, 85, 105, 0.32)'
  },
  aurora: {
    name: 'Aurora Mint',
    accent: '#0f766e',
    bg: '#ecfeff',
    gradient: 'radial-gradient(circle at 18% 18%, #99f6e4 0%, transparent 33%), radial-gradient(circle at 84% 8%, #a5f3fc 0%, transparent 26%), linear-gradient(140deg, #f0fdfa 0%, #e0f2fe 45%, #ecfeff 100%)',
    pattern: 'linear-gradient(120deg, rgba(20,184,166,0.12) 0%, transparent 35%, rgba(14,116,144,0.1) 65%, transparent 100%)',
    glassBg: 'rgba(240, 253, 250, 0.82)',
    glassBorder: 'rgba(15, 118, 110, 0.3)'
  },
  royal: {
    name: 'Royal Gold',
    accent: '#a16207',
    bg: '#fefce8',
    gradient: 'radial-gradient(circle at 14% 12%, #fef08a 0%, transparent 32%), radial-gradient(circle at 88% 7%, #fde68a 0%, transparent 28%), linear-gradient(150deg, #fffbeb 0%, #fef3c7 46%, #fefce8 100%)',
    pattern: 'repeating-linear-gradient(45deg, rgba(161,98,7,0.1) 0 1px, transparent 1px 11px)',
    glassBg: 'rgba(255, 251, 235, 0.84)',
    glassBorder: 'rgba(161, 98, 7, 0.32)'
  }
}
