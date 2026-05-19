export const stockMarketAssets = [
  { ticker: 'AAPL', company: 'Apple', sector: 'Technology', basePrice: 260.72, volatility: 0.08, drift: 0.01, dividendYield: 0.005, icon: '📱' },
  { ticker: 'MSFT', company: 'Microsoft', sector: 'Technology', basePrice: 405.76, volatility: 0.07, drift: 0.01, dividendYield: 0.007, icon: '💻' },
  { ticker: 'NVDA', company: 'NVIDIA', sector: 'Semiconductors', basePrice: 184.76, volatility: 0.14, drift: 0.012, dividendYield: 0.001, icon: '🧠' },
  { ticker: 'AMZN', company: 'Amazon', sector: 'Consumer', basePrice: 214.34, volatility: 0.1, drift: 0.008, dividendYield: 0, icon: '📦' },
  { ticker: 'KO', company: 'Coca-Cola', sector: 'Consumer Staples', basePrice: 77.88, volatility: 0.045, drift: 0.004, dividendYield: 0.03, icon: '🥤' },
  { ticker: 'JPM', company: 'JPMorgan', sector: 'Financials', basePrice: 288.73, volatility: 0.065, drift: 0.005, dividendYield: 0.02, icon: '🏦' },
  { ticker: 'XOM', company: 'ExxonMobil', sector: 'Energy', basePrice: 148.13, volatility: 0.09, drift: 0.003, dividendYield: 0.033, icon: '🛢️' },
  { ticker: 'VTI', company: 'US Total Market ETF', sector: 'ETF', basePrice: 333.57, volatility: 0.05, drift: 0.006, dividendYield: 0.014, icon: '🧺' },
  { ticker: 'TSLA', company: 'Tesla', sector: 'Automotive', basePrice: 399.25, volatility: 0.12, drift: 0.015, dividendYield: 0, icon: '🚗' },
  { ticker: 'GOOGL', company: 'Alphabet', sector: 'Technology', basePrice: 307.04, volatility: 0.09, drift: 0.01, dividendYield: 0.004, icon: '🔍' },
  { ticker: 'META', company: 'Meta Platforms', sector: 'Technology', basePrice: 653.91, volatility: 0.11, drift: 0.008, dividendYield: 0.003, icon: '👓' },
  { ticker: 'NFLX', company: 'Netflix', sector: 'Communication Services', basePrice: 96.94, volatility: 0.13, drift: 0.007, dividendYield: 0, icon: '📺' },
  { ticker: 'DIS', company: 'Disney', sector: 'Communication Services', basePrice: 101.32, volatility: 0.1, drift: 0.005, dividendYield: 0, icon: '🏰' },
  { ticker: 'MCD', company: "McDonald\'s", sector: 'Consumer', basePrice: 287.14, volatility: 0.06, drift: 0.006, dividendYield: 0.022, icon: '🍔' },
  { ticker: 'WMT', company: 'Walmart', sector: 'Consumer Staples', basePrice: 68.45, volatility: 0.055, drift: 0.006, dividendYield: 0.014, icon: '🛒' },
  { ticker: 'NKE', company: 'Nike', sector: 'Consumer', basePrice: 102.37, volatility: 0.085, drift: 0.007, dividendYield: 0.012, icon: '👟' },
  { ticker: 'SBUX', company: 'Starbucks', sector: 'Consumer', basePrice: 95.28, volatility: 0.09, drift: 0.006, dividendYield: 0.023, icon: '☕' },
  { ticker: 'HAS', company: 'Hasbro', sector: 'Consumer', basePrice: 66.42, volatility: 0.11, drift: 0.005, dividendYield: 0.018, icon: '🧸' },
  { ticker: 'MAT', company: 'Mattel', sector: 'Consumer', basePrice: 21.74, volatility: 0.12, drift: 0.008, dividendYield: 0, icon: '🧩' },
  { ticker: 'EA', company: 'Electronic Arts', sector: 'Communication Services', basePrice: 148.22, volatility: 0.1, drift: 0.007, dividendYield: 0, icon: '🎮' },
  { ticker: 'RBLX', company: 'Roblox', sector: 'Communication Services', basePrice: 47.6, volatility: 0.16, drift: 0.011, dividendYield: 0, icon: '🕹️' },
  { ticker: 'SPY', company: 'S&P 500 ETF', sector: 'ETF', basePrice: 677.05, volatility: 0.04, drift: 0.005, dividendYield: 0.012, icon: '📈' },
  { ticker: 'QQQ', company: 'Nasdaq 100 ETF', sector: 'ETF', basePrice: 607.73, volatility: 0.06, drift: 0.007, dividendYield: 0.006, icon: '📊' },
  { ticker: 'DIA', company: 'Dow Jones ETF', sector: 'ETF', basePrice: 477.74, volatility: 0.05, drift: 0.006, dividendYield: 0.018, icon: '📉' },
]

export const stockMarketGlossary = [
  {
    term: 'Bull Market',
    plain: 'A stretch where prices mostly go up.',
    levels: {
      elementary: 'The market is climbing like a hill.',
      'middle-school': 'Prices have been rising for a while.',
      'high-school': 'A broad uptrend driven by optimism and buying pressure.',
      adult: 'A sustained period of rising asset prices with strong investor sentiment.'
    }
  },
  {
    term: 'Bear Market',
    plain: 'A stretch where prices mostly go down.',
    levels: {
      elementary: 'The market is sliding downhill.',
      'middle-school': 'Prices have been falling for months.',
      'high-school': 'A prolonged downturn, commonly defined by major declines from prior highs.',
      adult: 'A broad market decline, often 20%+ from peaks, with risk-off behavior.'
    }
  },
  {
    term: 'Volatility',
    plain: 'How jumpy prices are.',
    levels: {
      elementary: 'How much prices bounce around.',
      'middle-school': 'How quickly and how far prices move up and down.',
      'high-school': 'The statistical dispersion of returns over time.',
      adult: 'Magnitude and frequency of price variation, often measured via standard deviation.'
    }
  },
  {
    term: 'Diversification',
    plain: 'Not putting all your money in one place.',
    levels: {
      elementary: 'Use different baskets for your eggs.',
      'middle-school': 'Spread money across different investments to reduce risk.',
      'high-school': 'Allocating across uncorrelated assets to smooth portfolio risk.',
      adult: 'Risk management by spreading exposure across sectors, asset classes, and factors.'
    }
  },
  {
    term: 'Dividend',
    plain: 'A cash reward some companies pay shareholders.',
    levels: {
      elementary: 'Some companies share part of their money with owners.',
      'middle-school': 'A payout from company profits to shareholders.',
      'high-school': 'Periodic cash distributions paid per share from earnings.',
      adult: 'A board-approved earnings distribution, typically paid quarterly per share.'
    }
  },
  {
    term: 'P/E Ratio',
    plain: 'Price compared to company earnings.',
    levels: {
      elementary: 'A clue for whether a stock seems pricey or cheap.',
      'middle-school': 'Stock price divided by earnings per share.',
      'high-school': 'Valuation metric comparing market price to EPS.',
      adult: 'Relative valuation multiple indicating how much investors pay per unit of earnings.'
    }
  },
  {
    term: 'Portfolio Value',
    plain: 'What all your current shares are worth right now.',
    levels: {
      elementary: 'How much your investment basket is worth today.',
      'middle-school': 'The current total value of all stocks you own.',
      'high-school': 'Sum of each holding: shares multiplied by current price.',
      adult: 'Aggregate mark-to-market value of all open positions.'
    }
  },
  {
    term: 'Cost Basis',
    plain: 'How much money you put into your current holdings.',
    levels: {
      elementary: 'The money you spent to buy your shares.',
      'middle-school': 'Your total invested amount in the shares you still own.',
      'high-school': 'For each position: shares multiplied by average purchase cost, summed across holdings.',
      adult: 'Total capital invested in current open positions, adjusted by average entry prices.'
    }
  },
  {
    term: 'Unrealized P/L',
    plain: 'The gain or loss if you sold your shares right now.',
    levels: {
      elementary: 'How much you are up or down before selling.',
      'middle-school': 'Paper profit or loss on holdings you still own.',
      'high-school': 'Current value minus cost basis for open positions.',
      adult: 'Mark-to-market profit/loss not yet realized through execution.'
    }
  }
]

export const autoInvestProfiles = [
  {
    id: 'conservative',
    name: 'Conservative Income',
    risk: 'Low',
    description: 'ETF-heavy with defensive household brands, financial and energy exposure, plus smaller slices of growth names.',
    allocations: {
      VTI: 0.20,
      SPY: 0.15,
      DIA: 0.09,
      QQQ: 0.07,
      KO: 0.07,
      JPM: 0.07,
      XOM: 0.05,
      WMT: 0.05,
      MCD: 0.04,
      SBUX: 0.03,
      NKE: 0.025,
      DIS: 0.02,
      HAS: 0.015,
      MAT: 0.01,
      MSFT: 0.025,
      AAPL: 0.02,
      GOOGL: 0.012,
      AMZN: 0.01,
      META: 0.01,
      NVDA: 0.008,
      NFLX: 0.007,
      TSLA: 0.006,
      EA: 0.007,
      RBLX: 0.005,
    }
  },
  {
    id: 'balanced',
    name: 'Balanced Blend',
    risk: 'Medium',
    description: 'Balanced mix of broad ETFs, mega-cap leaders, and familiar consumer, toy, and gaming brands.',
    allocations: {
      VTI: 0.15,
      SPY: 0.12,
      QQQ: 0.09,
      MSFT: 0.09,
      AAPL: 0.08,
      GOOGL: 0.07,
      AMZN: 0.07,
      META: 0.06,
      NVDA: 0.05,
      JPM: 0.03,
      KO: 0.02,
      TSLA: 0.03,
      XOM: 0.015,
      NFLX: 0.02,
      DIA: 0.03,
      DIS: 0.015,
      MCD: 0.015,
      WMT: 0.012,
      NKE: 0.008,
      SBUX: 0.006,
      HAS: 0.003,
      MAT: 0.003,
      EA: 0.005,
      RBLX: 0.008,
    }
  },
  {
    id: 'growth',
    name: 'Growth Accelerator',
    risk: 'Higher',
    description: 'Tilts toward tech and innovation leaders while keeping small positions in recognizable brands and stabilizers.',
    allocations: {
      NVDA: 0.14,
      MSFT: 0.12,
      META: 0.10,
      GOOGL: 0.10,
      AMZN: 0.091,
      AAPL: 0.085,
      TSLA: 0.075,
      QQQ: 0.07,
      NFLX: 0.035,
      EA: 0.03,
      RBLX: 0.02,
      VTI: 0.03,
      SPY: 0.015,
      NKE: 0.015,
      SBUX: 0.01,
      DIS: 0.01,
      MCD: 0.01,
      WMT: 0.01,
      HAS: 0.008,
      MAT: 0.008,
      JPM: 0.006,
      XOM: 0.004,
      KO: 0.003,
      DIA: 0.005,
    }
  }
]
