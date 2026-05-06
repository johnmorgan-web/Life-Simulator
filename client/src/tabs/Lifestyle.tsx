import { useGame } from '../context/GameContext'
import lifestyleExpenses from '../constants/lifestyleExpenses.constants'
import { useEffect, useRef, useState } from 'react'

export default function Lifestyle() {
  const { state, dispatch, buildLedger, getLuxuryServiceMonthlyPay } = useGame()
  const [showHappinessTooltip, setShowHappinessTooltip] = useState(false)
  const [entTierFlash, setEntTierFlash] = useState(false)
  const [subTierFlash, setSubTierFlash] = useState(false)
  const prevEntTierRef = useRef<string | null>(null)
  const prevSubTierRef = useRef<string | null>(null)

  const handleToggleService = (serviceId: string) => {
    const updated = { ...state.luxuryServices, [serviceId]: !state.luxuryServices[serviceId] }
    dispatch({ type: 'SET_STATE', payload: { luxuryServices: updated } })
    buildLedger(0, 0, { ...state, luxuryServices: updated })
  }

  const handleEntertainmentChange = (newAmount: number) => {
    const cap = getMaxEntertainmentBudget()
    const clampedEntertainment = Math.max(0, Math.min(newAmount, cap))
    dispatch({
      type: 'SET_STATE',
      payload: {
        entertainmentSpending: clampedEntertainment
      }
    })
  }

  const handleSubscriptionChange = (newAmount: number) => {
    const cap = getMaxEntertainmentBudget()
    const clampedSubscription = Math.max(0, Math.min(newAmount, cap))
    dispatch({
      type: 'SET_STATE',
      payload: {
        subscriptionEntertainmentSpending: clampedSubscription
      }
    })
  }

  const applyComfortableBudget = () => {
    const cap = getMaxEntertainmentBudget()
    const total = Math.round(netSalary * 0.09)
    const boundedTotal = Math.min(total, cap)
    const entertainment = Math.round(boundedTotal * 0.65)
    const subscriptions = Math.max(0, boundedTotal - entertainment)
    dispatch({
      type: 'SET_STATE',
      payload: {
        entertainmentSpending: entertainment,
        subscriptionEntertainmentSpending: subscriptions
      }
    })
  }

  const getNetSalary = () => {
    const job = state.job
    const grossSalary = job.base * state.city.p
    return Math.round(grossSalary * 0.8) // After 20% taxes
  }

  const netSalary = getNetSalary()
  const portfolioMarketValue = Array.isArray(state.portfolio)
    ? state.portfolio.reduce((sum: number, holding: any) => {
      const shares = Number(holding?.shares || 0)
      const price = Number(state.marketPrices?.[holding?.ticker] || 0)
      return sum + (shares * price)
    }, 0)
    : 0
  const realEstateEquity = Array.isArray(state.investmentProperties)
    ? state.investmentProperties.reduce((sum: number, property: any) => {
      const value = Number(property?.propertyValue || 0)
      const loan = Number(property?.loanBalance || 0)
      return sum + Math.max(0, value - loan)
    }, 0)
    : 0
  const netWorth = Number(state.check || 0)
    + Number(state.savings || 0)
    + portfolioMarketValue
    + realEstateEquity
    - Number(state.debt || 0)
  const getMaxEntertainmentBudget = () => Math.round(netSalary * 0.15)
  const maxEntertainmentBudget = Math.min(150000, getMaxEntertainmentBudget())
  const totalEntertainmentBudget = (state.entertainmentSpending || 0) + (state.subscriptionEntertainmentSpending || 0)
  const happiness = Math.max(0, Math.min(100, Math.round(state.happiness ?? 70)))
  const happinessTone = happiness >= 70 ? 'bg-emerald-500' : happiness >= 45 ? 'bg-amber-500' : 'bg-rose-500'
  const subscriptionStreakMonths = Math.max(0, Math.floor(state.subscriptionStreakMonths || 0))
  const subscriptionBadges = Array.isArray(state.subscriptionBadges) ? state.subscriptionBadges : []
  const entertainmentTicketStubs = Array.isArray(state.entertainmentTicketStubs) ? state.entertainmentTicketStubs : []

  const badgeMilestones = [3, 6, 12, 24]
  const nextBadgeTarget = badgeMilestones.find((months) => months > subscriptionStreakMonths) || null

  const entertainmentOptions = [
    { name: 'Arcade Friday + Pizza', monthlyCost: 30, icon: '🕹️' },
    { name: 'VIP Laser Tag Nights', monthlyCost: 75, icon: '🔫' },
    { name: 'Rent the Trampoline Park', monthlyCost: 100, icon: '🤸' },
    { name: 'Ballpark Gaming Takeover', monthlyCost: 140, icon: '🏟️' },
    { name: 'Private Theme Park After-Hours', monthlyCost: 220, icon: '🎢' },
    { name: 'Chartered Yacht Game Night', monthlyCost: 1200, icon: '🛥️' },
    { name: 'Desert Supercar Treasure Rally', monthlyCost: 5000, icon: '🏎️' },
    { name: 'Stadium Fireworks Spectacular', monthlyCost: 12000, icon: '🎆' },
    { name: 'Private Island Weekend Carnival', monthlyCost: 25000, icon: '🏝️' },
    { name: 'Cruise Ship Esports Festival', monthlyCost: 50000, icon: '🛳️' },
    { name: 'Orbital Zero-Gravity Party', monthlyCost: 90000, icon: '🛰️' },
    { name: 'Lunar Theme Park Buyout', monthlyCost: 150000, icon: '🌕' }
  ]

  const subscriptionOptions = [
    { name: 'Cartoon Vault Max+', monthlyCost: 15, icon: '📺' },
    { name: 'Infinite Game Pass Galaxy', monthlyCost: 20, icon: '🎮' },
    { name: 'No-Ads Music Universe', monthlyCost: 12, icon: '🎧' },
    { name: 'Fancy Pants Club', monthlyCost: 18, icon: '🎩' },
    { name: 'Mega Snack Box of the Month', monthlyCost: 25, icon: '🍿' },
    { name: 'VIP Sticker Crate Air-Dropped Weekly', monthlyCost: 300, icon: '📦' },
    { name: 'Personal Meme Curator Hotline', monthlyCost: 1200, icon: '😂' },
    { name: 'Gold-Plated Controller Rotation', monthlyCost: 5000, icon: '🕹️' },
    { name: 'Celebrity Voice Pack Shoutouts', monthlyCost: 12000, icon: '🎤' },
    { name: 'Private Esports Arena Membership', monthlyCost: 25000, icon: '🏟️' },
    { name: 'Jet-Delivered Midnight Snack Squad', monthlyCost: 50000, icon: '🛩️' },
    { name: 'Orbital Streaming Lounge Access', monthlyCost: 90000, icon: '🛰️' },
    { name: 'Moon Base Family Plan', monthlyCost: 150000, icon: '🌕' }
  ]

  const entertainmentSpend = state.entertainmentSpending || 0
  const subscriptionSpend = state.subscriptionEntertainmentSpending || 0
  const entertainmentPct = netSalary > 0 ? (entertainmentSpend / netSalary) * 100 : 0
  const subscriptionPct = netSalary > 0 ? (subscriptionSpend / netSalary) * 100 : 0

  const getEntertainmentTier = (percent: number) => {
    if (percent <= 1) return { name: 'Bare Minimum', modifier: -1, color: 'text-slate-600' }
    if (percent <= 3) return { name: 'Friday Fun Budget', modifier: 1, color: 'text-emerald-600' }
    if (percent <= 6) return { name: 'Dream Weekend Mode', modifier: 2, color: 'text-emerald-700' }
    if (percent <= 9) return { name: 'No Curfew Lifestyle', modifier: 0, color: 'text-amber-600' }
    if (percent <= 11.5) return { name: 'Rent-the-Mall Energy', modifier: 1, color: 'text-sky-700' }
    if (percent <= 13.5) return { name: 'Ballpark Sleepover League', modifier: 2, color: 'text-violet-700' }
    if (percent <= 15) return { name: 'Theme Park Keys Holder', modifier: 1, color: 'text-fuchsia-700' }
    return { name: 'Overextended', modifier: -2, color: 'text-rose-600' }
  }

  const getSubscriptionTier = (percent: number) => {
    if (percent <= 0.5) return { name: 'Disconnected', modifier: -1, color: 'text-slate-600' }
    if (percent <= 2) return { name: 'After-School Bundle', modifier: 1, color: 'text-emerald-600' }
    if (percent <= 4) return { name: 'Snack + Stream Supreme', modifier: 2, color: 'text-emerald-700' }
    if (percent <= 6) return { name: 'Fancy Pants Club', modifier: 1, color: 'text-amber-600' }
    if (percent <= 8) return { name: 'Golden Controller Society', modifier: 2, color: 'text-sky-700' }
    if (percent <= 10) return { name: 'Ultra Deluxe Dream Bundle', modifier: 2, color: 'text-violet-700' }
    if (percent <= 12) return { name: 'Legendary Kid-At-Heart Pass', modifier: 1, color: 'text-fuchsia-700' }
    return { name: 'Subscription Creep', modifier: -2, color: 'text-rose-600' }
  }

  const entertainmentTier = getEntertainmentTier(entertainmentPct)
  const subscriptionTier = getSubscriptionTier(subscriptionPct)
  const projectedHappinessModifier = entertainmentTier.modifier + subscriptionTier.modifier

  // Happiness modifier breakdown (mirrors GameContext processMonth logic)
  const monthsSinceVehiclePurchase = (() => {
    const garage = Array.isArray(state.garage) ? state.garage : []
    if (garage.length === 0) return 999
    const curMonth = Number(state.month || 1)
    const curYear = Number(state.year || 2025)
    let best = Infinity
    for (const g of garage) {
      if (typeof g.purchaseMonth !== 'number' || typeof g.purchaseYear !== 'number') continue
      const months = (curYear - g.purchaseYear) * 12 + (curMonth - g.purchaseMonth)
      if (months < best) best = months
    }
    return best === Infinity ? 999 : best
  })()
  const luxuryServiceSpend = lifestyleExpenses.luxuryServices.reduce((sum, service) => {
    return (state.luxuryServices as any)?.[service.id] ? sum + Number(getLuxuryServiceMonthlyPay(service.id) || 0) : sum
  }, 0)
  const discretionarySpend = (entertainmentSpend + subscriptionSpend) + luxuryServiceSpend
  const hasDebt = Number(state.debt || 0) > 0
  const lowPayStagnation = Number(state.tenure || 0) >= 12 && netSalary < 3200
  const highPayStress1 = netSalary >= 10000
  const highPayStress2 = netSalary >= 20000
  const staleVehicle = monthsSinceVehiclePurchase > 6
  const lowDiscretionary = discretionarySpend < netSalary * 0.03

  const happinessDebuffs = [
    { label: 'Carrying debt', amount: -5, active: hasDebt },
    { label: 'Low-pay stagnation (12+ mo. tenure & salary < $3,200)', amount: -4, active: lowPayStagnation },
    { label: 'High income stress ($10k+ salary)', amount: -2, active: highPayStress1 },
    { label: 'High income stress ($20k+ salary, stacks)', amount: -2, active: highPayStress2 },
    { label: 'Stale vehicle purchase (no new vehicle in 6+ mo.)', amount: -3, active: staleVehicle },
    { label: 'Underspending on leisure (<3% of income)', amount: -2, active: lowDiscretionary },
    { label: 'Entertainment underspend (Bare Minimum tier)', amount: -1, active: entertainmentTier.modifier < 0 },
    { label: 'Subscription overspend (Subscription Creep tier)', amount: -2, active: subscriptionTier.modifier < 0 },
  ]
  const happinessBuffs = [
    { label: 'Housekeeper service', amount: 2, active: !!state.luxuryServices?.housekeeper },
    { label: 'Concierge service', amount: 3, active: !!state.luxuryServices?.concierge },
    { label: 'Personal trainer service', amount: 1, active: !!state.luxuryServices?.trainer },
    { label: 'Therapist service (offsets ~85% of debuffs + 1)', amount: null as number | null, active: !!state.luxuryServices?.therapist },
    { label: `Entertainment tier: ${entertainmentTier.name}`, amount: entertainmentTier.modifier, active: entertainmentTier.modifier > 0 },
    { label: `Subscription tier: ${subscriptionTier.name}`, amount: subscriptionTier.modifier, active: subscriptionTier.modifier > 0 },
    {
      label: `Promotion/new higher-pay job momentum (${Math.max(0, Number(state.jobUpgradeBoostMonths || 0))} mo left)`,
      amount: 8,
      active: Number(state.jobUpgradeBoostMonths || 0) > 0,
    },
    {
      label: `Pay raise momentum (${Math.max(0, Number(state.payRaiseBoostMonths || 0))} mo left)`,
      amount: 5,
      active: Number(state.payRaiseBoostMonths || 0) > 0,
    },
    {
      label: `Recent credential momentum (${Math.max(0, Number(state.credentialBoostMonths || 0))} mo left)`,
      amount: 4,
      active: Number(state.credentialBoostMonths || 0) > 0,
    },
    {
      label: `Perfect check month (${Math.max(0, Number(state.perfectChecksBoostMonths || 0))} mo left)`,
      amount: 3,
      active: Number(state.perfectChecksBoostMonths || 0) > 0,
    },
  ]
  const totalActiveDebuffs = happinessDebuffs.filter(d => d.active).reduce((s, d) => s + d.amount, 0)
  const therapistOffset = state.luxuryServices?.therapist ? Math.floor(Math.abs(totalActiveDebuffs) * 0.85) + 1 : 0
  const netHappinessDelta = happinessDebuffs.filter(d => d.active).reduce((s, d) => s + d.amount, 0)
    + happinessBuffs.filter(b => b.active && b.amount !== null).reduce((s, b) => s + (b.amount ?? 0), 0)
    + therapistOffset

  const entertainmentTierBlurb: Record<string, string> = {
    'Bare Minimum': 'A single snack and a strong imagination are carrying this month.',
    'Friday Fun Budget': 'Enough for regular fun without derailing the budget plan.',
    'Dream Weekend Mode': 'Weekends feel like mini-vacations with room to breathe.',
    'No Curfew Lifestyle': 'Plans are plentiful, calendar is packed, vibes are high.',
    'Rent-the-Mall Energy': 'You are one confident group chat away from chaos.',
    'Ballpark Sleepover League': 'The group chat thinks you own a stadium now.',
    'Theme Park Keys Holder': 'Somehow this feels normal now. It should not.',
    'Overextended': 'The fun is legendary, the accountant is sobbing.'
  }

  const subscriptionTierBlurb: Record<string, string> = {
    'Disconnected': 'Only free trials and borrowed passwords survived this month.',
    'After-School Bundle': 'Core subscriptions active. Good times, low stress.',
    'Snack + Stream Supreme': 'Peak couch setup achieved.',
    'Fancy Pants Club': 'Monocle optional, dramatic playlist required.',
    'Golden Controller Society': 'Your queue is immaculate and your wallet knows.',
    'Ultra Deluxe Dream Bundle': 'Every service says "Welcome back, boss."',
    'Legendary Kid-At-Heart Pass': 'The childhood wishlist has become policy.',
    'Subscription Creep': 'You subscribed to things you cannot even remember.'
  }

  const getMilestones = (options: { name: string; monthlyCost: number; icon: string }[]) => {
    let running = 0
    return options.map((option) => {
      running += option.monthlyCost
      return { ...option, threshold: running }
    })
  }

  const entertainmentMilestones = getMilestones(entertainmentOptions)
  const subscriptionMilestones = getMilestones(subscriptionOptions)

  const getActiveCount = (budget: number, options: { monthlyCost: number }[]) => {
    let running = 0
    let count = 0
    for (const option of options) {
      running += option.monthlyCost
      if (budget >= running) count += 1
    }
    return count
  }

  const activeEntertainmentCount = getActiveCount(entertainmentSpend, entertainmentOptions)
  const activeSubscriptionCount = getActiveCount(subscriptionSpend, subscriptionOptions)

  const monthlyLuxuryServicesCost = luxuryServiceSpend

  useEffect(() => {
    if (!prevEntTierRef.current) {
      prevEntTierRef.current = entertainmentTier.name
      return
    }
    if (prevEntTierRef.current !== entertainmentTier.name) {
      prevEntTierRef.current = entertainmentTier.name
      setEntTierFlash(true)
      const t = setTimeout(() => setEntTierFlash(false), 450)
      return () => clearTimeout(t)
    }
  }, [entertainmentTier.name])

  useEffect(() => {
    if (!prevSubTierRef.current) {
      prevSubTierRef.current = subscriptionTier.name
      return
    }
    if (prevSubTierRef.current !== subscriptionTier.name) {
      prevSubTierRef.current = subscriptionTier.name
      setSubTierFlash(true)
      const t = setTimeout(() => setSubTierFlash(false), 450)
      return () => clearTimeout(t)
    }
  }, [subscriptionTier.name])

  return (
    <div className="space-y-8">
      {/* Current Lifestyle Info */}
          <div className="glass p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">📊 Current Lifestyle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Monthly Income</p>
                <p className="text-xl font-bold text-emerald-600">${netSalary.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Luxury Services</p>
                <p className="text-xl font-bold text-blue-600">${monthlyLuxuryServicesCost.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-1">Auto-calculated from hired services</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Current Job</p>
                <p className="text-lg font-bold text-slate-800">{state.job.title}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Happiness</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-slate-800">{happiness}%</p>
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowHappinessTooltip(true)}
                      onMouseLeave={() => setShowHappinessTooltip(false)}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold cursor-help"
                    >
                      ?
                    </button>
                    {showHappinessTooltip && (
                      <div className="absolute z-50 top-full mt-2 left-0 sm:left-auto sm:right-0 w-80 max-w-[calc(100vw-1rem)] rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed p-3 shadow-xl whitespace-normal break-words">
                        <p className="font-bold mb-2">Monthly Happiness Modifiers</p>

                        <p className="text-[10px] font-bold uppercase text-rose-400 mb-1">Debuffs</p>
                        <div className="space-y-0.5 mb-2">
                          {happinessDebuffs.map((d, i) => (
                            <div key={i} className={`flex justify-between gap-2 ${d.active ? 'text-rose-300' : 'text-slate-500'}`}>
                              <span>{d.active ? '▸' : '○'} {d.label}</span>
                              <span className="shrink-0 font-bold">{d.active ? d.amount : '—'}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] font-bold uppercase text-emerald-400 mb-1">Buffs</p>
                        <div className="space-y-0.5 mb-2">
                          {happinessBuffs.map((b, i) => (
                            <div key={i} className={`flex justify-between gap-2 ${b.active ? 'text-emerald-300' : 'text-slate-500'}`}>
                              <span>{b.active ? '▸' : '○'} {b.label}</span>
                              <span className="shrink-0 font-bold">
                                {b.active
                                  ? b.amount === null
                                    ? `+${therapistOffset}`
                                    : b.amount > 0 ? `+${b.amount}` : b.amount
                                  : '—'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-700 pt-1.5 mt-1">
                          <div className={`flex justify-between font-bold ${netHappinessDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span>Estimated net this month</span>
                            <span>{netHappinessDelta >= 0 ? '+' : ''}{netHappinessDelta}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div className={`${happinessTone} h-2 rounded-full`} style={{ width: `${happiness}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Collectibles */}
          <div>
            <h3 className="font-bold text-lg mb-4">🏆 Collectibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Subscription Badges</p>
                    <p className="text-sm text-slate-600">Earned by maintaining monthly subscription spending.</p>
                  </div>
                  <span className="text-2xl">🎖️</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-2">Current streak: {subscriptionStreakMonths} month{subscriptionStreakMonths === 1 ? '' : 's'}</p>
                {nextBadgeTarget ? (
                  <p className="text-xs text-slate-600 mb-3">Next badge at {nextBadgeTarget} months ({Math.max(0, nextBadgeTarget - subscriptionStreakMonths)} to go).</p>
                ) : (
                  <p className="text-xs text-emerald-700 mb-3 font-bold">All badge milestones unlocked.</p>
                )}

                {subscriptionBadges.length > 0 ? (
                  <div className="space-y-2">
                    {subscriptionBadges
                      .slice()
                      .sort((a: any, b: any) => (a.months || 0) - (b.months || 0))
                      .map((badge: any) => (
                        <div key={badge.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                          <p className="text-sm font-bold text-emerald-800">{badge.icon} {badge.name}</p>
                          <p className="text-[11px] text-emerald-700">{badge.months} month streak • {badge.awardedMonth}/{badge.awardedYear}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No badges yet. Keep at least one active subscription each month to build your streak.</p>
                )}
              </div>

              <div className="glass p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Ticket Stubs</p>
                    <p className="text-sm text-slate-600">Collected when your entertainment budget hosts multiple events in a month.</p>
                  </div>
                  <span className="text-2xl">🎟️</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-2">Collected: {entertainmentTicketStubs.length}</p>

                {entertainmentTicketStubs.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {entertainmentTicketStubs.slice(0, 8).map((stub: any) => (
                      <div key={stub.id} className="bg-sky-50 border border-sky-200 rounded-lg p-2">
                        <p className="text-sm font-bold text-sky-800">{stub.icon} {stub.title}</p>
                        <p className="text-[11px] text-sky-700">Hosted {stub.hostedCount} events • {stub.month}/{stub.year}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No ticket stubs yet. Raise entertainment spending enough to host at least 2 events in a month.</p>
                )}
              </div>
            </div>
          </div>

          {/* Luxury Services Section */}
          <div>
            <h3 className="font-bold text-lg mb-4">✨ Luxury Services</h3>
            <div className="grid grid-cols-2 gap-4">
              {lifestyleExpenses.luxuryServices.map(service => {
                const isActive = (state.luxuryServices as any)[service.id]
                const monthlyServicePay = Number(getLuxuryServiceMonthlyPay(service.id) || 0)
                const canAfford = netSalary >= service.minSalary
                const netWorthGateMet = service.id !== 'accountant' || netWorth >= 50000000
                const canHire = canAfford && netWorthGateMet
                const affordabilityPercent = netSalary > 0 ? Math.round((monthlyServicePay / netSalary) * 100) : 0

                return (
                  <div
                    key={service.id}
                    className={`glass p-4 transition-all ${isActive ? 'ring-2 ring-emerald-500' : ''} ${!canHire && !isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-2xl mb-1">{service.icon}</p>
                        <h4 className="font-bold text-sm">{service.name}</h4>
                        <p className="text-[10px] text-slate-600 mt-1">{service.description}</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-3">
                      <p className="text-xs font-bold text-slate-700">
                        ${monthlyServicePay.toLocaleString()}/mo ({affordabilityPercent}% of income)
                      </p>
                      {service.id === 'accountant' ? (
                        <p className="text-[10px] text-slate-500 mb-2">
                          Requires: $50,000,000 net worth (current: ${Math.max(0, Math.round(netWorth)).toLocaleString()})
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 mb-2">
                          Requires: ${service.minSalary.toLocaleString()}/mo
                        </p>
                      )}
                      <button
                        onClick={() => handleToggleService(service.id)}
                        disabled={!isActive && !canHire}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : canHire
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isActive ? '✓ Hired' : canHire ? 'Hire' : service.id === 'accountant' && !netWorthGateMet ? 'Locked (Need $50M Net Worth)' : 'Unaffordable'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Entertainment & Subscriptions */}
          <div>
            <h3 className="font-bold text-lg mb-4">🎬 Entertainment & Subscriptions</h3>
            <div className="glass p-6">
              <p className="text-sm text-slate-600 mb-4">Set entertainment and subscription budgets separately. Tiers and projected happiness effects update as you slide.</p>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 block">
                  Entertainment Spending: ${Math.round(state.entertainmentSpending || 0)}
                </label>
                <div className="flex flex-wrap gap-2">
                  {entertainmentOptions.map((option, idx) => {
                    const active = idx < activeEntertainmentCount
                    return (
                      <div key={option.name} className="tooltip-anchor">
                        <div
                          className={`px-2 py-1 rounded-lg text-xs border transition ${active ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                        >
                          <span className="mr-1">{option.icon}</span>{option.name}
                        </div>
                        <span className="tooltip-bubble">
                          {option.name} (~${option.monthlyCost}/mo)
                          <span className="tooltip-caret" />
                        </span>
                      </div>
                    )
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxEntertainmentBudget}
                  step="5"
                  value={Math.round(state.entertainmentSpending || 0)}
                  onChange={e => handleEntertainmentChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {entertainmentOptions.map((option, idx) => {
                    const active = idx < activeEntertainmentCount
                    return (
                      <span key={`ent-icon-${option.name}`} className="tooltip-anchor">
                        <span
                          className={`text-base transition ${active ? 'opacity-100 drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]' : 'opacity-35'}`}
                        >
                          {option.icon}
                        </span>
                        <span className="tooltip-bubble">
                          {option.name} (~${option.monthlyCost}/mo)
                          <span className="tooltip-caret" />
                        </span>
                      </span>
                    )
                  })}
                </div>
                <div className="relative h-10 mt-1">
                  {entertainmentMilestones.map((option, idx) => {
                    const threshold = Math.min(maxEntertainmentBudget, option.threshold)
                    const left = maxEntertainmentBudget > 0 ? (threshold / maxEntertainmentBudget) * 100 : 0
                    const active = idx < activeEntertainmentCount
                    return (
                      <div
                        key={option.name}
                        className={`tooltip-anchor absolute -translate-x-1/2 top-0 transition-all ${active ? 'opacity-100 scale-110' : 'opacity-35 scale-100'}`}
                        style={{ left: `${left}%` }}
                      >
                        <div className={`text-base ${active ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]' : ''}`}>{option.icon}</div>
                        <span className="tooltip-bubble">
                          {option.name} (~${option.monthlyCost}/mo)
                          <span className="tooltip-caret" />
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className={`text-[11px] font-bold ${entertainmentTier.color}`}>
                  Entertainment Tier: {entertainmentTier.name} ({entertainmentPct.toFixed(1)}% of salary, modifier {entertainmentTier.modifier >= 0 ? '+' : ''}{entertainmentTier.modifier})
                </p>
                <p className={`text-[11px] ${entTierFlash ? 'tier-flash-emerald' : 'text-slate-600'}`}>
                  {entertainmentTierBlurb[entertainmentTier.name] || 'Leisure tier adjusted.'}
                </p>

                <label className="text-sm font-bold text-slate-700 block mt-3">
                  Subscription Entertainment: ${Math.round(state.subscriptionEntertainmentSpending || 0)}
                </label>
                <div className="flex flex-wrap gap-2">
                  {subscriptionOptions.map((option, idx) => {
                    const active = idx < activeSubscriptionCount
                    return (
                      <div key={option.name} className="tooltip-anchor">
                        <div
                          className={`px-2 py-1 rounded-lg text-xs border transition ${active ? 'bg-sky-100 border-sky-400 text-sky-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                        >
                          <span className="mr-1">{option.icon}</span>{option.name}
                        </div>
                        <span className="tooltip-bubble">
                          {option.name} (~${option.monthlyCost}/mo)
                          <span className="tooltip-caret" />
                        </span>
                      </div>
                    )
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxEntertainmentBudget}
                  step="5"
                  value={Math.round(state.subscriptionEntertainmentSpending || 0)}
                  onChange={e => handleSubscriptionChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="relative h-10 mt-1">
                  {subscriptionMilestones.map((option, idx) => {
                    const threshold = Math.min(maxEntertainmentBudget, option.threshold)
                    const left = maxEntertainmentBudget > 0 ? (threshold / maxEntertainmentBudget) * 100 : 0
                    const active = idx < activeSubscriptionCount
                    return (
                      <div
                        key={option.name}
                        className={`tooltip-anchor absolute -translate-x-1/2 top-0 transition-all ${active ? 'opacity-100 scale-110' : 'opacity-35 scale-100'}`}
                        style={{ left: `${left}%` }}
                      >
                        <div className={`text-base ${active ? 'drop-shadow-[0_0_6px_rgba(59,130,246,0.9)]' : ''}`}>{option.icon}</div>
                        <span className="tooltip-bubble">
                          {option.name} (~${option.monthlyCost}/mo)
                          <span className="tooltip-caret" />
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className={`text-[11px] font-bold ${subscriptionTier.color}`}>
                  Subscription Tier: {subscriptionTier.name} ({subscriptionPct.toFixed(1)}% of salary, modifier {subscriptionTier.modifier >= 0 ? '+' : ''}{subscriptionTier.modifier})
                </p>
                <p className={`text-[11px] ${subTierFlash ? 'tier-flash-sky' : 'text-slate-600'}`}>
                  {subscriptionTierBlurb[subscriptionTier.name] || 'Subscription tier adjusted.'}
                </p>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>$0</span>
                  <span>${maxEntertainmentBudget} (15% cap for this slider)</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  Total planned entertainment + subscriptions: ${Math.round(totalEntertainmentBudget)} per month.
                  The game auto-adjusts both amounts each month, and each slider can go up to 15% of net salary independently.
                </p>
                <p className={`text-[11px] font-bold ${projectedHappinessModifier >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Combined leisure happiness modifier: {projectedHappinessModifier >= 0 ? '+' : ''}{projectedHappinessModifier}
                </p>
                <button onClick={applyComfortableBudget} className="py-2 px-3 rounded bg-emerald-600 text-white text-xs font-bold">
                  Reset to Comfortable Budget
                </button>
              </div>
            </div>
          </div>

          {/* Lifestyle Guide */}
          <div className="glass p-6 bg-blue-50 border border-blue-200">
            <h4 className="font-bold text-sm mb-2">💡 Lifestyle Tips</h4>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>• Rent/mortgage costs 25% of your net salary - higher paying jobs = more luxurious neighborhoods</li>
              <li>• Food costs scale with location and salary level</li>
              <li>• Personal Chef eliminates food costs entirely</li>
              <li>• Personal Chauffeur eliminates transit and vehicle gas/maintenance charges</li>
              <li>• Personal Trainer lowers your chance of missing work</li>
              <li>• Personal Therapist can trigger random rainbow moments and offset most monthly mood debuffs</li>
              <li>• Housekeeper + Concierge improve monthly happiness</li>
              <li>• Happiness drops from debt, long low-pay stagnation, high-pay stress, stale purchases, and ultra-tight spending</li>
              <li>• Entertainment and subscriptions are discretionary, auto-adjusted monthly, and each capped at 15% of net salary</li>
              <li>• Luxury services require minimum salary thresholds to afford</li>
            </ul>
          </div>
        </div>
      )
    }
