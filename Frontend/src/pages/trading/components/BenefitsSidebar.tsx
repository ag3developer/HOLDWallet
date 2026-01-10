import React from 'react'
import { Shield, Clock, Zap, Lock, Award } from 'lucide-react'

const BENEFITS = [
  {
    icon: Shield,
    title: 'Secure Trades',
    description: 'Bank-level security',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    icon: Clock,
    title: 'Fast Execution',
    description: 'Instant quotes',
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Zap,
    title: 'Best Rates',
    description: 'Low spreads',
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: Lock,
    title: 'Full Control',
    description: 'Your keys, your crypto',
    color: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
]

export function BenefitsSidebar() {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
      {/* Header - Compact on mobile */}
      <div className='px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl shadow-md'>
            <Award className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
          </div>
          <div>
            <h2 className='text-sm sm:text-lg font-bold text-gray-900 dark:text-white'>
              Why Trade Here
            </h2>
            <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
              Vantagens exclusivas
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Grid - 2x2 compact on mobile */}
      <div className='p-3 sm:p-4'>
        <div className='grid grid-cols-2 gap-2 sm:gap-3'>
          {BENEFITS.map(benefit => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-4 ${benefit.bgLight} ${benefit.bgDark} rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-default overflow-hidden`}
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                <div
                  className={`relative mb-1.5 sm:mb-2 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-shadow`}
                >
                  <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${benefit.iconColor}`} />
                </div>
                <h3 className='font-semibold text-gray-900 dark:text-white text-[11px] sm:text-sm text-center leading-tight'>
                  {benefit.title}
                </h3>
                <p className='text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 text-center mt-0.5 hidden sm:block'>
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trust Badge - Compact */}
      <div className='px-3 sm:px-4 pb-3 sm:pb-4'>
        <div className='flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg sm:rounded-xl border border-green-100 dark:border-green-800/30'>
          <Shield className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400' />
          <span className='text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300'>
            100% Seguro & Criptografado
          </span>
        </div>
      </div>
    </div>
  )
}
