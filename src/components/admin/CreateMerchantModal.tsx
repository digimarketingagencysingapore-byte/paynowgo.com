'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { MerchantsDB } from '../../lib/admin-database';

interface CreateMerchantModalProps {
  onClose: () => void;
  onSuccess: (newMerchant: any) => void;
}

export function CreateMerchantModal({ onClose, onSuccess }: CreateMerchantModalProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    uen: '',
    mobile: '',
    address: '',
    subscriptionLink: '',
    monthlyRevenue: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== MERCHANT CREATION DEBUG START ===');
    console.log('[CREATE_MERCHANT] Form submitted at:', new Date().toISOString());
    console.log('[CREATE_MERCHANT] Raw form data:', formData);
    
    // Basic validation
    if (!formData.businessName.trim()) {
      console.log('[CREATE_MERCHANT] Validation failed: Business name is required');
      setError('Business name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      console.log('[CREATE_MERCHANT] Validation failed: Email is required');
      setError('Email is required');
      return;
    }
    
    if (!formData.password.trim() || formData.password.length < 8) {
      console.log('[CREATE_MERCHANT] Validation failed: Password must be at least 8 characters');
      setError('Password must be at least 8 characters');
      return;
    }
    
    console.log('[CREATE_MERCHANT] Form validation passed, setting loading state...');
    setIsLoading(true);
    setError('');

    try {
      console.log('[CREATE_MERCHANT] Preparing createData object...');
      
      const createData = {
        businessName: formData.businessName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        uen: formData.uen.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        address: formData.address.trim() || undefined,
        subscriptionPlan: 'basic' as const,
        subscriptionLink: formData.subscriptionLink.trim() || undefined,
        monthlyRevenue: formData.monthlyRevenue ? parseFloat(formData.monthlyRevenue) : undefined
      };

      console.log('[CREATE_MERCHANT] Final createData object:', createData);
      console.log('[CREATE_MERCHANT] About to call MerchantsDB.create...');
      
      const startTime = Date.now();
      const newMerchant = await MerchantsDB.create(createData);
      const endTime = Date.now();
      
      console.log(`[CREATE_MERCHANT] ✅ SUCCESS! Merchant created in ${endTime - startTime}ms:`, newMerchant);
      
      console.log('[CREATE_MERCHANT] Clearing form data and closing modal...');
      // Clear form and close modal
      setFormData({
        businessName: '',
        email: '',
        password: '',
        uen: '',
        mobile: '',
        address: '',
        subscriptionLink: '',
        monthlyRevenue: ''
      });
      
      console.log('[CREATE_MERCHANT] Showing success message...');
      alert('Merchant created successfully!');
      onSuccess(newMerchant);
      onClose(); // Close the modal
      console.log('[CREATE_MERCHANT] Modal closed successfully');
      
    } catch (error) {
      console.log('[CREATE_MERCHANT] ❌ ERROR CAUGHT in handleSubmit:');
      console.error('[CREATE_MERCHANT] Error details:', error);
      console.log('[CREATE_MERCHANT] Error type:', typeof error);
      console.log('[CREATE_MERCHANT] Error constructor:', error.constructor.name);
      
      if (error instanceof Error) {
        console.log('[CREATE_MERCHANT] Error message:', error.message);
        console.log('[CREATE_MERCHANT] Error stack:', error.stack);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create merchant';
      console.log('[CREATE_MERCHANT] Setting error message:', errorMessage);
      setError(`Error: ${errorMessage}`);
      
      // Keep the form open so user can see the error and try again
      console.log('[CREATE_MERCHANT] Form kept open for error display');
    } finally {
      console.log('[CREATE_MERCHANT] Setting loading state to false...');
      setIsLoading(false);
      console.log('=== MERCHANT CREATION DEBUG END ===');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add New Merchant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
              </label>
            <input
              type="text"
              name="businessName"
              required
              value={formData.businessName}
              onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., ABC Restaurant Pte Ltd"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
              </label>
              <input
              type="email"
              name="email"
              required
              value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="merchant@example.com"
              />
            </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="Minimum 8 characters"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UEN Number (PayNow Business)
            </label>
            <input
              type="text"
              name="uen"
              value={formData.uen}
              onChange={(e) => setFormData(prev => ({ ...prev, uen: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., 201234567M, T05LL1103B"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if merchant will use mobile PayNow only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number (PayNow Individual)
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={(e) => {
                const value = e.target.value;
                // Format mobile number properly
                let formatted = value.replace(/\D/g, ''); // Remove non-digits
                if (formatted.startsWith('65') && formatted.length > 2) {
                  formatted = '+' + formatted;
                } else if (formatted.length === 8) {
                  formatted = '+65' + formatted;
                } else if (formatted.length > 0 && !formatted.startsWith('65')) {
                  formatted = '+65' + formatted;
                }
                setFormData(prev => ({ ...prev, mobile: formatted }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="+65 9123 4567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if merchant will use UEN PayNow only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="123 Business Street, Singapore 123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Revenue (SGD)
            </label>
            <input
              type="number"
              name="monthlyRevenue"
              step="0.01"
              min="0"
              value={formData.monthlyRevenue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated monthly revenue of the merchant
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Link (Stripe/Airwallex)
            </label>
            <input
              type="url"
              name="subscriptionLink"
              value={formData.subscriptionLink}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              placeholder="https://dashboard.stripe.com/customers/cus_..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Direct link to Stripe customer or Airwallex subscription
            </p>
          </div>

          {/* PayNow Configuration Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">PayNow Configuration</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• At least one PayNow method (UEN or Mobile) should be configured</li>
              <li>• UEN enables business PayNow payments</li>
              <li>• Mobile enables individual PayNow payments</li>
              <li>• Both can be configured for maximum flexibility</li>
              <li>• These settings can only be changed by administrators</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Merchant</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}