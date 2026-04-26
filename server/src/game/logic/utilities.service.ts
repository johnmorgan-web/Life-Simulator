import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilitiesService {
  // Utility functions
  round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  fix(n: number): number {
    return Math.round(n * 100) / 100;
  }

  hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  mulberry32(a: number) {
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    };
  }

  // Haversine distance (km)
  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Deterministic seasonal + noise multiplier
  variableMultiplier(
    year: number,
    month: number,
    category: 'utilities' | 'food' | 'gas' | 'car' | 'entertainment',
    cityName: string = '',
  ): number {
    const seasonal: Record<string, number[]> = {
      utilities: [0.02, 0.03, 0.02, 0.0, -0.01, -0.02, 0.03, 0.03, 0.01, 0.0, 0.01, 0.04],
      food: [0.0, 0.0, 0.0, 0.0, 0.01, 0.01, 0.0, 0.01, 0.0, 0.0, 0.03, 0.04],
      gas: [0.01, 0.01, 0.0, 0.0, 0.0, 0.03, 0.04, 0.03, 0.01, 0.0, 0.0, 0.0],
      car: [0.02, 0.02, 0.01, 0.0, 0.0, -0.01, -0.01, 0.0, 0.01, 0.02, 0.02, 0.02],
      entertainment: [0.0, 0.02, 0.03, 0.02, 0.01, 0.0, -0.01, 0.0, 0.01, 0.02, 0.03, 0.04],
    };

    const m = Math.max(1, Math.min(12, Math.floor(month)));
    const season = (seasonal[category] && seasonal[category][m - 1]) || 0;

    let catHash = 0;
    for (let i = 0; i < category.length; i++)
      catHash = (catHash * 31 + category.charCodeAt(i)) >>> 0;
    let cityHash = 0;
    for (let i = 0; i < cityName.length; i++)
      cityHash = (cityHash * 31 + cityName.charCodeAt(i)) >>> 0;
    const seed = (year * 100 + m) ^ catHash ^ cityHash;
    const rnd = this.mulberry32(seed)();
    const noise = rnd * 0.04 - 0.02;

    let adjust = season + noise;
    if (adjust > 0.05) adjust = 0.05;
    if (adjust < -0.05) adjust = -0.05;

    return 1 + adjust;
  }

  variableCost(
    base: number,
    month: number,
    year: number,
    cityMultiplier = 1,
    category: 'utilities' | 'food' | 'gas' | 'car' | 'entertainment' = 'utilities',
    cityName: string = '',
  ): number {
    const mult = this.variableMultiplier(year, month, category, cityName);
    return this.fix(base * cityMultiplier * mult);
  }

  // Transit helpers
  transitStateByName(name: string, transitOptions: any[]): any {
    const selected = transitOptions.find((t) => t.n === name);
    if (!selected) {
      return { name: 'L1 - Walk/Bike', cost: 15, level: 1 };
    }
    return { name: selected.n, cost: selected.c, level: selected.l };
  }

  countRelocations(logs: any[]): number {
    return (Array.isArray(logs) ? logs : []).filter(
      (l: any) => String(l?.msg || '').includes('Relocated to '),
    ).length;
  }

  sumLedgerAmounts(ledger: any[], matcher: (desc: string) => boolean): number {
    return this.round2(
      (Array.isArray(ledger) ? ledger : []).reduce((sum: number, row: any) => {
        if (matcher(String(row?.description || ''))) {
          return sum + Number(row?.amount || 0);
        }
        return sum;
      }, 0),
    );
  }

  subscriptionBadgeMilestones() {
    return [
      { months: 3, id: 'sub-3', name: 'Binge Apprentice', icon: '📺' },
      { months: 6, id: 'sub-6', name: 'Fancy Pants Club Member', icon: '🎩' },
      { months: 12, id: 'sub-12', name: 'Streaming Sensei', icon: '🎖️' },
      { months: 24, id: 'sub-24', name: 'Legendary Subscription Overlord', icon: '👑' },
    ];
  }

  entertainmentHostCount(budget: number): number {
    const thresholds = [30, 75, 100, 140, 220, 1200, 5000, 12000, 25000, 50000, 90000, 150000];
    let count = 0;
    for (const t of thresholds) {
      if (budget >= t) count += 1;
    }
    return count;
  }

  ticketStubForHostCount(hostCount: number) {
    if (hostCount >= 12) return { title: 'Lunar Theme Park Buyout', icon: '🌕' };
    if (hostCount >= 11) return { title: 'Orbital Zero-Gravity Party', icon: '🛰️' };
    if (hostCount >= 10) return { title: 'Cruise Ship Esports Festival', icon: '🛳️' };
    if (hostCount >= 9) return { title: 'Private Island Weekend Carnival', icon: '🏝️' };
    if (hostCount >= 8) return { title: 'Stadium Fireworks Spectacular', icon: '🎆' };
    if (hostCount >= 7) return { title: 'Desert Supercar Treasure Rally', icon: '🏎️' };
    if (hostCount >= 6) return { title: 'Chartered Yacht Game Night', icon: '🛥️' };
    if (hostCount >= 5) return { title: 'Private Theme Park After-Hours', icon: '🎢' };
    if (hostCount >= 4) return { title: 'Ballpark Gaming Takeover', icon: '🏟️' };
    if (hostCount >= 3) return { title: 'VIP Laser Tag Bracket', icon: '🔫' };
    return { title: 'Arcade + Pizza Night', icon: '🕹️' };
  }
}
