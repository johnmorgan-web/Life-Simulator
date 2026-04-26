import { Injectable } from '@nestjs/common';
import { vehicleDatabase } from '../../data/vehicleDatabase.constants';

@Injectable()
export class VehicleService {
  // Relocation cost calculation based on distance and vehicle transport
  calculateRelocationCost(current: any, target: any, ownedVehicle: any, haversineDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number) {
    if (!current || !target || !('lat' in current) || !('lat' in target)) {
      return { distance: 0, relocationCost: 1500, transportCost: 0, sellVehicle: false };
    }
    const distance = haversineDistance(current.lat, current.lon, target.lat, target.lon);
    // base moving cost per km and fixed overhead
    const basePerKm = 0.8; // $0.8 per km
    const overhead = 800;
    const relocationCost = Math.round((distance * basePerKm + overhead) * 100) / 100;

    // vehicle transport cost based on vehicle being owned
    let transportCost = 0;
    if (ownedVehicle && ownedVehicle.vehicleId) {
      const vehicle = vehicleDatabase.vehicles.find((v) => v.id === ownedVehicle.vehicleId);
      if (vehicle) {
        transportCost = Math.round((distance * vehicle.costPerKm) * 100) / 100;
      }
    }

    // if target is far and user doesn't have appropriate transit, suggest selling vehicle
    const sellVehicle = false; // default false; UI may propose
    return { distance, relocationCost, transportCost, sellVehicle };
  }

  // Calculate vehicle depreciation based on age and condition
  calculateVehicleValue(vehicle: any, currentMonth: number, currentYear: number): number {
    if (!vehicle) return 0;
    const vehicleData = vehicleDatabase.vehicles.find((v) => v.id === vehicle.vehicleId);
    if (!vehicleData) return vehicle.purchasePrice;

    const ageMonths =
      (currentYear - vehicle.purchaseYear) * 12 + (currentMonth - vehicle.purchaseMonth);
    const ageYears = ageMonths / 12;

    const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes];
    let currentValue = vehicle.purchasePrice;

    // Apply depreciation for each year
    if (ageYears > 0) {
      const depreciationRate = vehicle.purchasedNew
        ? classData.depreciation.new
        : classData.depreciation.used;
      currentValue = vehicle.purchasePrice * Math.pow(1 - depreciationRate, ageYears);
    }

    return Math.round(currentValue * 100) / 100;
  }

  // Calculate monthly car payment based on purchase price, APR, and term
  calculateMonthlyPayment(principal: number, aprRate: number, months: number): number {
    if (months <= 0 || principal <= 0) return 0;
    const monthlyRate = aprRate / 12;
    if (monthlyRate === 0) return principal / months;
    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment * 100) / 100;
  }

  // Calculate gas cost per month based on vehicle efficiency
  calculateMonthlyGasCost(vehicle: any, milesPerMonth: number = 1000): number {
    if (!vehicle) return 0;
    const vehicleData = vehicleDatabase.vehicles.find((v) => v.id === vehicle.vehicleId);
    if (!vehicleData) return 0;

    const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes];
    const gasPricePerGallon = 3.5; // Can be made dynamic
    const gallonsNeeded = milesPerMonth / classData.gasMileage;
    return Math.round(gallonsNeeded * gasPricePerGallon * 100) / 100;
  }

  // Calculate maintenance cost per month based on vehicle age and class
  calculateMonthlyMaintenanceCost(vehicle: any, currentMonth: number, currentYear: number): number {
    if (!vehicle) return 0;
    const vehicleData = vehicleDatabase.vehicles.find((v) => v.id === vehicle.vehicleId);
    if (!vehicleData) return 0;

    const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes];
    const ageMonths =
      (currentYear - vehicle.purchaseYear) * 12 + (currentMonth - vehicle.purchaseMonth);
    const ageYears = ageMonths / 12;

    // Base maintenance: $50-150 per month depending on class
    let baseMaintenance = 80 * classData.baseMaintenanceFactor;

    // Increase with age: +20% per year after 3 years
    if (ageYears > 3) {
      baseMaintenance *= 1 + (ageYears - 3) * 0.2;
    }

    return Math.round(baseMaintenance * 100) / 100;
  }

  // Detect if garage has helicopter
  garageHasHelicopter(garage: any[]): boolean {
    return garage.some((g) => {
      const vehicle = vehicleDatabase.vehicles.find((v) => v.id === g.vehicleId);
      if (!vehicle) return false;
      const body = (vehicle.body || '').toLowerCase();
      return body.includes('helicopter') || vehicle.icon === '🚁';
    });
  }

  // Get preferred transit from garage
  preferredTransitFromGarage(garage: any[], transitStateByName: (name: string) => any): any {
    if (!garage || garage.length === 0) return null;
    if (this.garageHasHelicopter(garage)) {
      return transitStateByName('L5 - Helicopter');
    }
    return transitStateByName('L4 - Owned Vehicle');
  }

  // Sync transit with garage
  syncTransitWithGarage(currentTransit: any, garage: any[], transitStateByName: (name: string) => any): any {
    const vehicleTransit = this.preferredTransitFromGarage(garage, transitStateByName);
    if (vehicleTransit) return vehicleTransit;
    if ((currentTransit?.level || 1) >= 4) {
      return transitStateByName('L3 - Rideshare - Uber/Lyft');
    }
    return currentTransit;
  }
}
