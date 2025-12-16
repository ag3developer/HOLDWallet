interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingScreen = ({
  message = 'Carregando...',
  fullScreen = true,
}: LoadingScreenProps) => {
  if (!fullScreen) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='flex flex-col items-center gap-3'>
          <div className='h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin'></div>
          <p className='text-sm text-gray-600 dark:text-gray-400'>{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50'>
      <div className='flex flex-col items-center gap-6'>
        {/* Logo com animação cripto */}
        <div className='relative'>
          {/* Círculo externo rotativo */}
          <div className='absolute inset-0 h-24 w-24 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin'></div>
          <div
            className='absolute inset-0 h-24 w-24 rounded-full border-4 border-transparent border-b-orange-500 border-l-orange-400 animate-spin'
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          ></div>

          {/* Logo central */}
          <div className='h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-orange-500 flex items-center justify-center relative overflow-hidden'>
            {/* Efeito de brilho animado */}
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse'></div>

            {/* Logo W estilizada */}
            <div className='relative z-10'>
              <svg className='h-12 w-12 text-white' viewBox='0 0 100 100' fill='currentColor'>
                <path
                  d='M15,25 L25,75 L35,45 L50,75 L65,45 L75,75 L85,25 M35,45 L50,15 L65,45'
                  stroke='currentColor'
                  strokeWidth='8'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
          </div>

          {/* Partículas flutuantes (estilo cripto) */}
          <div className='absolute -top-2 -left-2 h-3 w-3 bg-orange-400 rounded-full animate-ping'></div>
          <div
            className='absolute -bottom-2 -right-2 h-2 w-2 bg-blue-400 rounded-full animate-ping'
            style={{ animationDelay: '0.3s' }}
          ></div>
          <div
            className='absolute top-0 -right-2 h-2 w-2 bg-green-400 rounded-full animate-ping'
            style={{ animationDelay: '0.6s' }}
          ></div>
        </div>

        {/* Loading message */}
        <div className='text-center mt-4'>
          <h2 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent mb-2'>
            Wolknow
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400'>{message}</p>
        </div>

        {/* Progress bar animado */}
        <div className='w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
          <div
            className='h-full bg-gradient-to-r from-blue-500 via-orange-500 to-blue-500 animate-pulse'
            style={{
              animation: 'progressSlide 1.5s ease-in-out infinite',
            }}
          ></div>
        </div>

        {/* Ícones cripto rotativos */}
        <div className='flex gap-3 opacity-40'>
          <div className='text-2xl animate-bounce' style={{ animationDelay: '0s' }}>
            ₿
          </div>
          <div className='text-2xl animate-bounce' style={{ animationDelay: '0.2s' }}>
            Ξ
          </div>
          <div className='text-2xl animate-bounce' style={{ animationDelay: '0.4s' }}>
            ◈
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progressSlide {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  )
}
