/**
 * 🔍 WOLK NOW - Message Search
 * ============================
 * Componente para buscar mensagens no histórico do chat
 */

import { useState, useRef, useEffect } from 'react'
import { Search, X, Clock, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { apiClient } from '@/services/api'

interface SearchResult {
  id: string
  content: string
  sender_id: string
  sender_name: string
  is_own: boolean
  created_at: string
  message_type: string
}

interface MessageSearchProps {
  roomId: string
  onResultClick?: (messageId: string) => void
  onClose?: () => void
}

export const MessageSearch = ({ roomId, onResultClick, onClose }: MessageSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Focar input ao abrir
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Buscar com debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchTerm || searchTerm.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      setHasSearched(true)

      try {
        const response = await apiClient.get<{
          success: boolean
          results: SearchResult[]
          count: number
        }>(`/chat/rooms/${roomId}/search?q=${encodeURIComponent(searchTerm)}&limit=30`)

        setResults(response.data.results || [])
        setCurrentIndex(0)
      } catch (error) {
        console.error('Error searching messages:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm, roomId])

  // Navegação com teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.()
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setCurrentIndex(prev => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setCurrentIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      const result = results[currentIndex]
      if (result) onResultClick?.(result.id)
    }
  }

  // Navegar para anterior/próximo
  const goToPrev = () => {
    if (results.length > 0) {
      const newIndex = (currentIndex - 1 + results.length) % results.length
      setCurrentIndex(newIndex)
      const result = results[newIndex]
      if (result) onResultClick?.(result.id)
    }
  }

  const goToNext = () => {
    if (results.length > 0) {
      const newIndex = (currentIndex + 1) % results.length
      setCurrentIndex(newIndex)
      const result = results[newIndex]
      if (result) onResultClick?.(result.id)
    }
  }

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  // Highlight do termo de busca
  const highlightText = (text: string) => {
    if (!searchTerm) return text

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={`${part}-${i}-highlight`}
          className='bg-yellow-300 dark:bg-yellow-600 rounded px-0.5'
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
      {/* Barra de busca */}
      <div className='flex items-center gap-2 p-3'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            ref={inputRef}
            type='text'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Buscar mensagens...'
            className='w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                       rounded-lg border-0 focus:ring-2 focus:ring-blue-500
                       text-gray-900 dark:text-white placeholder-gray-500'
          />
        </div>

        {/* Contador de resultados */}
        {hasSearched && !isLoading && results.length > 0 && (
          <span className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
            {currentIndex + 1} de {results.length}
          </span>
        )}

        {/* Botões de navegação */}
        {results.length > 0 && (
          <div className='flex items-center gap-1'>
            <button
              onClick={goToPrev}
              className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
              title='Anterior'
            >
              <ArrowUp className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            </button>
            <button
              onClick={goToNext}
              className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
              title='Próximo'
            >
              <ArrowDown className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            </button>
          </div>
        )}

        {/* Fechar */}
        <button
          onClick={onClose}
          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
          title='Fechar busca'
        >
          <X className='w-4 h-4 text-gray-600 dark:text-gray-400' />
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className='flex items-center justify-center py-4'>
          <Loader2 className='w-5 h-5 text-blue-500 animate-spin' />
        </div>
      )}

      {/* Resultados */}
      {!isLoading && results.length > 0 && (
        <div className='max-h-64 overflow-y-auto border-t border-gray-200 dark:border-gray-700'>
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => {
                setCurrentIndex(index)
                onResultClick?.(result.id)
              }}
              className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50
                         border-b border-gray-100 dark:border-gray-700/50 last:border-0
                         transition-colors
                         ${index === currentIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <div className='flex items-center justify-between mb-1'>
                <span
                  className={`text-xs font-medium ${result.is_own ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  {result.is_own ? 'Você' : result.sender_name}
                </span>
                <span className='text-xs text-gray-400 flex items-center gap-1'>
                  <Clock className='w-3 h-3' />
                  {formatDate(result.created_at)}
                </span>
              </div>
              <p className='text-sm text-gray-700 dark:text-gray-300 line-clamp-2'>
                {highlightText(result.content)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Sem resultados */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className='py-6 text-center text-gray-500 dark:text-gray-400'>
          <Search className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>Nenhuma mensagem encontrada</p>
        </div>
      )}
    </div>
  )
}

export default MessageSearch
