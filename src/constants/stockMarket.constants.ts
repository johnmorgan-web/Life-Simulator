export const stockMarketAssets = [
  { ticker: 'AAPL', company: 'Apple', sector: 'Technology', basePrice: 190, volatility: 0.08, drift: 0.01, icon: '📱' },
  { ticker: 'MSFT', company: 'Microsoft', sector: 'Technology', basePrice: 415, volatility: 0.07, drift: 0.01, icon: '💻' },
  { ticker: 'NVDA', company: 'NVIDIA', sector: 'Semiconductors', basePrice: 860, volatility: 0.14, drift: 0.012, icon: '🧠' },
  { ticker: 'AMZN', company: 'Amazon', sector: 'Consumer', basePrice: 178, volatility: 0.1, drift: 0.008, icon: '📦' },
  { ticker: 'KO', company: 'Coca-Cola', sector: 'Consumer Staples', basePrice: 62, volatility: 0.045, drift: 0.004, icon: '🥤' },
  { ticker: 'JPM', company: 'JPMorgan', sector: 'Financials', basePrice: 198, volatility: 0.065, drift: 0.005, icon: '🏦' },
  { ticker: 'XOM', company: 'ExxonMobil', sector: 'Energy', basePrice: 121, volatility: 0.09, drift: 0.003, icon: '🛢️' },
  { ticker: 'VTI', company: 'US Total Market ETF', sector: 'ETF', basePrice: 258, volatility: 0.05, drift: 0.006, icon: '🧺' },
  { ticker: 'TSLA', company: 'Tesla', sector: 'Automotive', basePrice: 250, volatility: 0.12, drift: 0.015, icon: '🚗' },
  { ticker: 'GOOGL', company: 'Alphabet', sector: 'Technology', basePrice: 135, volatility: 0.09, drift: 0.01, icon: '🔍' },
  { ticker: 'META', company: 'Meta Platforms', sector: 'Technology', basePrice: 300, volatility: 0.11, drift: 0.008, icon: '👓' },
  { ticker: 'NFLX', company: 'Netflix', sector: 'Communication Services', basePrice: 400, volatility: 0.13, drift: 0.007, icon: '📺' },
  { ticker: 'DIS', company: 'Disney', sector: 'Communication Services', basePrice: 110, volatility: 0.1, drift: 0.005, icon: '🏰' }
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
    description: 'Heavier ETF and staple exposure with smaller growth allocations.',
    allocations: {
      VTI: 0.45,
      KO: 0.2,
      JPM: 0.15,
      AAPL: 0.08,
      MSFT: 0.07,
      XOM: 0.05
    }
  },
  {
    id: 'balanced',
    name: 'Balanced Blend',
    risk: 'Medium',
    description: 'Mix of broad market ETF, mega-cap tech, and defensive sectors.',
    allocations: {
      VTI: 0.32,
      AAPL: 0.16,
      MSFT: 0.16,
      AMZN: 0.1,
      JPM: 0.1,
      KO: 0.08,
      XOM: 0.08
    }
  },
  {
    id: 'growth',
    name: 'Growth Accelerator',
    risk: 'Higher',
    description: 'Focused on higher-volatility tech and innovation exposure.',
    allocations: {
      NVDA: 0.3,
      MSFT: 0.2,
      AAPL: 0.18,
      AMZN: 0.16,
      VTI: 0.1,
      JPM: 0.06
    }
  }
]
