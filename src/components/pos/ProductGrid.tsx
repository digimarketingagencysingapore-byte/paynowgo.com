'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StoredItem as Item, StoredCategory as ItemCategory } from '@/lib/storage';
import { formatCentsToSGD } from '@/lib/money';
import { ItemsAPI, CategoriesAPI } from '@/lib/storage';

interface ProductGridProps {
  onProductClick: (item: Item) => void;
}

export function ProductGrid({ onProductClick }: ProductGridProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('[PRODUCT_GRID] Loading active items from database...');
      
      // Get active items from database
      const itemsData = await ItemsAPI.getAll({ active: true });
      console.log('[PRODUCT_GRID] Items loaded:', itemsData.length, 'items');
      console.log('[PRODUCT_GRID] Items data:', itemsData.map(i => ({ id: i.id, name: i.name, price_cents: i.price_cents })));
      setItems(itemsData);

      // Get categories from database
      const categoriesData = await CategoriesAPI.getAll();
      console.log('[PRODUCT_GRID] Categories loaded:', categoriesData.length, 'categories');
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('Failed to load products from database');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items by category
  const filteredItems = selectedCategory 
    ? items.filter(item => item.categoryId === selectedCategory)
    : items;

  console.log('[PRODUCT_GRID] Render - items:', items.length, 'filteredItems:', filteredItems.length);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('')}
            className={selectedCategory === '' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 lg:gap-3">
        {filteredItems.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            onClick={() => onProductClick(item)}
            className="h-20 lg:h-24 flex flex-col items-center justify-center p-2 lg:p-4 text-center hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 hover:shadow-md"
          >
            <div className="text-xs lg:text-sm font-semibold text-gray-900 mb-1 lg:mb-2 line-clamp-2 leading-tight">
              {item.name}
            </div>
            <div className="text-xs lg:text-sm font-bold text-emerald-600 bg-emerald-50 px-1 lg:px-2 py-0.5 lg:py-1 rounded-full">
              {formatCentsToSGD(item.price_cents)}
            </div>
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {selectedCategory ? 'No products in this category' : 'No active products found'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Add products in the Items tab to see them here
          </p>
        </div>
      )}
    </div>
  );
}