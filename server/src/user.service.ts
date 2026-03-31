import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

// Import data
import { cityData } from './data/cityData.constants';
import { jobBoard } from './data/jobBoard.constants';
import { academyCourses } from './data/academyCourses.constants';
import { stockMarketAssets } from './data/stockMarket.constants';
import { realEstateTemplates } from './data/realEstate.constants';
import { autoInvestProfiles } from './data/stockMarket.constants'; // assuming it's there

// Import functions - need to copy them
// For now, placeholder

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Copy all helper functions here
  // ...

  async createUser(name: string): Promise<User> {
    const initialState = this.getInitialState(name);
    const createdUser = new this.userModel(initialState);
    return createdUser.save();
  }

  async getUserByName(name: string): Promise<User | null> {
    return this.userModel.findOne({ name }).exec();
  }

  async updateUser(name: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ name }, updateData, { new: true }).exec();
  }

  // Implement reducer logic here
  async processMonth(name: string): Promise<User | null> {
    const user = await this.getUserByName(name);
    if (!user) return null;

    // Apply month processing logic
    // This will be the reducer logic moved here

    // For now, placeholder
    return this.updateUser(name, { month: user.month + 1 });
  }

  private getInitialState(name: string): Partial<User> {
    const initializeEduProgress = () => {
      const progress: any = {};
      academyCourses.forEach(course => {
        progress[course.n] = 0;
      });
      return progress;
    };

    const comfortableEntertainmentDefaults = (job: any, city: any) => {
      // Placeholder - need to implement
      return { entertainmentSpending: 100, subscriptionEntertainmentSpending: 50 };
    };

    const initializeJobMarket = (jobs: any[]) => {
      // Placeholder
      return {};
    };

    const getSharedRealEstateMarket = () => {
      // Placeholder
      return {};
    };

    const readSharedRealEstateMeta = () => {
      // Placeholder
      return {};
    };

    const defaultRealEstateMeta = () => {
      // Placeholder
      return {};
    };

    const initializeMarketPrices = () => {
      // Placeholder
      return {};
    };

    return {
      name,
      check: 1200.0,
      save: 0,
      debt: 0,
      credit: 600,
      month: 2,
      year: 2026,
      city: cityData[3],
      job: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 },
      transit: { name: 'L1 - Walk/Bike', cost: 15, level: 1 },
      activeEdu: null,
      eduProgress: initializeEduProgress(),
      ledger: [],
      tenure: 0,
      logs: [],
      careerHistory: [],
      credentials: [],
      credentialHistory: [],
      applications: [],
      jobMarket: initializeJobMarket(jobBoard),
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
        chauffeur: false,
        therapist: false,
        trainer: false,
        concierge: false,
        accountant: false
      },
      entertainmentSpending: comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3]).entertainmentSpending,
      subscriptionEntertainmentSpending: comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3]).subscriptionEntertainmentSpending,
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
      realEstateMarket: getSharedRealEstateMarket(),
      realEstateMarketMeta: readSharedRealEstateMeta() || defaultRealEstateMeta(),
      investmentProperties: [],
      pendingRealEstateDeals: [],
      realEstateLastMonthIncome: 0,
      realEstateLastMonthExpenses: 0,
      realEstateLastMonthPropertyBreakdown: [],
      marketPrices: initializeMarketPrices(),
      marketPricesPrevious: initializeMarketPrices(),
      portfolio: [],
      marketLearningLevel: 'adult',
      marketUsePlainLanguage: false,
      realEstateLearningLevel: 'adult',
      realEstateUsePlainLanguage: false,
      autoInvest: {
        enabled: false,
        monthlyAmount: 0,
        profileId: 'balanced'
      },
      stockInvestedThisMonth: 0,
      stockInvestedLastMonth: 0,
      totalGasPaid: 0,
      totalUtilitiesPaid: 0,
      maxMonthlyLuxuryEventSpend: 0,
      achievementsUnlocked: [],
      achievementHistory: [],
      rewardTokens: 0,
      lastAchievementCategory: null,
      unlockedThemes: ['default'],
      activeTheme: 'default',
      rewardHistory: []
    };
  }
}