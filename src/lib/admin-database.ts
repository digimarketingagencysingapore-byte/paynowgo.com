/**
 * Admin Database API for permanent storage of admin data
 * Handles merchants, admin users, CMS content, and system settings
 */

import { supabase } from './supabase';
import { getSupabaseClient } from './supabase';
import { signToken } from './auth';

// Custom error class for table not found scenarios
export class SupabaseTableNotFoundError extends Error {
  constructor(tableName: string) {
    super(`Table '${tableName}' not found in Supabase schema`);
    this.name = 'SupabaseTableNotFoundError';
  }
}

// Admin User Types
export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  firstName?: string;
  lastName?: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Merchant Types
export interface Merchant {
  id: string;
  businessName: string;
  email: string;
  password?: string; // For demo login
  uen?: string;
  mobile?: string;
  address?: string;
  status: 'active' | 'suspended' | 'pending' | 'expired';
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  subscriptionStartsAt: string;
  subscriptionExpiresAt: string;
  paymentMethod: 'uen' | 'mobile';
  settings: Record<string, any>;
  monthlyRevenue?: number;
  subscriptionLink?: string;
  createdAt: string;
  updatedAt: string;
}

// CMS Content Types
export interface CMSSection {
  id: string;
  section: string;
  content: Record<string, any>;
  version: number;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// System Settings Types
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Set admin context for RLS
async function setAdminContext(adminId: string) {
  const { error } = await supabase.rpc('set_config', {
    parameter: 'app.current_admin_id',
    value: adminId
  });
  
  if (error) {
    console.warn('Could not set admin context:', error);
  }
}

// Admin Users Database API
export const AdminUsersDB = {
  async authenticate(email: string, password: string): Promise<AdminUser | null> {
    try {
      // In production, this would verify password hash
      // For demo, we'll use simple comparison
      if (email === 'test@admin.com' && password === '12345678') {
        // Return demo admin user without database query
        const demoAdminId = '00000000-0000-0000-0000-000000000001';
        const now = new Date().toISOString();
        
        // Generate a valid JWT token for the demo admin user
        const token = await signToken({
          userId: demoAdminId,
          userType: 'admin',
          email: email
        });

        return {
          success: true,
          user: {
          id: demoAdminId,
          email: email,
          role: 'super_admin',
          firstName: 'Demo',
          lastName: 'Admin',
          active: true,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
          },
          token: token
        };
      }
      
      return {
        success: false,
        error: 'Invalid email or password'
      };
    } catch (error) {
      console.error('Admin authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  },

  async getAll(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin users:', error);
      throw new Error('Failed to fetch admin users');
    }

    return (data || []).map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      active: true,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  },

  async create(data: {
    email: string;
    password: string;
    role: 'super_admin' | 'admin' | 'support';
    firstName?: string;
    lastName?: string;
  }): Promise<AdminUser> {
    // In production, hash the password properly
    const { data: result, error } = await supabase
      .from('admin_users')
      .insert({
        email: data.email,
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uOtO', // demo hash
        role: data.role,
        first_name: data.firstName,
        last_name: data.lastName
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user:', error);
      throw new Error('Failed to create admin user');
    }

    return {
      id: result.id,
      email: result.email,
      role: result.role,
      firstName: result.first_name,
      lastName: result.last_name,
      active: result.active,
      lastLoginAt: result.last_login_at,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }
};

// Merchants Database API
export const MerchantsDB = {
  async getAll(authToken?: string): Promise<Merchant[]> {
    console.log('[MERCHANTS_DB] Fetching from Supabase...');
    const client = getSupabaseClient(authToken);
    const { data, error } = await client
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch merchants: ${error.message}`);
    }

    return (data || []).map(merchant => ({
      id: merchant.id,
      businessName: merchant.business_name,
      email: merchant.email,
      uen: merchant.uen,
      mobile: merchant.mobile,
      address: merchant.address,
      status: merchant.status,
      subscriptionPlan: merchant.subscription_plan,
      subscriptionStartsAt: merchant.subscription_starts_at,
      subscriptionExpiresAt: merchant.subscription_expires_at,
      paymentMethod: merchant.payment_method,
      settings: merchant.settings || {},
      subscriptionLink: merchant.subscription_link,
      createdAt: merchant.created_at,
      updatedAt: merchant.updated_at
    }));
  },

  async create(data: {
    businessName: string;
    email: string;
    password: string;
    uen?: string;
    mobile?: string;
    address?: string;
    subscriptionPlan?: 'basic' | 'professional' | 'enterprise';
  }): Promise<Merchant> {
    console.log('[MERCHANTS_DB] Creating merchant with data:', data);
    
    const passwordHash = data.password;
    
    const { data: result, error } = await supabase
      .from('merchants')
      .insert({
        business_name: data.businessName,
        email: data.email,
        password_hash: passwordHash,
        uen: data.uen,
        mobile: data.mobile,
        address: data.address,
        subscription_plan: data.subscriptionPlan || 'basic',
        subscription_starts_at: new Date().toISOString(),
        subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create merchant: ${error.message}`);
    }

    return {
      id: result.id,
      businessName: result.business_name,
      email: result.email,
      uen: result.uen,
      mobile: result.mobile,
      address: result.address,
      status: result.status,
      subscriptionPlan: result.subscription_plan,
      subscriptionStartsAt: result.subscription_starts_at,
      subscriptionExpiresAt: result.subscription_expires_at,
      paymentMethod: result.payment_method || (data.uen ? 'uen' : 'mobile'),
      settings: result.settings || {},
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  },

  async update(id: string, data: {
    businessName?: string;
    email?: string;
    uen?: string;
    mobile?: string;
    address?: string;
    subscriptionPlan?: 'basic' | 'professional' | 'enterprise';
    monthlyRevenue?: number;
    subscriptionLink?: string;
  }): Promise<Merchant> {
    console.log('[MERCHANTS_DB] Updating merchant:', id, 'with data:', data);
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.businessName !== undefined) updateData.business_name = data.businessName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.uen !== undefined) updateData.uen = data.uen;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.subscriptionPlan !== undefined) updateData.subscription_plan = data.subscriptionPlan;
    if (data.monthlyRevenue !== undefined) updateData.monthly_revenue = data.monthlyRevenue;
    if (data.subscriptionLink !== undefined) updateData.subscription_link = data.subscriptionLink;

    const { data: result, error } = await supabase
      .from('merchants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update merchant: ${error.message}`);
    }

    const updatedMerchant = {
      id: result.id,
      businessName: result.business_name,
      email: result.email,
      uen: result.uen,
      mobile: result.mobile,
      address: result.address,
      status: result.status,
      subscriptionPlan: result.subscription_plan,
      subscriptionStartsAt: result.subscription_starts_at,
      subscriptionExpiresAt: result.subscription_expires_at,
      paymentMethod: result.payment_method || (result.uen ? 'uen' : 'mobile'),
      settings: result.settings || {},
      monthlyRevenue: result.monthly_revenue,
      subscriptionLink: result.subscription_link,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
    
    return updatedMerchant;
  },

  async updateStatus(id: string, status: 'active' | 'suspended' | 'pending' | 'expired'): Promise<Merchant | null> {
    console.log('[MERCHANTS_DB] Updating status in Supabase:', id, status);
    const { data: result, error } = await supabase
      .from('merchants')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update merchant status: ${error.message}`);
    }

    return {
      id: result.id,
      businessName: result.business_name,
      email: result.email,
      uen: result.uen,
      mobile: result.mobile,
      address: result.address,
      status: result.status,
      subscriptionPlan: result.subscription_plan,
      subscriptionStartsAt: result.subscription_starts_at,
      subscriptionExpiresAt: result.subscription_expires_at,
      paymentMethod: result.payment_method,
      settings: result.settings || {},
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  },

  async delete(id: string): Promise<boolean> {
    console.log('[MERCHANTS_DB] Deleting from Supabase:', id);
    const { error } = await supabase
      .from('merchants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete merchant: ${error.message}`);
    }

    return true;
  }
};

// LocalStorage fallback functions
const MERCHANTS_STORAGE_KEY = 'paynowgo_merchants';

export function getMerchantsFromLocalStorage(): Merchant[] {
  try {
    const stored = localStorage.getItem(MERCHANTS_STORAGE_KEY);
    if (!stored) {
      console.log('[MERCHANTS_DB] No merchants in localStorage, initializing with demo data');
      // Initialize with demo merchant
      const defaultMerchants: Merchant[] = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          businessName: 'Demo Restaurant Pte Ltd',
          email: 'test@merchant.com',
          password: '12345678', // Add password for demo merchant
          uen: 'T05LL1103B',
          mobile: '+6591234567',
          address: '123 Orchard Road, Singapore 238874',
          status: 'active',
          subscriptionPlan: 'basic',
          subscriptionStartsAt: new Date().toISOString(),
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'uen',
          settings: {},
          monthlyRevenue: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
      ];
      localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(defaultMerchants));
      console.log('[MERCHANTS_DB] Demo merchants initialized in localStorage');
      return defaultMerchants;
    }
    const merchants = JSON.parse(stored);
    console.log('[MERCHANTS_DB] Loaded merchants from localStorage:', merchants.length);
    return merchants;
  } catch (error) {
    console.error('Error reading merchants from localStorage:', error);
    return [];
  }
}

function createMerchantInLocalStorage(data: {
  businessName: string;
  email: string;
  password: string;
  uen?: string;
  mobile?: string;
  address?: string;
  subscriptionPlan?: 'basic' | 'professional' | 'enterprise';
  subscriptionLink?: string;
}): Merchant {
  console.log('[MERCHANTS_DB] Creating merchant in localStorage with data:', data);
  const merchants = getMerchantsFromLocalStorage();
  console.log('[MERCHANTS_DB] Current merchants in localStorage:', merchants.length);
  
  const newMerchant: Merchant = {
    id: 'merchant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    businessName: data.businessName,
    email: data.email,
    password: data.password,
    uen: data.uen,
    mobile: data.mobile,
    address: data.address,
    status: 'active',
    subscriptionPlan: data.subscriptionPlan || 'basic',
    subscriptionStartsAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: data.uen ? 'uen' : 'mobile',
    settings: {},
    subscriptionLink: data.subscriptionLink,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('[MERCHANTS_DB] New merchant object created:', newMerchant);
  const updatedMerchants = [newMerchant, ...merchants];
  console.log('[MERCHANTS_DB] Updated merchants array length:', updatedMerchants.length);
  
  try {
    localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(updatedMerchants));
    console.log('[MERCHANTS_DB] Merchants saved to localStorage successfully');
    
    // Verify the save worked
    const verification = localStorage.getItem(MERCHANTS_STORAGE_KEY);
    const verifiedMerchants = verification ? JSON.parse(verification) : [];
    console.log('[MERCHANTS_DB] Verification: localStorage now contains', verifiedMerchants.length, 'merchants');
    
    if (verifiedMerchants.length !== updatedMerchants.length) {
      console.error('[MERCHANTS_DB] localStorage save verification failed!');
      throw new Error('Failed to save to localStorage');
    }
  } catch (error) {
    console.error('[MERCHANTS_DB] Error saving to localStorage:', error);
    throw new Error('Failed to save merchant to localStorage');
  }
  
  console.log('[MERCHANTS_DB] Merchants saved to localStorage');
  
  return newMerchant;
}

function updateMerchantInLocalStorage(id: string, data: {
  businessName?: string;
  email?: string;
  uen?: string;
  mobile?: string;
  address?: string;
  subscriptionPlan?: 'basic' | 'professional' | 'enterprise';
  monthlyRevenue?: number;
}): Merchant {
  console.log('[MERCHANTS_DB] Updating merchant in localStorage:', id, 'with data:', data);
  const merchants = getMerchantsFromLocalStorage();
  const index = merchants.findIndex(m => m.id === id);
  
  if (index === -1) {
    throw new Error('Merchant not found');
  }
  
  const existingMerchant = merchants[index];
  
  // Handle null values properly - they should clear the field
  const updatedMerchant: Merchant = {
    ...existingMerchant,
    businessName: data.businessName !== undefined ? data.businessName : existingMerchant.businessName,
    email: data.email !== undefined ? data.email : existingMerchant.email,
    uen: data.uen !== undefined ? (data.uen || undefined) : existingMerchant.uen,
    mobile: data.mobile !== undefined ? (data.mobile || undefined) : existingMerchant.mobile,
    address: data.address !== undefined ? (data.address || undefined) : existingMerchant.address,
    subscriptionPlan: data.subscriptionPlan !== undefined ? data.subscriptionPlan : existingMerchant.subscriptionPlan,
    monthlyRevenue: data.monthlyRevenue !== undefined ? data.monthlyRevenue : existingMerchant.monthlyRevenue,
    subscriptionLink: data.subscriptionLink !== undefined ? (data.subscriptionLink || undefined) : existingMerchant.subscriptionLink,
    paymentMethod: (() => {
      const finalUen = data.uen !== undefined ? data.uen : existingMerchant.uen;
      const finalMobile = data.mobile !== undefined ? data.mobile : existingMerchant.mobile;
      return finalUen ? 'uen' : finalMobile ? 'mobile' : 'uen'; // Default to uen if neither
    })(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('[MERCHANTS_DB] Updated merchant object:', {
    id: updatedMerchant.id,
    businessName: updatedMerchant.businessName,
    uen: updatedMerchant.uen,
    mobile: updatedMerchant.mobile,
    paymentMethod: updatedMerchant.paymentMethod
  });
  
  merchants[index] = updatedMerchant;
  
  try {
    localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(merchants));
    console.log('[MERCHANTS_DB] Merchant updated in localStorage successfully');
    
    // Update the merchant's user data if they're currently logged in
    const currentUserData = localStorage.getItem('user_data');
    if (currentUserData) {
      try {
        const currentUser = JSON.parse(currentUserData);
        if (currentUser.id === id) {
          const updatedUserData = {
            ...currentUser,
            businessName: updatedMerchant.businessName,
            email: updatedMerchant.email,
            uen: updatedMerchant.uen || undefined,
            mobile: updatedMerchant.mobile || undefined,
            address: updatedMerchant.address
          };
          
          console.log('[MERCHANTS_DB] Updating user session with cleaned data:', {
            businessName: updatedUserData.businessName,
            uen: updatedUserData.uen,
            mobile: updatedUserData.mobile
          });
          
          localStorage.setItem('user_data', JSON.stringify(updatedUserData));
          console.log('[MERCHANTS_DB] Updated current user session data');
          
          // Trigger a custom event to update the header without full page reload
          window.dispatchEvent(new CustomEvent('merchantDataUpdated', { 
            detail: updatedUserData 
          }));
          
          console.log('[MERCHANTS_DB] Merchant session data updated, event dispatched');
        }
      } catch (error) {
        console.warn('[MERCHANTS_DB] Could not update current user session:', error);
      }
    }
  } catch (error) {
    console.error('[MERCHANTS_DB] Error updating merchant in localStorage:', error);
    throw new Error('Failed to update merchant in localStorage');
  }
  
  return updatedMerchant;
}

function updateMerchantStatusInLocalStorage(id: string, status: 'active' | 'suspended' | 'pending' | 'expired'): Merchant | null {
  const merchants = getMerchantsFromLocalStorage();
  const index = merchants.findIndex(m => m.id === id);
  
  if (index === -1) return null;
  
  const updatedMerchant = {
    ...merchants[index],
    status,
    updatedAt: new Date().toISOString()
  };
  
  merchants[index] = updatedMerchant;
  localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(merchants));
  
  return updatedMerchant;
}

function deleteMerchantFromLocalStorage(id: string): boolean {
  const merchants = getMerchantsFromLocalStorage();
  const filtered = merchants.filter(m => m.id !== id);
  
  if (filtered.length === merchants.length) return false;
  
  localStorage.setItem(MERCHANTS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// CMS Content Database API
export const CMSDB = {
  async getContent(section: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('content')
        .eq('section', section)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('table') || error.message?.includes('schema cache')) {
          console.warn('CMS table not found, using fallback storage');
          return null;
        }
        console.warn('CMS content not found for section:', section);
        return null;
      }

      return data.content;
    } catch (error) {
      console.warn('CMS database error, using fallback:', error);
      return null;
    }
  },

  async getAllContent(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('cms_content')
      .select('section, content')
      .eq('active', true);

    if (error) {
      if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('table') || error.message?.includes('schema cache') || error.message?.includes('Could not find')) {
        throw new SupabaseTableNotFoundError('cms_content');
      }
      console.warn('CMS content table error:', error);
      return {};
    }

    const content: Record<string, any> = {};
    (data || []).forEach(item => {
      content[item.section] = item.content;
    });

    return content;
  },

  async saveContent(section: string, content: any, adminId?: string): Promise<void> {
    // Deactivate current version
    await supabase
      .from('cms_content')
      .update({ active: false })
      .eq('section', section)
      .eq('active', true);

    // Insert new version
    const { error } = await supabase
      .from('cms_content')
      .insert({
        section,
        content,
        created_by: adminId,
        version: 1 // In production, increment version number
      });

    if (error) {
      if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.message?.includes('table') || error.message?.includes('schema cache')) {
        throw new SupabaseTableNotFoundError('cms_content');
      }
      console.error('Error saving CMS content:', error);
      throw new Error('Failed to save CMS content');
    }
  },

  async saveAllContent(allContent: Record<string, any>, adminId?: string): Promise<void> {
    for (const [section, content] of Object.entries(allContent)) {
      await this.saveContent(section, content, adminId);
    }
  }
};

// System Settings Database API
export const SystemSettingsDB = {
  async getAll(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching system settings:', error);
      throw new Error('Failed to fetch system settings');
    }

    return (data || []).map(setting => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      category: setting.category,
      updatedBy: setting.updated_by,
      createdAt: setting.created_at,
      updatedAt: setting.updated_at
    }));
  },

  async get(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.warn('System setting not found:', key);
      return null;
    }

    return data.value;
  },

  async set(key: string, value: any, adminId?: string): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value,
        updated_by: adminId,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error setting system setting:', error);
      throw new Error('Failed to update system setting');
    }
  }
};

// Migration helper for existing data
export function migrateAdminData() {
  console.log('[ADMIN_MIGRATION] Migration skipped - using localStorage as primary storage');
  // Migration is disabled until database tables are properly set up
  // This prevents errors when CMS tables don't exist in Supabase
}

// Check if admin migration is needed
export function needsAdminMigration(): boolean {
  const migrated = localStorage.getItem('paynowgo_cms_migrated');
  const hasLocalCMS = localStorage.getItem('paynowgo_cms_content');
  
  return !migrated && !!hasLocalCMS;
}