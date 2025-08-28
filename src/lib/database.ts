// /src/lib/database.ts
import { supabase } from './supabase';

// Define interfaces that were missing
export interface StoredCategory {
  id: string;
  tenantId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredItem {
  id: string;
  tenantId: string;
  profileId: string | null;
  categoryId: string | null;
  name: string;
  price_cents: number;
  active: boolean;
  sku: string | null;
  createdAt: string;
  updatedAt: string;
  category?: StoredCategory;
}

// Storage keys for localStorage fallback
const STORAGE_KEYS = {
  ITEMS: 'paynowgo_items',
  CATEGORIES: 'paynowgo_categories',
  ORDERS: 'paynowgo_orders'
};

// Storage utilities
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

// LocalStorage helper functions for categories
function createCategoryInLocalStorage(data: { name: string; position?: number }): StoredCategory {
  const categories: StoredCategory[] = getFromStorage(STORAGE_KEYS.CATEGORIES, []);
  const newCategory: StoredCategory = {
    id: 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    tenantId: '00000000-0000-0000-0000-000000000001',
    name: data.name,
    position: data.position || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const updatedCategories = [newCategory, ...categories];
  saveToStorage(STORAGE_KEYS.CATEGORIES, updatedCategories);
  return newCategory;
}

function updateCategoryInLocalStorage(id: string, data: Partial<{ name: string; position: number }>): StoredCategory | null {
  const categories: StoredCategory[] = getFromStorage(STORAGE_KEYS.CATEGORIES, []);
  const index = categories.findIndex(cat => cat.id === id);
  
  if (index === -1) return null;

  const updatedCategory = {
    ...categories[index],
    ...data,
    updatedAt: new Date().toISOString()
  };

  categories[index] = updatedCategory;
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  return updatedCategory;
}

function deleteCategoryFromLocalStorage(id: string): boolean {
  const categories: StoredCategory[] = getFromStorage(STORAGE_KEYS.CATEGORIES, []);
  const filteredCategories = categories.filter(cat => cat.id !== id);
  
  if (filteredCategories.length === categories.length) return false;
  
  saveToStorage(STORAGE_KEYS.CATEGORIES, filteredCategories);
  return true;
}

// LocalStorage helper functions for items
function getItemsFromLocalStorage(filters?: { 
  active?: boolean; 
  categoryId?: string; 
  query?: string; 
}): StoredItem[] {
  let items: StoredItem[] = getFromStorage(STORAGE_KEYS.ITEMS, []);
  
  if (filters?.active !== undefined) {
    items = items.filter(item => item.active === filters.active);
  }
  if (filters?.categoryId) {
    items = items.filter(item => item.categoryId === filters.categoryId);
  }
  if (filters?.query) {
    const searchQuery = filters.query.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery))
    );
  }
  
  return items;
}

function createItemInLocalStorage(data: {
  name: string;
  price: string;
  categoryId?: string | null;
  active?: boolean;
  sku?: string | null;
  tenantId?: string;
}): StoredItem {
  const items: StoredItem[] = getFromStorage(STORAGE_KEYS.ITEMS, []);
  const newItem: StoredItem = {
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    tenantId: data.tenantId || '00000000-0000-0000-0000-000000000001',
    profileId: null, // LocalStorage fallback doesn't have profile support
    categoryId: data.categoryId || null,
    name: data.name,
    price_cents: Math.round(parseFloat(data.price) * 100),
    active: data.active ?? true,
    sku: data.sku || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const updatedItems = [newItem, ...items];
  saveToStorage(STORAGE_KEYS.ITEMS, updatedItems);
  return newItem;
}

function updateItemInLocalStorage(id: string, data: Partial<{
  name: string;
  price: string;
  categoryId: string | null;
  active: boolean;
  sku: string | null;
}>): StoredItem | null {
  const items: StoredItem[] = getFromStorage(STORAGE_KEYS.ITEMS, []);
  const index = items.findIndex(item => item.id === id);
  
  if (index === -1) return null;

  const updateData: any = { ...items[index] };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price_cents = Math.round(parseFloat(data.price) * 100);
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.sku !== undefined) updateData.sku = data.sku;
  // Keep existing profileId for localStorage items
  updateData.updatedAt = new Date().toISOString();

  items[index] = updateData;
  saveToStorage(STORAGE_KEYS.ITEMS, items);
  return updateData;
}

function deleteItemFromLocalStorage(id: string): boolean {
  const items: StoredItem[] = getFromStorage(STORAGE_KEYS.ITEMS, []);
  const filteredItems = items.filter(item => item.id !== id);
  
  if (filteredItems.length === items.length) return false;
  
  saveToStorage(STORAGE_KEYS.ITEMS, filteredItems);
  return true;
}

// Get current user's profile ID
async function getCurrentProfileId(): Promise<string | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[DATABASE] No authenticated user found');
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('[DATABASE] Error getting current profile ID:', error);
    return null;
  }
}

// Get current merchant ID from profile_id
async function getCurrentMerchantId(): Promise<string> {
  try {
    console.log('[DATABASE] Getting current merchant ID...');
    
    // Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('[DATABASE] No authenticated user found:', userError);
      throw new Error('User not authenticated');
    }

    // Get merchant data linked to this user's profile using simple nested query
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('profile_id', user.id)
      .single();
      
    if (merchantError || !merchant) {
      console.warn('[DATABASE] No merchant found for user profile:', merchantError);
      throw new Error('Merchant not found for current user');
    }
    
    console.log('[DATABASE] Current merchant ID:', merchant.id);
    return merchant.id;
    
  } catch (error) {
    console.error('[DATABASE] Error getting current merchant ID:', error);
    throw error;
  }
}

/**
 * Ensures tables are accessible via public schema
 * Handles both direct table access and view-based access
 */
export async function ensureTablesReady(): Promise<void> {
  try {
    // Test table access
    const { error } = await supabase
      .from('items')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[database] Table access failed:', error);
      
      if (error.code === 'PGRST106') {
        throw new Error('Tables not found. Please run the database migration.');
      }
      
      if (error.code === 'PGRST205') {
        // Schema cache issue - wait and retry once
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const { error: retryError } = await supabase
          .from('items')
          .select('id')
          .limit(1);
          
        if (retryError) {
          throw new Error(`Schema cache error: ${retryError.message}`);
        }
      } else {
        throw new Error(`Database access failed: ${error.message}`);
      }
    }

    console.log('[database] Tables ready');
  } catch (error) {
    console.error('[database] Tables not ready:', error);
    throw error;
  }
}

// Helper method for CategoriesAPI
const getFromLocalStorage = () => getFromStorage(STORAGE_KEYS.CATEGORIES, []);

export const CategoriesAPI = {
  async getAll(): Promise<StoredCategory[]> {
    try {
      console.log('[CATEGORIES_API] Fetching from Supabase...');
      const merchantId = await getCurrentMerchantId();
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', merchantId) // Filter by current merchant
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Convert database format to StoredCategory format
      return (data || []).map((item: any) => ({
        id: item.id,
        tenantId: item.tenant_id || merchantId, // Should always be merchantId now
        name: item.name,
        position: item.position || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.warn('[CATEGORIES_API] Supabase error, using localStorage:', error);
      return getFromLocalStorage();
    }
  },

  async create(data: { name: string; position?: number }): Promise<StoredCategory> {
    try {
      const merchantId = await getCurrentMerchantId();
      const insertData = {
        name: data.name,
        position: data.position || 0,
        tenant_id: merchantId, // Use current merchant ID as tenant_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: result, error } = await supabase
        .from('categories')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[CATEGORIES_API] Category created successfully:', result);
      
      // Convert database format to StoredCategory format
      return {
        id: result.id || '',
        tenantId: result.tenant_id || merchantId,
        name: result.name || '',
        position: result.position || 0,
        createdAt: result.created_at || '',
        updatedAt: result.updated_at || ''
      };
    } catch (error) {
      console.warn('[CATEGORIES_API] Supabase create failed, using localStorage:', error);
      return createCategoryInLocalStorage(data);
    }
  },

  async update(id: string, data: Partial<{ name: string; position: number }>): Promise<StoredCategory | null> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      const { data: result, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Convert database format to StoredCategory format
      return {
        id: result.id || '',
        tenantId: result.tenant_id || '00000000-0000-0000-0000-000000000001',
        name: result.name || '',
        position: result.position || 0,
        createdAt: result.created_at || '',
        updatedAt: result.updated_at || ''
      };
    } catch (error) {
      console.warn('[CATEGORIES_API] Supabase update failed, using localStorage:', error);
      return updateCategoryInLocalStorage(id, data);
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('[CATEGORIES_API] Supabase delete failed, using localStorage:', error);
      return deleteCategoryFromLocalStorage(id);
    }
  }
};

export const ItemsAPI = {
  async getAll(filters?: { 
    active?: boolean; 
    categoryId?: string; 
    query?: string; 
  }): Promise<StoredItem[]> {
    try {
      console.log('[ITEMS_API] Fetching from Supabase...');
      const profileId = await getCurrentProfileId();
      const merchantId = await getCurrentMerchantId();
      
      let query = supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by current user's profile_id
      if (profileId) {
        query = query.eq('profile_id', profileId);
      }
      
      // Also filter by tenant_id (merchant_id) for extra safety
      query = query.eq('tenant_id', merchantId);
      
      // Apply filters
      if (filters?.active !== undefined) {
        query = query.eq('active', filters.active);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('[ITEMS_API] Supabase query failed:', error);
        throw error;
      }
      
      let items = data || [];
      
      // Apply text search filter client-side
      if (filters?.query) {
        const searchQuery = filters.query.toLowerCase();
        items = items.filter(item => 
          item.name?.toLowerCase().includes(searchQuery) ||
          (item.sku && item.sku.toLowerCase().includes(searchQuery))
        );
      }
      
      // Convert to StoredItem format
      return items.map((item: any) => ({
        id: item.id || '',
        tenantId: item.tenant_id || merchantId, // Should always be merchantId now
        profileId: item.profile_id,
        categoryId: null, // No category support in current schema
        name: item.name || '',
        price_cents: item.price_cents || 0,
        active: item.active ?? true,
        sku: item.sku,
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || '',
        category: undefined
      }));
    } catch (error) {
      console.warn('[ITEMS_API] Supabase error, using localStorage:', error);
      return getItemsFromLocalStorage(filters);
    }
  },

  async create(data: {
    name: string;
    price: string;
    categoryId?: string | null;
    active?: boolean;
    sku?: string | null;
    tenantId?: string;
  }): Promise<StoredItem> {
    try {
      const profileId = await getCurrentProfileId();
      const merchantId = await getCurrentMerchantId();
      const priceInCents = Math.round(parseFloat(data.price) * 100);
      
      const insertData = {
        tenant_id: merchantId, // Use current merchant ID, ignore UI tenant selection
        profile_id: profileId,
        name: data.name,
        price_cents: priceInCents,
        currency: 'SGD',
        active: data.active ?? true,
        sku: data.sku,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('[ITEMS_API] Creating item in Supabase:', insertData);
      
      const { data: result, error } = await supabase
        .from('items')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('[ITEMS_API] Supabase insert failed:', error);
        throw error;
      }
      
      console.log('[ITEMS_API] Item created successfully:', result);
      
      // Convert to StoredItem format
      return {
        id: result.id || '',
        tenantId: result.tenant_id || merchantId,
        profileId: result.profile_id,
        categoryId: null,
        name: result.name || '',
        price_cents: result.price_cents || 0,
        active: result.active ?? true,
        sku: result.sku,
        createdAt: result.created_at || '',
        updatedAt: result.updated_at || '',
        category: undefined
      };
    } catch (error) {
      console.warn('[ITEMS_API] Supabase create failed, using localStorage:', error);
      return createItemInLocalStorage(data);
    }
  },

  async update(id: string, data: Partial<{
    name: string;
    price: string;
    categoryId: string | null;
    active: boolean;
    sku: string | null;
  }>): Promise<StoredItem | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.price !== undefined) updateData.price_cents = Math.round(parseFloat(data.price) * 100);
      if (data.active !== undefined) updateData.active = data.active;
      if (data.sku !== undefined) updateData.sku = data.sku;
      updateData.currency = 'SGD';
      
      console.log('[ITEMS_API] Updating item in Supabase:', id, updateData);
      
      const { data: result, error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[ITEMS_API] Supabase update failed:', error);
        throw error;
      }
      
      console.log('[ITEMS_API] Item updated successfully:', result);
      
      // Convert to StoredItem format  
      return {
        id: result.id || '',
        tenantId: result.tenant_id || result.tenant_id, // Keep original tenant_id
        profileId: result.profile_id,
        categoryId: null,
        name: result.name || '',
        price_cents: result.price_cents || 0,
        active: result.active ?? true,
        sku: result.sku,
        createdAt: result.created_at || '',
        updatedAt: result.updated_at || '',
        category: undefined
      };
    } catch (error) {
      console.warn('[ITEMS_API] Supabase update failed, using localStorage:', error);
      return updateItemInLocalStorage(id, data);
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      console.log('[ITEMS_API] Deleting item from Supabase:', id);
      
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('[ITEMS_API] Supabase delete failed:', error);
        throw error;
      }
      
      console.log('[ITEMS_API] Item deleted successfully');
      return true;
    } catch (error) {
      console.warn('[ITEMS_API] Supabase delete failed, using localStorage:', error);
      return deleteItemFromLocalStorage(id);
    }
  }
};