'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemForm } from './ItemForm';
import { CategoryForm } from './CategoryForm';
import { StoredItem as Item, StoredCategory as ItemCategory } from '@/@types';
import { formatCentsToSGD } from '@/lib/money';
import { ItemsAPI, CategoriesAPI } from '@/lib/storage';

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('[ITEMS_LIST] Fetching data from database...');
      
      // Get categories from database
      const categoriesData = await CategoriesAPI.getAll();
      console.log('[ITEMS_LIST] Categories loaded:', categoriesData.length);
      setCategories(categoriesData);

      // Get items from database
      const itemsData = await ItemsAPI.getAll();
      console.log('[ITEMS_LIST] Items loaded:', itemsData.length);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load data from database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async (data: any) => {
    try {
      setIsSubmitting(true);
      console.log('[ITEMS_LIST] Creating item with data:', data);
      
      const newItem = await ItemsAPI.create(data);
      console.log('[ITEMS_LIST] New item created:', newItem);
      setItems(prev => [newItem, ...prev]);
      setIsFormOpen(false);
      alert('Item created successfully!');
    } catch (error) {
      console.error('Failed to create item:', error);
      alert('Failed to create item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (data: any) => {
    try {
      setIsSubmitting(true);
      console.log('[ITEMS_LIST] Creating category with data:', data);
      
      const newCategory = await CategoriesAPI.create(data);
      console.log('[ITEMS_LIST] New category created:', newCategory);
      setCategories(prev => [...prev, newCategory]);
      setIsCategoryFormOpen(false);
      alert('Category created successfully!');
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (data: any) => {
    if (!editingCategory) return;

    try {
      setIsSubmitting(true);
      console.log('[ITEMS_LIST] Updating category:', editingCategory.id, 'with data:', data);
      
      const updatedCategory = await CategoriesAPI.update(editingCategory.id, data);
      
      if (updatedCategory) {
        console.log('[ITEMS_LIST] Category updated:', updatedCategory);
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? updatedCategory : cat
        ));
        setIsCategoryFormOpen(false);
        setEditingCategory(null);
        alert('Category updated successfully!');
        
        // Refresh items to update category references
        fetchData();
      } else {
        alert('Category not found');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (!editingItem) return;

    try {
      setIsSubmitting(true);
      console.log('[ITEMS_LIST] Updating item:', editingItem.id, 'with data:', data);
      
      const updatedItem = await ItemsAPI.update(editingItem.id, data);
      
      if (updatedItem) {
        console.log('[ITEMS_LIST] Item updated:', updatedItem);
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? updatedItem : item
        ));
        setIsFormOpen(false);
        setEditingItem(null);
        alert('Item updated successfully!');
      } else {
        alert('Item not found');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      console.log('[ITEMS_LIST] Deleting item:', item.id);
      
      // Use the API endpoint directly since ItemsAPI.delete might not work
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        console.log('[ITEMS_LIST] Item deleted successfully');
        alert('Item deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert('Failed to delete item: ' + errorData.error);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleToggleActive = async (item: Item) => {
    try {
      console.log('[ITEMS_LIST] Toggling item active status:', item.id, 'from', item.active, 'to', !item.active);
      
      const updatedItem = await ItemsAPI.update(item.id, { active: !item.active });
      
      if (updatedItem) {
        console.log('[ITEMS_LIST] Item active status updated:', updatedItem);
        setItems(prev => prev.map(i => 
          i.id === item.id ? updatedItem : i
        ));
        alert(`Item ${updatedItem.active ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert('Item not found');
      }
    } catch (error) {
      console.error('Failed to toggle item status:', error);
      alert('Failed to toggle item status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && item.active) ||
      (activeFilter === 'inactive' && !item.active);

    return matchesSearch && matchesCategory && matchesActive;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items Management</h1>
          <p className="text-gray-600 mt-1">Manage your products and pricing</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsCategoryFormOpen(true);
            }}
            variant="outline"
            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Category
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Items</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600">
            {filteredItems.length} of {items.length} items
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      {item.sku && (
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCentsToSGD(item.price_cents)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.category?.name || 'No Category'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.active ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      <ItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
        item={editingItem}
        categories={categories}
        isLoading={isSubmitting}
      />

      {/* Category Form Modal */}
      <CategoryForm
        isOpen={isCategoryFormOpen}
        onClose={() => {
          setIsCategoryFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
        category={editingCategory}
        isLoading={isSubmitting}
      />
    </div>
  );
}