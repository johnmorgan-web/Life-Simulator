import type { GameValues } from "../types/GameValues.types";

const gameValues: GameValues = {
  rentBase: 750, // Legacy - now calculated as % of salary
  hsDiplomaCost: 200,
  tradeCertCost: 800,
  degreeCost: 1200,
  rentPercentOfSalary: 0.30, // 30% of salary goes to rent (industry standard)
  foodCostBase: 350,  // Basic food costs (fast food, groceries for low earners)
  gasCostBase: 200, // Monthly gas for vehicle
  utilitiesCostBase: 150, // Electric, water, internet (before phone/internet)
  carMaintenance: 100, // Oil changes, repairs, insurance
  phoneInternetBase: 80, // Phone and home internet
};

/**
 * Return a monthly cost with seasonal bias and small random variation.
 * - month: 1-12
 * - category: 'utilities' | 'food' | 'gas' | 'car' | undefined
 * The final variation is clamped to +/-5% relative to base and rounded to 2 decimals.
 */
export function getMonthlyCost(base: number, month: number, category?: string) {
  // random variation in [-0.05, 0.05]
  const rand = Math.random() * 0.1 - 0.05
  let bias = 0
  // seasonal biases (small, moved into same +/-5% envelope via clamping)
  switch (category) {
    case 'utilities':
      // Higher in winter (heating) and summer (A/C)
      if (month === 12 || month === 1 || month === 2) bias = 0.03
      else if (month >= 6 && month <= 8) bias = 0.02
      break
    case 'food':
      // Slightly higher in holiday season and summer
      if (month === 11 || month === 12) bias = 0.03
      else if (month >= 6 && month <= 8) bias = 0.01
      break
    case 'gas':
      // Slightly higher in summer travel months
      if (month >= 6 && month <= 8) bias = 0.02
      break
    case 'car':
      // Spring maintenance season
      if (month >= 3 && month <= 5) bias = 0.02
      else if (month === 12 || month === 1) bias = 0.01
      break
    default:
      bias = 0
  }

  let pct = rand + bias
  // clamp to +/-5%
  if (pct > 0.05) pct = 0.05
  if (pct < -0.05) pct = -0.05

  const val = Math.round((base * (1 + pct)) * 100) / 100
  return val
}

export default gameValues;
