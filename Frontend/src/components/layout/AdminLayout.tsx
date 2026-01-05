/**
 * 🛡️ HOLD Wallet - Admin Layout
 * ==============================
 *
 * Layout específico para páginas administrativas.
 */

import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

export const AdminLayout = () => {
  return (
    <div className='min-h-screen bg-gray-100 dark:bg-gray-900'>
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className='lg:ml-64 min-h-screen'>
        <Outlet />
      </main>
    </div>
  )
}
