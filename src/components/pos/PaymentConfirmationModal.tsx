'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, QrCode } from 'lucide-react';
import { RealtimeClient } from '../../lib/realtime';
import { realtimeQR } from '../../lib/realtime-qr';

interface OrderResult {
  orderId: string;
  amount: number;
  reference: string;
  qrSvg: string;
  expiresAt: string;
}

interface PaymentConfirmationModalProps {
  order: OrderResult;
  onComplete: (status: 'paid' | 'canceled') => void;
}

export function PaymentConfirmationModal({ order, onComplete }: PaymentConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState('');

  // Debug log to verify component is rendering
  console.log('[PAYMENT_MODAL] Component rendering with order:', order);

  // Calculate time left
  useEffect(() => {
    console.log('[PAYMENT_MODAL] Setting up timer for expiry:', order.expiresAt);
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.expiresAt).getTime();
      const diff = Math.max(0, expiry - now);
      const seconds = Math.floor(diff / 1000);
      setTimeLeft(seconds);
      console.log('[PAYMENT_MODAL] Time left updated:', seconds);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [order.expiresAt]);

  // Auto-expire when time runs out
  useEffect(() => {
    if (timeLeft === 0) {
      console.log('[PAYMENT_MODAL] Time expired, auto-canceling');
      handleCancel();
    }
  }, [timeLeft]);

  // Subscribe to realtime order updates
  useEffect(() => {
    console.log('[PAYMENT_MODAL] Setting up realtime subscription for order:', order.orderId);
    const realtimeClient = new RealtimeClient();
    const tenantId = '00000000-0000-0000-0000-000000000001'; // Demo tenant

    const unsubscribe = realtimeClient.subscribeToOrder(
      tenantId,
      order.orderId,
      (event) => {
        console.log('[MODAL] Order event received:', event);
        if (event.type === 'paid') {
          console.log('[PAYMENT_MODAL] Order paid via realtime, completing');
          onComplete('paid');
        } else if (event.type === 'canceled') {
          console.log('[PAYMENT_MODAL] Order canceled via realtime, completing');
          onComplete('canceled');
        }
      }
    );

    return () => {
      console.log('[PAYMENT_MODAL] Cleaning up realtime subscription');
      unsubscribe();
      realtimeClient.disconnect();
    };
  }, [order.orderId, onComplete]);

  const handleMarkPaid = async () => {
    console.log('[PAYMENT_MODAL] Mark paid button clicked');
    setIsProcessing(true);
    setError('');

    try {
      // Clear QR from all displays via real-time system
      await realtimeQR.clearQR();
      console.log('[MODAL] QR cleared from all displays');

      console.log('[MODAL] Order marked as paid successfully');
      onComplete('paid');

    } catch (error) {
      console.error('[MODAL] Error marking as paid:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark as paid');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    console.log('[PAYMENT_MODAL] Cancel button clicked');
    setIsProcessing(true);
    setError('');

    try {
      // Clear QR from all displays via real-time system
      await realtimeQR.clearQR();
      console.log('[MODAL] QR cleared from all displays');

      console.log('[MODAL] Order canceled successfully');
      onComplete('canceled');

    } catch (error) {
      console.error('[MODAL] Error canceling order:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel order');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  console.log('[PAYMENT_MODAL] About to render modal with timeLeft:', timeLeft);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Waiting for Payment</h2>
              <p className="text-sm text-gray-600">Manual confirmation required</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-gray-500">remaining</div>
          </div>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                SGD {order.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reference</span>
              <span className="text-sm font-mono font-medium text-gray-900">
                {order.reference}
              </span>
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              <div 
                className="w-32 h-32"
                dangerouslySetInnerHTML={{ __html: order.qrSvg }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">QR code displayed on customer screen</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Customer scans QR code with banking app</li>
              <li>Wait for payment confirmation on your phone</li>
              <li>Click "Paid" when you receive the bank notification</li>
            </ol>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={handleMarkPaid}
            disabled={isProcessing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Bezahlt</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            <span>Abbrechen</span>
          </button>
        </div>
      </div>
    </div>
  );
}