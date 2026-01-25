/**
 * 🔄 HOLD Wallet - Admin Dashboard Switcher
 * ==========================================
 *
 * Componente que permite alternar entre o Dashboard Legacy e V2.
 * Salva a preferência do usuário no localStorage.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useEffect } from 'react'
import { AdminDashboardPage } from './AdminDashboardPage'
import AdminDashboardPageV2 from './AdminDashboardPageV2'
import { ToggleLeft, ToggleRight, Sparkles, History } from 'lucide-react'

const STORAGE_KEY = 'admin-dashboard-version'

const AdminDashboardSwitcher: React.FC = () => {
  const [useV2, setUseV2] = useState<boolean>(() => {
    // Carrega preferência do localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? saved === 'v2' : true // Default: V2
  })

  // Salva preferência quando muda
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, useV2 ? 'v2' : 'legacy')
  }, [useV2])

  const toggleVersion = () => setUseV2(!useV2)

  return (
    <div className='relative'>
      {/* Version Toggle Button - Fixed Position */}
      <div className='fixed bottom-6 right-6 z-50'>
        <button
          onClick={toggleVersion}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
            transition-all duration-300 transform hover:scale-105
            ${
              useV2
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
            }
          `}
          title={useV2 ? 'Mudar para versão Legacy' : 'Mudar para versão V2 Premium'}
        >
          {useV2 ? (
            <>
              <Sparkles className='w-5 h-5' />
              <span className='text-sm font-medium'>V2 Premium</span>
              <ToggleRight className='w-6 h-6' />
            </>
          ) : (
            <>
              <History className='w-5 h-5' />
              <span className='text-sm font-medium'>Legacy</span>
              <ToggleLeft className='w-6 h-6' />
            </>
          )}
        </button>
      </div>

      {/* Render the selected version */}
      {useV2 ? <AdminDashboardPageV2 /> : <AdminDashboardPage />}
    </div>
  )
}

export default AdminDashboardSwitcher
