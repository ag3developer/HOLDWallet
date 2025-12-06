/**
 * 💸 useSendTransaction Hook
 * ===========================
 * 
 * React hook for managing send transaction flow with validation, fee estimation, and sending.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sendService } from '@/services/sendService';
import type {
  ValidateAddressRequest,
  EstimateFeeRequest,
  SendTransactionRequest,
  ValidateAddressResponse,
  EstimateFeeResponse,
  SendTransactionResponse,
  TransactionStatusResponse
} from '@/services/sendService';

export interface UseSendTransactionOptions {
  onSuccess?: (data: SendTransactionResponse) => void;
  onError?: (error: Error) => void;
}

export function useSendTransaction(options?: UseSendTransactionOptions) {
  const [validationResult, setValidationResult] = useState<ValidateAddressResponse | null>(null);
  const [feeEstimates, setFeeEstimates] = useState<EstimateFeeResponse | null>(null);

  // Validate address mutation
  const validateAddressMutation = useMutation({
    mutationFn: (request: ValidateAddressRequest) => sendService.validateAddress(request),
    onSuccess: (data) => {
      console.log('[useSendTransaction] Address validation success:', data);
      setValidationResult(data);
    },
    onError: (error: Error) => {
      console.error('[useSendTransaction] Address validation failed:', error);
      setValidationResult(null);
    }
  });

  // Estimate fee mutation
  const estimateFeeMutation = useMutation({
    mutationFn: (request: EstimateFeeRequest) => sendService.estimateFee(request),
    onSuccess: (data) => {
      console.log('[useSendTransaction] Fee estimation success:', data);
      setFeeEstimates(data);
    },
    onError: (error: Error) => {
      console.error('[useSendTransaction] Fee estimation failed:', error);
      setFeeEstimates(null);
    }
  });

  // Send transaction mutation
  const sendTransactionMutation = useMutation({
    mutationFn: (request: SendTransactionRequest) => sendService.sendTransaction(request),
    onSuccess: (data) => {
      console.log('[useSendTransaction] Transaction success:', data);
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('[useSendTransaction] Transaction failed:', error);
      options?.onError?.(error);
    }
  });

  // Validate address
  const validateAddress = useCallback(
    (address: string, network: string) => {
      validateAddressMutation.mutate({ address, network });
    },
    [validateAddressMutation]
  );

  // Estimate fees
  const estimateFee = useCallback(
    (walletId: string, toAddress: string, amount: string, network: string) => {
      estimateFeeMutation.mutate({
        wallet_id: walletId,
        to_address: toAddress,
        amount,
        network
      });
    },
    [estimateFeeMutation]
  );

  // Send transaction
  const sendTransaction = useCallback(
    (request: SendTransactionRequest) => {
      sendTransactionMutation.mutate(request);
    },
    [sendTransactionMutation]
  );

  // Reset all states
  const reset = useCallback(() => {
    setValidationResult(null);
    setFeeEstimates(null);
    validateAddressMutation.reset();
    estimateFeeMutation.reset();
    sendTransactionMutation.reset();
  }, [validateAddressMutation, estimateFeeMutation, sendTransactionMutation]);

  return {
    // Validation
    validateAddress,
    validationResult,
    isValidating: validateAddressMutation.isPending,
    validationError: validateAddressMutation.error,

    // Fee estimation
    estimateFee,
    feeEstimates,
    isEstimatingFee: estimateFeeMutation.isPending,
    feeEstimationError: estimateFeeMutation.error,

    // Send transaction
    sendTransaction,
    sendResult: sendTransactionMutation.data,
    isSending: sendTransactionMutation.isPending,
    sendError: sendTransactionMutation.error,
    sendSuccess: sendTransactionMutation.isSuccess,

    // Utilities
    reset,
    isLoading: validateAddressMutation.isPending || estimateFeeMutation.isPending || sendTransactionMutation.isPending
  };
}

/**
 * Hook to check transaction status periodically
 */
export function useTransactionStatus(transactionId: number | null, enabled: boolean = true) {
  return useQuery<TransactionStatusResponse>({
    queryKey: ['transactionStatus', transactionId],
    queryFn: () => sendService.getTransactionStatus(transactionId!),
    enabled: enabled && transactionId !== null,
    refetchInterval: (query) => {
      // Stop polling if transaction is finalized
      if (query.state.data?.final) {
        return false;
      }
      // Poll every 10 seconds for pending transactions
      return 10000;
    },
    retry: 3,
    retryDelay: 2000
  });
}

export default useSendTransaction;
