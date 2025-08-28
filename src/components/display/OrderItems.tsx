import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderItemsProps {
  items: OrderItem[];
}

export function OrderItems({ items }: OrderItemsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 max-w-md w-full mx-4">
      <div className="flex items-center justify-center mb-3">
        <ShoppingBag className="w-4 h-4 text-purple-600 mr-2" />
        <span className="text-sm font-medium text-purple-600">Order Items</span>
      </div>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-xs">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">
                {item.quantity}x {item.name}
              </div>
            </div>
            <div className="ml-2 font-medium text-gray-600 flex-shrink-0">
              ${item.totalPrice.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      {items.length > 4 && (
        <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-200">
          Showing {Math.min(4, items.length)} of {items.length} items
        </div>
      )}
    </div>
  );
}