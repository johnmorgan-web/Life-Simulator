import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { cityData } from '../../data/cityData.constants';
import { realEstateTemplates } from '../../data/realEstate.constants';

@Injectable()
export class RealEstateService {
  private sharedRealEstateMarket: Record<string, any[]> | null = null;
  private sharedRealEstateMarketMeta: any | null = null;
  private readonly monopolyMinMonthlySalary = 0;
  private readonly monopolySalaryCapRatio = 0.25;
  private readonly salaryBracketDefinitions = [
    { key: 'entry', label: 'Below $3,000/mo', min: 0, max: 2999 },
    { key: 'stabilizing', label: '$3,000-$3,999/mo', min: 3000, max: 3999 },
    { key: 'workforce', label: '$4,000-$5,999/mo', min: 4000, max: 5999 },
    { key: 'professional', label: '$6,000-$9,999/mo', min: 6000, max: 9999 },
    { key: 'affluent', label: '$10,000-$14,999/mo', min: 10000, max: 14999 },
    { key: 'executive', label: '$15,000+/mo', min: 15000, max: Number.POSITIVE_INFINITY },
  ] as const;
  private readonly activeMarketTemplateConfigs = [
    { templateId: 'self-storage-80', targetSalaryBracket: 'entry', targetSalaryRangeLabel: 'Below $3,000/mo' },
    { templateId: 'rv-park-40', targetSalaryBracket: 'stabilizing', targetSalaryRangeLabel: '$3,000-$3,999/mo' },
    { templateId: 'condo-1', targetSalaryBracket: 'workforce', targetSalaryRangeLabel: '$4,000-$5,999/mo' },
    { templateId: 'garden-12', targetSalaryBracket: 'professional', targetSalaryRangeLabel: '$6,000-$9,999/mo' },
    { templateId: 'office-20', targetSalaryBracket: 'affluent', targetSalaryRangeLabel: '$10,000-$14,999/mo' },
    { templateId: 'warehouse-1', targetSalaryBracket: 'executive', targetSalaryRangeLabel: '$15,000+/mo' },
  ] as const;

  constructor(private utilitiesService: UtilitiesService) {}

  private cloneDeep<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private getActiveMarketTemplates() {
    return this.activeMarketTemplateConfigs
      .map((config) => {
        const template = realEstateTemplates.find((entry) => entry.id === config.templateId);
        if (!template) return null;
        return { template, config };
      })
      .filter(Boolean) as Array<{
        template: (typeof realEstateTemplates)[number];
        config: (typeof this.activeMarketTemplateConfigs)[number];
      }>;
  }

  private bracketForMonthlyHousingCost(monthlyHousingCost: number) {
    const cost = Math.max(0, Number(monthlyHousingCost || 0));
    if (cost <= 700) return this.salaryBracketDefinitions[0];
    if (cost <= 950) return this.salaryBracketDefinitions[1];
    if (cost <= 1900) return this.salaryBracketDefinitions[2];
    if (cost <= 2600) return this.salaryBracketDefinitions[3];
    if (cost <= 3400) return this.salaryBracketDefinitions[4];
    return this.salaryBracketDefinitions[5];
  }

  private resolveTargetSalaryBracket(listingLike: any) {
    const explicitKey = String(listingLike?.targetSalaryBracket || '').trim();
    const explicitLabel = String(listingLike?.targetSalaryRangeLabel || '').trim();
    if (explicitKey && explicitLabel) {
      return { key: explicitKey, label: explicitLabel };
    }

    const housingCost = Math.max(
      0,
      Number(
        listingLike?.askingRentPerUnit
          ?? listingLike?.rentPerUnit
          ?? listingLike?.marketRentPerUnit
          ?? listingLike?.monthlyDebtService
          ?? 0,
      ),
    );
    const resolved = this.bracketForMonthlyHousingCost(housingCost);
    return { key: resolved.key, label: resolved.label };
  }

  private salaryMatchesTargetBracket(monthlySalary: number, bracketKey: string): boolean {
    const salary = Math.max(0, Number(monthlySalary || 0));
    const bracket = this.salaryBracketDefinitions.find((entry) => entry.key === bracketKey);
    if (!bracket) return salary >= this.monopolyMinMonthlySalary;
    return salary >= bracket.min && salary <= bracket.max;
  }

  private sortListingsForMarket(listings: any[]): any[] {
    const configuredOrder = new Map<string, number>();
    const allowedTemplateIds = new Set<string>();
    this.activeMarketTemplateConfigs.forEach((config, index) => {
      configuredOrder.set(String(config.templateId), index);
      allowedTemplateIds.add(String(config.templateId));
    });

    return [...(Array.isArray(listings) ? listings : [])]
      .filter((listing) => allowedTemplateIds.has(String(listing?.templateId || '')))
      .sort((a, b) => {
      const aOrder = configuredOrder.get(String(a?.templateId || ''));
      const bOrder = configuredOrder.get(String(b?.templateId || ''));
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== undefined && bOrder === undefined) return -1;
      if (aOrder === undefined && bOrder !== undefined) return 1;

      const aBracket = this.resolveTargetSalaryBracket(a).key;
      const bBracket = this.resolveTargetSalaryBracket(b).key;
      const aBracketIndex = this.salaryBracketDefinitions.findIndex((entry) => entry.key === aBracket);
      const bBracketIndex = this.salaryBracketDefinitions.findIndex((entry) => entry.key === bBracket);
      if (aBracketIndex !== bBracketIndex) return aBracketIndex - bBracketIndex;

      return Math.max(0, Number(a?.askingPrice || 0)) - Math.max(0, Number(b?.askingPrice || 0));
    });
  }

  private getRegisteredUserCount(userSnapshots: any[]): number {
    return Math.max(1, Array.isArray(userSnapshots) ? userSnapshots.length : 1);
  }

  private getUserCityCounts(userSnapshots: any[], liveSnapshot?: any): Record<string, number> {
    const userCityMap = new Map<string, string>();
    const snapshots = Array.isArray(userSnapshots) ? userSnapshots : [];

    for (const snapshot of snapshots) {
      const username = String(snapshot?.username || snapshot?.currentUser || '').trim();
      const cityName = snapshot?.city?.name;
      if (username && cityName) userCityMap.set(username, cityName);
    }

    if (liveSnapshot?.currentUser && liveSnapshot?.city?.name) {
      userCityMap.set(String(liveSnapshot.currentUser), String(liveSnapshot.city.name));
    }

    const counts: Record<string, number> = {};
    for (const cityName of userCityMap.values()) {
      counts[cityName] = (counts[cityName] || 0) + 1;
    }
    return counts;
  }

  private initializeSharedRealEstateMarket(userSnapshots: any[], liveSnapshot?: any): { market: Record<string, any[]>; meta: any } {
    const market: Record<string, any[]> = {};
    const counts = this.getUserCityCounts(userSnapshots, liveSnapshot);
    const meta = this.defaultRealEstateMeta();
    const users = this.getRegisteredUserCount(userSnapshots);

    for (const city of cityData) {
      const listings: any[] = [];
      const cityUserCount = Number(counts[city.name] || 0);
      const initialCount = this.initialListingsForCity(cityUserCount);
      const pressure = this.cityPressureMultiplier(users, city);
      const activeTemplates = this.getActiveMarketTemplates();

      for (let i = 0; i < initialCount; i++) {
        const selected = activeTemplates[i % activeTemplates.length];
        if (!selected) continue;
        listings.push(this.buildRealEstateListing(
          city,
          selected.template,
          i,
          pressure,
          `re-${city.name}-${selected.template.id}-${i}`,
          {
            targetSalaryBracket: selected.config.targetSalaryBracket,
            targetSalaryRangeLabel: selected.config.targetSalaryRangeLabel,
          },
        ));
      }

      meta.seededUsersByCity[city.name] = cityUserCount;
      meta.nextSequenceByCity[city.name] = initialCount;
      market[city.name] = this.sortListingsForMarket(listings);
    }

    return { market, meta };
  }

  cityRealEstateTier(city: any): string {
    const priceFactor = Number(city?.p || 1);
    if (priceFactor >= 1.3) return 'highCost';
    if (priceFactor <= 0.95) return 'growth';
    return 'balanced';
  }

  cityPressureMultiplier(registeredUsers: number, city: any): number {
    const users = Math.max(1, Number(registeredUsers || 1));
    const demandBase = 1 + Math.min(0.45, (users - 1) * 0.07);
    const cityAmplifier = 0.9 + (Number(city?.p || 1) - 1) * 0.6;
    return this.utilitiesService.round2(
      Math.max(0.75, Math.min(1.9, demandBase * cityAmplifier)),
    );
  }

  initialListingsForCity(userCount: number): number {
    const users = Math.max(0, Number(userCount || 0));
    if (users <= 0) return 0;
    return this.getActiveMarketTemplates().length;
  }

  buildRealEstateListing(
    city: any,
    template: any,
    sequence: number,
    pressure: number,
    customId?: string,
    overrides?: { targetSalaryBracket?: string; targetSalaryRangeLabel?: string },
  ): any {
    const seed = this.utilitiesService.hashString(`${city.name}-${template.id}-${sequence}`);
    const rnd = this.utilitiesService.mulberry32(seed);
    const quality = 0.86 + rnd() * 0.32;
    const dom = Math.max(0, Math.floor(rnd() * 7));
    const amenities = [...template.amenityOptions]
      .sort(() => rnd() - 0.5)
      .slice(0, Math.max(1, Math.min(3, Math.floor(rnd() * 4))));
    const askingPrice = this.utilitiesService.round2(
      template.basePrice *
        Number(city.p || 1) *
        quality *
        (0.93 + (pressure - 1) * 0.35),
    );
    const askingRentPerUnit = this.utilitiesService.round2(
      template.baseRentPerUnit *
        Number(city.r || 1) *
        quality *
        (0.95 + (pressure - 1) * 0.25),
    );
    const targetBracket = overrides?.targetSalaryBracket && overrides?.targetSalaryRangeLabel
      ? { key: overrides.targetSalaryBracket, label: overrides.targetSalaryRangeLabel }
      : this.bracketForMonthlyHousingCost(askingRentPerUnit);
    return {
      id: customId || `re-${city.name}-${template.id}-${sequence}-${Date.now()}`,
      cityName: city.name,
      templateId: template.id,
      templateName: template.name,
      assetClass: template.assetClass,
      incomeLabel: template.incomeLabel,
      units: template.units,
      askingPrice,
      askingRentPerUnit,
      amenities,
      dom,
      condition: Math.round(65 + rnd() * 30),
      ownershipCount: 0,
      foreclosure: false,
      listedByUser: null,
      targetSalaryBracket: targetBracket.key,
      targetSalaryRangeLabel: targetBracket.label,
    };
  }

  defaultRealEstateMeta(): any {
    const seededUsersByCity: Record<string, number> = {};
    const pendingListingTimersByCity: Record<string, number[]> = {};
    const nextSequenceByCity: Record<string, number> = {};
    for (const city of cityData) {
      seededUsersByCity[city.name] = 0;
      pendingListingTimersByCity[city.name] = [];
      nextSequenceByCity[city.name] = 0;
    }
    return { seededUsersByCity, pendingListingTimersByCity, nextSequenceByCity };
  }

  initializeRealEstateMarket(liveSnapshot?: any): { market: Record<string, any[]>; meta: any } {
    // Note: This would need user data from DB. Simplified for now.
    const market: Record<string, any[]> = {};
    const meta = this.defaultRealEstateMeta();
    const users = 1; // Would get from DB

    for (const city of cityData) {
      const listings: any[] = [];
      const initialCount = this.initialListingsForCity(users);
      const pressure = this.cityPressureMultiplier(users, city);
      const activeTemplates = this.getActiveMarketTemplates();
      for (let i = 0; i < initialCount; i++) {
        const selected = activeTemplates[i % activeTemplates.length];
        if (!selected) continue;
        listings.push(
          this.buildRealEstateListing(
            city,
            selected.template,
            i,
            pressure,
            `re-${city.name}-${selected.template.id}-${i}`,
            {
              targetSalaryBracket: selected.config.targetSalaryBracket,
              targetSalaryRangeLabel: selected.config.targetSalaryRangeLabel,
            },
          ),
        );
      }
      meta.seededUsersByCity[city.name] = users;
      meta.nextSequenceByCity[city.name] = initialCount;
      market[city.name] = this.sortListingsForMarket(listings);
    }
    return { market, meta };
  }

  realEstateAmenityScore(amenities: string[]): number {
    const amenityImpact: Record<string, any> = {
      // Placeholder - would come from constants
    };
    return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
      const impact = amenityImpact[a];
      return sum + Number(impact?.occupancyBoost || 0);
    }, 0);
  }

  realEstateAmenityRentBoostRate(amenities: string[]): number {
    const amenityImpact: Record<string, any> = {};
    return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
      const impact = amenityImpact[a];
      return sum + Number(impact?.rentBoost || 0);
    }, 0);
  }

  realEstateAmenityUpkeepRate(amenities: string[]): number {
    const amenityImpact: Record<string, any> = {};
    return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
      const impact = amenityImpact[a];
      return sum + Number(impact?.upkeepRate || 0);
    }, 0);
  }

  realEstateEquityValue(snapshot: any): number {
    const properties = Array.isArray(snapshot?.investmentProperties)
      ? snapshot.investmentProperties
      : [];
    return this.utilitiesService.round2(
      properties.reduce((sum: number, p: any) => {
        const value = Number(p?.currentValue || 0);
        const loan = Number(p?.loanBalance || 0);
        return sum + Math.max(0, value - loan);
      }, 0),
    );
  }

  private shapeNormalizedRealEstateState(data: any, market: Record<string, any[]>, meta: any): any {
    const normalizedMarket: Record<string, any[]> = {};

    for (const city of cityData) {
      const key = city.name;
      const listings = Array.isArray(market[key]) ? market[key] : [];
      normalizedMarket[key] = listings.map((l: any, idx: number) => ({
        id: l?.id || `re-${key}-${idx}`,
        cityName: l?.cityName || key,
        templateId: l?.templateId || realEstateTemplates[0].id,
        templateName: l?.templateName || realEstateTemplates[0].name,
        assetClass:
          l?.assetClass ||
          (realEstateTemplates.find((t) => t.id === l?.templateId)?.assetClass || 'Residential'),
        incomeLabel:
          l?.incomeLabel ||
          (realEstateTemplates.find((t) => t.id === l?.templateId)?.incomeLabel || 'Monthly Rent'),
        units: Math.max(1, Number(l?.units || 1)),
        askingPrice: Math.max(50000, Number(l?.askingPrice || 250000)),
        askingRentPerUnit: Math.max(400, Number(l?.askingRentPerUnit || 1500)),
        amenities: Array.isArray(l?.amenities) ? l.amenities : [],
        dom: Math.max(0, Math.floor(Number(l?.dom || 0))),
        condition: Math.max(20, Math.min(100, Math.round(Number(l?.condition || 75)))),
        ownershipCount: Math.max(0, Math.floor(Number(l?.ownershipCount || 0))),
        foreclosure: !!l?.foreclosure,
        listedByUser: l?.listedByUser || null,
        targetSalaryBracket: this.resolveTargetSalaryBracket(l).key,
        targetSalaryRangeLabel: this.resolveTargetSalaryBracket(l).label,
      }));
    }

    return {
      realEstateMarket: normalizedMarket,
      realEstateMarketMeta: meta,
      investmentProperties: Array.isArray(data?.investmentProperties)
        ? data.investmentProperties.map((p: any) => ({
            ...p,
            assetClass:
              p?.assetClass ||
              (realEstateTemplates.find((t) => t.id === p?.templateId)?.assetClass || 'Residential'),
            incomeLabel:
              p?.incomeLabel ||
              (realEstateTemplates.find((t) => t.id === p?.templateId)?.incomeLabel || 'Monthly Rent'),
            ownershipCount: Math.max(0, Math.floor(Number(p?.ownershipCount || 0))),
            mortgageTermMonths: Number(p?.mortgageTermMonths || 0),
            purchaseMode:
              p?.purchaseMode || (Number(p?.loanBalance || 0) > 0 ? 'mortgage' : 'cash'),
            targetSalaryBracket: this.resolveTargetSalaryBracket(p).key,
            targetSalaryRangeLabel: this.resolveTargetSalaryBracket(p).label,
          }))
        : [],
      pendingRealEstateDeals: Array.isArray(data?.pendingRealEstateDeals)
        ? data.pendingRealEstateDeals
        : [],
      realEstateLastMonthIncome: Number(data?.realEstateLastMonthIncome || 0),
      realEstateLastMonthExpenses: Number(data?.realEstateLastMonthExpenses || 0),
      realEstateLastMonthPropertyBreakdown: Array.isArray(data?.realEstateLastMonthPropertyBreakdown)
        ? data.realEstateLastMonthPropertyBreakdown.map((entry: any) => ({
            propertyId: String(entry?.propertyId || ''),
            propertyName: String(entry?.propertyName || 'Property'),
            cityName: String(entry?.cityName || ''),
            grossIncome: Number(entry?.grossIncome || 0),
            operatingCosts: Number(entry?.operatingCosts || 0),
            debtService: Number(entry?.debtService || 0),
            netCashflow: Number(entry?.netCashflow || 0),
          }))
        : [],
    };
  }

  normalizeRealEstateState(data: any): any {
    const { market, meta } = this.initializeRealEstateMarket(data);
    return this.shapeNormalizedRealEstateState(data, market, meta);
  }

  normalizeRealEstateStateFromShared(
    data: any,
    userSnapshots: any[],
    liveSnapshot?: any,
  ): any {
    const shared = this.syncSharedRealEstateMarket(userSnapshots, liveSnapshot || data, false);
    return this.shapeNormalizedRealEstateState(data, shared.market, shared.meta);
  }

  syncSharedRealEstateMarket(
    userSnapshots: any[],
    liveSnapshot?: any,
    advanceOneMonth = false,
  ): { market: Record<string, any[]>; meta: any } {
    if (!this.sharedRealEstateMarket || !this.sharedRealEstateMarketMeta) {
      const initialized = this.initializeSharedRealEstateMarket(userSnapshots, liveSnapshot);
      this.sharedRealEstateMarket = initialized.market;
      this.sharedRealEstateMarketMeta = initialized.meta;
    }

    const defaultMeta = this.defaultRealEstateMeta();
    const market = { ...(this.sharedRealEstateMarket || {}) };
    const meta = {
      ...defaultMeta,
      ...(this.sharedRealEstateMarketMeta || {}),
      seededUsersByCity: {
        ...defaultMeta.seededUsersByCity,
        ...((this.sharedRealEstateMarketMeta || {})?.seededUsersByCity || {}),
      },
      pendingListingTimersByCity: {
        ...defaultMeta.pendingListingTimersByCity,
        ...((this.sharedRealEstateMarketMeta || {})?.pendingListingTimersByCity || {}),
      },
      nextSequenceByCity: {
        ...defaultMeta.nextSequenceByCity,
        ...((this.sharedRealEstateMarketMeta || {})?.nextSequenceByCity || {}),
      },
    };

    const cityUserCounts = this.getUserCityCounts(userSnapshots, liveSnapshot);
    const users = this.getRegisteredUserCount(userSnapshots);
    const activeTemplates = this.getActiveMarketTemplates();

    for (const city of cityData) {
      const cityName = city.name;
      const currentUsers = Number(cityUserCounts[cityName] || 0);
      const seededUsers = Number(meta.seededUsersByCity?.[cityName] || 0);
      const pressure = this.cityPressureMultiplier(users, city);
      const existing = Array.isArray(market[cityName]) ? [...market[cityName]] : [];

      let additions = 0;
      if (seededUsers === 0 && currentUsers > 0 && existing.length === 0) {
        additions = this.initialListingsForCity(currentUsers);
      }

      let nextSequence = Number(meta.nextSequenceByCity?.[cityName] || existing.length);
      for (let i = 0; i < additions; i++) {
        const selected = activeTemplates[nextSequence % activeTemplates.length];
        if (!selected) continue;
        existing.push(
          this.buildRealEstateListing(
            city,
            selected.template,
            nextSequence,
            pressure,
            `re-${cityName}-${selected.template.id}-${nextSequence}-${Date.now()}-${i}`,
            {
              targetSalaryBracket: selected.config.targetSalaryBracket,
              targetSalaryRangeLabel: selected.config.targetSalaryRangeLabel,
            },
          ),
        );
        nextSequence += 1;
      }

      if (advanceOneMonth) {
        const timers = Array.isArray(meta.pendingListingTimersByCity?.[cityName])
          ? [...meta.pendingListingTimersByCity[cityName]]
          : [];
        const maturedCount = timers.filter((months: number) => Number(months || 0) <= 1).length;
        meta.pendingListingTimersByCity[cityName] = timers
          .map((months: number) => Math.max(0, Number(months || 0) - 1))
          .filter((months: number) => months > 0);

        for (let i = 0; i < maturedCount; i++) {
          const selected = activeTemplates[nextSequence % activeTemplates.length];
          if (!selected) continue;
          existing.push(
            this.buildRealEstateListing(
              city,
              selected.template,
              nextSequence,
              pressure,
              `re-${cityName}-${selected.template.id}-${nextSequence}-${Date.now()}-restock-${i}`,
              {
                targetSalaryBracket: selected.config.targetSalaryBracket,
                targetSalaryRangeLabel: selected.config.targetSalaryRangeLabel,
              },
            ),
          );
          nextSequence += 1;
        }
      }

      meta.seededUsersByCity[cityName] = Math.max(seededUsers, currentUsers);
      meta.nextSequenceByCity[cityName] = nextSequence;
      market[cityName] = this.sortListingsForMarket(existing);
    }

    this.sharedRealEstateMarket = market;
    this.sharedRealEstateMarketMeta = meta;
    return {
      market: this.cloneDeep(market),
      meta: this.cloneDeep(meta),
    };
  }

  setSharedRealEstateMarket(market: Record<string, any[]>, meta: any) {
    this.sharedRealEstateMarket = this.cloneDeep(market || {});
    this.sharedRealEstateMarketMeta = this.cloneDeep(meta || this.defaultRealEstateMeta());
  }

  private monthlySalary(snapshot: any): number {
    const job = snapshot?.job || snapshot?.pendingJob;
    const base = Math.max(0, Number(job?.base || 0));
    const cityMultiplier = Math.max(0, Number(snapshot?.city?.p || 1));
    return this.utilitiesService.round2(base * cityMultiplier * 0.8);
  }

  private pickDeterministic<T>(items: T[], seedKey: string): T | null {
    if (!Array.isArray(items) || items.length === 0) return null;
    const seed = this.utilitiesService.hashString(seedKey);
    const random = this.utilitiesService.mulberry32(seed);
    const index = Math.floor(random() * items.length);
    return items[Math.max(0, Math.min(items.length - 1, index))] || null;
  }

  private estimateMortgagePayment(
    principal: number,
    termMonths = 360,
    apr = 0.0675,
  ): number {
    const loan = Math.max(0, Number(principal || 0));
    const months = Math.max(1, Math.floor(Number(termMonths || 360)));
    if (loan <= 0) return 0;

    const monthlyRate = Math.max(0.0001, Number(apr || 0.0675) / 12);
    const growth = Math.pow(1 + monthlyRate, months);
    const payment = (loan * monthlyRate * growth) / Math.max(0.0001, growth - 1);
    return this.utilitiesService.round2(payment);
  }

  private median(values: number[]): number {
    const sorted = (Array.isArray(values) ? values : [])
      .map((entry) => Number(entry || 0))
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  }

  private average(values: number[]): number {
    const normalized = (Array.isArray(values) ? values : [])
      .map((entry) => Number(entry || 0))
      .filter((entry) => Number.isFinite(entry) && entry > 0);
    if (normalized.length === 0) return 0;
    const total = normalized.reduce((sum, value) => sum + value, 0);
    return total / normalized.length;
  }

  private residentPressureLevel(score: number): 'low' | 'medium' | 'high' {
    const value = Math.max(0, Number(score || 0));
    if (value >= 0.45) return 'high';
    if (value >= 0.3) return 'medium';
    return 'low';
  }

  buildListingResidentImpact(
    market: Record<string, any[]>,
    userSnapshots: any[],
    liveSnapshot?: any,
  ): Record<string, any> {
    const cityIncomeSamples: Record<string, number[]> = {};
    const snapshots = Array.isArray(userSnapshots) ? userSnapshots : [];
    const seenUsers = new Set<string>();

    const addSnapshot = (entry: any) => {
      const username = String(entry?.username || entry?.currentUser || '').trim();
      if (!username || seenUsers.has(username)) return;
      seenUsers.add(username);

      const cityName = String(entry?.city?.name || '').trim();
      if (!cityName) return;

      const salary = this.monthlySalary(entry);
      if (salary <= 0) return;

      if (!Array.isArray(cityIncomeSamples[cityName])) cityIncomeSamples[cityName] = [];
      cityIncomeSamples[cityName].push(salary);
    };

    for (const snapshot of snapshots) addSnapshot(snapshot);
    if (liveSnapshot && typeof liveSnapshot === 'object') addSnapshot(liveSnapshot);

    const output: Record<string, any> = {};
    const marketByCity = market && typeof market === 'object' ? market : {};
    for (const [cityName, listingsRaw] of Object.entries(marketByCity)) {
      const listings = Array.isArray(listingsRaw) ? listingsRaw : [];
      const incomeSamples = Array.isArray(cityIncomeSamples[cityName])
        ? cityIncomeSamples[cityName]
        : [];
      const cityAverageIncome = this.utilitiesService.round2(
        Math.max(3000, this.average(incomeSamples) || 0),
      );
      const cityMedianIncome = this.utilitiesService.round2(
        Math.max(3000, this.median(incomeSamples) || 0),
      );
      const cityResidentCount = incomeSamples.length;

      for (const listing of listings) {
        const listingId = String(listing?.id || '').trim();
        if (!listingId) continue;
        const listingTargetBracket = this.resolveTargetSalaryBracket(listing);
        const cityChargeEligibleCount = incomeSamples.filter(
          (salary) => this.salaryMatchesTargetBracket(salary, listingTargetBracket.key),
        ).length;
        const cityChargeEligibleRate = cityResidentCount > 0
          ? this.utilitiesService.round2(cityChargeEligibleCount / cityResidentCount)
          : 0;

        const rentPerUnit = Math.max(0, Number(listing?.askingRentPerUnit || 0));
        const askingPrice = Math.max(0, Number(listing?.askingPrice || 0));
        const mortgagePrincipal = askingPrice * 0.8;
        const mortgagePayment = this.estimateMortgagePayment(mortgagePrincipal);

        const rentShare = this.utilitiesService.round2(rentPerUnit / Math.max(1, cityMedianIncome));
        const mortgageShare = this.utilitiesService.round2(
          mortgagePayment / Math.max(1, cityMedianIncome),
        );
        const pressureScore = Math.max(rentShare, mortgageShare);
        const level = this.residentPressureLevel(pressureScore);

        output[listingId] = {
          cityName,
          residentCount: cityResidentCount,
          averageMonthlyIncome: cityAverageIncome,
          medianMonthlyIncome: cityMedianIncome,
          targetSalaryBracket: listingTargetBracket.key,
          targetSalaryRangeLabel: listingTargetBracket.label,
          chargeEligibleResidents: cityChargeEligibleCount,
          chargeEligibleRate: cityChargeEligibleRate,
          rentShare,
          mortgageShare,
          pressureScore: this.utilitiesService.round2(pressureScore),
          level,
          label:
            level === 'high'
              ? 'High resident pressure'
              : level === 'medium'
                ? 'Moderate resident pressure'
                : 'Lower resident pressure',
        };
      }
    }

    return output;
  }

  evaluateMonopolyRentForMonth(stateSnapshot: any, userSnapshots: any[]) {
    const snapshot = stateSnapshot && typeof stateSnapshot === 'object' ? stateSnapshot : {};
    const currentUser = String(snapshot?.currentUser || snapshot?.username || '').trim();
    const currentMonth = Math.max(1, Math.min(12, Number(snapshot?.month || 1)));
    const currentYear = Math.max(1, Number(snapshot?.year || 2026));
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const response = {
      nextMonth,
      nextYear,
      minMonthlySalary: this.monopolyMinMonthlySalary,
      salaryCapRatio: this.monopolySalaryCapRatio,
      tenantCharge: 0,
      tenantOwnerName: null as string | null,
      tenantOwnerPropertyName: null as string | null,
      tenantCityName: null as string | null,
      ownerPayout: 0,
      ownerTenantName: null as string | null,
      ownerPropertyName: null as string | null,
      ownerCityName: null as string | null,
      ownerTenantAssignments: {} as Record<string, string>,
    };

    const snapshots = Array.isArray(userSnapshots) ? userSnapshots : [];
    const userByName = new Map<string, any>();
    for (const entry of snapshots) {
      const username = String(entry?.username || entry?.currentUser || '').trim();
      if (!username) continue;
      userByName.set(username, entry || {});
    }
    if (currentUser) {
      userByName.set(currentUser, snapshot);
    }

    const cityCounts = this.getUserCityCounts(snapshots, snapshot);
    const currentCityName = String(snapshot?.city?.name || '').trim();
    const currentSalary = this.monthlySalary(snapshot);
    const priorAssignments =
      snapshot?.ownerTenantAssignments && typeof snapshot.ownerTenantAssignments === 'object'
        ? { ...snapshot.ownerTenantAssignments }
        : {};

    if (currentCityName) {
      const ownerPropertyCandidates: Array<{ ownerName: string; propertyName: string; cityName: string; debtService: number }> = [];

      for (const [username, userSnapshot] of userByName.entries()) {
        if (!username || (currentUser && username === currentUser)) continue;
        const properties = Array.isArray(userSnapshot?.investmentProperties)
          ? userSnapshot.investmentProperties
          : [];
        for (const property of properties) {
          const propertyCity = String(property?.cityName || '').trim();
          if (!propertyCity || propertyCity !== currentCityName) continue;

          const debtService = Math.max(0, Number(property?.monthlyDebtService || 0));
          const loanBalance = Math.max(0, Number(property?.loanBalance || 0));
          if (debtService <= 0 || loanBalance <= 0) continue;
          const propertyTargetBracket = this.resolveTargetSalaryBracket(property);
          if (!this.salaryMatchesTargetBracket(currentSalary, propertyTargetBracket.key)) continue;

          ownerPropertyCandidates.push({
            ownerName: username,
            propertyName: String(property?.templateName || property?.incomeLabel || 'Property'),
            cityName: propertyCity,
            debtService,
          });
        }
      }

      const chosenOwnerProperty = this.pickDeterministic(
        ownerPropertyCandidates,
        `${nextYear}-${nextMonth}-${currentUser || 'tenant'}-${currentCityName}-tenant-monopoly`,
      );

      if (chosenOwnerProperty) {
        const salaryCap = this.utilitiesService.round2(currentSalary * this.monopolySalaryCapRatio);
        const tenantCharge = this.utilitiesService.round2(
          Math.max(0, Math.min(chosenOwnerProperty.debtService, salaryCap)),
        );

        if (tenantCharge > 0) {
          response.tenantCharge = tenantCharge;
          response.tenantOwnerName = chosenOwnerProperty.ownerName;
          response.tenantOwnerPropertyName = chosenOwnerProperty.propertyName;
          response.tenantCityName = chosenOwnerProperty.cityName;
        }
      }
    }

    const ownedProperties = Array.isArray(snapshot?.investmentProperties)
      ? snapshot.investmentProperties
      : [];
    const ownerCandidates: Array<{
      cityUsers: number;
      payout: number;
      tenantName: string;
      propertyName: string;
      cityName: string;
      propertyKey: string;
    }> = [];

    for (const property of ownedProperties) {
      const cityName = String(property?.cityName || '').trim();
      if (!cityName) continue;

      const cityUsers = Math.max(0, Number(cityCounts[cityName] || 0));
      if (cityUsers < 2) continue;

      const debtService = Math.max(0, Number(property?.monthlyDebtService || 0));
      const loanBalance = Math.max(0, Number(property?.loanBalance || 0));
      if (debtService <= 0 || loanBalance <= 0) continue;
      const propertyKey = String(property?.id || `${cityName}-${String(property?.templateName || 'property')}`);
      const propertyTargetBracket = this.resolveTargetSalaryBracket(property);

      const tenantPool: Array<{ name: string; salary: number }> = [];
      for (const [username, userSnapshot] of userByName.entries()) {
        if (!username || (currentUser && username === currentUser)) continue;
        const tenantCity = String(userSnapshot?.city?.name || '').trim();
        if (tenantCity !== cityName) continue;

        const salary = this.monthlySalary(userSnapshot);
        if (!this.salaryMatchesTargetBracket(salary, propertyTargetBracket.key)) continue;
        tenantPool.push({ name: username, salary });
      }

      if (tenantPool.length === 0) continue;

      const previousTenant = String(priorAssignments[propertyKey] || '').trim();
      let eligiblePool = tenantPool;
      if (tenantPool.length > 1 && previousTenant) {
        const withoutPrevious = tenantPool.filter((tenant) => tenant.name !== previousTenant);
        if (withoutPrevious.length > 0) eligiblePool = withoutPrevious;
      }

      const selectedTenant = this.pickDeterministic(
        eligiblePool,
        `${nextYear}-${nextMonth}-${currentUser || 'owner'}-${cityName}-${String(property?.id || property?.templateName || 'property')}-owner-monopoly`,
      );
      if (!selectedTenant) continue;

      const salaryCap = this.utilitiesService.round2(selectedTenant.salary * this.monopolySalaryCapRatio);
      const payout = this.utilitiesService.round2(Math.max(0, Math.min(debtService, salaryCap)));
      if (payout <= 0) continue;

      ownerCandidates.push({
        cityUsers,
        payout,
        tenantName: selectedTenant.name,
        propertyName: String(property?.templateName || property?.incomeLabel || 'Property'),
        cityName,
        propertyKey,
      });
    }

    if (ownerCandidates.length > 0) {
      ownerCandidates.sort((a, b) => {
        if (b.cityUsers !== a.cityUsers) return b.cityUsers - a.cityUsers;
        if (b.payout !== a.payout) return b.payout - a.payout;
        return a.propertyName.localeCompare(b.propertyName);
      });

      const winner = ownerCandidates[0];
      response.ownerPayout = winner.payout;
      response.ownerTenantName = winner.tenantName;
      response.ownerPropertyName = winner.propertyName;
      response.ownerCityName = winner.cityName;
      response.ownerTenantAssignments = {
        ...priorAssignments,
        [winner.propertyKey]: winner.tenantName,
      };
    } else {
      response.ownerTenantAssignments = priorAssignments;
    }

    return response;
  }
}
