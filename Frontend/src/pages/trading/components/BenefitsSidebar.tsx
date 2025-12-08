import React from 'react'
import { Shield, Clock, Zap, Lock } from 'lucide-react'

const BENEFITS = [
  {
    icon: Shield,
    title: 'Secure Trades',
    description: 'Bank-level security for all transactions',
  },
  {
    icon: Clock,
    title: 'Fast Execution',
    description: 'Get instant quotes and execute trades',
  },
  {
    icon: Zap,
    title: 'Best Rates',
    description: 'Competitive rates and low spreads',
  },
  {
    icon: Lock,
    title: 'Full Control',
    description: 'Your keys, your crypto, always',
  },
]

export function BenefitsSidebar() {
  return (
    <div>
      {/* Benefits Section - Horizontal Grid 2x2 */}
      <div>
        <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-3'>Why Trade Here</h2>
        <div className='grid grid-cols-2 gap-3'>
          {BENEFITS.map(benefit => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className='flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-center'
              >
                <div className='mb-2'>
                  <Icon className='w-7 h-7 text-blue-600 dark:text-blue-400' />
                </div>
                <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                  {benefit.title}
                </h3>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
