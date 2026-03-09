export type AchievementRule = {
  id: string
  title: string
  description: string
  category: 'vehicles' | 'calculation' | 'relocation' | 'lifestyle' | 'stocks' | 'tenure' | 'education' | 'wealth'
  metric: 'vehiclesOwned' | 'calculationStreak' | 'relocationCount' | 'lifestyleServices' | 'stockUnrealizedGain' | 'tenureMonths' | 'credentialsCount' | 'netWorth'
  threshold: number
  tokenReward: number
}

export const achievementRules: AchievementRule[] = [
  { id: 'veh-1', title: 'First Set of Keys', description: 'Own 1 vehicle.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 1, tokenReward: 1 },
  { id: 'veh-3', title: 'Family Fleet', description: 'Own 3 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 3, tokenReward: 1 },
  { id: 'veh-6', title: 'Motor Mogul', description: 'Own 6 vehicles.', category: 'vehicles', metric: 'vehiclesOwned', threshold: 6, tokenReward: 2 },

  { id: 'calc-10', title: 'Ledger Sharp', description: 'Reach a 10-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 10, tokenReward: 1 },
  { id: 'calc-25', title: 'Human Calculator', description: 'Reach a 25-step calculation streak.', category: 'calculation', metric: 'calculationStreak', threshold: 25, tokenReward: 2 },

  { id: 'rel-1', title: 'Fresh Start', description: 'Relocate once.', category: 'relocation', metric: 'relocationCount', threshold: 1, tokenReward: 1 },
  { id: 'rel-3', title: 'City Hopper', description: 'Relocate 3 times.', category: 'relocation', metric: 'relocationCount', threshold: 3, tokenReward: 2 },

  { id: 'life-3', title: 'Luxury Lite', description: 'Run 3 active lifestyle services.', category: 'lifestyle', metric: 'lifestyleServices', threshold: 3, tokenReward: 1 },
  { id: 'life-6', title: 'Concierge Class', description: 'Run all 6 lifestyle services.', category: 'lifestyle', metric: 'lifestyleServices', threshold: 6, tokenReward: 2 },

  { id: 'stk-1k', title: 'Market Green', description: 'Reach $1,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 1000, tokenReward: 1 },
  { id: 'stk-10k', title: 'Bull Runner', description: 'Reach $10,000 unrealized stock gains.', category: 'stocks', metric: 'stockUnrealizedGain', threshold: 10000, tokenReward: 2 },

  { id: 'ten-12', title: 'One-Year Anchor', description: 'Hold a position for 12 months.', category: 'tenure', metric: 'tenureMonths', threshold: 12, tokenReward: 1 },
  { id: 'ten-36', title: 'Career Pillar', description: 'Hold a position for 36 months.', category: 'tenure', metric: 'tenureMonths', threshold: 36, tokenReward: 2 },

  { id: 'edu-3', title: 'Credential Stack', description: 'Earn 3 credentials.', category: 'education', metric: 'credentialsCount', threshold: 3, tokenReward: 1 },
  { id: 'edu-8', title: 'Academic Arsenal', description: 'Earn 8 credentials.', category: 'education', metric: 'credentialsCount', threshold: 8, tokenReward: 2 },

  { id: 'net-100k', title: 'Six-Figure Climber', description: 'Reach $100,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 100000, tokenReward: 1 },
  { id: 'net-1m', title: 'Millionaire Mile', description: 'Reach $1,000,000 net worth.', category: 'wealth', metric: 'netWorth', threshold: 1000000, tokenReward: 3 }
]

export const cosmeticThemes: Record<string, { name: string; accent: string; bg: string }> = {
  default: { name: 'Classic Red', accent: '#ef4444', bg: '#f8fafc' },
  emerald: { name: 'Emerald', accent: '#10b981', bg: '#ecfdf5' },
  ocean: { name: 'Ocean Blue', accent: '#0ea5e9', bg: '#f0f9ff' },
  sunset: { name: 'Sunset Orange', accent: '#f97316', bg: '#fff7ed' },
  graphite: { name: 'Graphite', accent: '#475569', bg: '#f8fafc' }
}
