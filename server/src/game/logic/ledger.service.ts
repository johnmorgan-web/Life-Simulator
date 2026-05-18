import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { VehicleService } from './vehicle.service';
import { EntertainmentService } from './entertainment.service';
import { academyCourses } from '../../data/academyCourses.constants';
import gameValues from '../../data/gameValues.constants';

const LEDGER_DETAIL_POOLS: Record<string, string[]> = {
  housing: [
    'Monthly rent or mortgage payment',
    'Renter/home insurance premium',
    'Building maintenance and common fees',
    'Property taxes or local housing assessments',
    'Safety and security services',
    'Home essentials replenishment',
    'Lease administration and filing fees',
    'Routine home upkeep reserves',
    'Appliance wear-and-tear reserve',
    'General household operating baseline',
  ],
  transit: [
    'Public transit fare passes',
    'Rideshare and trip minimum charges',
    'Parking and station access fees',
    'Tolls and route surcharges',
    'Commute convenience upgrades',
    'Intercity transit tickets',
    'Transit card reloads',
    'Last-mile scooter or bike rides',
    'Airport or event transfer rides',
    'Occasional peak-hour price surges',
  ],
  gasMaint: [
    'Fuel top-ups and pump price changes',
    'Oil and fluid replacement',
    'Brake and tire wear costs',
    'Car wash and detailing basics',
    'Battery and filter servicing',
    'Registration and inspection prep',
    'Unexpected minor repairs',
    'Wiper, bulb, and small parts replacement',
    'Seasonal maintenance checks',
    'Roadside assistance contribution',
  ],
  utilities: [
    'Electricity and energy charges',
    'Water and sewer services',
    'Heating or cooling usage',
    'Trash and recycling pickup',
    'Phone line and mobile service',
    'Home internet plan',
    'Utility base fees and riders',
    'Peak usage time-of-day charges',
    'Network equipment rental',
    'Monthly communication taxes and fees',
  ],
  food: [
    'Grocery staples and pantry restock',
    'Fresh produce and proteins',
    'Household kitchen supplies',
    'Lunches and workday meals',
    'Coffee and quick snacks',
    'Bulk discount store runs',
    'Weekend meal prep ingredients',
    'Beverages and hydration items',
    'Personal care essentials from grocery trips',
    'Food delivery and convenience pickups',
  ],
  entertainment: [
    'Dining out and social outings',
    'Movie, concert, or local event tickets',
    'Gaming, hobbies, and recreation',
    'Weekend activities and experiences',
    'Sports, fitness classes, or day passes',
    'Creative supplies and passion projects',
    'Date nights and celebrations',
    'Short local trips and attractions',
    'Family-friendly entertainment activities',
    'Books, audio, or leisure content',
  ],
  subscriptions: [
    'Streaming video subscriptions',
    'Music and podcast memberships',
    'Gaming or creator platform passes',
    'Cloud storage and app subscriptions',
    'Premium productivity tools',
    'News or education subscriptions',
    'Fitness and wellness app plans',
    'Digital magazine bundles',
    'Online community memberships',
    'Auto-renewing lifestyle services',
  ],
};

@Injectable()
export class LedgerService {
  constructor(
    private utils: UtilitiesService,
    private vehicleService: VehicleService,
    private entertainmentService: EntertainmentService,
  ) {}

  buildLedger(state: any, paySave = 0, payDebt = 0): any[] {
    const fix = (n: number) => this.utils.fix(n);
    const ledger: any[] = [];
    let id = 0;
    const chauffeurActive = Boolean(state?.luxuryServices?.chauffer)
      && this.vehicleService.garageHasChauffeurEligibleVehicle(Array.isArray(state?.garage) ? state.garage : []);

    // Salary and statement costs should always reflect the active/current job.
    // pendingJob is only a queued future transition and should not drive ledger pay.
    const job = state.job || state.pendingJob;

    const deterministicHash = (key: string) => {
      const seedText = `${state.year}-${state.month}-${state.city?.name}-${job?.title}-${key}`;
      let hash = 0;
      for (let i = 0; i < seedText.length; i++) {
        hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
      }
      return hash;
    };

    const applyLedgerDecimalVariance = (amount: number, key: string): number => {
      if (amount <= 0) return 0;
      const hash = deterministicHash(key);
      const offset = ((hash % 91) - 45) / 100;
      return fix(Math.max(0.01, amount + offset));
    };

    const rotatingDetails = (poolKey: keyof typeof LEDGER_DETAIL_POOLS, key: string, count = 3) => {
      const pool = LEDGER_DETAIL_POOLS[poolKey] || [];
      if (!pool.length || count <= 0) return [];

      const start = deterministicHash(`details-${key}`) % pool.length;
      const picked: string[] = [];
      for (let i = 0; i < Math.min(count, pool.length); i++) {
        picked.push(pool[(start + i) % pool.length]);
      }
      return picked;
    };

    // Previous balance
    let bal = fix((state.check || 0) - paySave - payDebt);
    ledger.push({ id: id++, desc: 'Previous Balance', amt: 0, type: 'none', bal, done: true });

    // Salary
    const grossSalary = fix((job?.base || 0) * (state.city?.p || 1));
    const baseNetSalary = fix(grossSalary * 0.8);
    const workPenaltyPercent = Math.max(0, Math.min(0.35, state.workPenaltyPercent || 0));
    const netSalary = applyLedgerDecimalVariance(
      fix(baseNetSalary * (1 - workPenaltyPercent)),
      'net-salary',
    );

    bal = fix(bal + netSalary);
    ledger.push({
      id: id++,
      desc: `Net Salary: ${job?.title}${workPenaltyPercent > 0 ? ` (${(workPenaltyPercent * 100).toFixed(1)}% attendance impact)` : ''}`,
      amt: netSalary,
      type: 'inc',
      bal,
      done: false,
    });

    // Real estate income
    const realEstateIncome = Math.max(0, Number(state.realEstateLastMonthIncome || 0));
    const realEstateExpenses = Math.max(0, Number(state.realEstateLastMonthExpenses || 0));
    const realEstatePropertyBreakdown = Array.isArray(state.realEstateLastMonthPropertyBreakdown)
      ? state.realEstateLastMonthPropertyBreakdown
      : [];

    if (realEstateIncome > 0) {
      if (state.luxuryServices?.housekeeper) {
        bal = fix(bal + realEstateIncome);
        ledger.push({
          id: id++,
          desc: 'Rental Income (Managed Portfolio)',
          amt: realEstateIncome,
          type: 'inc',
          bal,
          done: false,
          details: realEstatePropertyBreakdown
            .filter((entry: any) => Number(entry?.grossIncome || 0) > 0)
            .map(
              (entry: any) =>
                `${entry.propertyName} (${entry.cityName}): $${Math.round(Number(entry.grossIncome || 0)).toLocaleString()}`,
            ),
        });
      } else {
        const incomeRows = realEstatePropertyBreakdown.filter(
          (entry: any) => Number(entry?.grossIncome || 0) > 0,
        );
        if (incomeRows.length > 0) {
          for (const entry of incomeRows) {
            const grossIncome = Math.max(0, Number(entry.grossIncome || 0));
            bal = fix(bal + grossIncome);
            ledger.push({
              id: id++,
              desc: `Rental Income: ${entry.propertyName} (${entry.cityName})`,
              amt: grossIncome,
              type: 'inc',
              bal,
              done: false,
            });
          }
        } else {
          bal = fix(bal + realEstateIncome);
          ledger.push({
            id: id++,
            desc: 'Rental Income (Last Month)',
            amt: realEstateIncome,
            type: 'inc',
            bal,
            done: false,
          });
        }
      }
    }

    if (realEstateExpenses > 0) {
      bal = fix(bal - realEstateExpenses);
      ledger.push({
        id: id++,
        desc: 'Rental Operating Costs (Last Month)',
        amt: realEstateExpenses,
        type: 'out',
        bal,
        done: false,
      });
    }

    // Housing / Rent
    const rent = applyLedgerDecimalVariance(
      fix(netSalary * gameValues.rentPercentOfSalary * (state.city?.r || 1)),
      'rent',
    );
    bal = fix(bal - rent);
    ledger.push({
      id: id++,
      desc: `Housing/Rent Payment (${Math.round(gameValues.rentPercentOfSalary * 100)}% salary)`,
      amt: rent,
      type: 'out',
      bal,
      done: false,
      details: rotatingDetails('housing', 'housing-rent'),
    });

    const mortgagePayment = Math.max(
      0,
      Number(state.house?.mortgagePayment ?? state.house?.monthlyPayment ?? state.house?.mortgage ?? 0),
    );
    const housingPaymentForUtilities = mortgagePayment > 0 ? mortgagePayment : rent;

    // Transportation
    if (!chauffeurActive) {
      const transitCost = applyLedgerDecimalVariance(
        state.transit?.cost || 0,
        `transit-${state.transit?.name}`,
      );
      bal = fix(bal - transitCost);
      ledger.push({
        id: id++,
        desc: `Transit: ${state.transit?.name}`,
        amt: transitCost,
        type: 'out',
        bal,
        done: false,
        details: rotatingDetails('transit', `transit-${state.transit?.name || 'default'}`),
      });

      // Only charge gas and maintenance if the player owns a vehicle
      if (state.garage && state.garage.length > 0) {
        const gas = this.utils.variableCost(
          gameValues.gasCostPercentOfSalary * 0.5,
          state.month,
          state.year,
          state.city?.p || 1,
          'gas',
          state.city?.name || '',
        );
        const carMaint = this.utils.variableCost(
          gameValues.carMaintenance,
          state.month,
          state.year,
          state.city?.p || 1,
          'car',
          state.city?.name || '',
        );
        const gasAndMaint = applyLedgerDecimalVariance(fix(gas + carMaint), 'gas-maint-no-vehicle');
        bal = fix(bal - gasAndMaint);
        ledger.push({
          id: id++,
          desc: 'Gas & Car Maintenance',
          amt: gasAndMaint,
          type: 'out',
          bal,
          done: false,
          details: rotatingDetails('gasMaint', 'gas-maint-combined'),
        });
      }
    }

    // Utilities & Phone
    const utilitiesBase = fix(housingPaymentForUtilities * 0.12);
    const utilities = this.utils.variableCost(
      utilitiesBase,
      state.month,
      state.year,
      1,
      'utilities',
      state.city?.name || '',
    );
    const phoneInternet = gameValues.phoneInternetBase;
    const totalUtilities = applyLedgerDecimalVariance(
      fix(utilities + phoneInternet),
      'utilities-phone',
    );
    bal = fix(bal - totalUtilities);
    ledger.push({
      id: id++,
      desc: 'Utilities & Phone/Internet',
      amt: totalUtilities,
      type: 'out',
      bal,
      done: false,
      details: rotatingDetails('utilities', 'utilities-phone'),
    });

    // Food
    if (!state.luxuryServices?.chef) {
      const foodCost = applyLedgerDecimalVariance(
        this.utils.variableCost(
          gameValues.FoodCostPercentOfSalary * 0.8,
          state.month,
          state.year,
          state.city?.p || 1,
          'food',
          state.city?.name || '',
        ),
        'food',
      );
      bal = fix(bal - foodCost);
      ledger.push({
        id: id++,
        desc: 'Food & Groceries',
        amt: foodCost,
        type: 'out',
        bal,
        done: false,
        details: rotatingDetails('food', 'food-groceries'),
      });
    }

    // Entertainment
    const entertainmentCap = this.entertainmentService.entertainmentCapForSalary(job, state.city);
    const adjustedEntertainment = this.entertainmentService.autoAdjustEntertainmentBudgets(
      state.entertainmentSpending || 0,
      state.subscriptionEntertainmentSpending || 0,
      state.year,
      state.month,
      job?.title || '',
      state.city?.name || '',
      entertainmentCap,
    );

    if (adjustedEntertainment.entertainmentBudget > 0) {
      const entertainmentCost = applyLedgerDecimalVariance(
        this.utils.variableCost(
          adjustedEntertainment.entertainmentBudget,
          state.month,
          state.year,
          1,
          'entertainment',
          state.city?.name || '',
        ),
        'entertainment-general',
      );
      bal = fix(bal - entertainmentCost);
      ledger.push({
        id: id++,
        desc: 'Entertainment',
        amt: entertainmentCost,
        type: 'out',
        bal,
        done: false,
        details: rotatingDetails('entertainment', 'entertainment-general'),
      });
    }

    if (adjustedEntertainment.subscriptionBudget > 0) {
      const subscriptionCost = applyLedgerDecimalVariance(
        this.utils.variableCost(
          adjustedEntertainment.subscriptionBudget,
          state.month,
          state.year,
          1,
          'entertainment',
          `${state.city?.name || ''}-subs`,
        ),
        'entertainment-subscriptions',
      );
      bal = fix(bal - subscriptionCost);
      ledger.push({
        id: id++,
        desc: 'Subscription Entertainment',
        amt: subscriptionCost,
        type: 'out',
        bal,
        done: false,
        details: rotatingDetails('subscriptions', 'entertainment-subscriptions'),
      });
    }

    // Stock investments
    const stockInvestDebit = fix(Number(state.stockInvestedLastMonth || 0));
    if (stockInvestDebit > 0) {
      bal = fix(bal - stockInvestDebit);
      ledger.push({
        id: id++,
        desc: 'Stock Investments (Cost Basis)',
        amt: stockInvestDebit,
        type: 'out',
        bal,
        done: false,
      });
    }

    // Education
    if (state.activeEdu) {
      const course = academyCourses.find((c) => c.n === state.activeEdu);
      const cost = applyLedgerDecimalVariance(
        course ? course.c : 1000,
        `tuition-${state.activeEdu}`,
      );
      bal = fix(bal - cost);
      ledger.push({
        id: id++,
        desc: `Tuition: ${state.activeEdu}`,
        amt: cost,
        type: 'out',
        bal,
        done: false,
      });
    }

    // Vehicle costs
    if (state.garage && state.garage.length > 0) {
      for (const g of state.garage) {
        if (g.monthsRemaining > 0) {
          const payment = applyLedgerDecimalVariance(
            g.monthlyPayment,
            `vehicle-payment-${g.id}`,
          );
          bal = fix(bal - payment);
          ledger.push({
            id: id++,
            desc: `Vehicle Loan Payment: ${g.vehicleName}`,
            amt: payment,
            type: 'out',
            bal,
            done: false,
          });
        }

        if (!chauffeurActive) {
          const gasCost = this.vehicleService.calculateMonthlyGasCost(g);
          if (gasCost > 0) {
            const adjustedGasCost = applyLedgerDecimalVariance(gasCost, `vehicle-gas-${g.id}`);
            bal = fix(bal - adjustedGasCost);
            ledger.push({
              id: id++,
              desc: `Gas: ${g.vehicleName}`,
              amt: adjustedGasCost,
              type: 'out',
              bal,
              done: false,
            });
          }

          const maintCost = this.vehicleService.calculateMonthlyMaintenanceCost(
            g,
            state.month,
            state.year,
          );
          if (maintCost > 0) {
            const adjustedMaintCost = applyLedgerDecimalVariance(
              maintCost,
              `vehicle-maint-${g.id}`,
            );
            bal = fix(bal - adjustedMaintCost);
            ledger.push({
              id: id++,
              desc: `Maintenance: ${g.vehicleName}`,
              amt: adjustedMaintCost,
              type: 'out',
              bal,
              done: false,
            });
          }
        }
      }
    }

    // Luxury services
    let luxuryCosts = 0;
    const luxuryServicesList: string[] = [];
    const luxuryLineItems: Array<{ desc: string; amt: number }> = [];
    const netMonthlyIncome = this.entertainmentService.totalMonthlyIncomeForLuxuryPricing(state);
    const explicitPropertyCount = Number(state?.investmentPropertyCount);
    const propertyCount = Number.isFinite(explicitPropertyCount)
      ? Math.max(0, Math.floor(explicitPropertyCount))
      : Array.isArray(state.investmentProperties)
        ? state.investmentProperties.length
        : 0;

    const luxuryServiceConfigs = [
      { id: 'chef', label: 'Chef', varianceKey: 'luxury-chef' },
      { id: 'housekeeper', label: 'Housekeeper', varianceKey: 'luxury-housekeeper' },
      { id: 'chauffer', label: 'Chauffeur', varianceKey: 'luxury-chauffeur' },
      { id: 'therapist', label: 'Therapist', varianceKey: 'luxury-therapist' },
      { id: 'trainer', label: 'Trainer', varianceKey: 'luxury-trainer' },
      { id: 'concierge', label: 'Concierge', varianceKey: 'luxury-concierge' },
      { id: 'accountant', label: 'Accountant', varianceKey: 'luxury-accountant' },
    ];

    for (const cfg of luxuryServiceConfigs) {
      if (!(state.luxuryServices as any)?.[cfg.id]) continue;
      const baseCost = this.entertainmentService.calculateLuxuryServiceMonthlyPay(
        cfg.id,
        netMonthlyIncome,
        { propertyCount },
      );
      const adjustedCost = applyLedgerDecimalVariance(baseCost, cfg.varianceKey);
      luxuryCosts += adjustedCost;
      luxuryServicesList.push(`${cfg.label}: $${adjustedCost}`);
      luxuryLineItems.push({ desc: `Luxury Service: ${cfg.label}`, amt: adjustedCost });
    }

    if (luxuryCosts > 0) {
      if (state.luxuryServices?.housekeeper) {
        bal = fix(bal - luxuryCosts);
        ledger.push({
          id: id++,
          desc: `Luxury Services (${luxuryServicesList.length})`,
          amt: luxuryCosts,
          type: 'out',
          bal,
          done: false,
          details: luxuryServicesList,
        });
      } else {
        for (const line of luxuryLineItems) {
          bal = fix(bal - line.amt);
          ledger.push({
            id: id++,
            desc: line.desc,
            amt: line.amt,
            type: 'out',
            bal,
            done: false,
          });
        }
      }
    }

    // Accountant summary mode
    if (state.luxuryServices?.accountant) {
      const first = ledger[0];
      const others = ledger.slice(1);
      const totalDebits = fix(
        others.reduce(
          (sum: number, row: any) =>
            row?.type === 'out' ? sum + Number(row?.amt || 0) : sum,
          0,
        ),
      );
      const nonDebitRows = others.filter((row: any) => row?.type !== 'out');

      let runningBal = Number(first?.bal || 0);
      const simplified: any[] = [{ ...first, id: 0, bal: runningBal, done: true }];

      if (totalDebits > 0) {
        runningBal = fix(runningBal - totalDebits);
        simplified.push({
          id: simplified.length,
          desc: 'Accountant Summary: Total Debits',
          amt: totalDebits,
          type: 'out',
          bal: runningBal,
          done: false,
          details: ['All debit items auto-summed by Accountant service'],
        });
      }

      for (const row of nonDebitRows) {
        if (row?.type === 'in') runningBal = fix(runningBal + Number(row?.amt || 0));
        simplified.push({ ...row, id: simplified.length, bal: runningBal, done: false });
      }

      return simplified;
    }

    return ledger;
  }

  extractStatementEvents(state: any): any[] {
    const month = Number(state?.month || 0);
    const year = Number(state?.year || 0);
    const source = Array.isArray(state?.statementEvents)
      ? state.statementEvents
      : Array.isArray(state?.eventHistory)
        ? state.eventHistory
        : [];

    return source
      .filter((entry: any) => {
        if (!entry || typeof entry !== 'object') return false;
        const eventMonth = Number(entry.month || 0);
        const eventYear = Number(entry.year || 0);
        return eventMonth === month && eventYear === year;
      })
      .map((entry: any, idx: number) => ({
        id: String(entry.id || `evt-${year}-${month}-${idx}`),
        title: String(entry.title || 'Life Event'),
        amount: Number(entry.amount || 0),
        type: entry.type === 'in' ? 'in' : 'out',
        icon: String(entry.icon || '🗞️'),
        desc: String(entry.desc || ''),
        trigger: String(entry.trigger || 'general'),
        month,
        year,
      }));
  }
}
