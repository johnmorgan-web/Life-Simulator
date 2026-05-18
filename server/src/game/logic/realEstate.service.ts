import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { cityData } from '../../data/cityData.constants';
import { realEstateTemplates } from '../../data/realEstate.constants';

@Injectable()
export class RealEstateService {
  private sharedRealEstateMarket: Record<string, any[]> | null = null;
  private sharedRealEstateMarketMeta: any | null = null;

  constructor(private utilitiesService: UtilitiesService) {}

  private cloneDeep<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
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

      for (let i = 0; i < initialCount; i++) {
        const template = realEstateTemplates[i % realEstateTemplates.length];
        listings.push(this.buildRealEstateListing(city, template, i, pressure, `re-${city.name}-${template.id}-${i}`));
      }

      meta.seededUsersByCity[city.name] = cityUserCount;
      meta.nextSequenceByCity[city.name] = initialCount;
      market[city.name] = listings.sort((a, b) => a.askingPrice - b.askingPrice);
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
    return 10 + Math.max(0, users - 1) * 2;
  }

  buildRealEstateListing(
    city: any,
    template: any,
    sequence: number,
    pressure: number,
    customId?: string,
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
      for (let i = 0; i < initialCount; i++) {
        const template = realEstateTemplates[i % realEstateTemplates.length];
        listings.push(
          this.buildRealEstateListing(city, template, i, pressure, `re-${city.name}-${template.id}-${i}`),
        );
      }
      meta.seededUsersByCity[city.name] = users;
      meta.nextSequenceByCity[city.name] = initialCount;
      market[city.name] = listings.sort((a, b) => a.askingPrice - b.askingPrice);
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

    for (const city of cityData) {
      const cityName = city.name;
      const currentUsers = Number(cityUserCounts[cityName] || 0);
      const seededUsers = Number(meta.seededUsersByCity?.[cityName] || 0);
      const pressure = this.cityPressureMultiplier(users, city);
      const existing = Array.isArray(market[cityName]) ? [...market[cityName]] : [];

      let additions = 0;
      if (seededUsers === 0 && currentUsers > 0 && existing.length === 0) {
        additions = this.initialListingsForCity(currentUsers);
      } else if (currentUsers > seededUsers) {
        additions = (currentUsers - seededUsers) * 2;
      }

      let nextSequence = Number(meta.nextSequenceByCity?.[cityName] || existing.length);
      for (let i = 0; i < additions; i++) {
        const template = realEstateTemplates[nextSequence % realEstateTemplates.length];
        existing.push(
          this.buildRealEstateListing(
            city,
            template,
            nextSequence,
            pressure,
            `re-${cityName}-${template.id}-${nextSequence}-${Date.now()}-${i}`,
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
          const template = realEstateTemplates[nextSequence % realEstateTemplates.length];
          existing.push(
            this.buildRealEstateListing(
              city,
              template,
              nextSequence,
              pressure,
              `re-${cityName}-${template.id}-${nextSequence}-${Date.now()}-restock-${i}`,
            ),
          );
          nextSequence += 1;
        }
      }

      meta.seededUsersByCity[cityName] = Math.max(seededUsers, currentUsers);
      meta.nextSequenceByCity[cityName] = nextSequence;
      market[cityName] = existing.sort((a: any, b: any) => Number(a.askingPrice || 0) - Number(b.askingPrice || 0));
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
}
