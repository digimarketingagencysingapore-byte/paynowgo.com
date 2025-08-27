import React, { useState } from 'react';
import { QrCode, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductGrid } from './ProductGrid';
import { ShoppingCart as Cart, CartLine } from './ShoppingCart';
import { QRCodeGenerator } from '../ui/QRCodeGenerator';
import { usePersistentOrders } from '@/hooks/usePersistentOrders';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { StoredItem as Item } from '@/lib/storage';
import { formatCentsToPrice, calculateCartTotal } from '@/lib/money';
import { v4 as uuidv4 } from 'uuid';

export function PersistentPOSSystem() {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [currentQR, setCurrentQR] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  const { createOrder, markOrderPaid, cancelOrder, error } = usePersistentOrders();
  const { businessType, mobile, uen } = useSettingsContext();

  const presetAmounts = [10, 25, 50, 100, 200];

  const generateReference = () => {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    const timeStr = date.getHours().toString().padStart(2, '0') + 
                   date.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `POS-${dateStr}-${timeStr}-${random}`;
  };

  const handleProductClick = (item: Item) => {
    setCart(prevCart => {
      const existingLine = prevCart.find(line => line.itemId === item.id);
      
      if (existingLine) {
        return prevCart.map(line =>
          line.itemId === item.id
            ? { ...line, qty: line.qty + 1 }
            : line
        );
      } else {
        const newLine: CartLine = {
          itemId: item.id,
          name: item.name,
          unitPriceCents: item.price_cents,
          qty: 1
        };
        return [...prevCart, newLine];
      }
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveLine(itemId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(line =>
        line.itemId === itemId ? { ...line, qty: newQty } : line
      )
    );
  };

  const handleRemoveLine = (itemId: string) => {
    setCart(prevCart => prevCart.filter(line => line.itemId !== itemId));
  };

  const handleClearCart = () => {
    if (confirm('Clear all items from cart?')) {
      setCart([]);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setIsCreatingOrder(true);

      // Determine amount and items
      let finalAmount: number;
      let orderItems: any[] = [];

      if (cart.length > 0) {
        // Use cart total
        const cartTotalCents = calculateCartTotal(cart);
        finalAmount = cartTotalCents / 100;
        
        orderItems = cart.map(line => ({
          itemId: line.itemId,
          name: line.name,
          unitPriceCents: line.unitPriceCents,
          qty: line.qty
        }));
      } else if (amount && parseFloat(amount) > 0) {
        // Use manual amount
        finalAmount = parseFloat(amount);
      } else {
        alert('Please add items to cart or enter an amount');
        return;
      }

      const finalReference = reference || generateReference();

      // Generate QR code first
      const payNowOptions = {
        mobile: businessType === 'mobile' ? mobile : null,
        uen: businessType === 'uen' ? uen : null,
        amount: finalAmount,
        refId: finalReference,
        editable: false,
        company: 'PayNowGo'
      };

      const { generatePayNowQrCode } = await import('../../utils/paynowQrGenerator');
      const qrResult = await generatePayNowQrCode(payNowOptions);

      // Create order in database
      const orderData = {
        amount: finalAmount,
        reference: finalReference,
        items: orderItems,
        idempotencyKey: uuidv4(),
        qrSvg: qrResult.qrCodeSvg,
        qrText: qrResult.url
      };

      console.log('[PERSISTENT_POS] Creating order:', orderData);

      const newOrder = await createOrder(orderData);
      
      console.log('[PERSISTENT_POS] Order created successfully:', newOrder.id);

      // Set current QR for display
      setCurrentQR({
        orderId: newOrder.id,
        qrSvg: qrResult.qrCodeSvg,
        amount: finalAmount,
        reference: finalReference,
        expiresAt: newOrder.expiresAt
      });

      // Update form
      setAmount(finalAmount.toString());
      setReference(finalReference);

      alert('Order created successfully! QR code is now displayed.');

    } catch (error) {
      console.error('[PERSISTENT_POS] Create order failed:', error);
      alert('Failed to create order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!currentQR) return;

    try {
      await markOrderPaid(currentQR.orderId);
      
      // Clear current QR
      setCurrentQR(null);
      setAmount('');
      setReference('');
      setCart([]);
      
      alert('✅ Payment confirmed!');
    } catch (error) {
      console.error('[PERSISTENT_POS] Mark paid failed:', error);
      alert('Failed to mark as paid: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancelOrder = async () => {
    if (!currentQR) return;

    if (!confirm('Cancel this order?')) return;

    try {
      await cancelOrder(currentQR.orderId);
      
      // Clear current QR
      setCurrentQR(null);
      setAmount('');
      setReference('');
      setCart([]);
      
      alert('Order canceled');
    } catch (error) {
      console.error('[PERSISTENT_POS] Cancel failed:', error);
      alert('Failed to cancel order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleReset = () => {
    setAmount('');
    setReference('');
    setCart([]);
    setCurrentQR(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Persistent POS System</h2>
        <p className="text-gray-600">Database-backed orders with complete history</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left: Product Grid */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Products
            </h3>
            <ProductGrid onProductClick={handleProductClick} />
          </div>
        </div>

        {/* Middle: Cart & Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shopping Cart */}
          <Cart
            lines={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveLine={handleRemoveLine}
            onClearCart={handleClearCart}
            onTransferToAmount={() => {
              const totalCents = calculateCartTotal(cart);
              setAmount(formatCentsToPrice(totalCents));
            }}
          />

          {/* Payment Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Details</h3>
            
            <div className="space-y-4">
              {/* PayNow Method Display */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-emerald-900 mb-2">PayNow Method</h4>
                <div className="text-sm text-emerald-800">
                  {businessType === 'uen' && uen ? `Business UEN: ${uen}` :
                   businessType === 'mobile' && mobile ? `Mobile: +65${mobile}` :
                   'PayNow not configured'}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (SGD) *
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="text-xl font-bold text-center"
                />
                
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                    >
                      S${preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder || (!amount && cart.length === 0)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 text-lg"
                >
                  {isCreatingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5 mr-2" />
                      Create Persistent Order
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full"
                >
                  Reset Form
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: QR Display */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              QR Code
            </h3>

            {currentQR ? (
              <div className="text-center">
                <div 
                  className="border border-gray-200 rounded-lg mb-4"
                  dangerouslySetInnerHTML={{ __html: currentQR.qrSvg }}
                />
                
                <div className="space-y-2 text-sm">
                  <div className="font-bold text-emerald-600 text-lg">
                    S${currentQR.amount.toFixed(2)}
                  </div>
                  <div className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {currentQR.reference}
                  </div>
                  <div className="text-xs text-gray-500">
                    Order ID: {currentQR.orderId.slice(0, 8)}...
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={handleMarkPaid}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                  
                  <Button
                    onClick={handleCancelOrder}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Cancel Order
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">QR Code will appear here</p>
                <p className="text-sm text-gray-400 mt-1">Create an order to generate QR</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}