// Test the balance mapping logic
const balData = {
  balances: {
    polygon: {
      network: "polygon",
      address: "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      balance: "22.991438883672133572",
      balance_usd: "2.86"
    },
    polygon_usdt: {
      network: "polygon (USDT)",
      address: "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      balance: "2.037785",
      balance_usd: "2.04"
    },
    base: {
      network: "base",
      address: "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      balance: "0.00269658799953073",
      balance_usd: "8.50"
    }
  }
}

// New mapping logic
const mapped = {}

Object.entries(balData.balances).forEach(([network, balInfo]) => {
  const networkLower = network.toLowerCase()
  let symbol = ''
  let amount = 0

  // Extract amount from balance info
  if (typeof balInfo === 'object' && balInfo.balance !== undefined) {
    const balanceStr = String(balInfo.balance)
    amount = parseFloat(balanceStr) || 0
  } else if (typeof balInfo === 'number') {
    amount = balInfo
  }

  // Map network to symbol
  if (networkLower.includes('polygon')) {
    symbol = networkLower.includes('usdt') ? 'USDT' : 'MATIC'
  } else if (networkLower === 'base') {
    symbol = 'BASE'
  } else if (networkLower === 'ethereum' || networkLower === 'eth') {
    symbol = 'ETH'
  }

  // Always add the symbol (even if balance is 0), to avoid undefined
  if (symbol) {
    mapped[symbol] = amount
    console.log(`Balance: ${symbol} = ${amount}`)
  }
})

console.log('Final mapping:', mapped)
console.log('MATIC balance:', mapped['MATIC'])
console.log('USDT balance:', mapped['USDT'])
console.log('BASE balance:', mapped['BASE'])
