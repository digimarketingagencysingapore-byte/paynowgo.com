/**
 * Real-time cross-device QR communication using Supabase Realtime
 * This enables QR codes to appear instantly on any device/smartphone
 */

import { supabase } from './supabase.js';
import { getSupabaseClient, isSupabaseSchemaEnabled } from './supabase';

export interface QRDisplayData {
  orderId: string;
  qrSvg: string;
  qrPng: string;
  amount: number;
  reference: string;
  expiresAt: string;
  timestamp: number;
  tenantId: string;
}

export class RealtimeQRManager {
  private channel: any = null;
  private _tenantId: string | null = null;
  private _supabase: any = supabase;
  private listeners: Set<(data: QRDisplayData | null) => void> = new Set();

  constructor() {
    // Default to unauthenticated supabase client
  }

  /**
   * Configure the manager with authentication token and tenant ID
   */
  setClient(token: string | null, tenantId: string | null): void {
    console.log('[REALTIME_QR] Setting client with token and tenant:', { hasToken: !!token, tenantId });
    this._supabase = getSupabaseClient(token);
    this._tenantId = tenantId;
  }

  /**
   * Broadcast QR data to all connected devices (from POS)
   */
  async broadcastQR(qrData: QRDisplayData): Promise<void> {
    console.log('[REALTIME_QR] Broadcasting QR data to all devices:', {
      orderId: qrData.orderId,
      amount: qrData.amount,
      reference: qrData.reference,
      svgLength: qrData.qrSvg?.length,
      tenantId: this._tenantId
    });

    try {
      // Method 1: Try direct Supabase insert with proper headers
      const { data, error } = await this._supabase
        .from('display_events')
        .insert({
          tenant_id: this._tenantId,
          event_type: 'show_qr',
          order_id: qrData.orderId,
          qr_data: qrData,
          expires_at: qrData.expiresAt
        });

      if (error) {
        console.warn('[REALTIME_QR] Direct Supabase insert failed:', error.message);
        
        // Method 2: Try server API proxy
        const response = await fetch('/api/display-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Key': this._tenantId || 'unknown'
          },
          body: JSON.stringify({
            tenant_id: this._tenantId,
            event_type: 'show_qr',
            order_id: qrData.orderId,
            qr_data: qrData,
            expires_at: qrData.expiresAt
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('[REALTIME_QR] Server API failed:', errorData.error, '- using localStorage fallback');
          this.broadcastViaLocalStorage(qrData);
        } else {
          console.log('[REALTIME_QR] QR data broadcasted via server API successfully');
        }
      } else {
        console.log('[REALTIME_QR] QR data broadcasted via direct Supabase successfully');
      }
    } catch (error) {
      console.warn('[REALTIME_QR] All methods failed, using localStorage fallback:', error);
      this.broadcastViaLocalStorage(qrData);
    }
  }

  /**
   * Clear QR data from all devices (when payment complete)
   */
  async clearQR(): Promise<void> {
    console.log('[REALTIME_QR] Clearing QR data from all devices');

    try {
      // Method 1: Try direct Supabase insert
      const { error } = await this._supabase
        .from('display_events')
        .insert({
          tenant_id: this._tenantId,
          event_type: 'hide_qr'
        });

      if (error) {
        console.warn('[REALTIME_QR] Direct Supabase clear failed:', error.message);
        
        // Method 2: Try server API proxy
        const response = await fetch('/api/display-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Key': this._tenantId || 'unknown'
          },
          body: JSON.stringify({
            tenant_id: this._tenantId,
            event_type: 'hide_qr'
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('[REALTIME_QR] Server API clear failed:', errorData.error, '- using localStorage fallback');
          this.clearViaLocalStorage();
        } else {
          console.log('[REALTIME_QR] QR cleared via server API successfully');
        }
      } else {
        console.log('[REALTIME_QR] QR cleared via direct Supabase successfully');
      }
    } catch (error) {
      console.warn('[REALTIME_QR] All clear methods failed, using localStorage fallback:', error);
      this.clearViaLocalStorage();
    }
  }

  /**
   * Subscribe to QR data changes (for display devices)
   */
  subscribeToQR(callback: (data: QRDisplayData | null) => void): () => void {
    console.log('[REALTIME_QR] Subscribing to QR data changes');
    this.listeners.add(callback);

    // Try Supabase Realtime first
    this.setupSupabaseSubscription();

    // Fallback to localStorage polling
    this.setupLocalStoragePolling();

    // Send current data immediately
    this.getCurrentQRData().then(callback);

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.cleanup();
      }
    };
  }

  /**
   * Get current QR data from any available source
   */
  async getCurrentQRData(): Promise<QRDisplayData | null> {
    if (!this._tenantId) {
      console.warn('[REALTIME_QR] No tenant ID configured, using localStorage only');
      return this.getLocalStorageData();
    }

    try {
      // Method 1: Try Supabase first
      const { data, error } = await this._supabase
        .from('display_events')
        .select('*')
        .eq('tenant_id', this._tenantId)
        .eq('event_type', 'show_qr')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.qr_data) {
        // Check if still valid
        if (data.expires_at && new Date(data.expires_at) > new Date()) {
          console.log('[REALTIME_QR] Found valid QR data in Supabase');
          return data.qr_data as QRDisplayData;
        }
      }
    } catch (error) {
      console.warn('[REALTIME_QR] Supabase query failed, trying localStorage:', error);
    }

    // Method 2: Fallback to localStorage
    return this.getLocalStorageData();
  }

  private getLocalStorageData(): QRDisplayData | null {
    try {
      const stored = localStorage.getItem('paynowgo_qr_data');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
          console.log('[REALTIME_QR] Found valid QR data in localStorage');
          return data;
        }
      }
    } catch (error) {
      console.error('[REALTIME_QR] Error reading localStorage:', error);
    }

    return null;
  }

  private setupSupabaseSubscription(): void {
    if (!this._tenantId) {
      console.warn('[REALTIME_QR] No tenant ID configured, skipping Supabase subscription');
      return;
    }

    try {
      this.channel = this._supabase
        .channel(`qr_display:${this._tenantId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'display_events',
            filter: `tenant_id=eq.${this._tenantId}`
          },
          (payload) => {
            console.log('[REALTIME_QR] Supabase realtime event received:', payload);
            
            if (payload.new.event_type === 'show_qr' && payload.new.qr_data) {
              this.notifyListeners(payload.new.qr_data);
            } else if (payload.new.event_type === 'hide_qr') {
              this.notifyListeners(null);
            }
          }
        )
        .subscribe();

      console.log('[REALTIME_QR] Supabase realtime subscription established');
    } catch (error) {
      console.warn('[REALTIME_QR] Supabase realtime setup failed:', error);
    }
  }

  private setupLocalStoragePolling(): void {
    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'paynowgo_qr_data') {
        console.log('[REALTIME_QR] Storage event received');
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch (error) {
            console.error('[REALTIME_QR] Error parsing storage event data:', error);
          }
        } else {
          this.notifyListeners(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll localStorage for cross-device scenarios
    const pollInterval = setInterval(async () => {
      const currentData = await this.getCurrentQRData();
      this.notifyListeners(currentData);
    }, 2000);

    // Store cleanup functions
    this.cleanup = () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
      if (this.channel) {
        this._supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  private broadcastViaLocalStorage(qrData: QRDisplayData): void {
    localStorage.setItem('paynowgo_qr_data', JSON.stringify(qrData));
    
    // Trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'paynowgo_qr_data',
      newValue: JSON.stringify(qrData),
      storageArea: localStorage
    }));
  }

  private clearViaLocalStorage(): void {
    localStorage.removeItem('paynowgo_qr_data');
    
    // Trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'paynowgo_qr_data',
      newValue: null,
      storageArea: localStorage
    }));
  }

  private notifyListeners(data: QRDisplayData | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[REALTIME_QR] Error in listener callback:', error);
      }
    });
  }

  private cleanup: () => void = () => {};

  disconnect(): void {
    this.cleanup();
    this.listeners.clear();
  }
}

// Export singleton instance
export const realtimeQR = new RealtimeQRManager();