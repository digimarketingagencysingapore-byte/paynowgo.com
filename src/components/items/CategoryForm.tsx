'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StoredCategory as ItemCategory } from '@/lib/storage';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  category?: ItemCategory | null;
  isLoading?: boolean;
}

export function CategoryForm({ isOpen, onClose, onSubmit, category, isLoading = false }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    position: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        position: category.position
      });
    } else {
      setFormData({
        name: '',
        position: 0
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Category name too long (max 50 characters)';
    }

    if (formData.position < 0) {
      newErrors.position = 'Position must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      position: formData.position
    };

    await onSubmit(submitData);
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
            {category ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Beverages, Main Dishes"
              maxLength={50}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Position
            </label>
            <Input
              type="number"
              value={formData.position}
              onChange={(e) => handleChange('position', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className={errors.position ? 'border-red-500' : ''}
            />
            {errors.position && (
              <p className="text-sm text-red-600 mt-1">{errors.position}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first in lists
            </p>
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
                  {category ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                category ? 'Update Category' : 'Create Category'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}