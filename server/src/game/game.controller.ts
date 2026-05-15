
import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerService } from './logic/ledger.service';
import { RewardService } from './logic/reward.service';
import { ApplicationService } from './logic/application.service';
import { RealEstateService } from './logic/realEstate.service';
import { MarketService } from './logic/market.service';
import { cityData } from '../data/cityData.constants';
import { academyCourses } from '../data/academyCourses.constants';
import jobBoard from '../data/jobBoard.constants';
import lifeEvents from '../data/lifeEvents.constants';
import { rewardWheelPrizePools } from '../data/achievements.constants';
import { UserStateEntity } from '../users/entities/user-state.entity';

function getCareerLinkedAcademyCourses() {
  const courseByName = new Map(
    academyCourses.map((course: any) => [String(course?.n || '').trim(), course]),
  );
  const relevantCourseNames = new Set<string>();

  for (const job of jobBoard as any[]) {
    for (const requirement of [job?.req, job?.certReq]) {
      const name = String(requirement || '').trim();
      if (name && courseByName.has(name)) relevantCourseNames.add(name);
    }
  }

  const stack = Array.from(relevantCourseNames);
  while (stack.length > 0) {
    const currentName = stack.pop()!;
    const course = courseByName.get(currentName);
    const prereq = String(course?.prereq || '').trim();
    if (!prereq || relevantCourseNames.has(prereq) || !courseByName.has(prereq)) continue;
    relevantCourseNames.add(prereq);
    stack.push(prereq);
  }

  return academyCourses.filter((course: any) =>
    relevantCourseNames.has(String(course?.n || '').trim()),
  );
}

@Controller('game')
export class GameController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rewardService: RewardService,
    private readonly applicationService: ApplicationService,
    private readonly realEstateService: RealEstateService,
    private readonly marketService: MarketService,
    @InjectRepository(UserStateEntity)
    private readonly userStateRepository: Repository<UserStateEntity>,
  ) {}

  private async getLiveUserSnapshots() {
    const users = await this.userStateRepository.find();
    return users.map((user) => {
      const state = user.state || {};
      return {
        ...state,
        id: user.id,
        username: user.username,
        currentUser: String(state?.currentUser || user.username || ''),
        city: state?.city,
      };
    });
  }

  @Get('life-events')
  getLifeEvents() {
    // Return deduped life events (if needed, but list is already unique)
    return lifeEvents;
  }

  @Get('academy-courses')
  getAcademyCourses() {
    const seen = new Set<string>();
    return getCareerLinkedAcademyCourses().filter((course: any) => {
      const name = String(course?.n || '').trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  @Get('catalog')
  getCatalog() {
    return {
      cities: cityData,
      jobs: jobBoard,
      academyCourses: this.getAcademyCourses(),
      rewardPrizePools: rewardWheelPrizePools,
    };
  }

  @Post('build-ledger')
  buildLedger(
    @Body() body: { state: any; paySave?: number; payDebt?: number },
  ): { ledger: any[]; events: any[] } {
    const { state, paySave = 0, payDebt = 0 } = body;
    const ledger = this.ledgerService.buildLedger(state, paySave, payDebt);
    const events = this.ledgerService.extractStatementEvents(state);
    return { ledger, events };
  }

  @Post(':id/spin-reward')
  async spinRewardWheel(@Param('id') id: string) {
    return this.rewardService.spinRewardWheelForUser(id);
  }

  @Post('evaluate-applications')
  evaluateApplications(@Body() body: { state: any }) {
    return this.applicationService.evaluateApplications(body?.state || {});
  }

  @Post('apply-job')
  applyForJob(@Body() body: { state: any; jobTitle: string }) {
    return this.applicationService.applyForJob(body?.state || {}, body?.jobTitle || '');
  }

  @Post('real-estate/market')
  async getRealEstateMarket(
    @Body() body: { state?: any; advanceOneMonth?: boolean },
  ) {
    const userSnapshots = await this.getLiveUserSnapshots();
    const synced = this.realEstateService.syncSharedRealEstateMarket(
      userSnapshots,
      body?.state || null,
      Boolean(body?.advanceOneMonth),
    );
    return {
      market: synced.market,
      meta: synced.meta,
    };
  }

  @Post('stocks/advance')
  async advanceStockMarket(
    @Body() body: { state?: any },
  ) {
    const userSnapshots = await this.getLiveUserSnapshots();
    const registeredUsers = Array.isArray(userSnapshots) ? userSnapshots.length : 0;
    const stateSnapshot = body?.state || {};
    const currentMonth = Math.max(1, Math.min(12, Number(stateSnapshot?.month || 1)));
    const currentYear = Math.max(1, Number(stateSnapshot?.year || 2026));
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const previousMarketPrices = this.marketService.normalizeMarketPrices(stateSnapshot?.marketPrices);
    const mergedEconomy = this.marketService.deriveStockEconomyOverridesForMonth(stateSnapshot);
    const nextMarketPrices = this.marketService.advanceMarketPrices(
      previousMarketPrices,
      nextYear,
      nextMonth,
      mergedEconomy.economyOverrides,
    );
    const marketPriceHistory = this.marketService.appendMarketPriceHistory(
      stateSnapshot?.marketPriceHistory,
      nextMarketPrices,
      nextMonth,
      nextYear,
    );
    const dynamicMarket = this.marketService.calculateDynamicMarketCaps(
      nextMarketPrices,
      registeredUsers,
    );

    return {
      marketPricesPrevious: previousMarketPrices,
      marketPrices: nextMarketPrices,
      marketPriceHistory,
      appliedShock: Number(mergedEconomy.appliedShock || 0),
      registeredUsers,
      marketCapsByTicker: dynamicMarket.marketCapsByTicker,
      floatSharesByTicker: dynamicMarket.floatSharesByTicker,
      economyOverrides: {
        ...mergedEconomy.economyOverrides,
        nextMonthStockShock: 0,
      },
    };
  }

  @Post('real-estate/normalize-state')
  async normalizeRealEstateState(@Body() body: { state?: any }) {
    const stateSnapshot = body?.state || {};
    const userSnapshots = await this.getLiveUserSnapshots();
    return this.realEstateService.normalizeRealEstateStateFromShared(
      stateSnapshot,
      userSnapshots,
      stateSnapshot,
    );
  }

  @Post('real-estate/submit-offer')
  async submitRealEstateOffer(
    @Body()
    body: {
      state: any;
      listing: any;
      options?: { downPaymentPct?: number; purchaseMode?: 'cash' | 'mortgage'; mortgageTermYears?: 15 | 30 };
    },
  ) {
    const listing = body?.listing;
    const liveState = body?.state || {};
    if (!listing?.id || !listing?.cityName) {
      return { ok: false, reason: 'invalid-listing' };
    }

    const userSnapshots = await this.getLiveUserSnapshots();
    const shared = this.realEstateService.syncSharedRealEstateMarket(userSnapshots, liveState, false);
    const market = shared.market;
    const meta = shared.meta;
    const cityListings = Array.isArray(market[listing.cityName]) ? market[listing.cityName] : [];
    const stillAvailable = cityListings.some((entry: any) => entry.id === listing.id);
    if (!stillAvailable) {
      return {
        ok: false,
        reason: 'listing-unavailable',
        market,
        meta,
      };
    }

    const nextCityListings = cityListings.filter((entry: any) => entry.id !== listing.id);
    const nextMarket = { ...market, [listing.cityName]: nextCityListings };
    const nextMeta = meta;
    this.realEstateService.setSharedRealEstateMarket(nextMarket, nextMeta);

    const credit = Number(liveState.credit || 600);
    const approvalMonthsRequired = Math.max(1, Math.round(4 - Math.min(1.5, (credit - 580) / 220)));
    const downPaymentPct = Math.max(0.1, Math.min(0.5, Number(body?.options?.downPaymentPct || 0.25)));
    const purchaseMode = body?.options?.purchaseMode === 'cash' ? 'cash' : 'mortgage';
    const mortgageTermYears = body?.options?.mortgageTermYears === 15 ? 15 : 30;

    const existingDeals = Array.isArray(liveState.pendingRealEstateDeals) ? liveState.pendingRealEstateDeals : [];
    const nextDeals = [
      ...existingDeals,
      {
        id: `offer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdMonth: Number(liveState.month || 1),
        createdYear: Number(liveState.year || 2026),
        monthsInPipeline: 0,
        approvalMonthsRequired,
        downPaymentPct,
        purchaseMode,
        mortgageTermYears,
        listing,
      },
    ];

    const logEntry = {
      date: `${Number(liveState.month || 1)}/${Number(liveState.year || 2026)}`,
      msg: `📝 Offer submitted: ${listing.templateName} in ${listing.cityName} (${purchaseMode === 'cash' ? 'cash offer' : `${Math.round(downPaymentPct * 100)}% down, ${mortgageTermYears}y`})`,
    };

    return {
      ok: true,
      market: nextMarket,
      meta: nextMeta,
      pendingRealEstateDeals: nextDeals,
      logEntry,
    };
  }

  @Post('real-estate/sell-property')
  async sellInvestmentProperty(
    @Body()
    body: {
      state: any;
      propertyId: string;
    },
  ) {
    const liveState = body?.state || {};
    const propertyId = String(body?.propertyId || '').trim();
    if (!propertyId) {
      return { ok: false, reason: 'not-found' };
    }

    const properties = Array.isArray(liveState.investmentProperties)
      ? liveState.investmentProperties
      : [];
    const property = properties.find((entry: any) => String(entry?.id || '') === propertyId);
    if (!property) {
      return { ok: false, reason: 'not-found' };
    }

    const userSnapshots = await this.getLiveUserSnapshots();
    const shared = this.realEstateService.syncSharedRealEstateMarket(userSnapshots, liveState, false);
    const market = shared.market;
    const meta = shared.meta;

    const round2 = (value: number) => Math.round(Number(value || 0) * 100) / 100;
    const salePrice = round2(Math.max(50000, Number(property.propertyValue || 0) * 0.98));
    const transactionCosts = round2(salePrice * 0.04);
    const loanBalance = Math.max(0, Number(property.loanBalance || 0));
    const netAfterLoan = round2(salePrice - transactionCosts - loanBalance);

    let check = Number(liveState.check || 0);
    let debt = Number(liveState.debt || 0);
    if (netAfterLoan >= 0) check = round2(check + netAfterLoan);
    else debt = round2(debt + Math.abs(netAfterLoan));

    const listing = {
      id: `re-resale-${property.id}-${Date.now()}`,
      cityName: property.cityName,
      templateId: property.templateId,
      templateName: property.templateName,
      assetClass: property.assetClass || 'Residential',
      incomeLabel: property.incomeLabel || 'Monthly Rent',
      units: Math.max(1, Number(property.units || 1)),
      askingPrice: salePrice,
      askingRentPerUnit: round2(Math.max(300, Number(property.rentPerUnit || property.marketRentPerUnit || 1200))),
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      dom: 0,
      condition: Math.max(25, Math.min(100, Math.round(Number(property.condition || 70)))),
      ownershipCount: Math.max(0, Math.floor(Number(property.ownershipCount || 0))),
      foreclosure: false,
      listedByUser: liveState.currentUser || null,
    };

    const cityName = String(property.cityName || '');
    const cityListings = Array.isArray(market[cityName]) ? market[cityName] : [];
    const nextMarket = {
      ...market,
      [cityName]: [...cityListings, listing],
    };
    this.realEstateService.setSharedRealEstateMarket(nextMarket, meta);

    const nextProperties = properties.filter((entry: any) => String(entry?.id || '') !== propertyId);
    const logEntry = {
      date: `${Number(liveState.month || 1)}/${Number(liveState.year || 2026)}`,
      msg: `🏷️ Sold ${property.templateName} for $${salePrice.toLocaleString()} and relisted to market.${netAfterLoan >= 0 ? ` Net proceeds +$${netAfterLoan.toLocaleString()}.` : ` Shortfall added to debt: $${Math.abs(netAfterLoan).toLocaleString()}.`}`,
    };

    return {
      ok: true,
      check,
      debt,
      investmentProperties: nextProperties,
      market: nextMarket,
      meta,
      logEntry,
    };
  }
}
