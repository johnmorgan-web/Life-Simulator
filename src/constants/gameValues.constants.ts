import type { GameValues } from "../types/GameValues.types";

const gameValues: GameValues = {
  rentBase: 750, // Legacy - now calculated as % of salary
  hsDiplomaCost: 200,
  tradeCertCost: 800,
  degreeCost: 1200,
  rentPercentOfSalary: 0.30, // 30% of salary goes to rent (industry standard)
  FoodCostPercentOfSalary: 150,  // Basic food costs (fast food, groceries for low earners)
  gasCostPercentOfSalary: 0.05, // Monthly gas for vehicle
  utilitiesCostPercentOfSalary: 200, // Electric, water, internet (before phone/internet)
  carMaintenance: 100, // Oil changes, repairs, insurance
  phoneInternetBase: 80, // Phone and home internet
  // Financial rates (annual)
  loanAPR: 0.105, // national average personal loan APR (~10.5%)
  hysaAPR: 0.0365 // high-yield savings annual rate (~3.65%)
};

export default gameValues;
