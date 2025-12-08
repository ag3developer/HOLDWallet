import React, { useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { APP_CONFIG } from '@/config/app'
import { RefreshCwIcon, CopyIcon, CheckIcon, AlertTriangleIcon } from 'lucide-react'

export const AuthDebugPage = () => {
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStorageInfo = () => {
    const storageKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
    const storedData = localStorage.getItem(storageKey)
    return {
      storageKey,
      exists: !!storedData,
      data: storedData ? JSON.parse(storedData) : null,
      parsedToken: storedData ? JSON.parse(storedData).state?.token : null,
    }
  }

  const storageInfo = getStorageInfo()

  const debugData = {
    'Zustand Store': {
      token: token ? `${token.substring(0, 20)}...` : '(null)',
      user: user ? user.email : '(null)',
      isAuthenticated,
      isLoading,
    },
    localStorage: {
      storageKey: storageInfo.storageKey,
      'exists in localStorage': storageInfo.exists,
      'token from localStorage': storageInfo.parsedToken
        ? `${storageInfo.parsedToken.substring(0, 20)}...`
        : '(null)',
    },
    'Token Validation': {
      'Token matches in both?': token === storageInfo.parsedToken ? '✅ YES' : '❌ NO',
      'Token format valid?': token?.startsWith('eyJ') ? '✅ JWT format' : '❌ Invalid JWT format',
      'Token length': token ? `${token.length} characters` : '(null)',
    },
    'API Configuration': {
      'Base URL': APP_CONFIG.api.baseUrl,
      'Storage Prefix': APP_CONFIG.storage.prefix,
      'Auth Storage Key': APP_CONFIG.storage.keys.auth,
    },
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
            🔍 Authentication Debug
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Use this page to troubleshoot authentication and token issues.
          </p>
        </div>

        {/* Alert Section */}
        {isAuthenticated ? (
          <div className='mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3'>
            <CheckIcon className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
            <div className='text-sm text-green-700 dark:text-green-200'>
              <p className='font-semibold mb-1'>✅ Authenticated</p>
              <p>User is logged in and should have access to protected endpoints.</p>
            </div>
          </div>
        ) : (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3'>
            <AlertTriangleIcon className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
            <div className='text-sm text-red-700 dark:text-red-200'>
              <p className='font-semibold mb-1'>⚠️ Not Authenticated</p>
              <p>User is not authenticated. Please log in first.</p>
            </div>
          </div>
        )}

        {/* Debug Sections */}
        <div className='space-y-6'>
          {Object.entries(debugData).map(([section, data]) => (
            <div
              key={section}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'
            >
              <div className='bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600'>
                <h2 className='font-semibold text-gray-900 dark:text-white'>{section}</h2>
              </div>
              <div className='p-4 space-y-3'>
                {Object.entries(data as Record<string, any>).map(([key, value]) => (
                  <div
                    key={key}
                    className='flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded'
                  >
                    <div className='flex-1'>
                      <p className='text-xs text-gray-600 dark:text-gray-400 font-mono'>{key}</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white break-all'>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    </div>
                    {typeof value === 'string' && value.length > 5 && value !== '(null)' && (
                      <button
                        onClick={() => copyToClipboard(value, key)}
                        className='ml-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors'
                      >
                        {copiedField === key ? (
                          <CheckIcon className='w-4 h-4 text-green-500' />
                        ) : (
                          <CopyIcon className='w-4 h-4 text-gray-500' />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Full Token Section */}
          {token && (
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'>
              <div className='bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600'>
                <h2 className='font-semibold text-gray-900 dark:text-white'>Full Access Token</h2>
              </div>
              <div className='p-4'>
                <textarea
                  value={token}
                  readOnly
                  placeholder='Full access token will appear here'
                  title='Full access token'
                  className='w-full h-32 p-2 font-mono text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100'
                />
                <button
                  onClick={() => copyToClipboard(token, 'fullToken')}
                  className='mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2'
                >
                  {copiedField === 'fullToken' ? (
                    <>
                      <CheckIcon className='w-4 h-4' />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className='w-4 h-4' />
                      Copy Full Token
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* localStorage Raw Data */}
          {storageInfo.data && (
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'>
              <div className='bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600'>
                <h2 className='font-semibold text-gray-900 dark:text-white'>
                  Raw localStorage Data
                </h2>
              </div>
              <div className='p-4'>
                <textarea
                  value={JSON.stringify(storageInfo.data, null, 2)}
                  readOnly
                  placeholder='Raw localStorage data will appear here'
                  title='Raw localStorage data'
                  className='w-full h-40 p-2 font-mono text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100'
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
            <h3 className='font-semibold text-blue-900 dark:text-blue-200 mb-2'>
              📝 How to Troubleshoot
            </h3>
            <ol className='text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside'>
              <li>Check if you're "Authenticated" in the alert above</li>
              <li>
                Verify "Token matches in both?" shows YES (token in Zustand = token in localStorage)
              </li>
              <li>Verify "Token format valid?" shows JWT format (starts with eyJ)</li>
              <li>Open DevTools Console (F12) and look for "[API]" messages</li>
              <li>Try creating a wallet and check the console logs</li>
              <li>If you see "No token found" messages, the token is not persisting correctly</li>
              <li>Copy your full token above and verify it's valid on jwt.io</li>
            </ol>
          </div>

          {/* Actions */}
          <div className='flex gap-3'>
            <button
              onClick={() => location.reload()}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2'
            >
              <RefreshCwIcon className='w-4 h-4' />
              Refresh Page
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                location.reload()
              }}
              className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
            >
              Clear All Storage & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
