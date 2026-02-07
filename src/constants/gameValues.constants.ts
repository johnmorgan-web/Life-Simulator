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

export default gameValues;
