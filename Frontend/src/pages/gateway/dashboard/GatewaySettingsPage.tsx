/**
 * WolkPay Gateway - Configurações do Merchant
 * Gerenciar perfil, dados empresariais e preferências
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Settings,
  ChevronLeft,
  RefreshCw,
  Save,
  Building2,
  Mail,
  Phone,
  Globe,
  Image,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react'
import {
  getMerchantProfile,
  updateMerchantProfile,
  getGatewayFees,
  type MerchantProfile,
  type MerchantStatus,
} from '../../../services/gatewayService'
import { isGatewayDomain } from '@/utils/domainDetection'

// Prefixo de rota: vazio no subdomínio gateway.*, /gateway no domínio principal.
const ROUTE_PREFIX = isGatewayDomain() ? '' : '/gateway'

export default function GatewaySettingsPage() {
  const { t, i18n } = useTranslation()
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [settlementCurrency, setSettlementCurrency] = useState<'BRL' | 'USDT' | 'ORIGINAL'>('BRL')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletNetwork, setWalletNetwork] = useState('')
  const [defaultPixFee, setDefaultPixFee] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
    getGatewayFees()
      .then(f => setDefaultPixFee(f.pix_fee_percent))
      .catch(() => setDefaultPixFee(null))
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profile = await getMerchantProfile()
      setMerchant(profile)

      // Populate form
      setBusinessName(profile.business_name || '')
      setBusinessEmail(profile.business_email || '')
      setBusinessPhone(profile.business_phone || '')
      setWebsiteUrl(profile.website_url || '')
      setLogoUrl(profile.logo_url || '')
      setSettlementCurrency(profile.settlement_currency || 'BRL')
      setWalletNetwork(profile.settlement_network || '')
      setWalletAddress('')
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateMerchantProfile({
        business_name: businessName,
        business_phone: businessPhone,
        website_url: websiteUrl,
        logo_url: logoUrl,
        settlement_currency: settlementCurrency,
        // Endereço não é devolvido pela API: só envia se o lojista digitou um novo
        settlement_wallet_address:
          settlementCurrency !== 'BRL' && walletAddress.trim() ? walletAddress.trim() : undefined,
        settlement_wallet_network: settlementCurrency !== 'BRL' && walletNetwork ? walletNetwork : undefined,
      })
      setHasChanges(false)
      await loadProfile()
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert(t('gateway.portal.settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = <T extends string | boolean>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T
  ) => {
    setter(value)
    setHasChanges(true)
  }

  const getStatusConfig = (status: MerchantStatus) => {
    const configs = {
      ACTIVE: {
        label: t('gateway.portal.settings.statusActive'),
        icon: CheckCircle,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      },
      PENDING: {
        label: t('gateway.portal.settings.statusPending'),
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
      },
      SUSPENDED: {
        label: t('gateway.portal.settings.statusSuspended'),
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
      },
      BLOCKED: {
        label: t('gateway.portal.settings.statusBlocked'),
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
      },
    }
    return configs[status] || configs.PENDING
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center'>
        <RefreshCw className='w-8 h-8 text-indigo-600 animate-spin' />
      </div>
    )
  }

  const statusConfig = merchant?.status ? getStatusConfig(merchant.status) : null
  const StatusIcon = statusConfig?.icon || AlertCircle

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <Link
                to={`${ROUTE_PREFIX}/dashboard`}
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
              >
                <ChevronLeft className='w-5 h-5' />
              </Link>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>{t('gateway.portal.settings.title')}</h1>
                <p className='text-slate-600 dark:text-slate-400 mt-1'>
                  {t('gateway.portal.settings.subtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className='flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {saving ? (
                <>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  {t('gateway.portal.settings.saving')}
                </>
              ) : (
                <>
                  <Save className='w-4 h-4' />
                  {t('gateway.portal.settings.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Main Form */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Business Info */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl'>
                  <Building2 className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
                </div>
                <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                  {t('gateway.portal.settings.businessTitle')}
                </h2>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <div className='md:col-span-2'>
                  <label
                    htmlFor='business-name'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.businessName')}
                  </label>
                  <div className='relative'>
                    <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      id='business-name'
                      type='text'
                      value={businessName}
                      onChange={e => handleFieldChange(setBusinessName, e.target.value)}
                      className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='business-email'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.businessEmail')}
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      id='business-email'
                      type='email'
                      value={businessEmail}
                      readOnly
                      title={t('gateway.portal.settings.emailReadonlyHint')}
                      className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='business-phone'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.phone')}
                  </label>
                  <div className='relative'>
                    <Phone className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      id='business-phone'
                      type='tel'
                      value={businessPhone}
                      onChange={e => handleFieldChange(setBusinessPhone, e.target.value)}
                      placeholder='+55 11 99999-9999'
                      className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='website-url'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.website')}
                  </label>
                  <div className='relative'>
                    <Globe className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      id='website-url'
                      type='url'
                      value={websiteUrl}
                      onChange={e => handleFieldChange(setWebsiteUrl, e.target.value)}
                      placeholder={t('gateway.portal.settings.websitePlaceholder')}
                      className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor='logo-url'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.logoUrl')}
                  </label>
                  <div className='relative'>
                    <Image className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      id='logo-url'
                      type='url'
                      value={logoUrl}
                      onChange={e => handleFieldChange(setLogoUrl, e.target.value)}
                      placeholder='https://...'
                      className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settlement Settings */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl'>
                  <Wallet className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                    {t('gateway.portal.settings.settlementTitle')}
                  </h2>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>
                    {t('gateway.portal.settings.settlementText')}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <div className='md:col-span-2'>
                  <label
                    htmlFor='settlement-currency'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    {t('gateway.portal.settings.receiveIn')}
                  </label>
                  <select
                    id='settlement-currency'
                    value={settlementCurrency}
                    onChange={e =>
                      handleFieldChange(
                        setSettlementCurrency as React.Dispatch<React.SetStateAction<string>>,
                        e.target.value
                      )
                    }
                    className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value='BRL'>{t('gateway.portal.settings.optionBrl')}</option>
                    <option value='USDT'>USDT (stablecoin)</option>
                    <option value='ORIGINAL'>{t('gateway.portal.settings.optionOriginal')}</option>
                  </select>
                </div>

                {settlementCurrency !== 'BRL' && (
                  <>
                    <div>
                      <label
                        htmlFor='settlement-network'
                        className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                      >
                        {t('gateway.portal.settings.walletNetwork')}
                      </label>
                      <select
                        id='settlement-network'
                        value={walletNetwork}
                        onChange={e => handleFieldChange(setWalletNetwork, e.target.value)}
                        className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      >
                        <option value=''>{t('gateway.portal.settings.select')}</option>
                        <option value='polygon'>Polygon</option>
                        <option value='ethereum'>Ethereum</option>
                        <option value='bsc'>BNB Smart Chain</option>
                        <option value='bitcoin'>Bitcoin</option>
                        <option value='solana'>Solana</option>
                        <option value='litecoin'>Litecoin</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor='settlement-wallet'
                        className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                      >
                        {t('gateway.portal.settings.walletAddress')}
                      </label>
                      <input
                        id='settlement-wallet'
                        type='text'
                        value={walletAddress}
                        onChange={e => handleFieldChange(setWalletAddress, e.target.value)}
                        placeholder={t('gateway.portal.settings.walletAddressPlaceholder')}
                        className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Account Status */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>{t('gateway.portal.settings.accountStatus')}</h3>

              {statusConfig && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${statusConfig.bg}`}>
                  <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                  <div>
                    <p className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</p>
                    {merchant?.approved_at && (
                      <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
                        {t('gateway.portal.settings.approvedOn', {
                          date: formatDate(merchant.approved_at),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className='mt-4 space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.settings.document')}</span>
                  <span className='text-slate-900 dark:text-white font-mono'>
                    {merchant?.business_document || '-'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.settings.fee')}</span>
                  <span className='text-slate-900 dark:text-white'>
                    {merchant?.fee_percentage != null
                      ? `${Number(merchant.fee_percentage).toFixed(2)}%`
                      : defaultPixFee != null
                        ? t('gateway.portal.settings.defaultPixFee', {
                            fee: Number(defaultPixFee).toFixed(2),
                          })
                        : '—'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.settings.memberSince')}</span>
                  <span className='text-slate-900 dark:text-white'>
                    {formatDate(merchant?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Logo Preview */}
            {logoUrl && (
              <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
                <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>
                  {t('gateway.portal.settings.logoPreview')}
                </h3>
                <div className='aspect-video bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden'>
                  <img
                    src={logoUrl}
                    alt={t('gateway.portal.settings.logoPreviewAlt')}
                    className='max-w-full max-h-full object-contain'
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Support */}
            <div className='bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white'>
              <h3 className='font-semibold mb-2'>{t('gateway.portal.settings.helpTitle')}</h3>
              <p className='text-sm text-white/80 mb-4'>
                {t('gateway.portal.settings.helpText')}
              </p>
              <a
                href='mailto:suporte@wolknow.com'
                className='inline-block px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors'
              >
                {t('gateway.portal.settings.contactSupport')}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
