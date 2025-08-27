'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StoredItem as Item, StoredCategory as ItemCategory } from '@/lib/storage';
import { formatCentsToPrice, isValidPrice } from '@/lib/money';

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  item?: Item | null;
  categories: ItemCategory[];
  isLoading?: boolean;
}

export function ItemForm({ isOpen, onClose, onSubmit, item, categories, isLoading = false }: ItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    active: true,
    sku: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        price: formatCentsToPrice(item.price_cents),
        categoryId: item.categoryId || '',
        active: item.active,
        sku: item.sku || ''
      });
    } else {
      setFormData({
        name: '',
        price: '',
        categoryId: '',
        active: true,
        sku: ''
      });
    }
    setErrors({});
  }, [item, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.length > 80) {
      newErrors.name = 'Item name too long (max 80 characters)';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (!isValidPrice(formData.price)) {
      newErrors.price = 'Invalid price format. Use format like 12.34';
    }

    if (formData.sku && formData.sku.length > 20) {
      newErrors.sku = 'SKU too long (max 20 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[ITEM_FORM] Form data before validation:', formData);
    
    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      price: formData.price.trim(),
      categoryId: formData.categoryId || null,
      active: formData.active,
      sku: formData.sku.trim() || null
    };

    console.log('[ITEM_FORM] Submit data:', submitData);
    
    try {
      await onSubmit(submitData);
      console.log('[ITEM_FORM] Submit successful');
    } catch (error) {
      console.error('[ITEM_FORM] Submit failed:', error);
      alert('Failed to save item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Item' : 'Create New Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Coffee, Nasi Lemak"
              maxLength={80}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (SGD) *
            </label>
            <Input
              type="text"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="12.34"
              className={errors.price ? 'border-red-500' : ''}
            />
            {errors.price && (
              <p className="text-sm text-red-600 mt-1">{errors.price}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">No Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU (Optional)
            </label>
            <Input
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="e.g., BEV001"
              maxLength={20}
              className={errors.sku ? 'border-red-500' : ''}
            />
            {errors.sku && (
              <p className="text-sm text-red-600 mt-1">{errors.sku}</p>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => handleChange('active', e.target.checked)}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active (visible in POS)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {item ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                item ? 'Update Item' : 'Create Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}