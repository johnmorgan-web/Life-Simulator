import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { CreditService } from './credit.service';
import { VehicleService } from './vehicle.service';
import { RealEstateService } from './realEstate.service';
import { MarketService } from './market.service';
import { EntertainmentService } from './entertainment.service';
import { JobService } from './job.service';
import { GameState } from '../types/game.types';
import { cityData } from '../../data/cityData.constants';
import { academyCourses } from '../../data/academyCourses.constants';
import jobBoard from '../../data/jobBoard.constants';

@Injectable()
export class GameService {
  constructor(
    private utilitiesService: UtilitiesService,
    private creditService: CreditService,
    private vehicleService: VehicleService,
    private realEstateService: RealEstateService,
    private marketService: MarketService,
    private entertainmentService: EntertainmentService,
    private jobService: JobService,
  ) {}

  /**
   * Get initial game state for a new user
   */
  getInitialState(): Partial<GameState> {
    const defaultJob = { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 };
    const defaultCity = cityData[3]; // Chicago
    const entertainmentDefaults = this.entertainmentService.comfortableEntertainmentDefaults(
      defaultJob,
      defaultCity,
    );

    return {
      check: 1200.0,
      savings: 0,
      debt: 0,
      credit: 600,
      month: 2,
      year: 2026,
      city: defaultCity,
      job: defaultJob,
      transit: { name: 'L1 - Walk/Bike', cost: 15, level: 1 },
      activeEdu: null,
      eduProgress: this.initializeEduProgress(),
      ledger: [],
      tenure: 0,
      logs: [],
      careerHistory: [],
      credentials: [],
      credentialHistory: [],
      applications: [],
      jobMarket: this.jobService.initializeJobMarket(jobBoard),
      pendingJob: null,
      pendingTransit: null,
      pendingCity: null,
      eventHistory: [],
      jobStartMonth: 2,
      jobStartYear: 2026,
      showSettlement: false,
      applicationResults: [],
      luxuryServices: {
        chef: false,
        housekeeper: false,
        chauffer: false,
        therapist: false,
        trainer: false,
        concierge: false,
        accountant: false,
      },
      entertainmentSpending: entertainmentDefaults.entertainmentSpending,
      subscriptionEntertainmentSpending:
        entertainmentDefaults.subscriptionEntertainmentSpending,
      subscriptionStreakMonths: 0,
      subscriptionBadges: [],
      entertainmentTicketStubs: [],
      happiness: 70,
      workPenaltyPercent: 0,
      celebration: null,
      paymentStreak: 0,
      calculationStreak: 0,
      lastPaymentOnTime: true,
      skippedPaymentThisMonth: false,
      lastNegotiationMonth: null,
      lastNegotiationYear: null,
      lastAutoBumpMonth: 2,
      lastAutoBumpYear: 2026,
      currentUser: null,
      ownsVehicle: null,
      garage: [],
      vehicleHistory: [],
      house: { model: null, level: 0, value: 0 },
      inventory: [],
      realEstateMarket: this.realEstateService.initializeRealEstateMarket().market,
      realEstateMarketMeta: this.realEstateService.defaultRealEstateMeta(),
      investmentProperties: [],
      pendingRealEstateDeals: [],
      realEstateLastMonthIncome: 0,
      realEstateLastMonthExpenses: 0,
      realEstateLastMonthPropertyBreakdown: [],
      marketPrices: this.marketService.initializeMarketPrices(),
      marketPricesPrevious: this.marketService.initializeMarketPrices(),
      portfolio: [],
      marketLearningLevel: 'adult',
      marketUsePlainLanguage: false,
      realEstateLearningLevel: 'adult',
      realEstateUsePlainLanguage: false,
      autoInvest: {
        enabled: false,
        monthlyAmount: 0,
        profileId: 'balanced',
      },
      stockInvestedThisMonth: 0,
      stockInvestedLastMonth: 0,
      totalGasPaid: 0,
      totalUtilitiesPaid: 0,
      maxMonthlyLuxuryEventSpend: 0,
      achievementsUnlocked: [],
      achievementHistory: [],
      rewardTokens: 0,
      rewardCategoryQueue: [],
      lastAchievementCategory: null,
      unlockedThemes: ['default'],
      activeTheme: 'default',
      rewardHistory: [],
    };
  }

  /**
   * Initialize education progress tracking
   */
  private initializeEduProgress(): Record<string, number> {
    const progress: Record<string, number> = {};
    academyCourses.forEach((course: any) => {
      progress[course.n] = 0;
    });
    return progress;
  }

  /**
   * Process a month advancement
   * This is where the reducer logic would go
   */
  async processMonth(state: Partial<GameState>): Promise<Partial<GameState>> {
    // Update market prices
    const newPrices = this.marketService.advanceMarketPrices(
      state.marketPrices,
      state.year || 2026,
      (state.month || 1) + 1,
    );

    // Calculate interest on savings
    const savingsInterest = this.creditService.calculateSavingsInterest(state.savings || 0);
    const debtInterest = this.creditService.calculateDebtInterest(
      state.debt || 0,
      this.creditService.calculateDynamicAPR(state.credit || 600),
    );

    // Execute auto-invest if enabled
    const autoInvestResult = this.marketService.applyAutoInvestCycle(
      state.check || 0,
      state.portfolio || [],
      newPrices,
      state.marketPricesPrevious || {},
      state.autoInvest,
      state.logs || [],
      state.month || 1,
      state.year || 2026,
    );

    return {
      ...state,
      month: ((state.month || 1) % 12) + 1,
      year: state.year! + (state.month === 12 ? 1 : 0),
      check: autoInvestResult.checkBalance + savingsInterest,
      savings: (state.savings || 0) + savingsInterest,
      debt: Math.max(0, (state.debt || 0) + debtInterest),
      marketPrices: newPrices,
      marketPricesPrevious: state.marketPrices,
      portfolio: autoInvestResult.portfolio,
      logs: autoInvestResult.logs,
    };
  }

  /**
   * Apply a game action/reducer
   */
  async applyAction(
    state: Partial<GameState>,
    action: any,
  ): Promise<Partial<GameState>> {
    switch (action.type) {
      case 'PROCESS_MONTH':
        return this.processMonth(state);

      case 'RELOCATE_PREPARE':
        return {
          ...state,
          pendingCity: action.payload,
        };

      case 'APPLY_JOB':
        return {
          ...state,
          applications: [...(state.applications || []), action.payload],
        };

      case 'UPDATE_STATE':
        return {
          ...state,
          ...action.payload,
        };

      default:
        return state;
    }
  }

  /**
   * Get all services for use in dependency injection
   */
  getServices() {
    return {
      utilities: this.utilitiesService,
      credit: this.creditService,
      vehicle: this.vehicleService,
      realEstate: this.realEstateService,
      market: this.marketService,
      entertainment: this.entertainmentService,
      job: this.jobService,
    };
  }
}
