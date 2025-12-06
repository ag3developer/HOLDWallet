interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingScreen = ({ 
  message = 'Carregando...', 
  fullScreen = true 
}: LoadingScreenProps) => {
  if (!fullScreen) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse opacity-75"></div>
        </div>

        {/* Loading spinner */}
        <div className="relative">
          <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>

        {/* Loading message */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            HOLD Wallet
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-blue-200 dark:bg-blue-800 animate-pulse"
              style={{ 
                animationDelay: `${i * 200}ms`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
