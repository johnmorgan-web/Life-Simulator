import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { amenityImpact, realEstateTemplates } from '../constants/realEstate.constants'

type LearningLevel = 'elementary' | 'middle-school' | 'high-school' | 'adult'

function currency(n: number) {
  return `$${Math.round(Number(n || 0)).toLocaleString()}`
}

function titleizeAmenity(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function checkPrerequisitesMet(amenity: string, installedAmenities: string[]): { met: boolean; missing: string[] } {
  const impact = amenityImpact[amenity] as any
  const prerequisites = impact?.prerequisites || []
  const missing = prerequisites.filter((pre: string) => !installedAmenities.includes(pre))
  return { met: missing.length === 0, missing }
}

function getSupplyPressure(usersInCity: number, city: any) {
  const demandBase = 1 + Math.min(0.45, (Math.max(1, usersInCity) - 1) * 0.07)
  const multiplier = Math.max(0.75, Math.min(1.9, demandBase * (0.9 + (Number(city?.p || 1) - 1) * 0.6)))
  let label = 'Loose'
  if (multiplier >= 1.35) label = 'Tight'
  else if (multiplier >= 1.1) label = 'Active'
  else if (multiplier >= 0.95) label = 'Balanced'
  return { multiplier, label }
}

function listingEducationBlurb(listing: any, learningLevel: LearningLevel, usePlainLanguage: boolean) {
  const ask = Number(listing?.askingPrice || 0)
  const rent = Number(listing?.askingRentPerUnit || 0)
  const units = Math.max(1, Number(listing?.units || 1))
  const grossMonthly = rent * units

  if (usePlainLanguage) {
    if (learningLevel === 'elementary') return `This place costs ${currency(ask)} and can make about ${currency(grossMonthly)} each month before bills.`
    if (learningLevel === 'middle-school') return `Asking price is ${currency(ask)}. Potential monthly income is around ${currency(grossMonthly)} before expenses.`
    if (learningLevel === 'high-school') return `At ${currency(ask)} ask, this asset can gross roughly ${currency(grossMonthly)}/month prior to debt service and operating costs.`
    return `This listing is priced at ${currency(ask)} with estimated gross income near ${currency(grossMonthly)} per month before expenses.`
  }

  if (learningLevel === 'elementary') return `PRICE ${currency(ask)} | MONEY IN ~${currency(grossMonthly)}/mo (before bills)`
  if (learningLevel === 'middle-school') return `Valuation: ${currency(ask)}. Gross income potential: ${currency(grossMonthly)}/month pre-expense.`
  if (learningLevel === 'high-school') return `Acquisition at ${currency(ask)} implies gross revenue capacity near ${currency(grossMonthly)}/month, excluding opex/debt.`
  return `Acquisition basis ${currency(ask)}; projected gross yield stream approximately ${currency(grossMonthly)}/month pre-opex.`
}

function propertyConditionTrend(property: any, currentMonth: number, currentYear: number) {
  const acquiredMonth = Number(property?.acquiredMonth || currentMonth)
  const acquiredYear = Number(property?.acquiredYear || currentYear)
  const propertyAgeMonths = Math.max(0, ((currentYear - acquiredYear) * 12) + (currentMonth - acquiredMonth))
  const maintenanceIntensity = Math.max(0.5, Math.min(1.5, Number(property?.maintenanceIntensity || 1)))
  const neglectScore = Math.max(0, Number(property?.neglectScore || 0))
  const ageDecay = 0.18 + Math.min(0.42, propertyAgeMonths * 0.008)
  const neglectPenalty = neglectScore * 0.035
  const maintenanceReduction = Math.max(0, (maintenanceIntensity - 0.75) * 0.42)
  const monthlyConditionDecay = Math.max(0.04, ageDecay + neglectPenalty - maintenanceReduction)

  let renovationLift = 0
  if (Number(property?.renovationMonthsRemaining || 0) > 0 && Number(property?.renovationBudgetRemaining || 0) > 0) {
    const monthsRemaining = Math.max(1, Number(property.renovationMonthsRemaining || 1))
    const monthlySpend = Number(property.renovationBudgetRemaining || 0) / monthsRemaining
    renovationLift = 0.9 + Math.min(1.15, Math.max(0.35, monthlySpend / 40000))
  }

  const netDelta = renovationLift - monthlyConditionDecay
  if (netDelta > 0.25) return { label: 'Improving', tone: 'text-emerald-700' }
  if (netDelta > -0.15) return { label: 'Nearly Stable', tone: 'text-amber-700' }
  if (netDelta > -0.55) return { label: 'Slow Decay', tone: 'text-orange-700' }
  return { label: 'Rapid Decay', tone: 'text-rose-700' }
}

function percent(value: number) {
  return `${value.toFixed(1)}%`
}

function getRealEstateVocabulary(learningLevel: LearningLevel, usePlainLanguage: boolean) {
  if (usePlainLanguage) {
    if (learningLevel === 'elementary') {
      return {
        monthlySectionTitle: 'Monthly Money View',
        grossLabel: 'Money In',
        operatingLabel: 'Property Bills',
        debtLabel: 'Loan Payment',
        netLabel: 'Money Left',
        marginLabel: 'Profit Share',
        breakevenLabel: 'Units Needed To Break Even',
        scenarioSectionTitle: 'What-if Outcomes',
        askingLabel: 'Price',
        rentPerUnitLabel: 'Rent Per Home',
        capRateLabel: 'Yearly Return',
        incomeModelLabel: 'How It Pays You',
        estCashRequiredLabel: 'Money Needed (Cash Buy)',
        estCashToCloseLabel: 'Money Needed To Close',
        foreclosureLabel: 'Bank Sale',
        learningLevelLabel: 'Learning Level',
        plainLanguageLabel: 'Simple Words',
        refreshMarketLabel: 'Refresh Market',
        buyModeLabel: 'Buy Mode',
        mortgageOptionLabel: 'Loan',
        cashOptionLabel: 'Cash (discount)',
        termLabel: 'Loan Length',
        downPaymentLabel: 'Down Payment',
        preOfferCalculatorTitle: 'Before You Offer Calculator',
        occupancyAssumptionLabel: 'Occupancy Guess',
        conditionAssumptionLabel: 'Condition Guess',
        estOperatingLabel: 'Estimated Bills',
        estDebtLabel: 'Estimated Loan Payment',
        estNetLabel: 'Estimated Money Left',
        estMarginLabel: 'Estimated Profit Share',
        estBreakEvenLabel: 'Estimated Break-even Occupancy',
        lowLabel: 'Low',
        highLabel: 'High',
      }
    }
    if (learningLevel === 'middle-school') {
      return {
        monthlySectionTitle: 'Monthly Profit View',
        grossLabel: 'Income',
        operatingLabel: 'Operating Bills',
        debtLabel: 'Debt Payment',
        netLabel: 'Net Profit',
        marginLabel: 'Profit Margin',
        breakevenLabel: 'Break-even Occupancy',
        scenarioSectionTitle: 'What-if Outcomes',
        askingLabel: 'Asking Price',
        rentPerUnitLabel: 'Rent / Unit',
        capRateLabel: 'Cap Rate',
        incomeModelLabel: 'Income Model',
        estCashRequiredLabel: 'Estimated Cash Required',
        estCashToCloseLabel: 'Estimated Cash To Close',
        foreclosureLabel: 'Foreclosure Listing',
        learningLevelLabel: 'Learning Level',
        plainLanguageLabel: 'Plain Language',
        refreshMarketLabel: 'Refresh Shared Market',
        buyModeLabel: 'Buy Mode',
        mortgageOptionLabel: 'Mortgage',
        cashOptionLabel: 'Cash (discounted)',
        termLabel: 'Term',
        downPaymentLabel: 'Down Payment',
        preOfferCalculatorTitle: 'Pre-Offer Calculator',
        occupancyAssumptionLabel: 'Occupancy Assumption',
        conditionAssumptionLabel: 'Condition Assumption',
        estOperatingLabel: 'Est. Operating Costs',
        estDebtLabel: 'Est. Debt Service',
        estNetLabel: 'Est. Net Cashflow',
        estMarginLabel: 'Est. Net Margin',
        estBreakEvenLabel: 'Est. Break-even Occupancy',
        lowLabel: 'Low',
        highLabel: 'High',
      }
    }
  }

  if (learningLevel === 'high-school') {
    return {
      monthlySectionTitle: 'Monthly P&L Snapshot',
      grossLabel: 'Gross Revenue',
      operatingLabel: 'Operating Costs',
      debtLabel: 'Debt Service',
      netLabel: 'Net Cashflow',
      marginLabel: 'Net Margin',
      breakevenLabel: 'Break-even Occupancy',
      scenarioSectionTitle: 'Scenario Matrix',
      askingLabel: 'Asking',
      rentPerUnitLabel: 'Rent/Unit',
      capRateLabel: 'Cap Rate',
      incomeModelLabel: 'Income Model',
      estCashRequiredLabel: 'Est. Cash Required',
      estCashToCloseLabel: 'Est. Cash To Close',
      foreclosureLabel: 'Foreclosure Listing',
      learningLevelLabel: 'Learning Level',
      plainLanguageLabel: 'Plain Language',
      refreshMarketLabel: 'Refresh Shared Market',
      buyModeLabel: 'Buy Mode',
      mortgageOptionLabel: 'Mortgage',
      cashOptionLabel: 'Cash (discounted)',
      termLabel: 'Term',
      downPaymentLabel: 'Down Payment',
      preOfferCalculatorTitle: 'Pre-Offer Calculator',
      occupancyAssumptionLabel: 'Occupancy Assumption',
      conditionAssumptionLabel: 'Condition Assumption',
      estOperatingLabel: 'Est. Operating Expenses',
      estDebtLabel: 'Est. Debt Service',
      estNetLabel: 'Est. Net Cashflow',
      estMarginLabel: 'Est. Net Margin',
      estBreakEvenLabel: 'Est. Break-even Occupancy',
      lowLabel: 'Low',
      highLabel: 'High',
    }
  }

  return {
    monthlySectionTitle: 'Monthly P&L Snapshot',
    grossLabel: 'Gross Revenue',
    operatingLabel: 'Operating Expenses',
    debtLabel: 'Debt Service',
    netLabel: 'Net Cashflow',
    marginLabel: 'Net Margin',
    breakevenLabel: 'Break-even Occupancy',
    scenarioSectionTitle: 'Scenario Matrix',
    askingLabel: 'Asking',
    rentPerUnitLabel: 'Rent/Unit',
    capRateLabel: 'Cap Rate',
    incomeModelLabel: 'Income Model',
    estCashRequiredLabel: 'Est. Cash Required',
    estCashToCloseLabel: 'Est. Cash To Close',
    foreclosureLabel: 'Foreclosure Listing',
    learningLevelLabel: 'Learning Level',
    plainLanguageLabel: 'Plain Language',
    refreshMarketLabel: 'Refresh Shared Market',
    buyModeLabel: 'Buy Mode',
    mortgageOptionLabel: 'Mortgage',
    cashOptionLabel: 'Cash (discounted)',
    termLabel: 'Term',
    downPaymentLabel: 'Down Payment',
    preOfferCalculatorTitle: 'Pre-Offer Calculator',
    occupancyAssumptionLabel: 'Occupancy Assumption',
    conditionAssumptionLabel: 'Condition Assumption',
    estOperatingLabel: 'Est. Operating Expenses',
    estDebtLabel: 'Est. Debt Service',
    estNetLabel: 'Est. Net Cashflow',
    estMarginLabel: 'Est. Net Margin',
    estBreakEvenLabel: 'Est. Break-even Occupancy',
    lowLabel: 'Low',
    highLabel: 'High',
  }
}

function amenityUpkeepRate(amenities: string[]) {
  return amenities.reduce((sum, amenity) => sum + Number(amenityImpact[amenity]?.upkeepRate || 0), 0)
}

function estimateMortgagePayment(principal: number, termYears: 15 | 30, apr = 0.0675) {
  const loan = Math.max(0, Number(principal || 0))
  if (loan <= 0) return 0
  const months = Math.max(1, Number(termYears || 30) * 12)
  const monthlyRate = Math.max(0.0001, apr / 12)
  const growth = Math.pow(1 + monthlyRate, months)
  return (loan * monthlyRate * growth) / Math.max(0.0001, (growth - 1))
}

function getMaintenanceEducation(learningLevel: LearningLevel, usePlainLanguage: boolean) {
  if (usePlainLanguage) {
    if (learningLevel === 'elementary') {
      return {
        summary: 'Fix-up plans help your building stay healthy. More care now means fewer expensive problems later.',
        leanTooltip: 'Spend less now. Saves money today, but the building wears out faster.',
        balancedTooltip: 'Normal care level. Good mix of cost and protection.',
        protectiveTooltip: 'Spend more now to protect the building and slow wear.',
        refreshTooltip: 'Small makeover. Lower budget and smaller improvement.',
        modernizeTooltip: 'Bigger upgrade. Better improvement with medium budget.',
        signatureTooltip: 'Top-level makeover. Most expensive, but strongest improvement.',
        optionsTitle: 'What these buttons do',
        leanLine: 'Lean Maintenance: spend less each month, but condition drops faster.',
        balancedLine: 'Balanced Maintenance: standard spending and steady protection.',
        protectiveLine: 'Protective Maintenance: higher spending to keep quality high.',
        refreshLine: 'Refresh Plan: smaller renovation budget with lighter results.',
        modernizeLine: 'Modernize Plan: fuller renovation with stronger results.',
        signatureLine: 'Signature Reposition: premium renovation for maximum improvement.',
        valueRecoveryLine: 'Value Recovery: how much of renovation spending turns into higher property value.',
      }
    }
    if (learningLevel === 'middle-school') {
      return {
        summary: 'Renovation improves condition over time, while maintenance controls how quickly the building wears down.',
        leanTooltip: 'Lower monthly upkeep costs, but faster condition decline.',
        balancedTooltip: 'Standard upkeep cost and balanced condition protection.',
        protectiveTooltip: 'Higher upkeep cost to better preserve condition and value.',
        refreshTooltip: 'Lower-cost renovation with moderate condition recovery.',
        modernizeTooltip: 'Mid-cost renovation with stronger condition and value recovery.',
        signatureTooltip: 'Premium renovation with strongest condition recovery and value lift.',
        optionsTitle: 'What these options mean',
        leanLine: 'Lean Maintenance: reduced upkeep spend (0.8x), faster wear.',
        balancedLine: 'Balanced Maintenance: standard upkeep spend (1.0x).',
        protectiveLine: 'Protective Maintenance: higher upkeep spend (1.2x), slower wear.',
        refreshLine: 'Refresh Plan: lighter renovation at 55% budget with partial value recovery.',
        modernizeLine: 'Modernize Plan: broader renovation at 95% budget with stronger value recovery.',
        signatureLine: 'Signature Reposition: premium renovation at 135% budget with highest value recovery.',
        valueRecoveryLine: 'Value Recovery Rate: percent of renovation spending that converts into property value.',
      }
    }
  }

  if (learningLevel === 'high-school') {
    return {
      summary: 'Renovations restore condition incrementally while maintenance intensity determines ongoing decay velocity.',
      leanTooltip: 'Lower opex profile, but accelerates condition depreciation.',
      balancedTooltip: 'Neutral upkeep posture with moderate condition preservation.',
      protectiveTooltip: 'Higher opex posture to suppress decay and preserve valuation.',
      refreshTooltip: 'Lower-capex renovation tranche with limited value recapture.',
      modernizeTooltip: 'Core-capex renovation with stronger condition and valuation recapture.',
      signatureTooltip: 'Premium capex repositioning with maximal condition recovery and value accretion.',
      optionsTitle: 'What these options mean',
      leanLine: 'Lean Maintenance: Reduced upkeep spend (0.8x). Improves short-run cashflow but increases long-run condition drag.',
      balancedLine: 'Balanced Maintenance: Standard upkeep spend (1.0x). Keeps condition relatively stable without overspending.',
      protectiveLine: 'Protective Maintenance: Elevated upkeep spend (1.2x). Slows decay materially and protects future value.',
      refreshLine: 'Refresh Plan: Light renovation at 55% budget. Partial condition recovery and lower value conversion efficiency.',
      modernizeLine: 'Modernize Plan: Fuller renovation at 95% budget. Better condition restoration and stronger value conversion.',
      signatureLine: 'Signature Reposition: Premium overhaul at 135% budget. Maximum condition restoration and strongest value accretion.',
      valueRecoveryLine: 'Value Recovery Rate: Share of renovation spend that converts into incremental asset value; >1.0 implies net value creation.',
    }
  }

  return {
    summary: 'Renovations restore condition progressively while maintenance intensity governs structural decay and long-horizon asset preservation.',
    leanTooltip: 'Lower ongoing operating expenditure, with elevated condition degradation risk over time.',
    balancedTooltip: 'Baseline operating posture balancing expenditure control and condition retention.',
    protectiveTooltip: 'Higher recurring expenditure to minimize deterioration and preserve valuation resilience.',
    refreshTooltip: 'Lower-capital renovation scope with partial condition normalization and moderate value recapture.',
    modernizeTooltip: 'Comprehensive renovation scope delivering stronger condition normalization and valuation recapture.',
    signatureTooltip: 'Premium repositioning program with maximal condition uplift and top-tier value accretion potential.',
    optionsTitle: 'What these options mean',
    leanLine: 'Lean Maintenance: Reduced upkeep spend (0.8x). Enhances near-term free cash flow but compounds deferred maintenance risk.',
    balancedLine: 'Balanced Maintenance: Standard upkeep spend (1.0x). Maintains operational stability without excess cost intensity.',
    protectiveLine: 'Protective Maintenance: Higher upkeep spend (1.2x). Dampens decay trajectory and defends long-term equity value.',
    refreshLine: 'Refresh Plan: Light-capex renovation at 55% budget. Delivers targeted condition lift with limited value conversion.',
    modernizeLine: 'Modernize Plan: Core-capex renovation at 95% budget. Improves physical condition and supports stronger valuation recapture.',
    signatureLine: 'Signature Reposition: Premium-capex renovation at 135% budget. Maximizes condition recovery and value accretion.',
    valueRecoveryLine: 'Value Recovery Rate: Ratio of renovation spend that capitalizes into asset value; values above 1.0 indicate positive value arbitrage.',
  }
}

export default function RealEstate() {
  const { state, dispatch, cityData, refreshRealEstateMarket, submitRealEstateOffer, sellInvestmentProperty, cityUserCounts } = useGame()
  const learningLevel: LearningLevel = state.learningLevel || state.realEstateLearningLevel || state.marketLearningLevel || 'adult'
  const usePlainLanguage = Boolean(state.usePlainLanguage ?? state.realEstateUsePlainLanguage ?? state.marketUsePlainLanguage)
  const [selectedCity, setSelectedCity] = useState(state.city?.name || cityData?.[0]?.name || '')
  const [downPaymentPct, setDownPaymentPct] = useState(0.25)
  const [purchaseMode, setPurchaseMode] = useState<'cash' | 'mortgage'>('mortgage')
  const [mortgageTermYears, setMortgageTermYears] = useState<15 | 30>(30)
  const [calculatorAssumptionsByListing, setCalculatorAssumptionsByListing] = useState<Record<string, { occupancyRate: number; condition: number }>>({})
  const [projectionModal, setProjectionModal] = useState<{ propertyId: string; amenity: string } | null>(null)

  const market = (state.realEstateMarket || {}) as Record<string, any[]>
  const marketMeta = (state.realEstateMarketMeta || {}) as any
  const cityListings = Array.isArray(market[selectedCity]) ? market[selectedCity] : []
  const deals = Array.isArray(state.pendingRealEstateDeals) ? state.pendingRealEstateDeals : []
  const properties = Array.isArray(state.investmentProperties) ? state.investmentProperties : []
  const cityRestockTimers = Array.isArray(marketMeta?.pendingListingTimersByCity?.[selectedCity]) ? marketMeta.pendingListingTimersByCity[selectedCity] : []
  const nextListingMonths = cityRestockTimers.length ? Math.min(...cityRestockTimers.map((n: number) => Number(n || 0)).filter((n: number) => n > 0)) : null

  const selectedCityInsights = useMemo(() => {
    const city = (Array.isArray(cityData) ? cityData : []).find((c: any) => c.name === selectedCity)
    const usersInCity = Math.max(0, Number(cityUserCounts[selectedCity] || 0))
    if (!city) return { usersInCity, pressureMultiplier: 1, pressureLabel: 'Balanced' }
    const pressure = getSupplyPressure(usersInCity, city)
    return { usersInCity, pressureMultiplier: pressure.multiplier, pressureLabel: pressure.label }
  }, [cityData, cityUserCounts, selectedCity])

  const cityDashboard = useMemo(() => {
    const allCities = Array.isArray(cityData) ? cityData : []
    return allCities.map((city: any) => {
      const listings = Array.isArray(market[city.name]) ? market[city.name] : []
      const asks = listings.map((l: any) => Number(l.askingPrice || 0)).filter((n: number) => n > 0)
      const rents = listings.map((l: any) => Number(l.askingRentPerUnit || 0)).filter((n: number) => n > 0)
      const median = (arr: number[]) => {
        if (!arr.length) return 0
        const sorted = [...arr].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
      }

      const cityOwned = properties.filter((p: any) => p.cityName === city.name)
      const cityUnits = cityOwned.reduce((sum: number, p: any) => sum + Number(p.units || 0), 0)
      const cityOccupied = cityOwned.reduce((sum: number, p: any) => sum + Number(p.occupiedUnits || 0), 0)

      return {
        cityName: city.name,
        icon: city.icon,
        usersInCity: Math.max(0, Number(cityUserCounts[city.name] || 0)),
        supplyPressure: getSupplyPressure(Math.max(0, Number(cityUserCounts[city.name] || 0)), city),
        listingCount: listings.length,
        medianAsking: median(asks),
        medianRent: median(rents),
        ownedProperties: cityOwned.length,
        occupancyRate: cityUnits > 0 ? (cityOccupied / cityUnits) * 100 : 0
      }
    }).sort((a: any, b: any) => b.listingCount - a.listingCount)
  }, [cityData, cityUserCounts, market, properties])

  const vocabulary = useMemo(() => getRealEstateVocabulary(learningLevel, usePlainLanguage), [learningLevel, usePlainLanguage])
  const maintenanceEducation = useMemo(() => getMaintenanceEducation(learningLevel, usePlainLanguage), [learningLevel, usePlainLanguage])

  const lastMonthBreakdownByProperty = useMemo(() => {
    const rows = Array.isArray(state.realEstateLastMonthPropertyBreakdown) ? state.realEstateLastMonthPropertyBreakdown : []
    return rows.reduce((acc: Record<string, any>, row: any) => {
      acc[String(row.propertyId || '')] = row
      return acc
    }, {})
  }, [state.realEstateLastMonthPropertyBreakdown])

  const scenarioProjection = (property: any, occupancyRate: number, conditionAssumption: number) => {
    const units = Math.max(1, Number(property.units || 1))
    const occupiedUnits = Math.max(0, Math.min(units, Math.round(units * occupancyRate)))
    const rentPerUnit = Math.max(450, Number(property.rentPerUnit || 0))
    const propertyValue = Math.max(60000, Number(property.propertyValue || 0))
    const debtService = Math.max(0, Number(property.monthlyDebtService || 0))
    const city = (Array.isArray(cityData) ? cityData : []).find((c: any) => c.name === property.cityName) || { p: 1, r: 1 }
    const upkeepRate = amenityUpkeepRate(Array.isArray(property.amenities) ? property.amenities : [])
    const annualTaxRate = 0.009 + Number(city.p || 1) * 0.003
    const annualInsuranceRate = 0.0035 + Number(city.r || 1) * 0.001
    const annualMaintenanceRate = 0.014 + (Math.max(0, 85 - conditionAssumption) * 0.00025) + upkeepRate
    const operatingCosts = Math.round((propertyValue * (annualTaxRate + annualInsuranceRate + annualMaintenanceRate) / 12) * 100) / 100
    const gross = Math.round((occupiedUnits * rentPerUnit) * 100) / 100
    const net = Math.round((gross - operatingCosts - debtService) * 100) / 100
    const margin = gross > 0 ? (net / gross) * 100 : -100
    return { gross, operatingCosts, debtService, net, margin }
  }

  const breakEvenOccupancyPercent = (property: any, conditionAssumption: number) => {
    const units = Math.max(1, Number(property.units || 1))
    const rentPerUnit = Math.max(450, Number(property.rentPerUnit || 0))
    const projection = scenarioProjection(property, 1, conditionAssumption)
    const breakEvenUnits = (projection.operatingCosts + projection.debtService) / Math.max(1, rentPerUnit)
    return Math.max(0, Math.min(100, (breakEvenUnits / units) * 100))
  }

  const listingPreOfferProjection = (listing: any, occupancyRate: number, conditionAssumption: number) => {
    const units = Math.max(1, Number(listing?.units || 1))
    const rentPerUnit = Math.max(450, Number(listing?.askingRentPerUnit || 0))
    const askingPrice = Math.max(60000, Number(listing?.askingPrice || 0))
    const occupiedUnits = Math.max(0, Math.min(units, Math.round(units * occupancyRate)))
    const city = (Array.isArray(cityData) ? cityData : []).find((c: any) => c.name === listing?.cityName) || { p: 1, r: 1 }
    const upkeepRate = amenityUpkeepRate(Array.isArray(listing?.amenities) ? listing.amenities : [])
    const annualTaxRate = 0.009 + Number(city.p || 1) * 0.003
    const annualInsuranceRate = 0.0035 + Number(city.r || 1) * 0.001
    const annualMaintenanceRate = 0.014 + (Math.max(0, 85 - conditionAssumption) * 0.00025) + upkeepRate
    const operatingCosts = Math.round((askingPrice * (annualTaxRate + annualInsuranceRate + annualMaintenanceRate) / 12) * 100) / 100
    const loanPrincipal = purchaseMode === 'cash' ? 0 : askingPrice * (1 - downPaymentPct)
    const debtService = Math.round(estimateMortgagePayment(loanPrincipal, mortgageTermYears) * 100) / 100
    const gross = Math.round((occupiedUnits * rentPerUnit) * 100) / 100
    const net = Math.round((gross - operatingCosts - debtService) * 100) / 100
    const margin = gross > 0 ? (net / gross) * 100 : -100
    const breakEvenUnits = (operatingCosts + debtService) / Math.max(1, rentPerUnit)
    const breakEven = Math.max(0, Math.min(100, (breakEvenUnits / units) * 100))
    return { operatingCosts, debtService, net, margin, breakEven }
  }

  const getListingAssumptions = (listingId: string) => {
    return calculatorAssumptionsByListing[listingId] || { occupancyRate: 0.8, condition: 70 }
  }

  const setListingAssumption = (listingId: string, key: 'occupancyRate' | 'condition', value: number) => {
    setCalculatorAssumptionsByListing((prev) => {
      const current = prev[listingId] || { occupancyRate: 0.8, condition: 70 }
      return {
        ...prev,
        [listingId]: {
          ...current,
          [key]: value,
        },
      }
    })
  }

  const submitOffer = async (listing: any) => {
    const result = await submitRealEstateOffer(listing, { downPaymentPct, purchaseMode, mortgageTermYears })
    if (!result?.ok && result?.reason === 'listing-unavailable') {
      await refreshRealEstateMarket()
      alert('This listing was just taken by another user. Market has been refreshed.')
    }
  }

  const setMaintenance = (propertyId: string, intensity: number) => {
    const next = properties.map((p: any) => p.id === propertyId ? { ...p, maintenanceIntensity: intensity } : p)
    dispatch({ type: 'SET_STATE', payload: { investmentProperties: next } })
  }

  const startRenovation = (propertyId: string, plan: 'refresh' | 'modernize' | 'signature') => {
    const next = properties.map((p: any) => {
      if (p.id !== propertyId || Number(p.renovationMonthsRemaining || 0) > 0) return p
      const template = realEstateTemplates.find((t) => t.id === p.templateId)
      const planConfig = {
        refresh: { budgetMult: 0.55, monthBonus: 0, valueRecovery: 0.76, label: 'Refresh' },
        modernize: { budgetMult: 0.95, monthBonus: 1, valueRecovery: 0.92, label: 'Modernize' },
        signature: { budgetMult: 1.35, monthBonus: 2, valueRecovery: 1.08, label: 'Signature Reposition' }
      }[plan]
      const baseRate = Number(template?.renovationCostRate || 0.08)
      const baseMonths = Math.max(2, Number(template?.renovationMonths || Math.min(6, Math.ceil(Number(p.units || 1) / 3))))
      const budget = Math.max(15000, Number(p.propertyValue || 0) * baseRate * planConfig.budgetMult)
      const months = Math.max(2, baseMonths + planConfig.monthBonus)
      return {
        ...p,
        renovationPlan: planConfig.label,
        renovationMonthsRemaining: months,
        renovationBudgetRemaining: Math.round(budget),
        renovationValueRecovery: planConfig.valueRecovery
      }
    })
    dispatch({ type: 'SET_STATE', payload: { investmentProperties: next } })
  }

  const addAmenity = (propertyId: string, amenity: string) => {
    const impact = amenityImpact[amenity]
    const installCost = Number(impact?.installCost || 12000)
    if (Number(state.check || 0) < installCost) return
    const next = properties.map((p: any) => {
      if (p.id !== propertyId) return p
      const current = Array.isArray(p.amenities) ? p.amenities : []
      if (current.includes(amenity)) return p
      const currentValue = Math.max(0, Number(p.propertyValue || 0))
      const valueLift = Math.round(Math.max(installCost * 0.6, currentValue * Number(impact?.valueBoost || 0.008) * 0.45))
      const rentLift = Math.round(Math.max(0, Number(p.rentPerUnit || 0) * Number(impact?.rentBoost || 0) * 0.35))
      return {
        ...p,
        amenities: [...current, amenity],
        propertyValue: currentValue + valueLift,
        rentPerUnit: Math.max(0, Number(p.rentPerUnit || 0) + rentLift),
        marketRentPerUnit: Math.max(0, Number(p.marketRentPerUnit || p.rentPerUnit || 0) + rentLift),
        condition: Math.min(100, Number(p.condition || 75) + (impact?.upgradeTier === 'signature' ? 4 : impact?.upgradeTier === 'premium' ? 3 : 2))
      }
    })
    dispatch({
      type: 'SET_STATE',
      payload: {
        investmentProperties: next,
        check: Number(state.check || 0) - installCost,
        logs: [
          ...(Array.isArray(state.logs) ? state.logs : []),
          { date: `${state.month}/${state.year}`, msg: `🧱 Added ${titleizeAmenity(amenity)} for ${currency(installCost)}. Asset value improved immediately.` }
        ]
      }
    })
    setProjectionModal(null)
  }

  const calculateAmenityProjection = (property: any, amenity: string) => {
    const impact = amenityImpact[amenity]
    const installCost = Number(impact?.installCost || 12000)
    const currentValue = Math.max(0, Number(property.propertyValue || 0))
    const valueLift = Math.round(Math.max(installCost * 0.6, currentValue * Number(impact?.valueBoost || 0.008) * 0.45))
    const rentLift = Math.round(Math.max(0, Number(property.rentPerUnit || 0) * Number(impact?.rentBoost || 0) * 0.35))
    const units = Math.max(1, Number(property.units || 1))
    const occupancyBoost = Math.round((Number(impact?.occupancyBoost || 0) * 100) * 10) / 10
    const conditionGain = impact?.upgradeTier === 'signature' ? 4 : impact?.upgradeTier === 'premium' ? 3 : 2
    const paybackMonths = rentLift > 0 ? Math.round(installCost / (rentLift * units)) : null
    return { installCost, valueLift, rentLift, occupancyBoost, conditionGain, paybackMonths }
  }

  const estimatedCashPurchase = (listing: any) => {
    const price = Number(listing.askingPrice || 0)
    return Math.round(price * 0.97 + price * 0.015)
  }

  const estimatedMortgageCash = (listing: any) => {
    const price = Number(listing.askingPrice || 0)
    return Math.round(price * downPaymentPct + price * 0.025)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-4">
        <h3 className="font-bold text-lg">Real Estate Market</h3>
        <p className="text-xs text-slate-600 mt-1">{selectedCity} currently has {selectedCityInsights.usersInCity} active user{selectedCityInsights.usersInCity === 1 ? '' : 's'} with {selectedCityInsights.pressureLabel.toLowerCase()} supply pressure ({selectedCityInsights.pressureMultiplier.toFixed(2)}x demand).</p>
        <div className="flex flex-wrap gap-3 mt-3">
          <label className="text-sm text-slate-700 flex items-center gap-2">
            {vocabulary.learningLevelLabel}
            <select
              value={learningLevel}
              onChange={(e) => dispatch({
                type: 'SET_STATE',
                payload: {
                  learningLevel: e.target.value,
                  marketLearningLevel: e.target.value,
                  realEstateLearningLevel: e.target.value,
                },
              })}
              className="px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="elementary">Elementary</option>
              <option value="middle-school">Middle School</option>
              <option value="high-school">High School</option>
              <option value="adult">Adult</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={usePlainLanguage}
              onChange={(e) => dispatch({
                type: 'SET_STATE',
                payload: {
                  usePlainLanguage: e.target.checked,
                  marketUsePlainLanguage: e.target.checked,
                  realEstateUsePlainLanguage: e.target.checked,
                },
              })}
            />
            {vocabulary.plainLanguageLabel}
          </label>
          <button className="px-3 py-2 rounded bg-slate-800 text-white text-sm" onClick={() => { void refreshRealEstateMarket() }}>{vocabulary.refreshMarketLabel}</button>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 rounded border border-slate-300 bg-white"
          >
            {(Array.isArray(cityData) ? cityData : []).map((city: any) => (
              <option key={city.name} value={city.name}>{city.icon} {city.name}</option>
            ))}
          </select>
          <label className="text-sm text-slate-700 flex items-center gap-2">
            {vocabulary.buyModeLabel}
            <select value={purchaseMode} onChange={(e) => setPurchaseMode(e.target.value === 'cash' ? 'cash' : 'mortgage')} className="px-2 py-1 rounded border border-slate-300 bg-white">
              <option value="mortgage">{vocabulary.mortgageOptionLabel}</option>
              <option value="cash">{vocabulary.cashOptionLabel}</option>
            </select>
          </label>
          {purchaseMode === 'mortgage' ? (
            <label className="text-sm text-slate-700 flex items-center gap-2">
              {vocabulary.termLabel}
              <select value={String(mortgageTermYears)} onChange={(e) => setMortgageTermYears(Number(e.target.value) === 15 ? 15 : 30)} className="px-2 py-1 rounded border border-slate-300 bg-white">
                <option value="15">15 years</option>
                <option value="30">30 years</option>
              </select>
            </label>
          ) : null}
          {purchaseMode === 'mortgage' ? (
            <label className="text-sm text-slate-700 flex items-center gap-2">
            {vocabulary.downPaymentLabel}
            <select
              value={String(downPaymentPct)}
              onChange={(e) => setDownPaymentPct(Number(e.target.value))}
              className="px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="0.2">20%</option>
              <option value="0.25">25%</option>
              <option value="0.3">30%</option>
              <option value="0.4">40%</option>
            </select>
          </label>
          ) : null}
        </div>
      </div>

      <div className="glass p-4">
        <h4 className="font-bold">City Dashboard</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {cityDashboard.map((row: any) => (
            <div key={`city-dash-${row.cityName}`} className="bg-slate-50 rounded p-3 text-sm">
              <p className="font-semibold">{row.icon} {row.cityName}</p>
              <p className="text-slate-600">Users in city: <span className="font-bold">{row.usersInCity}</span></p>
              <p className="text-slate-600">Supply pressure: <span className="font-bold">{row.supplyPressure.label}</span> <span className="text-xs">({row.supplyPressure.multiplier.toFixed(2)}x)</span></p>
              <p className="text-slate-600">Listings: <span className="font-bold">{row.listingCount}</span></p>
              <p className="text-slate-600">Median Ask: <span className="font-bold">{currency(row.medianAsking)}</span></p>
              <p className="text-slate-600">Median Rent/Unit: <span className="font-bold">{currency(row.medianRent)}</span></p>
              <p className="text-slate-600">Your holdings: <span className="font-bold">{row.ownedProperties}</span></p>
              <p className="text-slate-600">Your occupancy: <span className="font-bold">{row.occupancyRate.toFixed(0)}%</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cityListings.length === 0 ? (
          <div className="glass p-4 lg:col-span-2">
            <p className="font-bold text-slate-800">No Active Listings In {selectedCity}</p>
            <p className="text-sm text-slate-600 mt-1">
              {nextListingMonths
                ? `All available properties are currently taken. The next likely listing should appear in about ${nextListingMonths} month${nextListingMonths === 1 ? '' : 's'}.`
                : 'All available properties are currently taken. New listings usually return to market around six months after purchases or when more users move into the city.'}
            </p>
          </div>
        ) : null}
        {cityListings.slice(0, 12).map((listing: any) => {
          const gross = Number(listing.units || 1) * Number(listing.askingRentPerUnit || 0) * 12
          const capRate = listing.askingPrice > 0 ? ((gross * 0.65) / Number(listing.askingPrice || 1)) * 100 : 0
          const listingId = String(listing.id || '')
          const assumptions = getListingAssumptions(listingId)
          const projection = listingPreOfferProjection(listing, assumptions.occupancyRate, assumptions.condition)
          return (
            <div key={listing.id} className="glass p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-800">{listing.templateName}</p>
                  <p className="text-xs text-slate-500">{listing.assetClass || 'Residential'} • {listing.units} units • DOM {listing.dom} • Condition {listing.condition}%</p>
                  <p className="text-xs text-slate-500">Owned since inception: {Math.max(0, Number(listing.ownershipCount || 0))} time{Math.max(0, Number(listing.ownershipCount || 0)) === 1 ? '' : 's'}</p>
                </div>
                <button
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-bold"
                  onClick={() => { void submitOffer(listing) }}
                >
                  Make Offer
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{vocabulary.askingLabel}</p>
                  <p className="font-bold text-slate-800">{currency(listing.askingPrice)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{vocabulary.rentPerUnitLabel}</p>
                  <p className="font-bold text-slate-800">{currency(listing.askingRentPerUnit)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{vocabulary.capRateLabel}</p>
                  <p className="font-bold text-slate-800">{capRate.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2">Amenities: {(listing.amenities || []).join(', ') || 'None listed'}</p>
              <p className="text-xs text-slate-600 mt-1">{vocabulary.incomeModelLabel}: {listing.incomeLabel || 'Monthly Rent'}</p>
              <p className="text-[11px] text-slate-700 mt-1">{listingEducationBlurb(listing, learningLevel, usePlainLanguage)}</p>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                {purchaseMode === 'cash'
                  ? `${vocabulary.estCashRequiredLabel}: ${currency(estimatedCashPurchase(listing))}`
                  : `${vocabulary.estCashToCloseLabel}: ${currency(estimatedMortgageCash(listing))}`}
              </p>
              <div className="mt-3 border border-slate-200 rounded p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-800">{vocabulary.preOfferCalculatorTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                  <label className="text-slate-700 flex items-center gap-2">
                    {vocabulary.occupancyAssumptionLabel}
                    <select
                      value={String(assumptions.occupancyRate)}
                      onChange={(e) => setListingAssumption(listingId, 'occupancyRate', Number(e.target.value))}
                      className="px-2 py-1 rounded border border-slate-300 bg-white"
                    >
                      <option value="0.6">{vocabulary.lowLabel} (60%)</option>
                      <option value="0.8">Base (80%)</option>
                      <option value="0.95">{vocabulary.highLabel} (95%)</option>
                    </select>
                  </label>
                  <label className="text-slate-700 flex items-center gap-2">
                    {vocabulary.conditionAssumptionLabel}
                    <select
                      value={String(assumptions.condition)}
                      onChange={(e) => setListingAssumption(listingId, 'condition', Number(e.target.value))}
                      className="px-2 py-1 rounded border border-slate-300 bg-white"
                    >
                      <option value="45">{vocabulary.lowLabel} (45)</option>
                      <option value="70">Base (70)</option>
                      <option value="90">{vocabulary.highLabel} (90)</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px]">
                  <div className="bg-white rounded p-2">
                    <p className="uppercase text-[10px] text-slate-500">{vocabulary.estOperatingLabel}</p>
                    <p className="font-semibold text-slate-800">{currency(projection.operatingCosts)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="uppercase text-[10px] text-slate-500">{vocabulary.estDebtLabel}</p>
                    <p className="font-semibold text-slate-800">{currency(projection.debtService)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="uppercase text-[10px] text-slate-500">{vocabulary.estNetLabel}</p>
                    <p className={`font-semibold ${projection.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(projection.net)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="uppercase text-[10px] text-slate-500">{vocabulary.estMarginLabel}</p>
                    <p className={`font-semibold ${projection.margin >= 15 ? 'text-emerald-700' : projection.margin >= 5 ? 'text-amber-700' : 'text-rose-700'}`}>{percent(projection.margin)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-2">{vocabulary.estBreakEvenLabel}: <span className="font-semibold">{percent(projection.breakEven)}</span></p>
              </div>
              {listing.foreclosure ? <p className="text-[11px] font-bold text-rose-700 mt-1">{vocabulary.foreclosureLabel}</p> : null}
            </div>
          )
        })}
      </div>

      <div className="glass p-4">
        <h4 className="font-bold">Pending Approvals</h4>
        {deals.length === 0 ? <p className="text-sm text-slate-500 mt-2">No active offers.</p> : (
          <div className="space-y-2 mt-2">
            {deals.map((deal: any) => (
              <div key={deal.id} className="bg-slate-50 rounded p-3 text-sm">
                <p className="font-semibold">{deal?.listing?.templateName} - {deal?.listing?.cityName}</p>
                <p className="text-slate-600">Pipeline: {deal.monthsInPipeline}/{deal.approvalMonthsRequired} months • Down: {Math.round(Number(deal.downPaymentPct || 0) * 100)}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass p-4">
        <h4 className="font-bold">Owned Properties</h4>
        {properties.length === 0 ? <p className="text-sm text-slate-500 mt-2">No investment properties yet.</p> : (
          <div className="space-y-3 mt-2">
            {properties.map((property: any) => {
              const template = realEstateTemplates.find((t) => t.id === property.templateId)
              const openAmenities = (template?.amenityOptions || [])
                .filter((a) => !(property.amenities || []).includes(a))
                .sort((a, b) => Number(amenityImpact[a]?.installCost || 0) - Number(amenityImpact[b]?.installCost || 0))
              const conditionTrend = propertyConditionTrend(property, Number(state.month || 1), Number(state.year || 2026))
              const lastMonth = lastMonthBreakdownByProperty[String(property.id)]
              const grossIncome = Number(lastMonth?.grossIncome ?? 0)
              const operatingCosts = Number(lastMonth?.operatingCosts ?? 0)
              const debtService = Number(lastMonth?.debtService ?? Number(property.monthlyDebtService || 0))
              const netCashflow = Number(lastMonth?.netCashflow ?? property.lastNetCashflow ?? 0)
              const marginPercent = grossIncome > 0 ? (netCashflow / grossIncome) * 100 : -100
              const breakEven = breakEvenOccupancyPercent(property, Number(property.condition || 70))
              const lowOccLowCond = scenarioProjection(property, 0.6, 45)
              const lowOccHighCond = scenarioProjection(property, 0.6, 90)
              const highOccLowCond = scenarioProjection(property, 0.95, 45)
              const highOccHighCond = scenarioProjection(property, 0.95, 90)
              return (
                <div key={property.id} className="bg-slate-50 rounded p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{property.templateName} - {property.cityName}</p>
                    <p className={`font-bold ${Number(property.lastNetCashflow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {vocabulary.netLabel}: {currency(property.lastNetCashflow)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {property.assetClass || 'Residential'} • Occupancy: {property.occupiedUnits}/{property.units} • Value {currency(property.propertyValue)} • Loan {currency(property.loanBalance)} • Condition {Math.round(Number(property.condition || 0))}%
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Financing: {property.purchaseMode === 'cash' ? 'Cash Purchase' : `${property.mortgageTermMonths ? Math.round(property.mortgageTermMonths / 12) : 30}Y Mortgage`} • Income: {property.incomeLabel || 'Monthly Rent'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Ownership count: {Math.max(1, Number(property.ownershipCount || 1))} total owner{Math.max(1, Number(property.ownershipCount || 1)) === 1 ? '' : 's'}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${conditionTrend.tone}`}>
                    Condition trend: {conditionTrend.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {maintenanceEducation.summary}
                  </p>
                  {Number(property.renovationMonthsRemaining || 0) > 0 ? (
                    <p className="text-[11px] text-indigo-700 font-semibold mt-1">
                      Active renovation: {property.renovationPlan || 'Capital Plan'} with about {currency(property.renovationBudgetRemaining)} left to spend.
                    </p>
                  ) : null}

                  <div className="mt-3 bg-white border border-slate-200 rounded p-3">
                    <p className="text-xs font-semibold text-slate-800">{vocabulary.monthlySectionTitle}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-[11px]">
                      <div className="bg-slate-50 rounded p-2">
                        <p className="uppercase text-[10px] text-slate-500">{vocabulary.grossLabel}</p>
                        <p className="font-semibold text-slate-800">{currency(grossIncome)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="uppercase text-[10px] text-slate-500">{vocabulary.operatingLabel}</p>
                        <p className="font-semibold text-slate-800">{currency(operatingCosts)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="uppercase text-[10px] text-slate-500">{vocabulary.debtLabel}</p>
                        <p className="font-semibold text-slate-800">{currency(debtService)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="uppercase text-[10px] text-slate-500">{vocabulary.netLabel}</p>
                        <p className={`font-semibold ${netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(netCashflow)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="uppercase text-[10px] text-slate-500">{vocabulary.marginLabel}</p>
                        <p className={`font-semibold ${marginPercent >= 15 ? 'text-emerald-700' : marginPercent >= 5 ? 'text-amber-700' : 'text-rose-700'}`}>{percent(marginPercent)}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">{vocabulary.breakevenLabel}: <span className="font-semibold">{percent(breakEven)}</span></p>
                  </div>

                  <div className="mt-3 bg-white border border-slate-200 rounded p-3">
                    <p className="text-xs font-semibold text-slate-800">{vocabulary.scenarioSectionTitle}</p>
                    <p className="text-[11px] text-slate-600 mt-1">Rows are occupancy levels. Columns are condition levels.</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                      <div className="bg-slate-50 rounded p-2" />
                      <div className="bg-slate-50 rounded p-2 text-slate-700 font-semibold">{vocabulary.lowLabel} condition</div>
                      <div className="bg-slate-50 rounded p-2 text-slate-700 font-semibold">{vocabulary.highLabel} condition</div>

                      <div className="bg-slate-50 rounded p-2 text-slate-700 font-semibold">{vocabulary.lowLabel} occupancy</div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className={`font-semibold ${lowOccLowCond.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(lowOccLowCond.net)}</p>
                        <p className="text-slate-500">{percent(lowOccLowCond.margin)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className={`font-semibold ${lowOccHighCond.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(lowOccHighCond.net)}</p>
                        <p className="text-slate-500">{percent(lowOccHighCond.margin)}</p>
                      </div>

                      <div className="bg-slate-50 rounded p-2 text-slate-700 font-semibold">{vocabulary.highLabel} occupancy</div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className={`font-semibold ${highOccLowCond.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(highOccLowCond.net)}</p>
                        <p className="text-slate-500">{percent(highOccLowCond.margin)}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className={`font-semibold ${highOccHighCond.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(highOccHighCond.net)}</p>
                        <p className="text-slate-500">{percent(highOccHighCond.margin)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-slate-200"
                        onClick={() => setMaintenance(property.id, 0.8)}
                      >
                        Lean Maintenance
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.leanTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-slate-200"
                        onClick={() => setMaintenance(property.id, 1)}
                      >
                        Balanced Maintenance
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.balancedTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-slate-200"
                        onClick={() => setMaintenance(property.id, 1.2)}
                      >
                        Protective Maintenance
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.protectiveTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-indigo-500 text-white"
                        onClick={() => startRenovation(property.id, 'refresh')}
                        disabled={Number(property.renovationMonthsRemaining || 0) > 0}
                      >
                        Refresh Plan
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.refreshTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-indigo-600 text-white"
                        onClick={() => startRenovation(property.id, 'modernize')}
                        disabled={Number(property.renovationMonthsRemaining || 0) > 0}
                      >
                        Modernize Plan
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.modernizeTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <span className="tooltip-anchor">
                      <button
                        className="px-2 py-1 text-xs rounded bg-indigo-800 text-white"
                        onClick={() => startRenovation(property.id, 'signature')}
                        disabled={Number(property.renovationMonthsRemaining || 0) > 0}
                      >
                        {Number(property.renovationMonthsRemaining || 0) > 0 ? `Renovating (${property.renovationMonthsRemaining} mo)` : 'Signature Reposition'}
                      </button>
                      <span className="tooltip-bubble">{maintenanceEducation.signatureTooltip}<span className="tooltip-caret" /></span>
                    </span>
                    <button className="px-2 py-1 text-xs rounded bg-rose-600 text-white" onClick={() => { void sellInvestmentProperty(property.id) }}>Sell & Relist</button>
                  </div>
                  <details className="mt-3">
                    <summary className="text-[11px] text-slate-500 cursor-pointer select-none hover:text-slate-700">▸ {maintenanceEducation.optionsTitle}</summary>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600 bg-slate-100 rounded p-2">
                      <p><strong>Lean Maintenance</strong> - {maintenanceEducation.leanLine}</p>
                      <p><strong>Balanced Maintenance</strong> - {maintenanceEducation.balancedLine}</p>
                      <p><strong>Protective Maintenance</strong> - {maintenanceEducation.protectiveLine}</p>
                      <p><strong>Refresh Plan</strong> - {maintenanceEducation.refreshLine}</p>
                      <p><strong>Modernize Plan</strong> - {maintenanceEducation.modernizeLine}</p>
                      <p><strong>Signature Reposition</strong> - {maintenanceEducation.signatureLine}</p>
                      <p><strong>Value Recovery Rate</strong> - {maintenanceEducation.valueRecoveryLine}</p>
                    </div>
                  </details>
                  <div className="mt-2 text-xs text-slate-600">Amenities: {(property.amenities || []).map((amenity: string) => titleizeAmenity(amenity)).join(', ') || 'None'}</div>
                  {openAmenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {openAmenities.map((amenity) => {
                        const preqCheck = checkPrerequisitesMet(amenity, property.amenities || [])
                        const impact = amenityImpact[amenity]
                        const canAfford = Number(state.check || 0) >= Number(impact?.installCost || 12000)
                        const isDisabled = !preqCheck.met || !canAfford
                        const title = !preqCheck.met 
                          ? `Requires: ${preqCheck.missing.map(titleizeAmenity).join(', ')}`
                          : !canAfford 
                          ? 'Insufficient funds'
                          : titleizeAmenity(amenity)
                        return (
                          <span key={amenity} className="tooltip-anchor">
                            <button
                              className={`px-2 py-1 text-xs rounded ${isDisabled ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-100 text-emerald-800 cursor-pointer hover:bg-emerald-200'}`}
                              onClick={() => !isDisabled && setProjectionModal({ propertyId: property.id, amenity })}
                              disabled={isDisabled}
                            >
                              {titleizeAmenity(amenity)} • {impact?.upgradeTier || 'core'} • {currency(impact?.installCost || 12000)} • +{Math.round(Number(impact?.valueBoost || 0) * 100)}% value
                              {!preqCheck.met && ` ⚠️ (${preqCheck.missing.map(titleizeAmenity).join(', ')})`}
                            </button>
                            <span className="tooltip-bubble">{title}<span className="tooltip-caret" /></span>
                          </span>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Amenity Projection Modal */}
      {projectionModal && (() => {
        const property = properties.find((p: any) => p.id === projectionModal.propertyId)
        if (!property) return null
        const amenity = projectionModal.amenity
        const impact = amenityImpact[amenity]
        const projection = calculateAmenityProjection(property, amenity)
        const preqCheck = checkPrerequisitesMet(amenity, property.amenities || [])
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setProjectionModal(null)}>
            <div className="bg-white rounded-lg p-6 max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2">{titleizeAmenity(amenity)}</h3>
              <div className="text-xs space-y-2 mb-4 bg-slate-50 p-3 rounded">
                <p><strong>Tier:</strong> {impact?.upgradeTier}</p>
                <p><strong>Install Cost:</strong> {currency(projection.installCost)}</p>
                <p><strong>Immediate Value Gain:</strong> {currency(projection.valueLift)}</p>
                <p><strong>Monthly Rent Boost per Unit:</strong> {currency(projection.rentLift)}</p>
                <p><strong>Total Monthly Boost:</strong> {currency(projection.rentLift * Math.max(1, Number(property.units || 1)))}</p>
                <p><strong>Occupancy Boost:</strong> +{projection.occupancyBoost}%</p>
                <p><strong>Condition Improvement:</strong> +{projection.conditionGain}%</p>
                {projection.paybackMonths !== null && <p><strong>Payback Period:</strong> ~{projection.paybackMonths} months</p>}
              </div>
              {!preqCheck.met && (
                <div className="text-xs bg-amber-50 border border-amber-300 p-2 rounded mb-4">
                  <p className="font-semibold text-amber-900">Prerequisites not installed:</p>
                  <p className="text-amber-800">{preqCheck.missing.map(titleizeAmenity).join(', ')}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1 text-xs rounded bg-slate-300 hover:bg-slate-400" onClick={() => setProjectionModal(null)}>Cancel</button>
                <button 
                  className={`px-3 py-1 text-xs rounded text-white ${preqCheck.met && Number(state.check || 0) >= projection.installCost ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'}`}
                  onClick={() => {
                    if (preqCheck.met && Number(state.check || 0) >= projection.installCost) {
                      addAmenity(property.id, amenity)
                    }
                  }}
                  disabled={!preqCheck.met || Number(state.check || 0) < projection.installCost}
                >
                  Install Now
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
