/**
 * WolkPay Gateway - Gerenciamento de API Keys
 * Criar, visualizar e revogar chaves de API
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  RefreshCw,
  Shield,
  Calendar,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react'
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
  type CreateApiKeyResponse,
} from '../../../services/gatewayService'

export default function GatewayApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null)
  const [creating, setCreating] = useState(false)

  // Form
  const [keyName, setKeyName] = useState('')
  const [keyEnv, setKeyEnv] = useState<'live' | 'test'>('test')
  const [permissions, setPermissions] = useState<string[]>(['payments:create', 'payments:read'])

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const keys = await getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error('Erro ao carregar API Keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!keyName.trim()) return

    try {
      setCreating(true)
      const response = await createApiKey({
        name: keyName,
        environment: keyEnv,
        permissions,
      })
      setNewKey(response)
      setShowCreateModal(false)
      setShowKeyModal(true)
      setKeyName('')
      loadApiKeys()
    } catch (error) {
      console.error('Erro ao criar API Key:', error)
      alert('Não foi possível criar a API Key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja revogar esta chave? Esta ação não pode ser desfeita.'))
      return

    try {
      await revokeApiKey(keyId)
      loadApiKeys()
    } catch (error) {
      console.error('Erro ao revogar API Key:', error)
      alert('Não foi possível revogar a API Key')
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const togglePermission = (permission: string) => {
    setPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    )
  }

  const allPermissions = [
    {
      id: 'payments:create',
      label: 'Criar Pagamentos',
      description: 'Criar novos pagamentos via API',
    },
    { id: 'payments:read', label: 'Ler Pagamentos', description: 'Consultar status de pagamentos' },
    {
      id: 'payments:cancel',
      label: 'Cancelar Pagamentos',
      description: 'Cancelar pagamentos pendentes',
    },
    {
      id: 'webhooks:manage',
      label: 'Gerenciar Webhooks',
      description: 'Configurar endpoints de webhook',
    },
  ]

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <Link
                to='/gateway/dashboard'
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
              >
                <ChevronLeft className='w-5 h-5' />
              </Link>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>API Keys</h1>
                <p className='text-slate-600 dark:text-slate-400 mt-1'>
                  Gerencie suas chaves de acesso à API
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className='flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors'
            >
              <Plus className='w-5 h-5' />
              Nova API Key
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Security Notice */}
        <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6 flex items-start gap-3'>
          <AlertTriangle className='w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5' />
          <div>
            <h3 className='font-medium text-amber-800 dark:text-amber-200'>
              Importante sobre segurança
            </h3>
            <p className='text-sm text-amber-700 dark:text-amber-300 mt-1'>
              Suas API Keys dão acesso à sua conta. Nunca compartilhe ou exponha suas chaves em
              código público. As chaves de teste podem ser usadas em ambiente de desenvolvimento.
            </p>
          </div>
        </div>

        {/* API Keys List */}
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700'>
          {loading ? (
            <div className='p-12 text-center'>
              <RefreshCw className='w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3' />
              <p className='text-slate-500 dark:text-slate-400'>Carregando chaves...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className='p-12 text-center'>
              <Key className='w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-slate-900 dark:text-white mb-2'>
                Nenhuma API Key criada
              </h3>
              <p className='text-slate-500 dark:text-slate-400 mb-6'>
                Crie sua primeira chave de API para começar a integrar
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className='inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors'
              >
                <Plus className='w-5 h-5' />
                Criar API Key
              </button>
            </div>
          ) : (
            <div className='divide-y divide-slate-100 dark:divide-slate-700'>
              {apiKeys.map(key => (
                <div
                  key={key.id}
                  className='p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                >
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                    <div className='flex items-start gap-4'>
                      <div
                        className={`p-3 rounded-xl ${
                          key.environment === 'live'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
                        <Key
                          className={`w-6 h-6 ${
                            key.environment === 'live'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <h3 className='font-semibold text-slate-900 dark:text-white'>
                            {key.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              key.environment === 'live'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {key.environment === 'live' ? 'Produção' : 'Teste'}
                          </span>
                          {!key.is_active && (
                            <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'>
                              Revogada
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-4 mt-2'>
                          <code className='px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm font-mono text-slate-600 dark:text-slate-400'>
                            {key.key_prefix}••••••••••••
                          </code>
                          <button
                            onClick={() => copyToClipboard(key.key_prefix, key.id)}
                            className='p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                          >
                            {copiedId === key.id ? (
                              <Check className='w-4 h-4 text-emerald-500' />
                            ) : (
                              <Copy className='w-4 h-4' />
                            )}
                          </button>
                        </div>
                        <div className='flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='w-4 h-4' />
                            Criada em {formatDate(key.created_at)}
                          </span>
                          {key.last_used_at && (
                            <span>Último uso: {formatDate(key.last_used_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {key.is_active && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className='flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors'
                      >
                        <Trash2 className='w-4 h-4' />
                        <span className='hidden sm:inline'>Revogar</span>
                      </button>
                    )}
                  </div>

                  {/* Permissions */}
                  {key.permissions && key.permissions.length > 0 && (
                    <div className='mt-4 flex flex-wrap gap-2'>
                      {key.permissions.map(perm => (
                        <span
                          key={perm}
                          className='px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium'
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentation Link */}
        <div className='mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white'>
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-white/20 rounded-xl'>
              <Shield className='w-6 h-6' />
            </div>
            <div>
              <h3 className='font-semibold text-lg mb-2'>Documentação da API</h3>
              <p className='text-white/80 mb-4'>
                Consulte nossa documentação completa para integrar o WolkPay Gateway ao seu sistema.
              </p>
              <a
                href='/docs/api'
                className='inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl font-medium hover:bg-white/90 transition-colors'
              >
                Ver Documentação
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/50 backdrop-blur-sm'
            onClick={() => setShowCreateModal(false)}
          />
          <div className='relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl'>
            <div className='px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
                Criar Nova API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className='p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='p-6 space-y-5'>
              {/* Key Name */}
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Nome da Chave
                </label>
                <input
                  type='text'
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder='Ex: Backend Production'
                  className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
              </div>

              {/* Key Type */}
              <div>
                <span className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Ambiente
                </span>
                <div className='grid grid-cols-2 gap-3'>
                  <button
                    type='button'
                    onClick={() => setKeyEnv('test')}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      keyEnv === 'test'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p
                      className={`font-medium ${keyEnv === 'test' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}
                    >
                      Teste
                    </p>
                    <p className='text-xs text-slate-500 mt-1'>Para desenvolvimento</p>
                  </button>
                  <button
                    type='button'
                    onClick={() => setKeyEnv('live')}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      keyEnv === 'live'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p
                      className={`font-medium ${keyEnv === 'live' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}
                    >
                      Produção
                    </p>
                    <p className='text-xs text-slate-500 mt-1'>Para uso real</p>
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Permissões
                </label>
                <div className='space-y-2'>
                  {allPermissions.map(perm => (
                    <label
                      key={perm.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        permissions.includes(perm.id)
                          ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type='checkbox'
                        checked={permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className='mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
                      />
                      <div>
                        <p className='text-sm font-medium text-slate-900 dark:text-white'>
                          {perm.label}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          {perm.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateKey}
                disabled={!keyName.trim() || creating}
                className='w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
              >
                {creating ? (
                  <>
                    <RefreshCw className='w-5 h-5 animate-spin' />
                    Criando...
                  </>
                ) : (
                  <>
                    <Key className='w-5 h-5' />
                    Criar API Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Display Modal */}
      {showKeyModal && newKey && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
          <div className='relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl'>
            <div className='p-6 text-center'>
              <div className='w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Key className='w-8 h-8 text-emerald-600 dark:text-emerald-400' />
              </div>
              <h3 className='text-xl font-semibold text-slate-900 dark:text-white mb-2'>
                API Key Criada!
              </h3>
              <p className='text-slate-600 dark:text-slate-400 mb-6'>
                Copie sua chave agora. Por segurança, ela não será exibida novamente.
              </p>

              <div className='bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6'>
                <div className='flex items-center justify-between gap-3'>
                  <code className='flex-1 text-sm font-mono text-slate-900 dark:text-white break-all text-left'>
                    {newKey.secret_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.secret_key, 'new-key')}
                    title='Copiar chave'
                    className='p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex-shrink-0'
                  >
                    {copiedId === 'new-key' ? (
                      <Check className='w-5 h-5' />
                    ) : (
                      <Copy className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </div>

              <div className='flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-6'>
                <Lock className='w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0' />
                <p className='text-sm text-amber-700 dark:text-amber-300 text-left'>
                  Guarde esta chave em local seguro. Ela não poderá ser visualizada novamente.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowKeyModal(false)
                  setNewKey(null)
                }}
                className='w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors'
              >
                Entendi, já copiei
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
