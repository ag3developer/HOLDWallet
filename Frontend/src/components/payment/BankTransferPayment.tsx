/**
 * 💳 Bank Transfer Payment - React Component
 * Component para exibir instruções de transferência bancária
 *
 * Uso: Integrar na página de confirmação do Instant Trade
 */

import React, { useState, useEffect } from 'react'
import { Copy, Download, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

interface BankTransferPaymentProps {
  transferId: string
  transferData: {
    transfer_id: string
    status: 'pending' | 'confirmed' | 'failed'
    amount_brl: number
    bank_account: {
      bank_code: string
      bank_name: string
      agency: string
      account_number: string
      account_digit: string
      account_name: string
    }
    reference_code: string
    description: string
    expires_at: string
    instructions: string
  }
  onPaymentConfirmed?: () => void
  onTimeout?: () => void
}

export function BankTransferPayment({
  transferData,
  onPaymentConfirmed,
  onTimeout,
}: BankTransferPaymentProps) {
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60) // 15 minutos
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'expired'>(
    transferData.status as any
  )

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired')
          onTimeout?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onTimeout])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='w-full max-w-2xl mx-auto p-6 rounded-xl bg-gray-900 border border-gray-800'>
      {/* Header */}
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-white mb-2'>💳 Transferência Bancária</h2>
        <p className='text-gray-400'>Transfira para a conta abaixo para completar sua compra</p>
      </div>

      {/* Status Bar */}
      {status === 'confirmed' && (
        <div className='mb-6 p-4 bg-green-900/30 border border-green-600 rounded-lg flex items-center gap-3'>
          <CheckCircle2 className='w-5 h-5 text-green-500' />
          <div>
            <p className='text-green-500 font-semibold'>Pagamento confirmado! ✓</p>
            <p className='text-green-400 text-sm'>Seu trade será completado em breve.</p>
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div className='mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg flex items-center gap-3'>
          <AlertCircle className='w-5 h-5 text-red-500' />
          <div>
            <p className='text-red-500 font-semibold'>Solicitação expirada</p>
            <p className='text-red-400 text-sm'>
              Por favor, crie uma nova solicitação de transferência.
            </p>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <>
          {/* Timer */}
          <div className='mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg flex items-center gap-3'>
            <Clock className='w-5 h-5 text-blue-500' />
            <div>
              <p className='text-blue-400 font-semibold'>Tempo restante: {formatTime(timeLeft)}</p>
              <p className='text-blue-300 text-sm'>
                Você tem 15 minutos para fazer a transferência
              </p>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className='mb-6 bg-gray-800 rounded-lg p-6 border border-gray-700'>
            <h3 className='text-white font-semibold mb-4'>Dados para Transferência</h3>

            <div className='space-y-4'>
              {/* Bank */}
              <div>
                <label className='text-gray-400 text-sm'>Banco</label>
                <div className='flex items-center justify-between mt-2'>
                  <div>
                    <p className='text-white font-semibold'>
                      {transferData.bank_account.bank_name}
                    </p>
                    <p className='text-gray-400 text-sm'>
                      Código: {transferData.bank_account.bank_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(transferData.bank_account.bank_code)}
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                    title='Copiar código do banco'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Agency */}
              <div>
                <label className='text-gray-400 text-sm'>Agência</label>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-white font-semibold text-lg'>
                    {transferData.bank_account.agency}
                  </p>
                  <button
                    onClick={() => copyToClipboard(transferData.bank_account.agency)}
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className='text-gray-400 text-sm'>Conta</label>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-white font-semibold text-lg'>
                    {transferData.bank_account.account_number}-
                    {transferData.bank_account.account_digit}
                  </p>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${transferData.bank_account.account_number}-${transferData.bank_account.account_digit}`
                      )
                    }
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className='text-gray-400 text-sm'>Titular da Conta</label>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-white font-semibold'>
                    {transferData.bank_account.account_name}
                  </p>
                  <button
                    onClick={() => copyToClipboard(transferData.bank_account.account_name)}
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className='pt-4 border-t border-gray-700'>
                <label className='text-gray-400 text-sm'>Valor</label>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-green-500 font-bold text-2xl'>
                    R$ {transferData.amount_brl.toFixed(2)}
                  </p>
                  <button
                    onClick={() => copyToClipboard(transferData.amount_brl.toFixed(2))}
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                  >
                    <Copy className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Reference Code */}
              <div className='pt-4 border-t border-gray-700'>
                <label className='text-gray-400 text-sm'>Referência (Descrição da TED/DOC)</label>
                <div className='flex items-center justify-between mt-2'>
                  <p className='text-white font-semibold'>{transferData.reference_code}</p>
                  <button
                    onClick={() => copyToClipboard(transferData.reference_code)}
                    className='p-2 hover:bg-gray-700 rounded transition-colors'
                  >
                    <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                {copied && <p className='text-green-500 text-sm mt-2'>Copiado! ✓</p>}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className='mb-6 bg-amber-900/20 border border-amber-600 rounded-lg p-4'>
            <h4 className='text-amber-400 font-semibold mb-2'>ℹ️ Instruções</h4>
            <ol className='text-amber-300 text-sm space-y-2 list-decimal list-inside'>
              <li>Abra seu banco (app ou website)</li>
              <li>Selecione TED/DOC para a agência {transferData.bank_account.agency}</li>
              <li>
                Digite a conta {transferData.bank_account.account_number}-
                {transferData.bank_account.account_digit}
              </li>
              <li>Digite o valor exato: R$ {transferData.amount_brl.toFixed(2)}</li>
              <li>Na descrição, use: {transferData.reference_code}</li>
              <li>Confirme e envie</li>
              <li>Sua compra será completada automaticamente</li>
            </ol>
          </div>

          {/* Copy All Button */}
          <button
            onClick={() => {
              const text = `
Banco: ${transferData.bank_account.bank_name}
Agência: ${transferData.bank_account.agency}
Conta: ${transferData.bank_account.account_number}-${transferData.bank_account.account_digit}
Titular: ${transferData.bank_account.account_name}
Valor: R$ ${transferData.amount_brl.toFixed(2)}
Referência: ${transferData.reference_code}
              `.trim()
              copyToClipboard(text)
            }}
            className='w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2'
          >
            <Copy className='w-4 h-4' />
            Copiar todos os dados
          </button>
        </>
      )}

      {/* Download Instructions */}
      <button
        onClick={() => {
          const text = `
HOLD Wallet - Instruções de Transferência Bancária
================================================

Transferência ID: ${transferData.transfer_id}
Data: ${new Date().toLocaleString('pt-BR')}

DADOS DA CONTA:
Banco: ${transferData.bank_account.bank_name} (${transferData.bank_account.bank_code})
Agência: ${transferData.bank_account.agency}
Conta: ${transferData.bank_account.account_number}-${transferData.bank_account.account_digit}
Titular: ${transferData.bank_account.account_name}

VALORES:
Valor a transferir: R$ ${transferData.amount_brl.toFixed(2)}
Referência: ${transferData.reference_code}

INSTRUÇÕES:
1. Abra seu banco (app ou website)
2. Selecione TED/DOC
3. Digite os dados da conta conforme acima
4. Na descrição, use: ${transferData.reference_code}
5. Confirme e envie
6. Sua compra será completada automaticamente

Tempo limite: 15 minutos
Expiração: ${transferData.expires_at}
          `.trim()

          const element = document.createElement('a')
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
          element.setAttribute('download', `transferencia_${transferData.transfer_id}.txt`)
          element.style.display = 'none'
          document.body.appendChild(element)
          element.click()
          document.body.removeChild(element)
        }}
        className='w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2'
      >
        <Download className='w-4 h-4' />
        Baixar instruções
      </button>
    </div>
  )
}

export default BankTransferPayment
