/**
 * 📝 WOLK NOW - Message Context Menu
 * ===================================
 * Menu de contexto para mensagens (editar, deletar, copiar)
 */

import { useState, useRef, useEffect } from 'react'
import { Copy, Pencil, Trash2, Reply, CheckCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/services/api'

interface MessageContextMenuProps {
  messageId: string
  roomId: string
  content: string
  isOwn: boolean
  isSystem?: boolean
  position: { x: number; y: number }
  onClose: () => void
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (messageId: string, content: string) => void
}

export const MessageContextMenu = ({
  messageId,
  roomId,
  content,
  isOwn,
  isSystem = false,
  position,
  onClose,
  onEdit,
  onDelete,
  onReply,
}: MessageContextMenuProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focar input ao editar
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  // Copiar mensagem
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Editar mensagem
  const handleEdit = async () => {
    if (!editContent.trim() || editContent === content) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.put(`/chat/rooms/${roomId}/messages/${messageId}`, null, {
        params: { content: editContent },
      })

      if (response.data.success) {
        onEdit?.(messageId, editContent)
        onClose()
      }
    } catch (error) {
      console.error('Failed to edit message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Deletar mensagem
  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja apagar esta mensagem?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.delete(`/chat/rooms/${roomId}/messages/${messageId}`)

      if (response.data.success) {
        onDelete?.(messageId)
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Responder mensagem
  const handleReply = () => {
    onReply?.(messageId, content)
    onClose()
  }

  // Calcular posição do menu - z-60 para ficar acima de modais
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 60,
  }

  // Modo de edição
  if (isEditing) {
    return (
      <div
        ref={menuRef}
        style={menuStyle}
        className='w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
                   border border-gray-200 dark:border-gray-700 overflow-hidden
                   animate-in fade-in zoom-in-95 duration-150'
      >
        <div className='p-3'>
          <textarea
            ref={inputRef}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder='Digite sua mensagem...'
            className='w-full p-2 text-sm bg-gray-100 dark:bg-gray-700 
                       rounded-lg border-0 focus:ring-2 focus:ring-blue-500
                       text-gray-900 dark:text-white resize-none'
            rows={3}
            disabled={isLoading}
          />
          <div className='flex items-center justify-end gap-2 mt-2'>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
              className='px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
            >
              Cancelar
            </button>
            <button
              onClick={handleEdit}
              disabled={isLoading || !editContent.trim()}
              className='px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2'
            >
              {isLoading ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <>
                  <CheckCircle className='w-4 h-4' />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className='w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
                 border border-gray-200 dark:border-gray-700 overflow-hidden py-1
                 animate-in fade-in zoom-in-95 duration-150'
    >
      {/* Copiar */}
      <button
        onClick={handleCopy}
        className='w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3'
      >
        {copied ? (
          <>
            <CheckCircle className='w-4 h-4 text-green-500' />
            <span className='text-green-600 dark:text-green-400'>Copiado!</span>
          </>
        ) : (
          <>
            <Copy className='w-4 h-4' />
            Copiar
          </>
        )}
      </button>

      {/* Responder */}
      {onReply && (
        <button
          onClick={handleReply}
          className='w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3'
        >
          <Reply className='w-4 h-4' />
          Responder
        </button>
      )}

      {/* Editar (apenas mensagens próprias e não-sistema) */}
      {isOwn && !isSystem && (
        <button
          onClick={() => setIsEditing(true)}
          className='w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3'
        >
          <Pencil className='w-4 h-4' />
          Editar
        </button>
      )}

      {/* Deletar (apenas mensagens próprias e não-sistema) */}
      {isOwn && !isSystem && (
        <>
          <div className='border-t border-gray-200 dark:border-gray-700 my-1' />
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className='w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3'
          >
            {isLoading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Trash2 className='w-4 h-4' />
            )}
            Apagar
          </button>
        </>
      )}
    </div>
  )
}

export default MessageContextMenu
