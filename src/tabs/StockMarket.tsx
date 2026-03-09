import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { stockMarketAssets, stockMarketGlossary, autoInvestProfiles } from '../constants/stockMarket.constants'

type LearningLevel = 'elementary' | 'middle-school' | 'high-school' | 'adult'

function toCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default function StockMarket() {
  const { state, dispatch } = useGame()
  const [shareInputs, setShareInputs] = useState<Record<string, number>>({})

  const marketPrices = state.marketPrices || {}
  const previousPrices = state.marketPricesPrevious || {}
  const portfolio = Array.isArray(state.portfolio) ? state.portfolio : []

  const learningLevel: LearningLevel = state.marketLearningLevel || 'adult'
  const usePlainLanguage = !!state.marketUsePlainLanguage
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

  const handleBuy = (ticker: string) => {
    const shares = Math.max(0, Math.floor(Number(shareInputs[ticker] || 0)))
    if (shares <= 0) return
    dispatch({ type: 'BUY_STOCK', payload: { ticker, shares } })
  }

  const handleSell = (ticker: string) => {
    const shares = Math.max(0, Math.floor(Number(shareInputs[ticker] || 0)))
    if (shares <= 0) return
    dispatch({ type: 'SELL_STOCK', payload: { ticker, shares } })
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold mb-2">📈 Stock Market</h2>
        <p className="text-sm text-slate-600">Invest in public companies, monitor your portfolio, and learn market vocabulary at your preferred level.</p>
      </div>

      <div className="glass p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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

      <div className="glass p-6">
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

        <div className="flex gap-2 mb-4">
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

      <div className="glass p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm font-bold text-slate-600">Learning level:</label>
          <select
            value={learningLevel}
            onChange={(e) => dispatch({ type: 'SET_STATE', payload: { marketLearningLevel: e.target.value } })}
            className="p-2 border rounded"
          >
            <option value="elementary">Elementary</option>
            <option value="middle-school">Middle School</option>
            <option value="high-school">High School</option>
            <option value="adult">Adult</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 ml-2">
            <input
              type="checkbox"
              checked={usePlainLanguage}
              onChange={(e) => dispatch({ type: 'SET_STATE', payload: { marketUsePlainLanguage: e.target.checked } })}
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

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">Trade Desk</h3>
        <p className="text-xs text-slate-500 mb-3">Orders may fill slightly above or below quote prices to simulate ceiling/floor executions.</p>
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
            const estimatedCost = Math.max(0, Math.floor(inputShares)) * price

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

                <div className="mt-2 text-xs text-slate-600">
                  Owned: <span className="font-bold">{ownedShares} shares</span>
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
                    step="1"
                    value={shareInputs[asset.ticker] || ''}
                    onChange={(e) => setShareInputs((prev) => ({ ...prev, [asset.ticker]: Number(e.target.value) }))}
                    placeholder="Shares"
                    className="w-28 p-2 border rounded"
                  />
                  <div className="text-xs text-slate-500 min-w-[140px]">Trade Cost: {toCurrency(estimatedCost)}</div>
                  <button onClick={() => handleBuy(asset.ticker)} className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold">Buy</button>
                  <button
                    onClick={() => handleSell(asset.ticker)}
                    disabled={ownedShares <= 0}
                    className={`px-3 py-2 rounded text-xs font-bold ${ownedShares > 0 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
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
