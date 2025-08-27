'use client';

import React, { useState, useEffect } from 'react';
import { RealtimeClient, DisplayEvent } from '@/lib/realtime';

interface DisplayOrder {
  orderId: string;
  amount: number;
  reference: string;
  qrSvg: string;
  expiresAt?: string;
}

export function CustomerDisplay() {
  const [currentOrder, setCurrentOrder] = useState<DisplayOrder | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Subscribe to display events
  useEffect(() => {
    const realtimeClient = new RealtimeClient();
    const tenantId = '00000000-0000-0000-0000-000000000001'; // Demo tenant

    const unsubscribe = realtimeClient.subscribeToDisplay(
      tenantId,
      (event: DisplayEvent) => {
        console.log('[DISPLAY] Event received:', event);
        
        if (event.type === 'show' && event.qr_svg) {
          setCurrentOrder({
            orderId: event.order_id!,
            amount: event.amount!,
            reference: event.reference!,
            qrSvg: event.qr_svg,
            expiresAt: event.expires_at
          });
        } else if (event.type === 'hide') {
          setCurrentOrder(null);
        }
      }
    );

    return () => {
      unsubscribe();
      realtimeClient.disconnect();
    };
  }, []);

  // Timer for expiry
  useEffect(() => {
    if (currentOrder?.expiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiry = new Date(currentOrder.expiresAt!).getTime();
        const diff = Math.max(0, expiry - now);
        setTimeLeft(Math.floor(diff / 1000));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [currentOrder?.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      {currentOrder ? (
        /* QR Display Mode */
        <div className="text-center max-w-lg w-full">
          {/* QR Code */}
          <div className="mb-8">
            <div 
              className="inline-block p-6 bg-white border-4 border-gray-200 rounded-2xl shadow-lg"
              dangerouslySetInnerHTML={{ __html: currentOrder.qrSvg }}
            />
          </div>

          {/* Amount */}
          <div className="mb-6">
            <div className="text-6xl font-bold text-emerald-600 mb-2">
              SGD {currentOrder.amount.toFixed(2)}
            </div>
            <div className="text-xl font-mono text-gray-700 bg-gray-100 px-4 py-2 rounded-lg inline-block">
              {currentOrder.reference}
            </div>
          </div>

          {/* Timer */}
          {currentOrder.expiresAt && (
            <div className="mb-6">
              <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-500">remaining</div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-lg text-gray-600 space-y-2">
            <p className="font-medium">Scan with any Singapore banking app</p>
            <p className="text-base">DBS • OCBC • UOB • Maybank • POSB</p>
          </div>
        </div>
      ) : (
        /* Idle Mode */
        <div className="text-center">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <QrCode className="w-16 h-16 text-gray-400" />
          </div>
          <h2 className="text-2xl font-medium text-gray-500">Ready</h2>
          <p className="text-gray-400 mt-2">Waiting for payment request...</p>
        </div>
      )}
    </div>
  );
}