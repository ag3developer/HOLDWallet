import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const Layout = () => {
  const location = useLocation()
  const isChatPage = location.pathname.startsWith('/chat')

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='flex h-screen'>
        {/* Sidebar - Esconde no mobile quando é chat */}
        <div className={isChatPage ? 'hidden lg:block' : ''}>
          <Sidebar />
        </div>

        {/* Main content */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          {/* Header - Esconde no mobile quando é chat (chat tem seu próprio header) */}
          <div className={isChatPage ? 'hidden lg:block' : ''}>
            <Header />
          </div>

          {/* Page content */}
          {isChatPage ? (
            /* Chat - Full screen, sem padding, sem scroll do container */
            <main className='flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900'>
              <Outlet />
            </main>
          ) : (
            /* Outras páginas - Com container e padding normal */
            <main className='flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900'>
              <div className='container mx-auto px-6 py-8'>
                <Outlet />
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}
