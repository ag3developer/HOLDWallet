/**
 * 😀 WOLK NOW - Emoji Picker
 * ==========================
 * Seletor de emojis compacto para o chat
 * Organizado por categorias com busca
 */

import { useState, useRef, useEffect } from 'react'
import { Smile, Search, X, Clock, Heart, ThumbsUp, Star, Coffee, Flag, Hash } from 'lucide-react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose?: () => void
  position?: 'top' | 'bottom'
}

// Categorias de emojis
const EMOJI_CATEGORIES = {
  recent: {
    icon: Clock,
    label: 'Recentes',
    emojis: [] as string[], // Preenchido do localStorage
  },
  smileys: {
    icon: Smile,
    label: 'Rostos',
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😅',
      '😂',
      '🤣',
      '😊',
      '😇',
      '🙂',
      '😉',
      '😌',
      '😍',
      '🥰',
      '😘',
      '😗',
      '😙',
      '😚',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😝',
      '🤑',
      '🤗',
      '🤭',
      '🤫',
      '🤔',
      '🤐',
      '🤨',
      '😐',
      '😑',
      '😶',
      '😏',
      '😒',
      '🙄',
      '😬',
      '🤥',
      '😌',
      '😔',
      '😪',
      '🤤',
      '😴',
      '😷',
      '🤒',
      '🤕',
      '🤢',
      '🤮',
      '🥵',
      '🥶',
      '🥴',
      '😵',
      '🤯',
      '🤠',
      '🥳',
      '😎',
      '🤓',
      '🧐',
      '😕',
      '😟',
      '🙁',
      '☹️',
      '😮',
      '😯',
      '😲',
      '😳',
      '🥺',
      '😦',
      '😧',
      '😨',
      '😰',
      '😥',
      '😢',
      '😭',
      '😱',
      '😖',
      '😣',
      '😞',
      '😓',
      '😩',
      '😫',
      '🥱',
      '😤',
      '😡',
      '😠',
      '🤬',
      '😈',
      '👿',
      '💀',
      '☠️',
      '💩',
      '🤡',
      '👹',
      '👺',
      '👻',
      '👽',
    ],
  },
  gestures: {
    icon: ThumbsUp,
    label: 'Gestos',
    emojis: [
      '👋',
      '🤚',
      '🖐️',
      '✋',
      '🖖',
      '👌',
      '🤌',
      '🤏',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      '👆',
      '🖕',
      '👇',
      '☝️',
      '👍',
      '👎',
      '✊',
      '👊',
      '🤛',
      '🤜',
      '👏',
      '🙌',
      '👐',
      '🤲',
      '🤝',
      '🙏',
      '✍️',
      '💅',
      '🤳',
      '💪',
      '🦾',
    ],
  },
  hearts: {
    icon: Heart,
    label: 'Corações',
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '♥️',
      '😻',
      '💑',
      '👩‍❤️‍👨',
      '💏',
    ],
  },
  objects: {
    icon: Star,
    label: 'Objetos',
    emojis: [
      '⭐',
      '🌟',
      '✨',
      '💫',
      '🔥',
      '💥',
      '💯',
      '💢',
      '💨',
      '💦',
      '💤',
      '🎉',
      '🎊',
      '🎈',
      '🎁',
      '🏆',
      '🥇',
      '🥈',
      '🥉',
      '🏅',
      '🎯',
      '💰',
      '💵',
      '💴',
      '💶',
      '💷',
      '💎',
      '📱',
      '💻',
      '🖥️',
      '📸',
      '🔑',
      '🗝️',
      '🔒',
      '🔓',
      '📧',
    ],
  },
  food: {
    icon: Coffee,
    label: 'Comida',
    emojis: [
      '☕',
      '🍵',
      '🧃',
      '🥤',
      '🧋',
      '🍺',
      '🍻',
      '🥂',
      '🍷',
      '🍸',
      '🍹',
      '🧉',
      '🍕',
      '🍔',
      '🍟',
      '🌭',
      '🥪',
      '🌮',
      '🌯',
      '🥗',
      '🍜',
      '🍝',
      '🍣',
      '🍱',
      '🍩',
      '🍪',
      '🎂',
      '🍰',
      '🧁',
      '🍫',
      '🍬',
      '🍭',
      '🍿',
      '🍦',
      '🍨',
      '🥧',
    ],
  },
  symbols: {
    icon: Hash,
    label: 'Símbolos',
    emojis: [
      '✅',
      '❌',
      '❓',
      '❗',
      '‼️',
      '⁉️',
      '💲',
      '💱',
      '©️',
      '®️',
      '™️',
      '🔴',
      '🟠',
      '🟡',
      '🟢',
      '🔵',
      '🟣',
      '⚫',
      '⚪',
      '🟤',
      '▶️',
      '⏸️',
      '⏹️',
      '⏺️',
      '⏭️',
      '⏮️',
      '⏩',
      '⏪',
      '🔀',
      '🔁',
      '🔂',
      '🔃',
      '🔄',
      '🔙',
      '🔚',
      '🔛',
    ],
  },
  flags: {
    icon: Flag,
    label: 'Bandeiras',
    emojis: [
      '🇧🇷',
      '🇺🇸',
      '🇬🇧',
      '🇪🇸',
      '🇫🇷',
      '🇩🇪',
      '🇮🇹',
      '🇵🇹',
      '🇯🇵',
      '🇨🇳',
      '🇰🇷',
      '🇮🇳',
      '🇷🇺',
      '🇦🇷',
      '🇲🇽',
      '🇨🇦',
      '🇦🇺',
      '🏳️',
      '🏴',
      '🏁',
      '🚩',
      '🎌',
      '🏳️‍🌈',
      '🏳️‍⚧️',
    ],
  },
}

// Emojis mais usados (fallback)
const DEFAULT_RECENT = ['👍', '❤️', '😂', '🔥', '✅', '👏', '🎉', '💯']

export const EmojiPicker = ({ onSelect, onClose, position = 'top' }: EmojiPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys')
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_RECENT)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Carregar recentes do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-emojis')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed)
        }
      } catch {
        // Ignorar erro
      }
    }
  }, [])

  // Salvar emoji nos recentes
  const saveToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16)
    setRecentEmojis(updated)
    localStorage.setItem('recent-emojis', JSON.stringify(updated))
  }

  // Handler de seleção
  const handleSelect = (emoji: string) => {
    saveToRecent(emoji)
    onSelect(emoji)
  }

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Focar busca ao abrir
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Filtrar emojis pela busca
  const getFilteredEmojis = () => {
    if (!searchTerm) {
      if (selectedCategory === 'recent') {
        return recentEmojis
      }
      return EMOJI_CATEGORIES[selectedCategory].emojis
    }

    // Buscar em todas as categorias
    const allEmojis: string[] = []
    Object.values(EMOJI_CATEGORIES).forEach(cat => {
      allEmojis.push(...cat.emojis)
    })

    // Filtro simples por termo (pode ser expandido com nomes de emojis)
    return [...new Set(allEmojis)]
  }

  const filteredEmojis = getFilteredEmojis()

  return (
    <div
      ref={containerRef}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
                  left-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
                  border border-gray-200 dark:border-gray-700 overflow-hidden z-50
                  animate-in fade-in zoom-in-95 duration-200`}
    >
      {/* Header com busca */}
      <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            ref={searchInputRef}
            type='text'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder='Buscar emoji...'
            className='w-full pl-9 pr-8 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                       rounded-lg border-0 focus:ring-2 focus:ring-blue-500
                       text-gray-900 dark:text-white placeholder-gray-500'
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title='Limpar busca'
              className='absolute right-2 top-1/2 -translate-y-1/2 p-1 
                         hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
            >
              <X className='w-3 h-3 text-gray-500' />
            </button>
          )}
        </div>
      </div>

      {/* Categorias */}
      {!searchTerm && (
        <div className='flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto'>
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon
            const isSelected = selectedCategory === key
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as keyof typeof EMOJI_CATEGORIES)}
                title={category.label}
                className={`p-2 rounded-lg transition-colors flex-shrink-0
                           ${
                             isSelected
                               ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                               : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                           }`}
              >
                <Icon className='w-4 h-4' />
              </button>
            )
          })}
        </div>
      )}

      {/* Grid de emojis */}
      <div className='p-2 h-48 overflow-y-auto'>
        {filteredEmojis.length > 0 ? (
          <div className='grid grid-cols-8 gap-1'>
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleSelect(emoji)}
                title={`Selecionar ${emoji}`}
                className='p-1.5 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 
                           rounded-lg transition-colors'
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className='flex items-center justify-center h-full text-gray-500 dark:text-gray-400'>
            <p className='text-sm'>Nenhum emoji encontrado</p>
          </div>
        )}
      </div>

      {/* Footer com categoria selecionada */}
      {!searchTerm && (
        <div className='px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700'>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {EMOJI_CATEGORIES[selectedCategory].label}
          </span>
        </div>
      )}
    </div>
  )
}

export default EmojiPicker
