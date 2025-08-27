'use client';

import React from 'react';
import { Minus, Plus, Trash2, ShoppingCart as CartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCentsToSGD, calculateCartTotal } from '@/lib/money';

export interface CartLine {
  itemId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
}

interface ShoppingCartProps {
  lines: CartLine[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveLine: (itemId: string) => void;
  onClearCart: () => void;
  onTransferToAmount: () => void;
  onGenerateQR?: () => Promise<void>;
}

export function ShoppingCart({ 
  lines, 
  onUpdateQuantity, 
  onRemoveLine, 
  onClearCart, 
  onTransferToAmount,
  onGenerateQR
}: ShoppingCartProps) {
  const subtotalCents = calculateCartTotal(lines);
  const hasItems = lines.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 space-y-3 lg:space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CartIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base lg:text-lg font-bold text-gray-900">Shopping Cart</h3>
          {hasItems && (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {lines.length} item{lines.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Cart Items */}
      {hasItems ? (
        <div className="space-y-2 lg:space-y-3 max-h-48 lg:max-h-64 overflow-y-auto">
          {lines.map((line) => (
            <div key={line.itemId} className="flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                  {line.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatCentsToSGD(line.unitPriceCents)} each
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-3">
                {/* Quantity Controls */}
                <div className="flex items-center space-x-1 bg-white rounded-lg border p-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (line.qty === 1) {
                        onRemoveLine(line.itemId);
                      } else {
                        onUpdateQuantity(line.itemId, line.qty - 1);
                      }
                    }}
                    className="h-6 lg:h-7 w-6 lg:w-7 p-0 border-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Minus className="w-2 lg:w-3 h-2 lg:h-3" />
                  </Button>
                  
                  <span className="text-xs lg:text-sm font-bold w-6 lg:w-8 text-center bg-gray-50 rounded px-1">
                    {line.qty}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(line.itemId, line.qty + 1)}
                    className="h-6 lg:h-7 w-6 lg:w-7 p-0 border-0 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Plus className="w-2 lg:w-3 h-2 lg:h-3" />
                  </Button>
                </div>

                {/* Line Total */}
                <div className="text-xs lg:text-sm font-bold text-emerald-600 w-16 lg:w-20 text-right">
                  {formatCentsToSGD(line.qty * line.unitPriceCents)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 lg:py-12">
          <div className="w-12 lg:w-16 h-12 lg:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CartIcon className="w-6 lg:w-8 h-6 lg:h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium text-sm lg:text-base">Your cart is empty</p>
          <p className="text-sm text-gray-400 mt-1">Click on products to add them</p>
        </div>
      )}

      {/* Subtotal */}
      {hasItems && (
        <div className="border-t pt-3 lg:pt-4 space-y-3 lg:space-y-4">
          <div className="flex justify-between items-center bg-emerald-50 p-2 lg:p-3 rounded-lg">
            <span className="text-base lg:text-lg font-bold text-gray-900">Subtotal:</span>
            <span className="text-lg lg:text-2xl font-bold text-emerald-600">
              {formatCentsToSGD(subtotalCents)}
            </span>
          </div>

          {/* Transfer to Amount Button */}
          <Button
            onClick={onTransferToAmount}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 lg:py-4 text-sm lg:text-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            💳 Transfer to Payment
          </Button>

          {/* Generate QR & Pay Button */}
          {onGenerateQR && (
            <Button
              onClick={onGenerateQR}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 lg:py-4 text-sm lg:text-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              🔄 Generate QR & Pay
            </Button>
          )}
        </div>
      )}
    </div>
  );
}