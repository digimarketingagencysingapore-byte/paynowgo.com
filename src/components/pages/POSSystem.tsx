import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, RefreshCw, CheckCircle, ShoppingCart } from 'lucide-react';
import { QRCodeGenerator } from '../ui/QRCodeGenerator';
import { type QrCodeResult } from '../../utils/paynowQrGenerator';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { ProductGrid } from '../pos/ProductGrid';
import { ShoppingCart as Cart, CartLine } from '../pos/ShoppingCart';
import { StoredItem as Item } from '@/@types';
import { formatCentsToPrice } from '@/lib/money';
import { terminalSync, DEFAULT_TERMINALS, type TerminalQRData } from '../../lib/terminal-sync';
import { MerchantOrdersDB, type CreateOrderData, type OrderItem as DBOrderItem } from '../../lib/merchant-database';
import { supabase } from '../../lib/supabase';

export function POSSystem() {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [currentQR, setCurrentQR] = useState<QrCodeResult | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const { businessType, setBusinessType, mobile, uen, reloadMerchantData } = useSettingsContext();

  const presetAmounts = [10, 25, 50, 100, 200];
  
  // Debug function to help user troubleshoot UEN issues
  const debugUENIssue = () => {
    console.log('=== UEN DEBUG HELPER ===');
    console.log('Current UEN from settings:', `"${uen}"`);
    console.log('UEN length:', uen?.length);
    console.log('UEN is empty?', !uen || uen.trim() === '');
    console.log('Current mobile from settings:', `"${mobile}"`);
    console.log('Business type selected:', businessType);
    
    // Test UEN validation
    if (uen && uen.trim()) {
      const cleaned = uen.replace(/[\s\-]/g, '').toUpperCase();
      console.log('Cleaned UEN for validation:', `"${cleaned}"`);
      
      // Test the patterns manually
      const patterns = [
        { name: '8 digits + letter', regex: /^[0-9]{8}[A-Z]$/ },
        { name: '9 digits + letter', regex: /^[0-9]{9}[A-Z]$/ },
        { name: '10 digits + letter', regex: /^[0-9]{10}[A-Z]$/ }
      ];
      
      patterns.forEach(pattern => {
        const matches = pattern.regex.test(cleaned);
        console.log(`${pattern.name}: ${matches ? '✅' : '❌'}`);
      });
    }
    
    alert('Check browser console for detailed UEN debugging info. If UEN shows as old value, try refreshing the page or run window.forceReloadSettings().');
  };

  // Add debug button for development
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  React.useEffect(() => {
    if (isDevelopment) {
      // Make debug functions available globally for easy access
      (window as any).debugUEN = debugUENIssue;
      (window as any).forceReloadSettings = reloadMerchantData;
      console.log('🐛 Debug helpers available:');
      console.log('  - window.debugUEN() - Check current UEN values');
      console.log('  - window.forceReloadSettings() - Force reload from database');
    }
  }, [uen, mobile, businessType]);

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
    console.log('[POS] Product clicked:', item.name);
    
    setCart(prevCart => {
      const existingLine = prevCart.find(line => line.itemId === item.id);
      
      if (existingLine) {
        // Increase quantity
        return prevCart.map(line =>
          line.itemId === item.id
            ? { ...line, qty: line.qty + 1 }
            : line
        );
      } else {
        // Add new line
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

  const handleGenerateQR = async () => {
    console.log('[POS] ===== Generate QR Button Clicked =====');
    console.log('[POS] Current state:', { amount, reference, description, businessType, mobile, uen });
    
    // Debug: Check what values are actually being used
    console.log('[POS] ===== DEBUGGING UEN ISSUE =====');
    console.log('[POS] businessType:', businessType);
    console.log('[POS] uen value:', `"${uen}"`);
    console.log('[POS] uen length:', uen?.length);
    console.log('[POS] uen type:', typeof uen);
    console.log('[POS] mobile value:', `"${mobile}"`);
    console.log('[POS] Settings context mobile:', mobile);
    console.log('[POS] Settings context uen:', uen);
    
    if (!amount || parseFloat(amount) <= 0) {
      console.log('[POS] Invalid amount:', amount);
      alert('Please enter a valid amount');
      return;
    }

    const finalReference = reference || generateReference();
    console.log('[POS] Using reference:', finalReference);
    setReference(finalReference);
    
    try {
      // Generate QR code first
      const payNowOptions = {
        mobile: businessType === 'mobile' ? mobile : null,
        uen: businessType === 'uen' ? uen : null,
        amount: parseFloat(amount),
        refId: finalReference,
        editable: false, // CRITICAL: Amount is not editable
        company: 'PayNowGo Demo'
      };
      
      console.log('[POS] ===== QR GENERATION START =====');
      console.log('[POS] Business type selected:', businessType);
      console.log('[POS] Available values - UEN:', uen, 'Mobile:', mobile);
      console.log('[POS] Final PayNow options:', payNowOptions);
      
      const { generatePayNowQrCode } = await import('../../utils/paynowQrGenerator');
      const qrResult = await generatePayNowQrCode(payNowOptions);
      
      console.log('[POS] ===== QR GENERATION SUCCESS =====');
      console.log('[POS] QR result received:', {
        hasQrCodeSvg: !!qrResult.qrCodeSvg,
        svgLength: qrResult.qrCodeSvg?.length,
        hasQrCodePng: !!qrResult.qrCodePng,
        url: qrResult.url
      });
      
      // Set the QR result
      console.log('[POS] Setting currentQR state...');
      setCurrentQR(qrResult);
      console.log('[POS] currentQR state set successfully');
      
      // Create order in database
      console.log('[POS] ===== DATABASE CREATION START =====');
      const orderData: CreateOrderData = {
        reference: finalReference,
        amount: parseFloat(amount),
        description: description || 'PayNow Payment',
        qrSvg: qrResult.qrCodeSvg,
        items: cart.map(line => ({
          id: line.itemId,
          name: line.name,
          quantity: line.qty,
          unitPriceCents: line.unitPriceCents,
          totalCents: line.qty * line.unitPriceCents
        }))
      };
      
      console.log('[POS] Order data to create:', {
        reference: orderData.reference,
        amount: orderData.amount,
        description: orderData.description,
        hasQrSvg: !!orderData.qrSvg,
        itemsCount: orderData.items?.length || 0
      });
      
      console.log('[POS] Calling MerchantOrdersDB.create...');
      const newOrder = await MerchantOrdersDB.create(orderData);
      
      console.log('[POS] ===== DATABASE CREATION SUCCESS =====');
      console.log('[POS] New order created:', {
        id: newOrder.id,
        reference: newOrder.reference,
        amount: newOrder.amount,
        status: newOrder.status,
        tenant_id: newOrder.tenant_id
      });
      
      setCurrentOrderId(newOrder.id);

      // Send QR data to display - SIMPLE VERSION
      console.log('[POS] 📱 Sending QR to display system (simple version)...');
      
      // Log items for debugging
      const items = cart.map(line => ({
        name: line.name,
        quantity: line.qty,
        unitPrice: line.unitPriceCents / 100,
        totalPrice: (line.qty * line.unitPriceCents) / 100
      }));
      console.log('[POS] Items in order:', items);
      
      try {
        // Simple direct insert into display_states - no complex terminal sync!
        console.log('[POS] Inserting display state directly into database...');
        
        // Create UUID format from device token
        const deviceUUID = `47285100-0000-0000-0000-000000000001`;
        console.log('[POS] Using device UUID:', deviceUUID);
        
        // First ensure device exists in customer_displays
        console.log('[POS] Ensuring device exists in customer_displays...');
        const { error: deviceError } = await supabase
          .from('customer_displays')
          .upsert({
            id: deviceUUID,
            device_key: '472851',
            name: 'Display 2851',
            tenant_id: newOrder.tenant_id,
            last_seen_at: new Date().toISOString()
          });

        if (deviceError) {
          console.error('[POS] ❌ Failed to create device record:', deviceError);
          throw deviceError;
        }
        
        console.log('[POS] ✅ Device record ensured, now storing display state...');
        const { error: displayError } = await supabase
          .from('display_states')
          .upsert({
            device_id: deviceUUID, // Use proper UUID format
            tenant_id: newOrder.tenant_id,
            state: 'show',
            order_id: newOrder.id,
            amount: parseFloat(amount),
            reference: finalReference,
            qr_svg: qrResult.qrCodeSvg,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });

        if (displayError) {
          console.error('[POS] ❌ Failed to store display state:', displayError);
          alert('Warning: Display may not show QR code due to database error');
        } else {
          console.log('[POS] ✅ Display state stored successfully! Display should show QR now.');
          console.log('[POS] Items logged for future implementation:', items);
        }
      } catch (error) {
        console.error('[POS] Display state storage error:', error);
      }
      
      console.log('[POS] QR generation completed successfully');
    } catch (error) {
      console.error('[POS] ===== ERROR OCCURRED =====');
      console.error('[POS] Error type:', error?.constructor?.name);
      console.error('[POS] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[POS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('[POS] Full error object:', error);
      
      alert(`QR Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentQR(null);
      setCurrentOrderId(null);
    }
    
    console.log('[POS] ===== End Generate QR Button Click =====');
  };

  const handleQRGenerated = (result: QrCodeResult) => {
    console.log('QR Generated callback received:', result);
    setCurrentQR(result);
  };

  const handleQRError = (error: string) => {
    console.log('QR Error callback received:', error);
    alert(`QR Generation Error: ${error}`);
    setCurrentQR(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (currentQR?.qrCodePng) {
      const link = document.createElement('a');
      link.href = currentQR.qrCodePng;
      link.download = `paynow-qr-${reference || 'payment'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No QR code available for download');
    }
  };

  const handleReset = () => {
    setAmount('');
    setReference('');
    setDescription('');
    setCurrentQR(null);
    setCurrentOrderId(null);
  };

  const handleMarkPaid = async () => {
    if (!currentQR || !reference) return;
    
    console.log('[POS] Marking order as paid:', reference);
    
    try {
      // Hide QR code from ALL terminals
      await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_1);
      await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_2);
      
      // Mark as paid in database
      const updatedOrder = await MerchantOrdersDB.markPaidByReference(reference);
      console.log('[POS] Order marked as paid in database:', updatedOrder?.id);
    } catch (error) {
      console.error('[POS] Failed to mark order as paid:', error);
      alert('Failed to mark order as paid: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return;
    }

    // Reset form for next order
    setAmount('');
    setReference('');
    setDescription('');
    setCart([]);
    setCurrentQR(null);
    setCurrentOrderId(null);
    
    alert('✅ Payment confirmed!');
  };

  const handleTransferToAmount = () => {
    const subtotalCents = cart.reduce((total, line) => total + (line.qty * line.unitPriceCents), 0);
    const subtotalAmount = formatCentsToPrice(subtotalCents);
    
    console.log('[POS] Transferring cart total to amount field:', subtotalAmount);
    setAmount(subtotalAmount);
    
    // Optionally clear cart after transfer
    // setCart([]);
  };

  const handleGenerateQRFromCart = async () => {
    console.log('[POS] ===== Generate QR From Cart =====');
    
    if (cart.length === 0) {
      alert('Cart is empty. Please add items first.');
      return;
    }

    // Calculate cart total
    const subtotalCents = cart.reduce((total, line) => total + (line.qty * line.unitPriceCents), 0);
    const subtotalAmount = formatCentsToPrice(subtotalCents);
    
    // Generate reference if empty
    const finalReference = reference || generateReference();
    
    // Create description from cart items
    const itemsDescription = cart.map(line => `${line.qty}x ${line.name}`).join(', ');
    const finalDescription = `Cart: ${itemsDescription}`;
    
    console.log('[POS] Cart checkout:', {
      amount: subtotalAmount,
      reference: finalReference,
      description: finalDescription,
      items: cart.length
    });
    
    // Set form values
    setAmount(subtotalAmount);
    setReference(finalReference);
    setDescription(finalDescription);
    
    try {
      // Generate QR code
      const payNowOptions = {
        mobile: businessType === 'mobile' ? mobile : null,
        uen: businessType === 'uen' ? uen : null,
        amount: parseFloat(subtotalAmount),
        refId: finalReference,
        editable: false,
        company: 'PayNowGo Demo'
      };
      
      console.log('[POS] Generating QR from cart with options:', payNowOptions);
      const { generatePayNowQrCode } = await import('../../utils/paynowQrGenerator');
      const qrResult = await generatePayNowQrCode(payNowOptions);
      console.log('[POS] QR generated from cart successfully');
      
      // Set the QR result
      setCurrentQR(qrResult);
      
      // Create order in database
      const cartOrderData: CreateOrderData = {
        reference: finalReference,
        amount: parseFloat(subtotalAmount),
        description: finalDescription,
        qrSvg: qrResult.qrCodeSvg,
        items: cart.map(line => ({
          id: line.itemId,
          name: line.name,
          quantity: line.qty,
          unitPriceCents: line.unitPriceCents,
          totalCents: line.qty * line.unitPriceCents
        }))
      };
      
      const newOrder = await MerchantOrdersDB.create(cartOrderData);
      setCurrentOrderId(newOrder.id);
      console.log('[POS] Order created from cart with ID:', newOrder.id);

      // Send QR data to display - SIMPLE VERSION (Cart Checkout)
      console.log('[POS] 📱 Sending cart QR to display system (simple version)...');
      
      // Log items for debugging
      const items = cart.map(line => ({
        name: line.name,
        quantity: line.qty,
        unitPrice: line.unitPriceCents / 100,
        totalPrice: (line.qty * line.unitPriceCents) / 100
      }));
      console.log('[POS] Cart items in order:', items);
      
      try {
        // Simple direct insert into display_states - no complex terminal sync!
        console.log('[POS] Inserting cart display state directly into database...');
        
        // Create UUID format from device token
        const deviceUUID = `47285100-0000-0000-0000-000000000001`;
        console.log('[POS] Using cart device UUID:', deviceUUID);
        
        // First ensure device exists in customer_displays
        console.log('[POS] Ensuring cart device exists in customer_displays...');
        const { error: deviceError } = await supabase
          .from('customer_displays')
          .upsert({
            id: deviceUUID,
            device_key: '472851',
            name: 'Display 2851',
            tenant_id: newOrder.tenant_id,
            last_seen_at: new Date().toISOString()
          });

        if (deviceError) {
          console.error('[POS] ❌ Failed to create cart device record:', deviceError);
          throw deviceError;
        }
        
        console.log('[POS] ✅ Cart device record ensured, now storing display state...');
        const { error: displayError } = await supabase
          .from('display_states')
          .upsert({
            device_id: deviceUUID, // Use proper UUID format
            tenant_id: newOrder.tenant_id,
            state: 'show',
            order_id: newOrder.id,
            amount: parseFloat(subtotalAmount),
            reference: finalReference,
            qr_svg: qrResult.qrCodeSvg,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });

        if (displayError) {
          console.error('[POS] ❌ Failed to store cart display state:', displayError);
          alert('Warning: Display may not show QR code due to database error');
        } else {
          console.log('[POS] ✅ Cart display state stored successfully! Display should show QR now.');
          console.log('[POS] Cart items logged for future implementation:', items);
        }
      } catch (error) {
        console.error('[POS] Cart display state storage error:', error);
      }
      
      console.log('[POS] Cart QR generation completed successfully');
      
    } catch (error) {
      console.error('[POS] QR generation from cart failed:', error);
      alert(`QR Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentQR(null);
    }
    
    console.log('[POS] ===== End Generate QR From Cart =====');
  };
  
  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">PayNow POS System</h2>
        <p className="text-gray-600">Select products, generate QR codes, and process payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Column: Product Grid - Wider on large screens */}
        <div className="lg:col-span-4 xl:col-span-5">
          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Products
            </h3>
            <ProductGrid onProductClick={handleProductClick} />
          </div>
        </div>

        {/* Middle Column: Cart & Payment Form - More space */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:space-y-6">
          {/* Shopping Cart */}
          <Cart
            lines={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveLine={handleRemoveLine}
            onClearCart={handleClearCart}
            onTransferToAmount={handleTransferToAmount}
            onGenerateQR={handleGenerateQRFromCart}
          />

          {/* Payment Form */}
          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Payment Details
            </h3>
            
            <div className="space-y-4 lg:space-y-6">
              {/* Business Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available PayNow Methods
                </label>
                
                {/* Show available payment methods */}
                <div className="space-y-3">
                  {/* Business PayNow Option - Always show */}
                  <label className={`flex items-center p-3 border rounded-lg ${
                    uen ? 'border-gray-200 hover:bg-gray-50' : 'border-orange-200 bg-orange-50'
                  }`}>
                    <input
                      type="radio"
                      value="uen"
                      checked={businessType === 'uen'}
                      onChange={(e) => setBusinessType(e.target.value as 'mobile' | 'uen')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <div className={`text-sm font-medium ${uen ? 'text-gray-900' : 'text-gray-500'}`}>
                        Business PayNow {!uen && '(Not configured)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        UEN: {uen || 'Use Settings to add UEN (e.g., 201234567A)'}
                      </div>
                    </div>
                  </label>
                  
                  {/* Individual PayNow Option - Always show */}
                  <label className={`flex items-center p-3 border rounded-lg ${
                    mobile ? 'border-gray-200 hover:bg-gray-50' : 'border-orange-200 bg-orange-50'
                  }`}>
                    <input
                      type="radio"
                      value="mobile"
                      checked={businessType === 'mobile'}
                      onChange={(e) => setBusinessType(e.target.value as 'mobile' | 'uen')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <div className={`text-sm font-medium ${mobile ? 'text-gray-900' : 'text-gray-500'}`}>
                        Individual PayNow {!mobile && '(Not configured)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Mobile: {mobile ? `+65${mobile.replace(/^\+65/, '')}` : 'Use Settings to add mobile (e.g., 91234567)'}
                      </div>
                    </div>
                  </label>
                  
                  {!uen && !mobile && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Quick Setup Required</h4>
                          <p className="text-xs text-yellow-700 mt-1">
                            Go to Settings and add either:
                          </p>
                          <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                            <li><strong>UEN</strong> for Business PayNow: 201234567A</li>
                            <li><strong>Mobile</strong> for Individual PayNow: 91234567</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (SGD) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 lg:py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg lg:text-xl font-bold text-center"
                />
                
                {/* Preset amounts */}
                <div className="mt-3 lg:mt-4 grid grid-cols-5 gap-1 lg:gap-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className="px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-700 rounded-lg transition-colors font-medium"
                    >
                      S${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm lg:text-base"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description"
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm lg:text-base"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 lg:space-y-3">
                <button
                  onClick={handleGenerateQR}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 lg:px-6 py-3 lg:py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-base lg:text-lg"
                >
                  <QrCode className="w-5 h-5" />
                  <span>Generate QR Code</span>
                </button>
                
                <button
                  onClick={handleReset}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm lg:text-base"
                >
                  <RefreshCw className="w-4 h-4 mr-2 inline" />
                  Reset Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code Display - Optimal size */}
        <div className="lg:col-span-3 xl:col-span-3">
          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-4 lg:top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                QR Code
              </h3>
              
              {currentQR && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Download QR Code"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Print QR Code"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {currentQR ? (
              <div className="text-center">
                <QRCodeGenerator 
                  key={`${amount}-${reference}-${businessType}`}
                  payNowOptions={{
                    mobile: businessType === 'mobile' ? mobile : null,
                    uen: businessType === 'uen' ? uen : null,
                    amount: parseFloat(amount),
                    refId: reference,
                    editable: false,
                    company: 'PayNowGo Demo'
                  }}
                  size={window.innerWidth >= 1024 && window.innerWidth < 1280 ? 160 : 200}
                  onGenerated={handleQRGenerated}
                  onError={handleQRError}
                />
                
                <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                  <div className="space-y-1 lg:space-y-2 text-xs lg:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold text-emerald-600 text-sm lg:text-base">S${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium font-mono text-xs lg:text-sm break-all">{reference}</span>
                    </div>
                    {description && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Description:</span>
                        <span className="font-medium break-all text-xs lg:text-sm">{description}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account:</span>
                      <span className="font-medium text-xs lg:text-sm">
                        {businessType === 'uen' ? `UEN ${uen}` : `+65 ${mobile}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 lg:w-20 h-16 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 lg:w-10 h-8 lg:h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-sm lg:text-base">QR Code will appear here</p>
                <p className="text-sm text-gray-400 mt-1">Enter amount and generate</p>
              </div>
            )}

            {/* Paid Button */}
            <div className="mt-4 lg:mt-6">
              <button
                onClick={handleMarkPaid}
                disabled={!currentQR}
                className={`w-full px-4 lg:px-6 py-3 lg:py-4 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors text-sm lg:text-lg shadow-sm ${
                  currentQR 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-5 lg:w-6 h-5 lg:h-6" />
                <span>{currentQR ? '✅ Mark as Paid' : 'Generate QR first'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}