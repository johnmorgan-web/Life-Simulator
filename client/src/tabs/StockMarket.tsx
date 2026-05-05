import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { stockMarketAssets, stockMarketGlossary, autoInvestProfiles } from '../constants/stockMarket.constants'

type LearningLevel = 'elementary' | 'middle-school' | 'high-school' | 'adult'

function roundShareQuantity(value: number) {
  return Math.round(value * 1000) / 1000
}

function formatShareQuantity(value: number) {
  return roundShareQuantity(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function toCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function recommendationClasses(recommendation?: string) {
  if (recommendation === 'Buy') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (recommendation === 'Sell') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function generateRecommendation(asset: any, price: number, prevPrice: number, portfolioValue: number, positionValue: number) {
  const momentumPct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0
  const premiumToBasePct = asset.basePrice > 0 ? ((price - asset.basePrice) / asset.basePrice) * 100 : 0
  const isETF = asset.sector === 'ETF'
  const concentrationPct = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : 0
  const sectorSentiment: Record<string, { score: number; note: string }> = {
    Technology: { score: 0.45, note: 'tech leadership remains strong' },
    Semiconductors: { score: 0.55, note: 'chip demand remains a leadership theme' },
    ETF: { score: 0.3, note: 'broad index exposure remains well supported' },
    Financials: { score: 0.05, note: 'financials look solid but less explosive' },
    'Consumer Staples': { score: -0.05, note: 'defensive staples are steady, not fast growers' },
    Energy: { score: -0.25, note: 'energy leadership looks less durable after a strong run' },
    Automotive: { score: 0.1, note: 'auto innovation is appealing but execution risk stays high' },
    'Communication Services': { score: 0.05, note: 'communications is mixed with selective strength' },
    Consumer: { score: 0.15, note: 'consumer platforms still have growth support' }
  }

  let score = 0
  const reasons: string[] = []

  const sectorView = sectorSentiment[asset.sector]
  if (sectorView) {
    score += sectorView.score
    reasons.push(sectorView.note)
  }

  if (asset.drift >= 0.01) {
    score += 1.1
    reasons.push('strong long-term drift')
  } else if (asset.drift >= 0.006) {
    score += 0.6
    reasons.push('positive trend profile')
  } else if (asset.drift <= 0.004) {
    score -= 0.35
    reasons.push('slower expected growth')
  }

  if (momentumPct <= -4 && asset.drift >= 0.007) {
    score += 0.9
    reasons.push('recent pullback in a stronger name')
  } else if (momentumPct >= 6) {
    score -= 0.7
    reasons.push('recent run-up may be overheated')
  } else if (momentumPct >= 2) {
    score -= 0.2
    reasons.push('price already moved higher recently')
  }

  // Strong one-month moves act like a simplified earnings/repricing signal.
  if (momentumPct >= 9 && asset.drift >= 0.008) {
    score += 0.35
    reasons.push('breakout momentum is still being rewarded')
  } else if (momentumPct <= -9) {
    score -= 0.45
    reasons.push('sharp downside move suggests a weaker near-term setup')
  }

  if (premiumToBasePct <= -8) {
    score += 0.8
    reasons.push('trading below base anchor')
  } else if (premiumToBasePct >= 18) {
    score -= 0.9
    reasons.push('well above base anchor')
  } else if (premiumToBasePct >= 8) {
    score -= 0.35
    reasons.push('some valuation stretch')
  }

  if (asset.volatility >= 0.12) {
    score -= 0.45
    reasons.push('high volatility')
  } else if (asset.volatility <= 0.055) {
    score += 0.2
    reasons.push('more stable price behavior')
  }

  if (isETF) {
    score += 0.35
    reasons.push('broad diversification support')
  }

  if (concentrationPct >= 35) {
    score -= 1
    reasons.push('your portfolio is already heavily concentrated here')
  } else if (concentrationPct >= 20) {
    score -= 0.45
    reasons.push('position size is already large in your portfolio')
  } else if (concentrationPct > 0 && concentrationPct <= 8 && score > 0.5) {
    score += 0.15
    reasons.push('current exposure is still modest')
  }

  let recommendation: 'Buy' | 'Hold' | 'Sell' = 'Hold'
  if (score >= 1.35) recommendation = 'Buy'
  else if (score <= -0.75) recommendation = 'Sell'

  const thesis = reasons.length
    ? `${reasons.slice(0, 2).join('; ')}.`
    : 'Mixed signal with no strong edge right now.'

  return { recommendation, thesis, score, momentumPct, premiumToBasePct }
}

export default function StockMarket() {
  const { state, dispatch, saveGame } = useGame()
  const [shareInputs, setShareInputs] = useState<Record<string, number>>({})

  const marketPrices = state.marketPrices || {}
  const previousPrices = state.marketPricesPrevious || {}
  const portfolio = Array.isArray(state.portfolio) ? state.portfolio : []

  const learningLevel: LearningLevel = state.learningLevel || state.marketLearningLevel || state.realEstateLearningLevel || 'adult'
  const usePlainLanguage = Boolean(state.usePlainLanguage ?? state.marketUsePlainLanguage ?? state.realEstateUsePlainLanguage)
  const autoInvest = state.autoInvest || { enabled: false, monthlyAmount: 0, profileId: 'balanced' }
  const [autoInvestDraft, setAutoInvestDraft] = useState(autoInvest)

  useEffect(() => {
    setAutoInvestDraft(autoInvest)
  }, [autoInvest.enabled, autoInvest.monthlyAmount, autoInvest.profileId])

  const selectedAutoProfile = autoInvestProfiles.find(p => p.id === autoInvestDraft.profileId) || autoInvestProfiles[1]
  const autoInvestDirty =
    autoInvest.enabled !== autoInvestDraft.enabled ||
    Number(autoInvest.monthlyAmount || 0) !== Number(autoInvestDraft.monthlyAmount || 0) ||
    autoInvest.profileId !== autoInvestDraft.profileId

  const confirmAutoInvestSettings = () => {
    dispatch({ type: 'SET_STATE', payload: { autoInvest: autoInvestDraft } })
    setTimeout(() => {
      saveGame()
    }, 60)
  }

  const resetAutoInvestSettings = () => {
    setAutoInvestDraft(autoInvest)
  }

  const holdingsByTicker = useMemo(() => {
    const map: Record<string, any> = {}
    for (const h of portfolio) map[h.ticker] = h
    return map
  }, [portfolio])

  const portfolioStats = useMemo(() => {
    let costBasis = 0
    let marketValue = 0
    for (const h of portfolio) {
      const shares = Number(h.shares || 0)
      const avgCost = Number(h.avgCost || 0)
      const price = Number(marketPrices[h.ticker] || 0)
      costBasis += shares * avgCost
      marketValue += shares * price
    }
    const gain = marketValue - costBasis
    return { costBasis, marketValue, gain }
  }, [portfolio, marketPrices])

  const signalsByTicker = useMemo(() => {
    const map: Record<string, ReturnType<typeof generateRecommendation>> = {}
    for (const asset of stockMarketAssets) {
      const price = Number(marketPrices[asset.ticker] || asset.basePrice)
      const prevPrice = Number(previousPrices[asset.ticker] || price)
      const holding = holdingsByTicker[asset.ticker]
      const positionValue = Number(holding?.shares || 0) * price
      map[asset.ticker] = generateRecommendation(asset, price, prevPrice, portfolioStats.marketValue, positionValue)
    }
    return map
  }, [marketPrices, previousPrices, holdingsByTicker, portfolioStats.marketValue])

  const topIdeas = useMemo(() => {
    return stockMarketAssets
      .map((asset) => ({ asset, signal: signalsByTicker[asset.ticker] }))
      .sort((a, b) => Number(b.signal?.score || 0) - Number(a.signal?.score || 0))
      .slice(0, 5)
  }, [signalsByTicker])

  const handleBuy = (ticker: string) => {
    const shares = Math.max(0, roundShareQuantity(Number(shareInputs[ticker] || 0)))
    if (shares <= 0) return
    const signal = signalsByTicker[ticker]
    if (signal?.recommendation === 'Sell') {
      const proceed = window.confirm(`This stock is currently rated SELL (${ticker}). Continue with this buy anyway?`)
      if (!proceed) return
    }
    dispatch({ type: 'BUY_STOCK', payload: { ticker, shares } })
  }

  const handleSell = (ticker: string) => {
    const shares = Math.max(0, roundShareQuantity(Number(shareInputs[ticker] || 0)))
    if (shares <= 0) return
    dispatch({ type: 'SELL_STOCK', payload: { ticker, shares } })
  }

  return (
    <div className="space-y-6">
      <div className="glass p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">📈 Stock Market</h2>
        <p className="text-sm text-slate-600">Invest in public companies, monitor your portfolio, and learn market vocabulary at your preferred level.</p>
      </div>

      <div className="glass p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Cash Available</p>
          <p className="text-xl font-bold text-emerald-700">{toCurrency(state.check || 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Portfolio Value</p>
          <p className="text-xl font-bold text-slate-800">{toCurrency(portfolioStats.marketValue)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Cost Basis</p>
          <p className="text-xl font-bold text-slate-800">{toCurrency(portfolioStats.costBasis)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Unrealized P/L</p>
          <p className={`text-xl font-bold ${portfolioStats.gain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {portfolioStats.gain >= 0 ? '+' : ''}{toCurrency(portfolioStats.gain)}
          </p>
        </div>
      </div>

      <div className="glass p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-3">🤖 Automatic Portfolio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <label className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-700 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!autoInvestDraft.enabled}
              onChange={(e) => setAutoInvestDraft((prev: any) => ({ ...prev, enabled: e.target.checked }))}
            />
            Enable monthly auto-invest
          </label>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Monthly Amount</p>
            <input
              type="number"
              min="0"
              step="25"
              value={autoInvestDraft.monthlyAmount || 0}
              onChange={(e) => setAutoInvestDraft((prev: any) => ({ ...prev, monthlyAmount: Math.max(0, Number(e.target.value) || 0) }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Portfolio Profile</p>
            <select
              value={autoInvestDraft.profileId || 'balanced'}
              onChange={(e) => setAutoInvestDraft((prev: any) => ({ ...prev, profileId: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              {autoInvestProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name} ({profile.risk})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
          <button
            onClick={confirmAutoInvestSettings}
            disabled={!autoInvestDirty}
            className={`px-3 py-2 rounded text-xs font-bold ${autoInvestDirty ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            Confirm Auto-Invest Settings
          </button>
          <button
            onClick={resetAutoInvestSettings}
            disabled={!autoInvestDirty}
            className={`px-3 py-2 rounded text-xs font-bold ${autoInvestDirty ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            Reset
          </button>
          {autoInvestDirty ? (
            <span className="text-xs text-amber-700 font-bold self-center">Unconfirmed changes</span>
          ) : (
            <span className="text-xs text-slate-500 self-center">Settings confirmed</span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
          <p className="font-bold mb-1">Current Plan: {selectedAutoProfile.name} ({selectedAutoProfile.risk} risk)</p>
          <p className="text-xs text-slate-600 mb-2">{selectedAutoProfile.description}</p>
          <p className="text-xs text-slate-600">
            Allocations: {Object.entries(selectedAutoProfile.allocations).map(([ticker, weight]) => `${ticker} ${Math.round(Number(weight) * 100)}%`).join(' | ')}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Auto-invest runs when you begin the next month, and manual buy/sell stays available anytime.
          </p>
        </div>
      </div>

      <div className="glass p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
          <label className="text-sm font-bold text-slate-600">Learning level:</label>
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
            className="p-2 border rounded w-full sm:w-auto"
          >
            <option value="elementary">Elementary</option>
            <option value="middle-school">Middle School</option>
            <option value="high-school">High School</option>
            <option value="adult">Adult</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 sm:ml-2">
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
            Translate into common words
          </label>
        </div>

        <h3 className="font-bold text-lg mb-3">Market Terms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stockMarketGlossary.map((entry) => (
            <div key={entry.term} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-bold text-slate-900">{entry.term}</p>
              <p className="text-sm text-slate-600 mt-1">
                {usePlainLanguage ? entry.plain : entry.levels[learningLevel]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-3">⭐ Top Ideas</h3>
        <p className="text-xs text-slate-500 mb-3">Ranked by current model score using drift, volatility, momentum, valuation gap, and your concentration risk.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 mb-2">
          {topIdeas.map(({ asset, signal }) => (
            <div key={`idea-${asset.ticker}`} className="bg-slate-50 border border-slate-200 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{asset.icon} {asset.ticker}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${recommendationClasses(signal?.recommendation)}`}>
                  {signal?.recommendation || 'Hold'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Score: {Number(signal?.score || 0).toFixed(2)}</p>
              <p className="text-[11px] text-slate-500 mt-1">{signal?.thesis}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-3">Trade Desk</h3>
        <p className="text-xs text-slate-500 mb-3">Orders may fill slightly above or below quote prices to simulate ceiling/floor executions.</p>
        <p className="text-xs text-slate-500 mb-3">Share quantity supports fractional trades up to 0.001 shares.</p>
        <div className="space-y-3">
          {stockMarketAssets.map((asset) => {
            const price = Number(marketPrices[asset.ticker] || asset.basePrice)
            const prevPrice = Number(previousPrices[asset.ticker] || price)
            const pct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0
            const holding = holdingsByTicker[asset.ticker]
            const ownedShares = Number(holding?.shares || 0)
            const avgCost = Number(holding?.avgCost || 0)
            const investedAmount = ownedShares * avgCost
            const positionValue = ownedShares * price
            const positionGain = positionValue - investedAmount
            const positionGainPct = investedAmount > 0 ? (positionGain / investedAmount) * 100 : 0
            const inputShares = Number(shareInputs[asset.ticker] || 0)
            const estimatedCost = Math.max(0, roundShareQuantity(inputShares)) * price
            const signal = signalsByTicker[asset.ticker] || generateRecommendation(asset, price, prevPrice, portfolioStats.marketValue, positionValue)

            return (
              <div key={asset.ticker} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{asset.icon} {asset.ticker} - {asset.company}</p>
                    <p className="text-xs text-slate-500">{asset.sector}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{toCurrency(price)}</p>
                    <p className={`text-xs font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}% vs last month
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-bold ${recommendationClasses(signal.recommendation)}`}>
                    {signal.recommendation}
                  </span>
                  <span className="text-xs text-slate-600">{signal.thesis}</span>
                </div>

                <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Drift: {(asset.drift * 100).toFixed(1)}%</span>
                  <span>Volatility: {(asset.volatility * 100).toFixed(1)}%</span>
                  <span>Base Gap: {signal.premiumToBasePct >= 0 ? '+' : ''}{signal.premiumToBasePct.toFixed(1)}%</span>
                  <span>Portfolio Weight: {portfolioStats.marketValue > 0 ? `${((positionValue / portfolioStats.marketValue) * 100).toFixed(1)}%` : '0.0%'}</span>
                </div>

                <div className="mt-2 text-xs text-slate-600">
                  Owned: <span className="font-bold">{formatShareQuantity(ownedShares)} shares</span>
                  {' '}| Position Value: <span className="font-bold">{toCurrency(positionValue)}</span>
                </div>

                <div className="mt-1 text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    Invested: <span className="font-bold">{toCurrency(investedAmount)}</span>
                  </span>
                  <span>
                    Avg Cost: <span className="font-bold">{ownedShares > 0 ? toCurrency(avgCost) : '--'}</span>
                  </span>
                  <span className={ownedShares > 0 ? (positionGain >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold') : ''}>
                    Gain Over Time: {ownedShares > 0 ? `${positionGain >= 0 ? '+' : ''}${toCurrency(positionGain)} (${positionGain >= 0 ? '+' : ''}${positionGainPct.toFixed(2)}%)` : '--'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={shareInputs[asset.ticker] || ''}
                    onChange={(e) => setShareInputs((prev) => ({ ...prev, [asset.ticker]: roundShareQuantity(Number(e.target.value) || 0) }))}
                    placeholder="Shares"
                    className="w-full sm:w-28 p-2 border rounded"
                  />
                  <div className="text-xs text-slate-500 w-full sm:w-auto min-w-0 sm:min-w-[140px]">Trade Cost: {toCurrency(estimatedCost)}</div>
                  <button onClick={() => handleBuy(asset.ticker)} className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold min-w-[72px]">Buy</button>
                  <button
                    onClick={() => handleSell(asset.ticker)}
                    disabled={ownedShares <= 0}
                    className={`px-3 py-2 rounded text-xs font-bold min-w-[72px] ${ownedShares > 0 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    Sell
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
