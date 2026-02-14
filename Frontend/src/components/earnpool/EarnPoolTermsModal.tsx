/**
 * 📜 EarnPool Terms & Conditions Modal
 * =====================================
 *
 * Modal displaying the terms and conditions for participating in the EarnPool.
 * Users must accept these terms before making their first deposit.
 * Supports multiple languages: English, Portuguese, Spanish.
 *
 * @version 2.0.0 - Multi-language support
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Lock,
  Coins,
  Scale,
  BookOpen,
} from 'lucide-react'

interface EarnPoolTermsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  minDeposit?: number
  lockPeriod?: number
  targetYield?: number
}

export function EarnPoolTermsModal({
  isOpen,
  onClose,
  onAccept,
  minDeposit = 250,
  lockPeriod = 30,
  targetYield = 0.75,
}: Readonly<EarnPoolTermsModalProps>) {
  const { t } = useTranslation()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedRisks, setAcceptedRisks] = useState(false)

  if (!isOpen) return null

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToBottom(true)
    }
  }

  const canAccept = hasScrolledToBottom && acceptedTerms && acceptedRisks

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm'>
      <div className='bg-[#1a1a2e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-purple-500/20 shadow-2xl shadow-purple-500/10'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-800'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20'>
              <FileText className='w-6 h-6 text-purple-400' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>{t('earnpool.terms.title')}</h2>
              <p className='text-sm text-gray-400'>{t('earnpool.terms.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title={t('common.close')}
            className='p-2 rounded-lg hover:bg-gray-800 transition-colors'
          >
            <X className='w-5 h-5 text-gray-400' />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6' onScroll={handleScroll}>
          {/* Important Warning Banner */}
          <div className='p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='font-semibold text-amber-400 mb-1'>
                  {t('earnpool.terms.disclaimer.title')}
                </h3>
                <p className='text-sm text-gray-300'>
                  {t('earnpool.terms.disclaimer.text', { targetYield })}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: What is EarnPool */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Users className='w-5 h-5 text-purple-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section1.title')}
              </h3>
            </div>
            <div className='pl-7 space-y-2 text-gray-300 text-sm'>
              <p>{t('earnpool.terms.section1.p1')}</p>
              <p>{t('earnpool.terms.section1.p2')}</p>
              <p className='text-purple-300'>{t('earnpool.terms.section1.p3')}</p>
            </div>
          </div>

          {/* Section 2: How It Works */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Coins className='w-5 h-5 text-blue-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section2.title')}
              </h3>
            </div>
            <div className='pl-7 space-y-3'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div className='p-3 rounded-lg bg-gray-800/50 border border-gray-700'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Lock className='w-4 h-4 text-purple-400' />
                    <span className='font-medium text-white'>
                      {t('earnpool.terms.section2.lockPeriod.title')}
                    </span>
                  </div>
                  <p className='text-sm text-gray-400'>
                    {t('earnpool.terms.section2.lockPeriod.text', { lockPeriod })}
                  </p>
                </div>
                <div className='p-3 rounded-lg bg-gray-800/50 border border-gray-700'>
                  <div className='flex items-center gap-2 mb-2'>
                    <TrendingUp className='w-4 h-4 text-green-400' />
                    <span className='font-medium text-white'>
                      {t('earnpool.terms.section2.targetYield.title')}
                    </span>
                  </div>
                  <p className='text-sm text-gray-400'>
                    {t('earnpool.terms.section2.targetYield.text', { targetYield })}
                  </p>
                </div>
                <div className='p-3 rounded-lg bg-gray-800/50 border border-gray-700'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Coins className='w-4 h-4 text-amber-400' />
                    <span className='font-medium text-white'>
                      {t('earnpool.terms.section2.minDeposit.title')}
                    </span>
                  </div>
                  <p className='text-sm text-gray-400'>
                    {t('earnpool.terms.section2.minDeposit.text', { minDeposit })}
                  </p>
                </div>
                <div className='p-3 rounded-lg bg-gray-800/50 border border-gray-700'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Clock className='w-4 h-4 text-blue-400' />
                    <span className='font-medium text-white'>
                      {t('earnpool.terms.section2.distribution.title')}
                    </span>
                  </div>
                  <p className='text-sm text-gray-400'>
                    {t('earnpool.terms.section2.distribution.text')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Risk Disclosure */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-red-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section3.title')}
              </h3>
            </div>
            <div className='pl-7 space-y-2 text-gray-300 text-sm'>
              <p className='text-red-300 font-medium'>{t('earnpool.terms.section3.intro')}</p>
              <ul className='space-y-2'>
                <li className='flex items-start gap-2'>
                  <span className='text-red-400 mt-1'>•</span>
                  <span>{t('earnpool.terms.section3.risk1')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-400 mt-1'>•</span>
                  <span>{t('earnpool.terms.section3.risk2')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-400 mt-1'>•</span>
                  <span>{t('earnpool.terms.section3.risk3')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-400 mt-1'>•</span>
                  <span>{t('earnpool.terms.section3.risk4')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-400 mt-1'>•</span>
                  <span>{t('earnpool.terms.section3.risk5')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 4: Terms of Participation */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Scale className='w-5 h-5 text-cyan-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section4.title')}
              </h3>
            </div>
            <div className='pl-7 space-y-2 text-gray-300 text-sm'>
              <p>{t('earnpool.terms.section4.intro')}</p>
              <ul className='space-y-2'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term1')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term2')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term3')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term4')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term5')}</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                  <span>{t('earnpool.terms.section4.term6')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 5: Withdrawals */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Clock className='w-5 h-5 text-emerald-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section5.title')}
              </h3>
            </div>
            <div className='pl-7 space-y-2 text-gray-300 text-sm'>
              <p className='font-medium text-white'>
                {t('earnpool.terms.section5.afterLock.title')}
              </p>
              <ul className='ml-4 space-y-1'>
                <li>• {t('earnpool.terms.section5.afterLock.item1')}</li>
                <li>• {t('earnpool.terms.section5.afterLock.item2')}</li>
                <li>• {t('earnpool.terms.section5.afterLock.item3')}</li>
              </ul>
              <p className='mt-3 font-medium text-white'>
                {t('earnpool.terms.section5.earlyWithdraw.title')}
              </p>
              <ul className='ml-4 space-y-1'>
                <li>• {t('earnpool.terms.section5.earlyWithdraw.item1')}</li>
                <li>• {t('earnpool.terms.section5.earlyWithdraw.item2')}</li>
                <li>• {t('earnpool.terms.section5.earlyWithdraw.item3')}</li>
              </ul>
            </div>
          </div>

          {/* Section 6: Contact */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <BookOpen className='w-5 h-5 text-indigo-400' />
              <h3 className='text-lg font-semibold text-white'>
                {t('earnpool.terms.section6.title')}
              </h3>
            </div>
            <div className='pl-7 text-gray-300 text-sm'>
              <p>{t('earnpool.terms.section6.text')}</p>
            </div>
          </div>

          {/* Last Updated */}
          <div className='text-center text-xs text-gray-500 pt-4 border-t border-gray-800'>
            {t('earnpool.terms.lastUpdated')}
          </div>
        </div>

        {/* Footer with Checkboxes and Actions */}
        <div className='p-6 border-t border-gray-800 space-y-4'>
          {/* Scroll Indicator */}
          {!hasScrolledToBottom && (
            <div className='flex items-center justify-center gap-2 text-amber-400 text-sm animate-pulse'>
              <AlertTriangle className='w-4 h-4' />
              <span>{t('earnpool.terms.scrollToRead')}</span>
            </div>
          )}

          {/* Checkboxes */}
          <div className='space-y-3'>
            <label className='flex items-start gap-3 cursor-pointer group'>
              <input
                type='checkbox'
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className='mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer'
              />
              <span className='text-sm text-gray-300 group-hover:text-white transition-colors'>
                {t('earnpool.terms.checkboxTerms')}
              </span>
            </label>

            <label className='flex items-start gap-3 cursor-pointer group'>
              <input
                type='checkbox'
                checked={acceptedRisks}
                onChange={e => setAcceptedRisks(e.target.checked)}
                className='mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer'
              />
              <span className='text-sm text-gray-300 group-hover:text-white transition-colors'>
                {t('earnpool.terms.checkboxRisks')}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3'>
            <button
              onClick={onClose}
              className='flex-1 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onAccept}
              disabled={!canAccept}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${
                  canAccept
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Shield className='w-5 h-5' />
              {t('earnpool.terms.acceptButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EarnPoolTermsModal
