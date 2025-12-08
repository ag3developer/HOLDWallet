import React, { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  iconColor?: string
  iconBg?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  compact?: boolean
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-100 dark:bg-blue-900',
  trend,
  compact = false,
}: StatCardProps) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full'>
      <div className='flex items-center justify-between'>
        <div className='flex-1 min-w-0'>
          <p
            className={`text-gray-600 dark:text-gray-400 mb-1 truncate ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {title}
          </p>
          <p
            className={`font-bold text-gray-900 dark:text-white truncate ${
              compact ? 'text-lg' : 'text-2xl'
            }`}
          >
            {value}
          </p>
          {trend && (
            <p
              className={`text-xs mt-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={`${iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ${
            compact ? 'w-10 h-10' : 'w-12 h-12'
          }`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  )
}
