import React, { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PriceChartProps {
  readonly symbol: string
  readonly price: number
  readonly currencySymbol: string
}

type TimePeriod = '1h' | '24h' | '7d' | '30d'

// Função para gerar dados históricos simulados
const generatePriceHistory = (basePrice: number, period: TimePeriod): number[] => {
  const pointsMap = { '1h': 12, '24h': 24, '7d': 7, '30d': 30 }
  const points = pointsMap[period]
  const volatility = basePrice * 0.05 // 5% volatilidade

  const data: number[] = [basePrice]
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.5) * volatility
    const lastPrice = data[i - 1]
    if (lastPrice !== undefined) {
      data.push(Math.max(basePrice * 0.8, lastPrice + change))
    }
  }
  return data
}

const getLabels = (period: TimePeriod): string[] => {
  const now = new Date()
  const labels: string[] = []

  if (period === '1h') {
    for (let i = 0; i < 12; i++) {
      const time = new Date(now.getTime() - (11 - i) * 5 * 60000)
      labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
  } else if (period === '24h') {
    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() - (23 - i) * 60 * 60000)
      labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
  } else if (period === '7d') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60000)
      const dayLabel = days[date.getDay()]
      if (dayLabel !== undefined) {
        labels.push(dayLabel)
      }
    }
  } else {
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60000)
      labels.push(date.getDate().toString().padStart(2, '0'))
    }
  }

  return labels
}

export function PriceChart({ symbol, price, currencySymbol }: Readonly<PriceChartProps>) {
  const [period, setPeriod] = useState<TimePeriod>('24h')

  const { labels, data, minPrice, maxPrice, change } = useMemo(() => {
    const chartLabels = getLabels(period)
    const priceData = generatePriceHistory(price, period)
    const min = Math.min(...priceData)
    const max = Math.max(...priceData)
    const firstPrice = priceData[0]
    const lastPrice = priceData.at(-1)
    const priceChange = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

    return {
      labels: chartLabels,
      data: priceData,
      minPrice: min,
      maxPrice: max,
      change: priceChange,
    }
  }, [period, price])

  const chartData = {
    labels,
    datasets: [
      {
        label: `${symbol} Price`,
        data,
        borderColor: change >= 0 ? '#10b981' : '#ef4444',
        backgroundColor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: change >= 0 ? '#10b981' : '#ef4444',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context: any) =>
            `${currencySymbol} ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value: any) =>
            `${currencySymbol} ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
          font: { size: 10 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-h-80'>
      {/* Header */}
      <div className='flex items-center justify-between mb-3'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
            {symbol} Price Chart
          </h3>
          <div className='flex items-center gap-2 mt-1'>
            <span className='text-lg font-bold text-gray-900 dark:text-white'>
              {currencySymbol} {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                change >= 0
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className='flex gap-2 mb-3'>
        {(['1h', '24h', '7d', '30d'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className='mb-3 max-h-48 overflow-hidden'>
        <Line data={chartData} options={chartOptions as any} height={200} />
      </div>

      {/* Stats */}
      <div className='grid grid-cols-3 gap-2 text-xs'>
        <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
          <p className='text-gray-600 dark:text-gray-400'>High</p>
          <p className='font-semibold text-gray-900 dark:text-white'>
            {currencySymbol} {maxPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
          <p className='text-gray-600 dark:text-gray-400'>Low</p>
          <p className='font-semibold text-gray-900 dark:text-white'>
            {currencySymbol} {minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
          <p className='text-gray-600 dark:text-gray-400'>Change</p>
          <p className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  )
}
