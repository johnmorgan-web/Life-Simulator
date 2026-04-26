import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 1200.0 })
  check: number;

  @Prop({ default: 0 })
  savings: number;

  @Prop({ default: 0 })
  debt: number;

  @Prop({ default: 600 })
  credit: number;

  @Prop({ default: 2 })
  month: number;

  @Prop({ default: 2026 })
  year: number;

  @Prop({ type: Object })
  city: any;

  @Prop({ type: Object })
  job: any;

  @Prop({ type: Object })
  transit: any;

  @Prop({ type: Object })
  activeEdu: any;

  @Prop({ type: Object, default: {} })
  eduProgress: any;

  @Prop({ type: [Object], default: [] })
  ledger: any[];

  @Prop({ default: 0 })
  tenure: number;

  @Prop({ type: [Object], default: [] })
  logs: any[];

  @Prop({ type: [Object], default: [] })
  careerHistory: any[];

  @Prop({ type: [String], default: [] })
  credentials: string[];

  @Prop({ type: [Object], default: [] })
  credentialHistory: any[];

  @Prop({ type: [Object], default: [] })
  applications: any[];

  @Prop({ type: Object, default: {} })
  jobMarket: any;

  @Prop({ type: Object })
  pendingJob: any;

  @Prop({ type: Object })
  pendingTransit: any;

  @Prop({ type: Object })
  pendingCity: any;

  @Prop({ type: [Object], default: [] })
  eventHistory: any[];

  @Prop({ default: 2 })
  jobStartMonth: number;

  @Prop({ default: 2026 })
  jobStartYear: number;

  @Prop({ default: false })
  showSettlement: boolean;

  @Prop({ type: [Object], default: [] })
  applicationResults: any[];

  @Prop({ type: Object, default: {} })
  luxuryServices: any;

  @Prop({ default: 0 })
  entertainmentSpending: number;

  @Prop({ default: 0 })
  subscriptionEntertainmentSpending: number;

  @Prop({ default: 0 })
  subscriptionStreakMonths: number;

  @Prop({ type: [Object], default: [] })
  subscriptionBadges: any[];

  @Prop({ type: [Object], default: [] })
  entertainmentTicketStubs: any[];

  @Prop({ default: 70 })
  happiness: number;

  @Prop({ default: 0 })
  workPenaltyPercent: number;

  @Prop({ type: String })
  celebration: string | null;

  @Prop({ default: 0 })
  paymentStreak: number;

  @Prop({ default: 0 })
  calculationStreak: number;

  @Prop({ default: true })
  lastPaymentOnTime: boolean;

  @Prop({ default: false })
  skippedPaymentThisMonth: boolean;

  @Prop({ type: Number })
  lastNegotiationMonth: number | null;

  @Prop({ type: Number })
  lastNegotiationYear: number | null;

  @Prop({ default: 2 })
  lastAutoBumpMonth: number;

  @Prop({ default: 2026 })
  lastAutoBumpYear: number;

  @Prop({ type: String })
  currentUser: string | null;

  @Prop({ type: Object })
  ownsVehicle: any;

  @Prop({ type: [Object], default: [] })
  garage: any[];

  @Prop({ type: [Object], default: [] })
  vehicleHistory: any[];

  @Prop({ type: Object, default: { model: null, level: 0, value: 0 } })
  house: any;

  @Prop({ type: [Object], default: [] })
  inventory: any[];

  @Prop({ type: Object, default: {} })
  realEstateMarket: any;

  @Prop({ type: Object, default: {} })
  realEstateMarketMeta: any;

  @Prop({ type: [Object], default: [] })
  investmentProperties: any[];

  @Prop({ type: [Object], default: [] })
  pendingRealEstateDeals: any[];

  @Prop({ default: 0 })
  realEstateLastMonthIncome: number;

  @Prop({ default: 0 })
  realEstateLastMonthExpenses: number;

  @Prop({ type: [Object], default: [] })
  realEstateLastMonthPropertyBreakdown: any[];

  @Prop({ type: Object, default: {} })
  marketPrices: any;

  @Prop({ type: Object, default: {} })
  marketPricesPrevious: any;

  @Prop({ type: [Object], default: [] })
  portfolio: any[];

  @Prop({ default: 'adult' })
  marketLearningLevel: string;

  @Prop({ default: false })
  marketUsePlainLanguage: boolean;

  @Prop({ default: 'adult' })
  realEstateLearningLevel: string;

  @Prop({ default: false })
  realEstateUsePlainLanguage: boolean;

  @Prop({ type: Object, default: { enabled: false, monthlyAmount: 0, profileId: 'balanced' } })
  autoInvest: any;

  @Prop({ default: 0 })
  stockInvestedThisMonth: number;

  @Prop({ default: 0 })
  stockInvestedLastMonth: number;

  @Prop({ default: 0 })
  totalGasPaid: number;

  @Prop({ default: 0 })
  totalUtilitiesPaid: number;

  @Prop({ default: 0 })
  maxMonthlyLuxuryEventSpend: number;

  @Prop({ type: [String], default: [] })
  achievementsUnlocked: string[];

  @Prop({ type: [Object], default: [] })
  achievementHistory: any[];

  @Prop({ default: 0 })
  rewardTokens: number;

  @Prop({ type: String })
  lastAchievementCategory: string | null;

  @Prop({ type: [String], default: ['default'] })
  unlockedThemes: string[];

  @Prop({ default: 'default' })
  activeTheme: string;

  @Prop({ type: [Object], default: [] })
  rewardHistory: any[];
}

export const UserSchema = SchemaFactory.createForClass(User);