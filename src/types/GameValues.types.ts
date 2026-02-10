export type GameValues = {
  rentBase: number;
  hsDiplomaCost: number;
  tradeCertCost: number;
  degreeCost: number;
  rentPercentOfSalary: number; // Rent is this % of monthly salary
  FoodCostPercentOfSalary: number; // Monthly food cost is this % of monthly salary
  gasCostPercentOfSalary: number; // Starting monthly gas cost is this % of monthly salary
  utilitiesCostPercentOfSalary: number; // Starting monthly utilities cost
  carMaintenance: number; // Monthly car maintenance
  phoneInternetBase: number; // Monthly phone & internet
  // Financial rates (annual)
  loanAPR: number; // Annual percentage rate for loans (decimal)
  hysaAPR: number; // Annual percentage yield for savings (decimal)
}