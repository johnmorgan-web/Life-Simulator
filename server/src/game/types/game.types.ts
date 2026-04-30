// Type definitions for Life Simulator game state and objects

export type GameAction = 
  | { type: 'PROCESS_MONTH' }
  | { type: 'APPLY_JOB'; payload: any }
  | { type: 'ACCEPT_JOB'; payload: any }
  | { type: 'UPDATE_STATE'; payload: Partial<GameState> }
  | { type: string; payload?: any };

export type Celebration = 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | 'achievement' | 'rainbow' | null;

export interface City {
  name: string;
  p: number; // price factor
  r: number; // rent factor
  icon: string;
  lat: number;
  lon: number;
  country: string;
}

export interface Job {
  title: string;
  base: number;
  tReq?: number;
  odds?: number;
  req?: string;
  certReq?: string;
  cat?: string;
  subcat?: string;
  expReq?: any;
  capacity?: number;
  roleReqFromReq?: string | null;
}

export interface Transit {
  name: string;
  cost: number;
  level: number;
}

export interface Vehicle {
  vehicleId: string;
  purchasePrice: number;
  purchaseMonth: number;
  purchaseYear: number;
  purchasedNew: boolean;
  forSalePrice?: number;
  forSaleMonth?: number;
  currentValue?: number;
  loanPrincipal?: number;
  loanBalance?: number;
  loanAPR?: number;
  loanTermMonths?: number;
  monthsPaid?: number;
  condition?: number;
  totalMiles?: number;
}

export interface LuxuryServices {
  chef: boolean;
  housekeeper: boolean;
  chauffer: boolean;
  therapist: boolean;
  trainer: boolean;
  concierge: boolean;
  accountant: boolean;
}

export interface AutoInvestConfig {
  enabled: boolean;
  monthlyAmount: number;
  profileId: string;
}

export interface RealEstateListing {
  id: string;
  cityName: string;
  templateId: string;
  templateName: string;
  assetClass: string;
  incomeLabel: string;
  units: number;
  askingPrice: number;
  askingRentPerUnit: number;
  amenities: string[];
  dom: number;
  condition: number;
  ownershipCount: number;
  foreclosure: boolean;
  listedByUser: string | null;
}

export interface InvestmentProperty {
  id: string;
  cityName: string;
  templateId: string;
  templateName: string;
  assetClass: string;
  incomeLabel: string;
  units: number;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  amenities: string[];
  condition: number;
  occupancyRate: number;
  ownershipCount: number;
  loanBalance: number;
  loanAPR: number;
  mortgageTermMonths: number;
  monthlyDebtService: number;
  purchaseMode: 'cash' | 'mortgage';
  purchaseMonth: number;
  purchaseYear: number;
  foreclosure: boolean;
}

export interface StockHolding {
  ticker: string;
  shares: number;
  costBasis: number;
  purchasePrice: number;
}

export interface LedgerEntry {
  date: string;
  description: string;
  amount: number;
  category: string;
  balance: number;
}

export interface LifeEvent {
  trigger: string;
  type: 'in' | 'out';
  amt: number;
  msg: string;
}

export interface SaveFile {
  name: string;
  timestamp: number;
  isAutoSave: boolean;
}

export interface GameState {
  // Financial
  check: number;
  savings: number;
  debt: number;
  credit: number;

  // Time
  month: number;
  year: number;

  // Location & Transit
  city: City;
  transit: Transit;
  pendingTransit?: any;
  pendingCity?: any;

  // Career
  job: Job;
  tenure: number;
  jobStartMonth: number;
  jobStartYear: number;
  careerHistory: any[];
  jobMarket: Record<string, any>;
  pendingJob?: any;
  lastNegotiationMonth?: number | null;
  lastNegotiationYear?: number | null;
  lastAutoBumpMonth: number;
  lastAutoBumpYear: number;

  // Education
  activeEdu?: any;
  eduProgress: Record<string, number>;
  credentials: string[];
  credentialHistory: any[];

  // Lifestyle
  luxuryServices: LuxuryServices;
  entertainmentSpending: number;
  subscriptionEntertainmentSpending: number;
  subscriptionStreakMonths: number;
  subscriptionBadges: any[];
  entertainmentTicketStubs: any[];
  happiness: number;
  workPenaltyPercent: number;

  // Housing
  house: { model: any; level: number; value: number };
  realEstateMarket: Record<string, any[]>;
  realEstateMarketMeta: any;
  investmentProperties: InvestmentProperty[];
  pendingRealEstateDeals: any[];
  realEstateLastMonthIncome: number;
  realEstateLastMonthExpenses: number;
  realEstateLastMonthPropertyBreakdown: any[];

  // Vehicles
  ownsVehicle?: any;
  garage: Vehicle[];
  vehicleHistory: any[];

  // Stock Market
  marketPrices: Record<string, number>;
  marketPricesPrevious: Record<string, number>;
  portfolio: StockHolding[];
  autoInvest: AutoInvestConfig;
  stockInvestedThisMonth: number;
  stockInvestedLastMonth: number;
  marketLearningLevel: string;
  marketUsePlainLanguage: boolean;
  realEstateLearningLevel: string;
  realEstateUsePlainLanguage: boolean;

  // Tracking
  ledger: LedgerEntry[];
  logs: any[];
  applications: any[];
  applicationResults: any[];
  eventHistory: any[];
  achievementsUnlocked: string[];
  achievementHistory: any[];
  rewardHistory: any[];

  // Streaks & Credit
  paymentStreak: number;
  calculationStreak: number;
  lastPaymentOnTime: boolean;
  skippedPaymentThisMonth: boolean;

  // UI & Preferences
  celebration: Celebration;
  showSettlement: boolean;
  username?: string | null;
  currentUser?: string | null;
  name: string;
  unlockedThemes: string[];
  activeTheme: string;
  rewardTokens: number;
  rewardCategoryQueue: string[];
  lastAchievementCategory?: string | null;

  // Financials
  totalGasPaid: number;
  totalUtilitiesPaid: number;
  maxMonthlyLuxuryEventSpend: number;
  inventory: any[];
}

export interface JobMarketState {
  [jobTitle: string]: {
    capacity: number;
    occupied: number;
  };
}

export interface RealEstateMarketMeta {
  seededUsersByCity: Record<string, number>;
  pendingListingTimersByCity: Record<string, number[]>;
  nextSequenceByCity: Record<string, number>;
}

export interface AchievementRule {
  id: string;
  name: string;
  metric: string;
  target: number;
  icon: string;
}

export interface Reward {
  name: string;
  icon: string;
  weight: number;
  value: number;
}
