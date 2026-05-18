import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';

@Injectable()
export class EntertainmentService {
  constructor(private utilitiesService: UtilitiesService) {}

  entertainmentCapForSalary(job: any, city: any): number {
    const netSalary = Math.max(0, (job?.base || 0) * (city?.p || 1) * 0.8);
    return this.utilitiesService.round2(netSalary * 0.15);
  }

  normalizeEntertainmentBudgets(
    entertainment: number,
    subscription: number,
    cap: number,
  ): { entertainmentBudget: number; subscriptionBudget: number } {
    let entertainmentBudget = Math.max(0, entertainment || 0);
    let subscriptionBudget = Math.max(0, subscription || 0);
    entertainmentBudget = Math.min(entertainmentBudget, cap);
    subscriptionBudget = Math.min(subscriptionBudget, cap);
    return {
      entertainmentBudget: this.utilitiesService.round2(entertainmentBudget),
      subscriptionBudget: this.utilitiesService.round2(subscriptionBudget),
    };
  }

  autoAdjustEntertainmentBudgets(
    entertainment: number,
    subscription: number,
    year: number,
    month: number,
    jobTitle: string,
    cityName: string,
    cap: number,
  ): { entertainmentBudget: number; subscriptionBudget: number } {
    if ((entertainment || 0) <= 0 && (subscription || 0) <= 0) {
      return { entertainmentBudget: 0, subscriptionBudget: 0 };
    }
    const seedBase = `${year}-${month}-${jobTitle}-${cityName}`;
    const entRnd = this.utilitiesService.mulberry32(
      this.utilitiesService.hashString(`${seedBase}-ent`),
    )();
    const subRnd = this.utilitiesService.mulberry32(
      this.utilitiesService.hashString(`${seedBase}-sub`),
    )();
    const entFactor = 0.92 + entRnd * 0.18;
    const subFactor = 0.92 + subRnd * 0.18;
    const adjustedEntertainment = this.utilitiesService.round2(
      Math.max(0, (entertainment || 0) * entFactor),
    );
    const adjustedSubscription = this.utilitiesService.round2(
      Math.max(0, (subscription || 0) * subFactor),
    );
    return this.normalizeEntertainmentBudgets(
      adjustedEntertainment,
      adjustedSubscription,
      cap,
    );
  }

  comfortableEntertainmentDefaults(
    job: any,
    city: any,
  ): {
    entertainmentSpending: number;
    subscriptionEntertainmentSpending: number;
  } {
    const netSalary = Math.max(0, (job?.base || 0) * (city?.p || 1) * 0.8);
    const targetTotal = this.utilitiesService.round2(netSalary * 0.09);
    return {
      entertainmentSpending: this.utilitiesService.round2(targetTotal * 0.65),
      subscriptionEntertainmentSpending: this.utilitiesService.round2(
        targetTotal * 0.35,
      ),
    };
  }

  totalMonthlyIncomeForLuxuryPricing(snapshot: any): number {
    const salaryIncome = Math.max(
      0,
      Number(snapshot?.job?.base || 0) * Number(snapshot?.city?.p || 1) * 0.8,
    );
    const rentalIncome = Math.max(
      0,
      Number(snapshot?.realEstateLastMonthIncome || 0),
    );
    return this.utilitiesService.round2(salaryIncome + rentalIncome);
  }

  calculateLuxuryServiceMonthlyPay(
    serviceId: string,
    netMonthlyIncome: number,
    options?: { propertyCount?: number },
  ): number {
    const income = Math.max(0, Number(netMonthlyIncome || 0));
    const propertyCount = Math.max(
      0,
      Math.floor(Number(options?.propertyCount || 0)),
    );
    const rules: Record<
      string,
      { base: number; pct: number; min: number; max: number }
    > = {
      chef: { base: 2200, pct: 0.08, min: 3000, max: 20000 },
      housekeeper: { base: 1200, pct: 0.03, min: 1600, max: 9000 },
      chauffer: { base: 2000, pct: 0.05, min: 2800, max: 18000 },
      therapist: { base: 1600, pct: 0.025, min: 2000, max: 11000 },
      trainer: { base: 900, pct: 0.02, min: 1200, max: 7000 },
      concierge: { base: 2500, pct: 0.04, min: 3000, max: 25000 },
      accountant: { base: 250000, pct: 0.02, min: 1250000, max: 5000000 },
    };

    const rule = rules[serviceId];
    if (!rule) return 0;

    const raw = rule.base + income * rule.pct;
    const baseline = this.utilitiesService.round2(
      Math.min(rule.max, Math.max(rule.min, raw)),
    );
    const propertySurcharge =
      serviceId === 'housekeeper' ? propertyCount * 450 : 0;
    let adjusted = this.utilitiesService.round2(baseline + propertySurcharge);
    if (income <= 0) return adjusted;

    if (adjusted / income < 0.15) {
      const targetPremium = income * 0.15 - adjusted;
      adjusted = this.utilitiesService.round2(adjusted + targetPremium * 0.28);
    }

    return adjusted;
  }

  totalLuxuryServiceDiscretionary(state: any): number {
    const netMonthlyIncome = this.totalMonthlyIncomeForLuxuryPricing(state);
    const propertyCount = Array.isArray(state?.investmentProperties)
      ? state.investmentProperties.length
      : 0;
    const services = state?.luxuryServices || {};
    return this.utilitiesService.round2(
      Object.entries(services).reduce((sum, [serviceId, active]) => {
        if (!active) return sum;
        return (
          sum +
          this.calculateLuxuryServiceMonthlyPay(serviceId, netMonthlyIncome, {
            propertyCount,
          })
        );
      }, 0),
    );
  }
}
