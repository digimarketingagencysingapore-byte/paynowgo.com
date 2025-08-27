'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Building2, Smartphone } from 'lucide-react';
import { MerchantsDB, type Merchant } from '../../lib/admin-database';

interface EditMerchantModalProps {
  merchant: Merchant;
  onClose: () => void;
  onSuccess: (updatedMerchant: Merchant) => void;
}

export function EditMerchantModal({ merchant, onClose, onSuccess }: EditMerchantModalProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    uen: '',
    mobile: '',
    address: '',
    subscriptionPlan: 'basic' as 'basic' | 'professional' | 'enterprise',
    monthlyRevenue: '',
    subscriptionLink: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      businessName: merchant.businessName,
      email: merchant.email,
      uen: merchant.uen || '',
      mobile: merchant.mobile || '',
      address: merchant.address || '',
      subscriptionPlan: merchant.subscriptionPlan,
      monthlyRevenue: merchant.monthlyRevenue ? merchant.monthlyRevenue.toString() : '',
      subscriptionLink: merchant.subscriptionLink || ''
    });
  }, [merchant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      console.log('[EDIT_MERCHANT] Updating merchant with data:', formData);
      
      // Clean up empty fields - convert empty strings to null for proper clearing
      const cleanData = {
        businessName: formData.businessName,
        email: formData.email,
        uen: formData.uen.trim() || null,
        mobile: formData.mobile.trim() || null,
        address: formData.address.trim() || null,
        subscriptionPlan: formData.subscriptionPlan,
        monthlyRevenue: formData.monthlyRevenue ? parseFloat(formData.monthlyRevenue) : undefined,
        subscriptionLink: formData.subscriptionLink.trim() || null
      };
      
      console.log('[EDIT_MERCHANT] Clean data (null = will be cleared):', cleanData);
      
      const updatedMerchant = await MerchantsDB.update(merchant.id, cleanData);
      
      console.log('[EDIT_MERCHANT] Merchant updated successfully:', updatedMerchant);
      alert('Merchant updated successfully!');
      onSuccess(updatedMerchant);
    } catch (error) {
      console.error('[EDIT_MERCHANT] Error updating merchant:', error);
      setError(error instanceof Error ? error.message : 'Failed to update merchant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const formatMobile = (mobile: string) => {
    // Remove any non-digits and format
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.startsWith('65')) {
      return '+' + cleaned;
    } else if (cleaned.length === 8) {
      return '+65' + cleaned;
    }
    return mobile;
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobile(e.target.value);
    setFormData(prev => ({
      ...prev,
      mobile: formatted
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Merchant</h2>
              <p className="text-sm text-gray-600">{merchant.businessName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Business Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                placeholder="123 Business Street, Singapore 123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan
              </label>
              <select
                name="subscriptionPlan"
                value={formData.subscriptionPlan}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="basic">Basic Plan</option>
                <option value="professional">Professional Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
          </div>

          {/* PayNow Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-medium text-gray-900">PayNow Configuration</h3>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Administrator Only</h4>
              <p className="text-xs text-yellow-700">
                These PayNow settings determine how the merchant can receive payments. 
                Only administrators can modify these critical payment configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UEN Number (Business PayNow)
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
                  Leave empty to disable business PayNow
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number (Individual PayNow)
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="+65 9123 4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to disable individual PayNow
                </p>
              </div>
            </div>

            {/* PayNow Status Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">PayNow Methods Preview</h4>
              <div className="space-y-2">
                {formData.uen && (
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Business PayNow: <strong>{formData.uen}</strong></span>
                  </div>
                )}
                {formData.mobile && (
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Individual PayNow: <strong>{formData.mobile}</strong></span>
                  </div>
                )}
                {!formData.uen && !formData.mobile && (
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-700">No PayNow methods configured</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
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
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Merchant</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}