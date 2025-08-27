import React from 'react';
import { X, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order, OrderItem } from '@/contexts/OrderContext';
import { formatCentsToSGD } from '@/lib/money';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkPaid?: (orderId: string) => void;
  onMarkFailed?: (orderId: string) => void;
}

export function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onMarkPaid, 
  onMarkFailed 
}: OrderDetailsModalProps) {
  if (!order) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const calculateItemsTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + item.totalCents, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="text-lg font-bold">Order Details</div>
              <div className="text-sm font-normal text-gray-600">{order.reference}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Reference</div>
                <div className="font-mono font-medium">{order.reference}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="font-medium">{order.timestamp}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Date</div>
                <div className="font-medium">
                  {order.createdAt.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
            
            {order.description && (
              <div className="mt-4">
                <div className="text-sm text-gray-600">Description</div>
                <div className="font-medium">{order.description}</div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Order Items
              {order.items && (
                <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {formatCentsToSGD(item.unitPriceCents)} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCentsToSGD(item.totalCents)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Items Subtotal */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Items Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCentsToSGD(calculateItemsTotal(order.items))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No items details available</p>
                <p className="text-sm text-gray-400">This order was created without item breakdown</p>
              </div>
            )}
          </div>

          {/* Order Total */}
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-emerald-900">Order Total:</span>
              <span className="text-2xl font-bold text-emerald-600">
                S${order.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {order.status === 'pending' && (onMarkPaid || onMarkFailed) && (
            <div className="flex space-x-3 pt-4 border-t">
              {onMarkPaid && (
                <Button
                  onClick={() => onMarkPaid(order.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              {onMarkFailed && (
                <Button
                  onClick={() => onMarkFailed(order.id)}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Mark as Failed
                </Button>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}