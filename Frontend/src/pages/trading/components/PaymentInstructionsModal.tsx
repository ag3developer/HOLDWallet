import React, { useState } from 'react'
import { X, Copy, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/services/api'

interface BankDetails {
  bank_code: string
  bank_name: string
  agency: string
  account_number: string
  account_holder: string
  cnpj: string
  pix_key: string
  instructions: string
}

interface PaymentInstructionsModalProps {
  readonly isOpen: boolean
  readonly tradeId: string
  readonly referenceCode: string
  readonly totalAmount: number
  readonly bankDetails: BankDetails
  readonly onClose: () => void
}

export function PaymentInstructionsModal({
  isOpen,
  tradeId,
  referenceCode,
  totalAmount,
  bankDetails,
  onClose,
}: PaymentInstructionsModalProps) {
  const [uploading, setUploading] = useState(false)
  const [proofUploaded, setProofUploaded] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Only JPG, PNG or PDF files are allowed')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('trade_id', tradeId)

      // TODO: Implement file upload endpoint
      // await apiClient.post(`/instant-trade/${tradeId}/upload-proof`, formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // })

      // Temporary: Just confirm payment without actual upload
      await apiClient.post(`/instant-trade/${tradeId}/confirm-payment`, {
        payment_proof_url: `temp_${file.name}`,
      })

      setProofUploaded(true)
      toast.success('Payment proof uploaded! Awaiting confirmation.')

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error uploading proof')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[95vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Payment Instructions</h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-4 space-y-4'>
          {/* Status Alert */}
          <div className='bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0' />
              <div className='text-sm text-blue-800 dark:text-blue-200'>
                <p className='font-semibold mb-1'>Order Reference: {referenceCode}</p>
                <p>Transfer R$ {totalAmount.toFixed(2)} and upload proof of payment below.</p>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
              Bank Account Details
            </h3>

            <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2'>
              {/* Bank */}
              <div className='flex justify-between items-center'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Bank</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-gray-900 dark:text-white'>
                    {bankDetails.bank_name}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.bank_name, 'Bank name')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* CNPJ */}
              <div className='flex justify-between items-center'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>CNPJ</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-mono text-gray-900 dark:text-white'>
                    {bankDetails.cnpj}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.cnpj, 'CNPJ')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* Agency */}
              <div className='flex justify-between items-center'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Agency</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-mono text-gray-900 dark:text-white'>
                    {bankDetails.agency}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.agency, 'Agency')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className='flex justify-between items-center'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Account</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-mono text-gray-900 dark:text-white'>
                    {bankDetails.account_number}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.account_number, 'Account')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* Account Holder */}
              <div className='flex justify-between items-center'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Account Holder</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-gray-900 dark:text-white'>
                    {bankDetails.account_holder}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.account_holder, 'Account holder')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* PIX Key */}
              <div className='flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600'>
                <span className='text-xs text-gray-600 dark:text-gray-400'>PIX Key (CNPJ)</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-mono text-gray-900 dark:text-white'>
                    {bankDetails.pix_key}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.pix_key, 'PIX key')}
                    className='text-blue-600 hover:text-blue-700'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Proof */}
          <div className='space-y-2'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
              Upload Proof of Payment
            </h3>

            {!proofUploaded ? (
              <div className='border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4'>
                <input
                  type='file'
                  id='proof-upload'
                  className='hidden'
                  accept='.jpg,.jpeg,.png,.pdf'
                  onChange={handleFileChange}
                />
                <label
                  htmlFor='proof-upload'
                  className='flex flex-col items-center justify-center cursor-pointer'
                >
                  <Upload className='w-8 h-8 text-gray-400 mb-2' />
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {file ? file.name : 'Click to upload (JPG, PNG or PDF)'}
                  </span>
                  <span className='text-xs text-gray-500 dark:text-gray-500 mt-1'>Max 5MB</span>
                </label>
              </div>
            ) : (
              <div className='bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-green-600' />
                  <span className='text-sm text-green-800 dark:text-green-200'>
                    Payment proof uploaded successfully!
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <p className='text-xs text-gray-600 dark:text-gray-400 mt-2'>
              ✓ Make the transfer to the account above
              <br />
              ✓ Upload a clear photo or screenshot of the receipt
              <br />
              ✓ Our team will verify within 2-4 hours
              <br />✓ You'll receive crypto once payment is confirmed
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-2 pt-2'>
            <button
              onClick={onClose}
              disabled={uploading}
              className='flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
            >
              {proofUploaded ? 'Close' : 'Cancel'}
            </button>
            {!proofUploaded && (
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className='flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {uploading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className='w-4 h-4' />
                    <span>Upload Proof</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
