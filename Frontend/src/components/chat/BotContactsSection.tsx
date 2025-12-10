/**
 * 🤖 Bot Contacts Section Component
 * Seção de contatos bot para testes de chamadas
 */

import { Phone, Video } from 'lucide-react'
import { BotUser } from '@/services/botUserService'

export interface BotContactsSectionProps {
  readonly bots: BotUser[]
  readonly onInitiateCall: (botId: string, callType: 'audio' | 'video') => Promise<void>
}

export function BotContactsSection({ bots, onInitiateCall }: BotContactsSectionProps) {
  return (
    <div className='px-4 py-3 border-t border-gray-700 dark:border-gray-600'>
      {/* Título da Seção */}
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide'>
          🤖 Bots de Teste
        </h3>
        <span className='text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full'>
          {bots.length} disponível
        </span>
      </div>

      {/* Lista de Bots */}
      <div className='space-y-2'>
        {bots.map(bot => (
          <div
            key={bot.id}
            className='flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group'
          >
            {/* Avatar e Info */}
            <div className='flex items-center gap-3 flex-1 min-w-0'>
              <div className='relative flex-shrink-0'>
                <img
                  src={bot.avatar}
                  alt={bot.name}
                  className='w-10 h-10 rounded-full object-cover'
                />
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    bot.status === 'online'
                      ? 'bg-green-500'
                      : bot.status === 'in_call'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                  }`}
                />
              </div>

              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                  {bot.name}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  {bot.status === 'online'
                    ? 'Online'
                    : bot.status === 'in_call'
                      ? 'Em chamada'
                      : 'Offline'}
                </p>
              </div>
            </div>

            {/* Botões de Ação - Sempre visíveis */}
            <div className='flex gap-1 ml-2 flex-shrink-0'>
              <button
                onClick={() => onInitiateCall(bot.id, 'audio')}
                disabled={bot.status !== 'online'}
                className='p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Chamar por voz'
              >
                <Phone className='w-4 h-4' />
              </button>
              <button
                onClick={() => onInitiateCall(bot.id, 'video')}
                disabled={bot.status !== 'online'}
                className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Chamar por vídeo'
              >
                <Video className='w-4 h-4' />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className='mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-700 dark:text-blue-300'>
        <p>💡 Clique no bot e escolha entre áudio ou vídeo para iniciar uma chamada de teste</p>
      </div>
    </div>
  )
}

export default BotContactsSection
