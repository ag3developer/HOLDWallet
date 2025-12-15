import React, { useState } from 'react'
import { Copy, Check, FileText, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface BankDetailsProps {
  readonly onProofSubmitted?: (proofUrl: string) => void
  readonly tradeId?: string | undefined
}

export function BankDetailsDisplay({ onProofSubmitted, tradeId }: BankDetailsProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  // Dados bancários da Hold Digital Assets
  const bankDetails = {
    bankName: 'Banco do Brasil',
    accountType: 'Conta Corrente',
    accountHolder: 'HOLD DIGITAL ASSETS LTDA',
    cnpj: '24.275.355/0001-51',
    agency: '5271-0',
    account: '26689-2',
    pixKey: '24.275.355/0001-51', // PIX Key - CNPJ
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied!`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum 5MB allowed.')
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or PDF.')
      return
    }

    setUploadingProof(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      if (tradeId) {
        formData.append('trade_id', tradeId)
      }

      // Upload to backend
      const response = await fetch(`${API_BASE}/instant-trade/upload-proof`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      toast.success('Proof uploaded successfully!')
      onProofSubmitted?.(data.proof_url)
    } catch (error) {
      toast.error('Failed to upload proof. Please try again.')
      console.error('Upload error:', error)
    } finally {
      setUploadingProof(false)
    }
  }

  return (
    <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-5 space-y-4'>
      {/* Header */}
      <div className='flex items-center gap-2'>
        <Building2 className='w-5 h-5 text-blue-600 dark:text-blue-400' />
        <div>
          <h3 className='font-semibold text-sm text-gray-900 dark:text-white'>Bank Transfer</h3>
          <p className='text-xs text-gray-600 dark:text-gray-400'>
            Transfer to HOLD Digital Assets
          </p>
        </div>
      </div>

      {/* Bank Information - Compact Grid */}
      <div className='grid grid-cols-2 gap-3'>
        {/* Bank Name */}
        <div className='bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Bank</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-semibold text-sm text-gray-900 dark:text-white truncate'>
              {bankDetails.bankName}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.bankName, 'Bank')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'Bank' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* CNPJ */}
        <div className='bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>CNPJ</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-mono font-semibold text-sm text-gray-900 dark:text-white truncate'>
              {bankDetails.cnpj}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.cnpj, 'CNPJ')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'CNPJ' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* Agency */}
        <div className='bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Agency</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-mono font-semibold text-sm text-gray-900 dark:text-white'>
              {bankDetails.agency}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.agency, 'Agency')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'Agency' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* Account */}
        <div className='bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Account</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-mono font-semibold text-sm text-gray-900 dark:text-white'>
              {bankDetails.account}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.account, 'Account')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'Account' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* Account Holder - Full Width */}
        <div className='col-span-2 bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Account Holder</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-semibold text-sm text-gray-900 dark:text-white truncate'>
              {bankDetails.accountHolder}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.accountHolder, 'Holder')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'Holder' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>

        {/* PIX Key - Full Width */}
        <div className='col-span-2 bg-white dark:bg-gray-800 p-3 rounded'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>PIX Key (CNPJ)</p>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-mono font-semibold text-sm text-gray-900 dark:text-white truncate'>
              {bankDetails.pixKey}
            </p>
            <button
              onClick={() => copyToClipboard(bankDetails.pixKey, 'PIX')}
              className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0'
            >
              {copied === 'PIX' ? (
                <Check className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4 text-gray-400' />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* File Upload for Proof - Compact */}
      <div className='space-y-2'>
        <div className='block text-xs font-semibold text-gray-700 dark:text-gray-300'>
          Upload Proof
        </div>
        <div className='border-2 border-dashed border-blue-300 dark:border-blue-600 rounded p-4 text-center hover:border-blue-400 transition-colors'>
          <input
            type='file'
            accept='.jpg,.jpeg,.png,.pdf'
            onChange={handleFileUpload}
            disabled={uploadingProof}
            className='hidden'
            id='proof-upload'
          />
          <label htmlFor='proof-upload' className='cursor-pointer flex flex-col items-center gap-2'>
            <FileText className='w-5 h-5 text-blue-600 dark:text-blue-400' />
            <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
              {uploadingProof ? 'Uploading...' : 'Click to upload'}
            </span>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              JPG, PNG or PDF (Max. 5MB)
            </span>
          </label>
        </div>
      </div>

      {/* Support Message - Compact */}
      <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-3'>
        <p className='text-xs text-amber-800 dark:text-amber-200'>
          ✓ Upload proof after transfer. Support will verify within 2-4 hours.
        </p>
      </div>
    </div>
  )
}
