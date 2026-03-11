export type RealEstateTemplate = {
  id: string
  name: string
  assetClass: 'Residential' | 'Land' | 'Commercial' | 'Industrial' | 'MixedUse' | 'Hospitality'
  incomeLabel: string
  units: number
  basePrice: number
  baseRentPerUnit: number
  hoaRate: number
  taxRateAnnual: number
  insuranceRateAnnual: number
  maintenanceRateAnnual: number
  renovationCostRate: number
  renovationMonths: number
  amenityOptions: string[]
}

export type RealEstateAmenityImpact = {
  rentBoost: number
  upkeepRate: number
  occupancyBoost: number
  valueBoost: number
  installCost: number
  upgradeTier: 'core' | 'premium' | 'signature'
}

export const realEstateTemplates: RealEstateTemplate[] = [
  {
    id: 'condo-1',
    name: 'Single Condo',
    assetClass: 'Residential',
    incomeLabel: 'Monthly Rent',
    units: 1,
    basePrice: 280000,
    baseRentPerUnit: 2100,
    hoaRate: 0.015,
    taxRateAnnual: 0.012,
    insuranceRateAnnual: 0.004,
    maintenanceRateAnnual: 0.02,
    renovationCostRate: 0.06,
    renovationMonths: 2,
    amenityOptions: ['parking', 'gym', 'pet-friendly', 'smart-lock', 'fiber-internet', 'ev-charging', 'rooftop-lounge']
  },
  {
    id: 'townhome-2',
    name: 'Townhome Duplex',
    assetClass: 'Residential',
    incomeLabel: 'Monthly Rent',
    units: 2,
    basePrice: 560000,
    baseRentPerUnit: 2450,
    hoaRate: 0.01,
    taxRateAnnual: 0.011,
    insuranceRateAnnual: 0.004,
    maintenanceRateAnnual: 0.022,
    renovationCostRate: 0.07,
    renovationMonths: 3,
    amenityOptions: ['parking', 'in-unit-laundry', 'pet-friendly', 'balcony', 'fiber-internet', 'smart-thermostat', 'ev-charging']
  },
  {
    id: 'midrise-8',
    name: 'Midrise 8-Unit',
    assetClass: 'Residential',
    incomeLabel: 'Monthly Rent',
    units: 8,
    basePrice: 1850000,
    baseRentPerUnit: 1900,
    hoaRate: 0,
    taxRateAnnual: 0.013,
    insuranceRateAnnual: 0.005,
    maintenanceRateAnnual: 0.03,
    renovationCostRate: 0.09,
    renovationMonths: 4,
    amenityOptions: ['laundry-room', 'security', 'parcel-room', 'rooftop', 'fitness-studio', 'bike-storage', 'package-lockers']
  },
  {
    id: 'garden-12',
    name: 'Garden 12-Unit',
    assetClass: 'Residential',
    incomeLabel: 'Monthly Rent',
    units: 12,
    basePrice: 2600000,
    baseRentPerUnit: 1750,
    hoaRate: 0,
    taxRateAnnual: 0.013,
    insuranceRateAnnual: 0.005,
    maintenanceRateAnnual: 0.032,
    renovationCostRate: 0.1,
    renovationMonths: 5,
    amenityOptions: ['parking', 'courtyard', 'security', 'playground', 'clubhouse', 'dog-park', 'solar-lighting']
  },
  {
    id: 'retail-strip-6',
    name: 'Retail Strip (6 Bays)',
    assetClass: 'Commercial',
    incomeLabel: 'NNN Lease Income',
    units: 6,
    basePrice: 1450000,
    baseRentPerUnit: 3200,
    hoaRate: 0,
    taxRateAnnual: 0.014,
    insuranceRateAnnual: 0.005,
    maintenanceRateAnnual: 0.026,
    renovationCostRate: 0.09,
    renovationMonths: 4,
    amenityOptions: ['parking', 'security', 'smart-lock', 'parcel-room', 'facade-refresh', 'tenant-signage', 'outdoor-seating']
  },
  {
    id: 'office-20',
    name: 'Office Building (20 Suites)',
    assetClass: 'Commercial',
    incomeLabel: 'Suite Lease Income',
    units: 20,
    basePrice: 5200000,
    baseRentPerUnit: 2400,
    hoaRate: 0,
    taxRateAnnual: 0.016,
    insuranceRateAnnual: 0.005,
    maintenanceRateAnnual: 0.03,
    renovationCostRate: 0.11,
    renovationMonths: 6,
    amenityOptions: ['security', 'rooftop', 'smart-lock', 'gym', 'conference-center', 'backup-generator', 'fiber-internet']
  },
  {
    id: 'warehouse-1',
    name: 'Distribution Warehouse',
    assetClass: 'Industrial',
    incomeLabel: 'Industrial Lease Income',
    units: 1,
    basePrice: 1750000,
    baseRentPerUnit: 14500,
    hoaRate: 0,
    taxRateAnnual: 0.015,
    insuranceRateAnnual: 0.006,
    maintenanceRateAnnual: 0.024,
    renovationCostRate: 0.08,
    renovationMonths: 4,
    amenityOptions: ['security', 'parking', 'smart-lock', 'dock-doors', 'cold-storage', 'solar-roof']
  },
  {
    id: 'self-storage-80',
    name: 'Self-Storage Facility (80 Units)',
    assetClass: 'Commercial',
    incomeLabel: 'Storage Unit Income',
    units: 80,
    basePrice: 2400000,
    baseRentPerUnit: 170,
    hoaRate: 0,
    taxRateAnnual: 0.013,
    insuranceRateAnnual: 0.004,
    maintenanceRateAnnual: 0.02,
    renovationCostRate: 0.07,
    renovationMonths: 3,
    amenityOptions: ['security', 'smart-lock', 'parking', 'climate-control', 'covered-loading', 'solar-lighting']
  },
  {
    id: 'rv-park-40',
    name: 'RV Park (40 Pads)',
    assetClass: 'Land',
    incomeLabel: 'Pad Lease Income',
    units: 40,
    basePrice: 1100000,
    baseRentPerUnit: 520,
    hoaRate: 0,
    taxRateAnnual: 0.011,
    insuranceRateAnnual: 0.003,
    maintenanceRateAnnual: 0.018,
    renovationCostRate: 0.06,
    renovationMonths: 3,
    amenityOptions: ['security', 'playground', 'parking', 'clubhouse', 'laundry-room', 'solar-lighting']
  },
  {
    id: 'farmland-120',
    name: 'Farmland (120 Acres)',
    assetClass: 'Land',
    incomeLabel: 'Crop Lease Income',
    units: 1,
    basePrice: 780000,
    baseRentPerUnit: 5200,
    hoaRate: 0,
    taxRateAnnual: 0.008,
    insuranceRateAnnual: 0.002,
    maintenanceRateAnnual: 0.012,
    renovationCostRate: 0.05,
    renovationMonths: 2,
    amenityOptions: ['security', 'smart-lock', 'irrigation-upgrade', 'equipment-barn', 'solar-pump']
  },
  {
    id: 'cell-tower-land',
    name: 'Cell Tower Ground Lease Parcel',
    assetClass: 'Land',
    incomeLabel: 'Ground Lease Income',
    units: 1,
    basePrice: 420000,
    baseRentPerUnit: 3800,
    hoaRate: 0,
    taxRateAnnual: 0.009,
    insuranceRateAnnual: 0.002,
    maintenanceRateAnnual: 0.01,
    renovationCostRate: 0.03,
    renovationMonths: 1,
    amenityOptions: ['security', 'backup-generator', 'fiber-backhaul']
  },
  {
    id: 'boutique-hotel-24',
    name: 'Boutique Hotel (24 Keys)',
    assetClass: 'Hospitality',
    incomeLabel: 'Nightly Occupancy Income',
    units: 24,
    basePrice: 6100000,
    baseRentPerUnit: 1550,
    hoaRate: 0,
    taxRateAnnual: 0.017,
    insuranceRateAnnual: 0.006,
    maintenanceRateAnnual: 0.035,
    renovationCostRate: 0.12,
    renovationMonths: 6,
    amenityOptions: ['gym', 'security', 'rooftop', 'parking', 'spa-suite', 'event-space', 'smart-room-entry']
  },
  {
    id: 'mixed-use-10',
    name: 'Mixed-Use Corner (10 Units)',
    assetClass: 'MixedUse',
    incomeLabel: 'Blended Lease Income',
    units: 10,
    basePrice: 2900000,
    baseRentPerUnit: 2650,
    hoaRate: 0,
    taxRateAnnual: 0.014,
    insuranceRateAnnual: 0.005,
    maintenanceRateAnnual: 0.029,
    renovationCostRate: 0.1,
    renovationMonths: 5,
    amenityOptions: ['security', 'parking', 'parcel-room', 'balcony', 'cowork-lounge', 'street-retail-refresh', 'fitness-studio']
  }
]

export const amenityImpact: Record<string, RealEstateAmenityImpact> = {
  parking: { rentBoost: 0.03, upkeepRate: 0.0015, occupancyBoost: 0.04, valueBoost: 0.012, installCost: 18000, upgradeTier: 'core' },
  gym: { rentBoost: 0.035, upkeepRate: 0.0025, occupancyBoost: 0.03, valueBoost: 0.016, installCost: 42000, upgradeTier: 'premium' },
  'pet-friendly': { rentBoost: 0.02, upkeepRate: 0.001, occupancyBoost: 0.025, valueBoost: 0.008, installCost: 9000, upgradeTier: 'core' },
  'smart-lock': { rentBoost: 0.01, upkeepRate: 0.0008, occupancyBoost: 0.02, valueBoost: 0.007, installCost: 6500, upgradeTier: 'core' },
  'in-unit-laundry': { rentBoost: 0.028, upkeepRate: 0.0012, occupancyBoost: 0.03, valueBoost: 0.014, installCost: 15000, upgradeTier: 'premium' },
  balcony: { rentBoost: 0.018, upkeepRate: 0.0007, occupancyBoost: 0.02, valueBoost: 0.01, installCost: 12000, upgradeTier: 'core' },
  'laundry-room': { rentBoost: 0.02, upkeepRate: 0.0015, occupancyBoost: 0.02, valueBoost: 0.011, installCost: 22000, upgradeTier: 'premium' },
  security: { rentBoost: 0.025, upkeepRate: 0.002, occupancyBoost: 0.03, valueBoost: 0.013, installCost: 26000, upgradeTier: 'premium' },
  'parcel-room': { rentBoost: 0.012, upkeepRate: 0.0007, occupancyBoost: 0.015, valueBoost: 0.008, installCost: 14000, upgradeTier: 'core' },
  rooftop: { rentBoost: 0.02, upkeepRate: 0.001, occupancyBoost: 0.02, valueBoost: 0.012, installCost: 28000, upgradeTier: 'premium' },
  courtyard: { rentBoost: 0.015, upkeepRate: 0.001, occupancyBoost: 0.018, valueBoost: 0.009, installCost: 16000, upgradeTier: 'core' },
  playground: { rentBoost: 0.013, upkeepRate: 0.0009, occupancyBoost: 0.015, valueBoost: 0.008, installCost: 11000, upgradeTier: 'core' },
  'fiber-internet': { rentBoost: 0.018, upkeepRate: 0.0006, occupancyBoost: 0.02, valueBoost: 0.011, installCost: 13000, upgradeTier: 'core' },
  'ev-charging': { rentBoost: 0.024, upkeepRate: 0.0014, occupancyBoost: 0.018, valueBoost: 0.014, installCost: 24000, upgradeTier: 'premium' },
  'rooftop-lounge': { rentBoost: 0.03, upkeepRate: 0.0018, occupancyBoost: 0.024, valueBoost: 0.018, installCost: 52000, upgradeTier: 'signature' },
  'smart-thermostat': { rentBoost: 0.012, upkeepRate: 0.0005, occupancyBoost: 0.012, valueBoost: 0.007, installCost: 5000, upgradeTier: 'core' },
  'fitness-studio': { rentBoost: 0.022, upkeepRate: 0.0017, occupancyBoost: 0.018, valueBoost: 0.013, installCost: 30000, upgradeTier: 'premium' },
  'bike-storage': { rentBoost: 0.008, upkeepRate: 0.0004, occupancyBoost: 0.012, valueBoost: 0.005, installCost: 7000, upgradeTier: 'core' },
  'package-lockers': { rentBoost: 0.012, upkeepRate: 0.0006, occupancyBoost: 0.015, valueBoost: 0.007, installCost: 10000, upgradeTier: 'core' },
  clubhouse: { rentBoost: 0.024, upkeepRate: 0.0018, occupancyBoost: 0.02, valueBoost: 0.014, installCost: 36000, upgradeTier: 'premium' },
  'dog-park': { rentBoost: 0.014, upkeepRate: 0.0008, occupancyBoost: 0.016, valueBoost: 0.008, installCost: 12000, upgradeTier: 'core' },
  'solar-lighting': { rentBoost: 0.009, upkeepRate: 0.0003, occupancyBoost: 0.01, valueBoost: 0.009, installCost: 14000, upgradeTier: 'core' },
  'facade-refresh': { rentBoost: 0.018, upkeepRate: 0.0009, occupancyBoost: 0.014, valueBoost: 0.013, installCost: 26000, upgradeTier: 'premium' },
  'tenant-signage': { rentBoost: 0.011, upkeepRate: 0.0003, occupancyBoost: 0.01, valueBoost: 0.006, installCost: 9000, upgradeTier: 'core' },
  'outdoor-seating': { rentBoost: 0.015, upkeepRate: 0.0008, occupancyBoost: 0.012, valueBoost: 0.009, installCost: 15000, upgradeTier: 'core' },
  'conference-center': { rentBoost: 0.024, upkeepRate: 0.0016, occupancyBoost: 0.016, valueBoost: 0.015, installCost: 46000, upgradeTier: 'signature' },
  'backup-generator': { rentBoost: 0.018, upkeepRate: 0.0012, occupancyBoost: 0.014, valueBoost: 0.013, installCost: 34000, upgradeTier: 'premium' },
  'dock-doors': { rentBoost: 0.028, upkeepRate: 0.0014, occupancyBoost: 0.018, valueBoost: 0.016, installCost: 40000, upgradeTier: 'premium' },
  'cold-storage': { rentBoost: 0.032, upkeepRate: 0.002, occupancyBoost: 0.014, valueBoost: 0.02, installCost: 70000, upgradeTier: 'signature' },
  'solar-roof': { rentBoost: 0.016, upkeepRate: 0.0005, occupancyBoost: 0.012, valueBoost: 0.014, installCost: 32000, upgradeTier: 'premium' },
  'climate-control': { rentBoost: 0.02, upkeepRate: 0.001, occupancyBoost: 0.014, valueBoost: 0.012, installCost: 28000, upgradeTier: 'premium' },
  'covered-loading': { rentBoost: 0.013, upkeepRate: 0.0007, occupancyBoost: 0.01, valueBoost: 0.009, installCost: 18000, upgradeTier: 'core' },
  'irrigation-upgrade': { rentBoost: 0.014, upkeepRate: 0.0007, occupancyBoost: 0.012, valueBoost: 0.01, installCost: 20000, upgradeTier: 'core' },
  'equipment-barn': { rentBoost: 0.016, upkeepRate: 0.0008, occupancyBoost: 0.01, valueBoost: 0.011, installCost: 26000, upgradeTier: 'premium' },
  'solar-pump': { rentBoost: 0.012, upkeepRate: 0.0003, occupancyBoost: 0.009, valueBoost: 0.009, installCost: 12000, upgradeTier: 'core' },
  'fiber-backhaul': { rentBoost: 0.026, upkeepRate: 0.0009, occupancyBoost: 0.012, valueBoost: 0.016, installCost: 38000, upgradeTier: 'signature' },
  'spa-suite': { rentBoost: 0.03, upkeepRate: 0.0018, occupancyBoost: 0.022, valueBoost: 0.018, installCost: 54000, upgradeTier: 'signature' },
  'event-space': { rentBoost: 0.027, upkeepRate: 0.0016, occupancyBoost: 0.018, valueBoost: 0.017, installCost: 48000, upgradeTier: 'signature' },
  'smart-room-entry': { rentBoost: 0.016, upkeepRate: 0.0007, occupancyBoost: 0.014, valueBoost: 0.01, installCost: 16000, upgradeTier: 'premium' },
  'cowork-lounge': { rentBoost: 0.021, upkeepRate: 0.0013, occupancyBoost: 0.017, valueBoost: 0.013, installCost: 26000, upgradeTier: 'premium' },
  'street-retail-refresh': { rentBoost: 0.018, upkeepRate: 0.0009, occupancyBoost: 0.012, valueBoost: 0.012, installCost: 24000, upgradeTier: 'premium' }
}

export const rentControlByCityType = {
  highCost: 0.03,
  balanced: 0.045,
  growth: 0.06
}
