/**
 * Client-side storage for production deployment
 * Uses Supabase database when configured, localStorage as fallback
 */

import { CategoriesAPI as SupabaseCategoriesAPI, ItemsAPI as SupabaseItemsAPI, type StoredCategory, type StoredItem } from './database';
import { isSupabaseConfigured, supabase } from './supabase.js';

// Re-export types from database module
export type { StoredItem, StoredCategory };

export interface StoredOrder {
  id: string;
  tenantId: string;
  reference: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  qrSvg?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  ITEMS: 'paynowgo_items',
  CATEGORIES: 'paynowgo_categories',
  ORDERS: 'paynowgo_orders',
  QR_DATA: 'paynowgo_qr_data'
};

// Initialize default data
const DEFAULT_CATEGORIES: StoredCategory[] = [
  {
    id: 'cat-1',
    tenantId: '00000000-0000-0000-0000-000000000001',
    name: 'Beverages',
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-2',
    tenantId: '00000000-0000-0000-0000-000000000001',
    name: 'Main Dishes',
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-3',
    tenantId: '00000000-0000-0000-0000-000000000001',
    name: 'Desserts',
    position: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_ITEMS: StoredItem[] = [
  {
    id: 'item-1',
    tenantId: '00000000-0000-0000-0000-000000000001',
    categoryId: 'cat-1',
    name: 'Coffee',
    price_cents: 450,
    active: true,
    sku: 'BEV001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[0]
  },
  {
    id: 'item-2',
    tenantId: '00000000-0000-0000-0000-000000000001',
    categoryId: 'cat-1',
    name: 'Tea',
    price_cents: 350,
    active: true,
    sku: 'BEV002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[0]
  },
  {
    id: 'item-3',
    tenantId: '00000000-0000-0000-0000-000000000001',
    categoryId: 'cat-2',
    name: 'Nasi Lemak',
    price_cents: 850,
    active: true,
    sku: 'MAIN001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[1]
  },
  {
    id: 'item-4',
    tenantId: '00000000-0000-0000-0000-000000000001',
    categoryId: 'cat-2',
    name: 'Chicken Rice',
    price_cents: 750,
    active: true,
    sku: 'MAIN002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[1]
  },
  {
    id: 'item-5',
    tenantId: '00000000-0000-0000-0000-000000000001',
    categoryId: 'cat-3',
    name: 'Ice Cream',
    price_cents: 400,
    active: true,
    sku: 'DES001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[2]
  }
];

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

// Initialize storage with default data if empty
function initializeStorage(merchantId?: string) {
  // If we have a specific merchant ID, use merchant-specific storage
  if (merchantId) {
    const categoriesKey = `paynowgo_categories_${merchantId}`;
    const itemsKey = `paynowgo_items_${merchantId}`;
    
    console.log('[STORAGE] Initializing storage for merchant:', merchantId);
    console.log('[STORAGE] Categories key:', categoriesKey);
    console.log('[STORAGE] Items key:', itemsKey);
    
    const existingCategories = getFromStorage(categoriesKey, []);
    if (existingCategories.length === 0) {
      console.log('[STORAGE] Creating default categories for merchant:', merchantId);
      saveToStorage(categoriesKey, DEFAULT_CATEGORIES);
    }

    const existingItems = getFromStorage(itemsKey, []);
    if (existingItems.length === 0) {
      console.log('[STORAGE] Creating default items for merchant:', merchantId);
      saveToStorage(itemsKey, DEFAULT_ITEMS);
    }
    return;
  }
  
  // Global storage (for backward compatibility)
  const existingCategories = getFromStorage(STORAGE_KEYS.CATEGORIES, []);
  if (existingCategories.length === 0) {
    saveToStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  const existingItems = getFromStorage(STORAGE_KEYS.ITEMS, []);
  if (existingItems.length === 0) {
    saveToStorage(STORAGE_KEYS.ITEMS, DEFAULT_ITEMS);
  }
}

// Get current merchant ID from Supabase session
async function getCurrentMerchantId(): Promise<string> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[STORAGE] No authenticated user found, using fallback merchant ID');
      return '00000000-0000-0000-0000-000000000001';
    }
    
    // Get merchant data linked to this user's profile
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('profile_id', user.id)
      .single();
      
    if (merchantError || !merchant) {
      console.warn('[STORAGE] No merchant found for user:', merchantError);
      console.log('[STORAGE] Using fallback merchant ID');
      return '00000000-0000-0000-0000-000000000001';
    }
    
    console.log('[STORAGE] Current merchant ID from Supabase:', merchant.id, 'User:', user.email);
    return merchant.id;
  } catch (error) {
    console.error('[STORAGE] Error getting current merchant ID:', error);
    
    // Fallback to demo merchant ID
    console.log('[STORAGE] Using fallback merchant ID');
    return '00000000-0000-0000-0000-000000000001';
  }
}

// Get merchant-specific storage keys
function getMerchantStorageKeys(merchantId: string) {
  return {
    CATEGORIES: `paynowgo_categories_${merchantId}`,
    ITEMS: `paynowgo_items_${merchantId}`,
    ORDERS: `paynowgo_orders_${merchantId}`
  };
}

// Categories API
export const CategoriesAPI = {
  async getAll(): Promise<StoredCategory[]> {
    console.log('[CATEGORIES_API] Fetching from Supabase...');
    return await SupabaseCategoriesAPI.getAll();
  },

  async create(data: { name: string; position?: number }): Promise<StoredCategory> {
    console.log('[CATEGORIES_API] Creating in Supabase...');
    return await SupabaseCategoriesAPI.create(data);
  },

  async update(id: string, data: Partial<{ name: string; position: number }>): Promise<StoredCategory | null> {
    console.log('[CATEGORIES_API] Updating in Supabase...');
    return await SupabaseCategoriesAPI.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    console.log('[CATEGORIES_API] Deleting from Supabase...');
    return await SupabaseCategoriesAPI.delete(id);
  }
};

// Items API
export const ItemsAPI = {
  async getAll(filters?: { 
    active?: boolean; 
    categoryId?: string; 
    query?: string; 
  }): Promise<StoredItem[]> {
    console.log('[ITEMS_API] Fetching from Supabase...');
    const items = await SupabaseItemsAPI.getAll(filters);
    return items;
  },

  async create(data: {
    name: string;
    price: string;
    categoryId?: string | null;
    active?: boolean;
    sku?: string | null;
  }): Promise<StoredItem> {
    console.log('[ITEMS_API] Creating in Supabase...');
    return await SupabaseItemsAPI.create(data);
  },

  async update(id: string, data: Partial<{
    name: string;
    price: string;
    categoryId: string | null;
    active: boolean;
    sku: string | null;
  }>): Promise<StoredItem | null> {
    console.log('[ITEMS_API] Updating in Supabase...');
    return await SupabaseItemsAPI.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    console.log('[ITEMS_API] Deleting from Supabase...');
    return await SupabaseItemsAPI.delete(id);
  }
};

// Orders API
export const OrdersAPI = {
  getAll(): StoredOrder[] {
    return getFromStorage(STORAGE_KEYS.ORDERS, []);
  },

  create(data: {
    reference: string;
    amount: number;
    qrSvg?: string;
    expiresAt?: string;
  }): StoredOrder {
    const orders = this.getAll();
    
    const newOrder: StoredOrder = {
      id: 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      tenantId: '00000000-0000-0000-0000-000000000001',
      reference: data.reference,
      amount: data.amount,
      status: 'pending',
      qrSvg: data.qrSvg,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = [newOrder, ...orders];
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    return newOrder;
  },

  updateStatus(id: string, status: 'pending' | 'paid' | 'canceled' | 'expired'): StoredOrder | null {
    const orders = this.getAll();
    const index = orders.findIndex(order => order.id === id);
    
    if (index === -1) return null;

    const updatedOrder = {
      ...orders[index],
      status,
      updatedAt: new Date().toISOString()
    };

    orders[index] = updatedOrder;
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
    return updatedOrder;
  }
};

// QR Display API
export const DisplayAPI = {
  getCurrentQR(): any {
    const qrData = getFromStorage(STORAGE_KEYS.QR_DATA, null);
    console.log('[DISPLAY_API] getCurrentQR returning:', {
      hasData: !!qrData,
      orderId: qrData?.orderId,
      amount: qrData?.amount,
      reference: qrData?.reference,
      hasSvg: !!qrData?.qrSvg,
      svgLength: qrData?.qrSvg?.length
    });
    return qrData;
  },

  showQR(data: {
    orderId: string;
    qrSvg: string;
    amount: number;
    reference: string;
    expiresAt?: string;
  }): void {
    console.log('[DISPLAY_API] Storing QR data:', {
      orderId: data.orderId,
      amount: data.amount,
      reference: data.reference,
      hasSvg: !!data.qrSvg,
      svgLength: data.qrSvg?.length,
      expiresAt: data.expiresAt
    });
    saveToStorage(STORAGE_KEYS.QR_DATA, data);
    
    // Trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.QR_DATA,
      newValue: JSON.stringify(data),
      storageArea: localStorage
    }));
    
    console.log('[DISPLAY_API] QR data stored and storage event dispatched');
  },

  hideQR(): void {
    console.log('[DISPLAY_API] Clearing QR data');
    localStorage.removeItem(STORAGE_KEYS.QR_DATA);
    
    // Trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.QR_DATA,
      newValue: null,
      storageArea: localStorage
    }));
    
    console.log('[DISPLAY_API] QR data cleared and storage event dispatched');
  }
};

// Initialize storage on module load
if (typeof window !== 'undefined') {
  // Initialize storage asynchronously
  getCurrentMerchantId().then(merchantId => {
    console.log('[STORAGE] Initializing storage for merchant:', merchantId);
    initializeStorage(merchantId);
  }).catch(error => {
    console.warn('[STORAGE] Could not get merchant ID for initialization:', error);
    // Initialize with fallback ID
    initializeStorage('00000000-0000-0000-0000-000000000001');
  });
}