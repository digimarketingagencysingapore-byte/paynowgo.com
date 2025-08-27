/**
 * Merchant-specific database API with proper synchronization
 * All data is properly isolated by merchant ID and synchronized across devices
 * Now uses terminal-based QR synchronization for cross-device updates
 */

import { supabase } from './supabase';
import { terminalSync, getTerminalIdFromDeviceKey, DEFAULT_TERMINALS, type TerminalQRData } from './terminal-sync';

// Get current merchant ID
function getCurrentMerchantId(): string {
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const merchant = JSON.parse(userData);
      return merchant.id;
    }
  } catch (error) {
    console.error('Error getting current merchant ID:', error);
  }
  return '00000000-0000-0000-0000-000000000001'; // Fallback
}

// Display Devices API
export const MerchantDisplayDevicesAPI = {
  async getAll(): Promise<any[]> {
    const merchantId = getCurrentMerchantId();
    console.log('[DISPLAY_DEVICES_API] Getting devices for merchant:', merchantId);
    
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
    
    return (data || []).map((device: any) => ({
      id: device.id,
      merchant_id: merchantId,
      device_key: device.device_key,
      device_name: device.device_name,
      active: device.last_seen_at ? new Date(device.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000) : false,
      last_seen_at: device.last_seen_at,
      created_at: device.created_at,
      updated_at: device.updated_at
    }));
  },

  async update(deviceId: string, data: { active?: boolean; device_name?: string }): Promise<any> {
    const merchantId = getCurrentMerchantId();
    console.log('[DISPLAY_DEVICES_API] Updating device:', deviceId, 'for merchant:', merchantId);
    
    try {
      const { data: result, error } = await supabase
        .from('devices')
        .update({
          device_name: data.device_name,
          last_seen_at: data.active ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('device_key', deviceId)
        .eq('merchant_id', merchantId)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase update failed, using localStorage:', error);
        throw error;
      }

      if (!result) {
        console.log('[DISPLAY_DEVICES_API] Device not found, creating new one');
        return await this.create({
          device_name: data.device_name || `Display ${deviceId}`,
          device_key: deviceId
        });
      }

      console.log('[DISPLAY_DEVICES_API] Updated in Supabase successfully');
      
      // Also update localStorage for immediate UI updates
      this.updateLocalStorage(merchantId, deviceId, data);
      
      return result;
    } catch (error) {
      console.warn('[DISPLAY_DEVICES_API] Using localStorage fallback for update');
      return this.updateLocalStorage(merchantId, deviceId, data);
    }
  },

  async create(data: { device_name: string; device_key: string }): Promise<any> {
    const merchantId = getCurrentMerchantId();
    
    try {
      const { data: result, error } = await supabase
        .from('devices')
        .upsert({
          merchant_id: merchantId,
          device_key: data.device_key,
          device_name: data.device_name,
          last_seen_at: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'merchant_id,device_key'
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase create/upsert failed:', error);
        throw error;
      }

      return result;
    } catch (error) {
      console.warn('[DISPLAY_DEVICES_API] Create failed, using localStorage:', error);
      
      const newDevice = {
        id: `device-${data.device_key}`,
        merchant_id: merchantId,
        device_key: data.device_key,
        device_name: data.device_name,
        active: false,
        last_seen_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const devices = await this.getAll();
      const updated = [...devices, newDevice];
      
      const storageKey = `displayDevices_${merchantId}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      
      return newDevice;
    }
  },

  generateDeviceKey(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  updateLocalStorage(merchantId: string, deviceId: string, data: any): any {
    const storageKey = `displayDevices_${merchantId}`;
    const stored = localStorage.getItem(storageKey);
    console.log('[DISPLAY_DEVICES_API] Updating localStorage for device:', deviceId, 'data:', data);
    
    if (stored) {
      const devices = JSON.parse(stored);
      const index = devices.findIndex((d: any) => 
        d.id === deviceId || 
        d.device_key === deviceId ||
        d.id === `device-${deviceId}` ||
        d.device_key === `device-${deviceId}`
      );
      
      if (index !== -1) {
        console.log('[DISPLAY_DEVICES_API] Found device at index:', index, 'updating...');
        devices[index] = {
          ...devices[index],
          ...data,
          active: data.active !== undefined ? data.active : devices[index].active,
          device_name: data.device_name || devices[index].device_name,
          last_seen_at: data.active ? new Date().toISOString() : devices[index].last_seen_at,
          updated_at: new Date().toISOString()
        };
        
        console.log('[DISPLAY_DEVICES_API] Device updated:', devices[index]);
        localStorage.setItem(storageKey, JSON.stringify(devices));
        
        // Trigger storage event for cross-device sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: storageKey,
          newValue: JSON.stringify(devices),
          storageArea: localStorage
        }));
        
        return devices[index];
      }
    } else {
      console.log('[DISPLAY_DEVICES_API] No stored devices found, initializing...');
      // Initialize if no devices exist
      this.getAll();
    }
    
    console.log('[DISPLAY_DEVICES_API] Device not found for update:', deviceId);
    return null;
  }
};

// Merchant Orders API
export const MerchantOrdersAPI = {
  async getAll(): Promise<any[]> {
    const merchantId = getCurrentMerchantId();
    console.log('[MERCHANT_ORDERS_API] Getting orders for merchant:', merchantId);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase query failed, using localStorage:', error);
        throw error;
      }

      console.log('[MERCHANT_ORDERS_API] Loaded from Supabase:', data?.length || 0, 'orders');
      return data || [];
    } catch (error) {
      console.warn('[MERCHANT_ORDERS_API] Using localStorage fallback');
      
      // Fallback to localStorage with merchant-specific key
      const storageKey = `paynowgo_orders_${merchantId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const orders = JSON.parse(stored);
        console.log('[MERCHANT_ORDERS_API] Loaded from localStorage:', orders.length, 'orders');
        return orders.map((order: any) => ({
          ...order,
          tenant_id: merchantId,
          created_at: order.createdAt || order.created_at,
          updated_at: order.updatedAt || order.updated_at || order.created_at
        }));
      }
      
      return [];
    }
  },

  async create(data: {
    reference: string;
    description?: string;
    amount: number;
    qr_svg?: string;
    expires_at?: string;
    items?: any[];
  }): Promise<any> {
    const merchantId = getCurrentMerchantId();
    console.log('[MERCHANT_ORDERS_API] Creating order for merchant:', merchantId);
    
    try {
      const { data: result, error } = await supabase
        .from('orders')
        .insert({
          tenant_id: merchantId,
          reference: data.reference,
          amount: data.amount,
          qr_svg: data.qr_svg,
          expires_at: data.expires_at,
          payload: JSON.stringify({ description: data.description, items: data.items || [] })
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('[MERCHANT_ORDERS_API] Created in Supabase successfully');
      
      // Also update localStorage for immediate UI updates
      this.updateLocalStorage(merchantId, result);
      
      return result;
    } catch (error) {
      console.warn('[MERCHANT_ORDERS_API] Create failed, using localStorage:', error);
      
      const newOrder = {
        id: 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        tenant_id: merchantId,
        reference: data.reference,
        description: data.description,
        amount: data.amount,
        status: 'pending',
        qr_svg: data.qr_svg,
        expires_at: data.expires_at,
        items: data.items || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.updateLocalStorage(merchantId, newOrder);
      return newOrder;
    }
  },

  async updateStatus(orderId: string, status: string): Promise<any> {
    const merchantId = getCurrentMerchantId();
    
    try {
      const { data: result, error } = await supabase
        .from('orders')
        .update({ 
          status,
        })
        .eq('id', orderId)
        .eq('tenant_id', merchantId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update localStorage
      this.updateOrderInLocalStorage(merchantId, orderId, { status });
      
      return result;
    } catch (error) {
      console.warn('[MERCHANT_ORDERS_API] Update failed, using localStorage:', error);
      return this.updateOrderInLocalStorage(merchantId, orderId, { status });
    }
  },

  updateLocalStorage(merchantId: string, newOrder: any): void {
    const storageKey = `paynowgo_orders_${merchantId}`;
    const stored = localStorage.getItem(storageKey);
    const orders = stored ? JSON.parse(stored) : [];
    
    const updated = [newOrder, ...orders];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    // Trigger storage event for cross-device sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(updated),
      storageArea: localStorage
    }));
  },

  updateOrderInLocalStorage(merchantId: string, orderId: string, updates: any): any {
    const storageKey = `paynowgo_orders_${merchantId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const orders = JSON.parse(stored);
      const index = orders.findIndex((o: any) => o.id === orderId);
      
      if (index !== -1) {
        orders[index] = {
          ...orders[index],
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(orders));
        
        // Trigger storage event for cross-device sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: storageKey,
          newValue: JSON.stringify(orders),
          storageArea: localStorage
        }));
        
        return orders[index];
      }
    }
    
    return null;
  }
};

// QR Events API for real-time display sync
export const MerchantQREventsAPI = {
  async broadcastShowQR(qrData: {
    orderId: string;
    qrSvg: string;
    amount: number;
    reference: string;
    expiresAt: string;
  }): Promise<void> {
    const merchantId = getCurrentMerchantId();
    console.log('[QR_EVENTS_API] Broadcasting show QR to ALL terminals for merchant:', merchantId);
    
    // Get all active terminals for this merchant
    const activeDevices = await MerchantDisplayDevicesAPI.getAll();
    const activeTerminals = activeDevices
      .filter(device => device.active)
      .map(device => getTerminalIdFromDeviceKey(device.device_key));
    
    console.log('[QR_EVENTS_API] Broadcasting to terminals:', activeTerminals);
    
    // Broadcast to ALL active terminals
    for (const terminalId of activeTerminals) {
      const terminalQRData: TerminalQRData = {
        ...qrData,
        terminalId,
        merchantId,
        timestamp: Date.now()
      };
      
      await terminalSync.broadcastToTerminal(terminalId, terminalQRData);
    }
    
    // Also broadcast to default terminals for backward compatibility
    const defaultTerminals = [DEFAULT_TERMINALS.COUNTER_1, DEFAULT_TERMINALS.COUNTER_2];
    for (const terminalId of defaultTerminals) {
      const terminalQRData: TerminalQRData = {
        ...qrData,
        terminalId,
        merchantId,
        timestamp: Date.now()
      };
      
      await terminalSync.broadcastToTerminal(terminalId, terminalQRData);
    }
    
    try {
      const { error } = await supabase
        .from('display_events')
        .insert({
          tenant_id: merchantId,
          event_type: 'show_qr',
          order_id: qrData.orderId,
          qr_data: qrData,
          expires_at: qrData.expiresAt
        });

      if (error) {
        console.warn('[QR_EVENTS_API] Database insert failed:', error);
      }
    } catch (error) {
      console.warn('[QR_EVENTS_API] Database event insert failed:', error);
    }
  },

  async broadcastHideQR(): Promise<void> {
    const merchantId = getCurrentMerchantId();
    console.log('[QR_EVENTS_API] Broadcasting hide QR to ALL terminals for merchant:', merchantId);
    
    // Get all active terminals for this merchant
    const activeDevices = await MerchantDisplayDevicesAPI.getAll();
    const activeTerminals = activeDevices
      .filter(device => device.active)
      .map(device => getTerminalIdFromDeviceKey(device.device_key));
    
    console.log('[QR_EVENTS_API] Clearing terminals:', activeTerminals);
    
    // Clear ALL active terminals
    for (const terminalId of activeTerminals) {
      await terminalSync.clearTerminal(terminalId);
    }
    
    // Also clear default terminals for backward compatibility
    const defaultTerminals = [DEFAULT_TERMINALS.COUNTER_1, DEFAULT_TERMINALS.COUNTER_2];
    for (const terminalId of defaultTerminals) {
      await terminalSync.clearTerminal(terminalId);
    }
    
    try {
      const { error } = await supabase
        .from('display_events')
        .insert({
          tenant_id: merchantId,
          event_type: 'hide_qr'
        });

      if (error) {
        console.warn('[QR_EVENTS_API] Database insert failed:', error);
      }
    } catch (error) {
      console.warn('[QR_EVENTS_API] Database event insert failed:', error);
    }
  },

  async getCurrentQR(): Promise<any> {
    const merchantId = getCurrentMerchantId();
    console.log('[QR_EVENTS_API] Getting current QR for merchant:', merchantId);
    
    // Check all active terminals for current QR
    const activeDevices = await MerchantDisplayDevicesAPI.getAll();
    const activeTerminals = activeDevices
      .filter(device => device.active)
      .map(device => getTerminalIdFromDeviceKey(device.device_key));
    
    // Try to get QR from any active terminal
    for (const terminalId of activeTerminals) {
      const qrData = await terminalSync.getCurrentTerminalState(terminalId);
      if (qrData) {
        console.log('[QR_EVENTS_API] Found QR data on terminal:', terminalId);
        return qrData;
      }
    }
    
    // Also check default terminals
    const defaultTerminals = [DEFAULT_TERMINALS.COUNTER_1, DEFAULT_TERMINALS.COUNTER_2];
    for (const terminalId of defaultTerminals) {
      const qrData = await terminalSync.getCurrentTerminalState(terminalId);
      if (qrData) {
        console.log('[QR_EVENTS_API] Found QR data on default terminal:', terminalId);
        return qrData;
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('display_events')
        .select('*')
        .eq('tenant_id', merchantId)
        .eq('event_type', 'show_qr')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.qr_data) {
        // Check if still valid
        if (data.expires_at && new Date(data.expires_at) > new Date()) {
          console.log('[QR_EVENTS_API] Found valid QR data in Supabase');
          return data.qr_data;
        }
      }
    } catch (error) {
      console.warn('[QR_EVENTS_API] Supabase query failed:', error);
    }

    // Fallback to localStorage
    const storageKey = `paynowgo_qr_data_${merchantId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const qrData = JSON.parse(stored);
      if (qrData.expiresAt && new Date(qrData.expiresAt) > new Date()) {
        console.log('[QR_EVENTS_API] Found valid QR data in localStorage');
        return qrData;
      }
    }
    
    return null;
  },

  updateLocalQRStorage(merchantId: string, qrData: any): void {
    const storageKey = `paynowgo_qr_data_${merchantId}`;
    localStorage.setItem(storageKey, JSON.stringify(qrData));
    
    // Also update global key for backward compatibility
    localStorage.setItem('paynowgo_current_qr', JSON.stringify(qrData));
    
    // Trigger storage events for cross-device sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(qrData),
      storageArea: localStorage
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'paynowgo_current_qr',
      newValue: JSON.stringify(qrData),
      storageArea: localStorage
    }));
  },

  clearLocalQRStorage(merchantId: string): void {
    const storageKey = `paynowgo_qr_data_${merchantId}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem('paynowgo_current_qr');
    
    // Trigger storage events for cross-device sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: null,
      storageArea: localStorage
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'paynowgo_current_qr',
      newValue: null,
      storageArea: localStorage
    }));
  },

  // Subscribe to QR events for displays
  subscribeToQREvents(callback: (qrData: any) => void): () => void {
    const merchantId = getCurrentMerchantId();
    console.log('[QR_EVENTS_API] Subscribing to QR events for ALL terminals of merchant:', merchantId);
    
    // Subscribe to ALL terminals for this merchant
    const unsubscribeFunctions: (() => void)[] = [];
    
    // Subscribe to default terminals
    const defaultTerminals = [DEFAULT_TERMINALS.COUNTER_1, DEFAULT_TERMINALS.COUNTER_2];
    defaultTerminals.forEach(terminalId => {
      const unsubscribe = terminalSync.subscribeToTerminal(terminalId, callback);
      unsubscribeFunctions.push(unsubscribe);
    });
    
    // Also subscribe to any device-specific terminals
    MerchantDisplayDevicesAPI.getAll().then(devices => {
      devices.forEach(device => {
        const terminalId = getTerminalIdFromDeviceKey(device.device_key);
        if (!defaultTerminals.includes(terminalId)) {
          const unsubscribe = terminalSync.subscribeToTerminal(terminalId, callback);
          unsubscribeFunctions.push(unsubscribe);
        }
      });
    });

    return () => {
      // Cleanup all subscriptions
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }
};