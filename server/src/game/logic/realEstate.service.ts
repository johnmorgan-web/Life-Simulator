import { Injectable } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { cityData } from '../../data/cityData.constants';
import { realEstateTemplates } from '../../data/realEstate.constants';

@Injectable()
export class RealEstateService {
  constructor(private utilitiesService: UtilitiesService) {}

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

  normalizeRealEstateState(data: any): any {
    const { market, meta } = this.initializeRealEstateMarket(data);
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
}
