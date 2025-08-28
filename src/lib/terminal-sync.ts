/**
 * Terminal-based QR synchronization system
 * Ensures ALL devices connected to the same terminal see the same QR code
 * regardless of which device generated it
 */

import { supabase } from './supabase.js';

export interface DisplayOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TerminalQRData {
  orderId: string;
  qrSvg: string;
  amount: number;
  reference: string;
  expiresAt: string;
  terminalId: string;
  merchantId: string;
  timestamp: number;
  items?: DisplayOrderItem[]; // Order items to show on display
}

export interface TerminalState {
  terminalId: string;
  merchantId: string;
  currentQR: TerminalQRData | null;
  lastUpdated: string;
}

export class TerminalSyncManager {
  private static instance: TerminalSyncManager;
  private channels: Map<string, any> = new Map();
  private listeners: Map<string, Set<(data: TerminalQRData | null) => void>> = new Map();

  static getInstance(): TerminalSyncManager {
    if (!TerminalSyncManager.instance) {
      TerminalSyncManager.instance = new TerminalSyncManager();
    }
    return TerminalSyncManager.instance;
  }

  /**
   * Broadcast QR to ALL devices connected to this terminal
   * Called from POS system (any device)
   */
  async broadcastToTerminal(terminalId: string, qrData: TerminalQRData): Promise<void> {
    console.log('[TERMINAL_SYNC] 📡 Broadcasting QR to terminal:', terminalId);
    console.log('[TERMINAL_SYNC] QR Data:', {
      orderId: qrData.orderId,
      amount: qrData.amount,
      reference: qrData.reference,
      merchantId: qrData.merchantId,
      hasQrSvg: !!qrData.qrSvg,
      hasItems: !!(qrData.items && qrData.items.length > 0),
      itemsCount: qrData.items?.length || 0
    });

    try {
      // Method 1: Store in database for persistence
      await this.storeTerminalState(terminalId, qrData);

      // Method 2: Broadcast via Supabase Realtime to ALL subscribers
      const channelName = `terminal:${terminalId}`;
      const channel = supabase.channel(channelName);
      
      await channel.send({
        type: 'broadcast',
        event: 'qr_update',
        payload: {
          type: 'show',
          data: qrData
        }
      });

      console.log('[TERMINAL_SYNC] QR broadcasted to channel:', channelName);

      // Method 3: Update localStorage for immediate local updates
      this.updateLocalTerminalState(terminalId, qrData);

      // Method 4: Notify local listeners
      this.notifyLocalListeners(terminalId, qrData);

    } catch (error) {
      console.error('[TERMINAL_SYNC] Broadcast failed:', error);
      // Fallback to localStorage only
      this.updateLocalTerminalState(terminalId, qrData);
      this.notifyLocalListeners(terminalId, qrData);
    }
  }

  /**
   * Clear QR from ALL devices connected to this terminal
   * Called when payment is completed/canceled
   */
  async clearTerminal(terminalId: string): Promise<void> {
    console.log('[TERMINAL_SYNC] Clearing QR from terminal:', terminalId);

    try {
      // Method 1: Clear from database
      await this.clearTerminalState(terminalId);

      // Method 2: Broadcast clear via Supabase Realtime
      const channelName = `terminal:${terminalId}`;
      const channel = supabase.channel(channelName);
      
      await channel.send({
        type: 'broadcast',
        event: 'qr_update',
        payload: {
          type: 'hide'
        }
      });

      console.log('[TERMINAL_SYNC] Clear broadcasted to channel:', channelName);

      // Method 3: Clear localStorage
      this.clearLocalTerminalState(terminalId);

      // Method 4: Notify local listeners
      this.notifyLocalListeners(terminalId, null);

    } catch (error) {
      console.error('[TERMINAL_SYNC] Clear failed:', error);
      // Fallback to localStorage only
      this.clearLocalTerminalState(terminalId);
      this.notifyLocalListeners(terminalId, null);
    }
  }

  /**
   * Subscribe to terminal updates (for display devices)
   * ALL devices with same terminalId will receive updates
   */
  subscribeToTerminal(terminalId: string, callback: (data: TerminalQRData | null) => void): () => void {
    console.log('[TERMINAL_SYNC] Subscribing to terminal:', terminalId);

    // Add to local listeners
    if (!this.listeners.has(terminalId)) {
      this.listeners.set(terminalId, new Set());
    }
    this.listeners.get(terminalId)!.add(callback);

    // Subscribe to Supabase Realtime channel
    const channelName = `terminal:${terminalId}`;
    let channel: any = null;

    try {
      channel = supabase.channel(channelName)
        .on('broadcast', { event: 'qr_update' }, (payload) => {
          console.log('[TERMINAL_SYNC] Realtime update received for terminal:', terminalId, payload);
          
          if (payload.payload.type === 'show' && payload.payload.data) {
            callback(payload.payload.data);
          } else if (payload.payload.type === 'hide') {
            callback(null);
          }
        })
        .subscribe();

      this.channels.set(terminalId, channel);
      console.log('[TERMINAL_SYNC] Subscribed to Supabase channel:', channelName);
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Supabase subscription failed:', error);
    }

    // Also listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `terminal_state_${terminalId}`) {
        console.log('[TERMINAL_SYNC] Storage change detected for terminal:', terminalId);
        if (e.newValue) {
          try {
            const state = JSON.parse(e.newValue);
            callback(state.currentQR);
          } catch (error) {
            console.error('[TERMINAL_SYNC] Error parsing storage data:', error);
          }
        } else {
          callback(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Send current state immediately
    this.getCurrentTerminalState(terminalId).then(callback);

    // Return cleanup function
    return () => {
      // Remove from local listeners
      const listeners = this.listeners.get(terminalId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(terminalId);
        }
      }

      // Cleanup Supabase channel
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(terminalId);
      }

      // Remove storage listener
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  /**
   * Get current terminal state from any available source
   */
  async getCurrentTerminalState(terminalId: string): Promise<TerminalQRData | null> {
    try {
      // Method 1: Try database first
      // Use the view to query by device_key instead of UUID
      const { data, error } = await supabase
        .from('display_states_by_key')
        .select('*')
        .eq('device_key', terminalId)
        .maybeSingle();

      if (!error && data && data.state === 'show' && data.qr_svg) {
        // Check if still valid
        if (!data.expires_at || new Date(data.expires_at) > new Date()) {
          console.log('[TERMINAL_SYNC] Found valid terminal state in database');
          return {
            orderId: data.order_id,
            qrSvg: data.qr_svg,
            amount: parseFloat(data.amount) || 0,
            reference: data.reference,
            expiresAt: data.expires_at,
            terminalId: terminalId,
            merchantId: data.tenant_id,
            timestamp: new Date(data.updated_at).getTime()
          };
        }
      }
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Database query failed:', error);
    }

    // Method 2: Fallback to localStorage
    const storageKey = `terminal_state_${terminalId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const state = JSON.parse(stored);
        if (state.currentQR && (!state.currentQR.expiresAt || new Date(state.currentQR.expiresAt) > new Date())) {
          console.log('[TERMINAL_SYNC] Found valid terminal state in localStorage');
          return state.currentQR;
        }
      } catch (error) {
        console.error('[TERMINAL_SYNC] Error parsing localStorage state:', error);
      }
    }

    return null;
  }

  /**
   * Store terminal state in database
   */
  private async storeTerminalState(terminalId: string, qrData: TerminalQRData): Promise<void> {
    try {
      console.log('[TERMINAL_SYNC] Storing terminal state for device_key:', terminalId, 'merchantId:', qrData.merchantId);
      
      // First, find the terminal UUID by device_key
      const { data: terminal, error: terminalError } = await supabase
        .from('terminals')
        .select('id')
        .eq('device_key', terminalId)
        .eq('tenant_id', qrData.merchantId)
        .maybeSingle();

      if (terminalError || !terminal) {
        console.error('[TERMINAL_SYNC] ❌ Terminal not found for device_key:', terminalId);
        console.error('[TERMINAL_SYNC] Error details:', terminalError);
        console.error('[TERMINAL_SYNC] This means display_states cannot be stored!');
        console.error('[TERMINAL_SYNC] Fix: Ensure terminal record exists in terminals table');
        console.error('[TERMINAL_SYNC] Expected: device_key =', terminalId, 'tenant_id =', qrData.merchantId);
        return;
      }

      console.log('[TERMINAL_SYNC] ✅ Terminal found:', terminal.id, 'for device_key:', terminalId);

      console.log('[TERMINAL_SYNC] Upserting display_states for terminal UUID:', terminal.id);
      
      const displayStateData = {
        device_id: terminal.id, // Use UUID, not device_key
        tenant_id: qrData.merchantId,
        state: 'show',
        order_id: qrData.orderId,
        amount: qrData.amount.toString(),
        reference: qrData.reference,
        qr_svg: qrData.qrSvg,
        expires_at: qrData.expiresAt,
        updated_at: new Date().toISOString()
      };
      
      console.log('[TERMINAL_SYNC] Display state data:', {
        device_id: displayStateData.device_id,
        tenant_id: displayStateData.tenant_id,
        state: displayStateData.state,
        order_id: displayStateData.order_id,
        reference: displayStateData.reference,
        hasQrSvg: !!displayStateData.qr_svg,
        expires_at: displayStateData.expires_at
      });

      const { error } = await supabase
        .from('display_states')
        .upsert(displayStateData);

      if (error) {
        console.error('[TERMINAL_SYNC] ❌ Database store failed:', error);
        console.error('[TERMINAL_SYNC] Failed to store display state - display will not show QR!');
      } else {
        console.log('[TERMINAL_SYNC] ✅ Display state stored successfully in database');
      }
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Database not available:', error);
    }
  }

  /**
   * Clear terminal state from database
   */
  private async clearTerminalState(terminalId: string): Promise<void> {
    try {
      // First, find the terminal UUID by device_key
      const { data: terminal, error: terminalError } = await supabase
        .from('terminals')
        .select('id, tenant_id')
        .eq('device_key', terminalId)
        .maybeSingle();

      if (terminalError || !terminal) {
        console.warn('[TERMINAL_SYNC] Terminal not found for device_key:', terminalId);
        return;
      }

      const { error } = await supabase
        .from('display_states')
        .update({
          state: 'idle',
          order_id: null,
          amount: null,
          reference: null,
          qr_svg: null,
          expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', terminal.id); // Use UUID, not device_key

      if (error) {
        console.warn('[TERMINAL_SYNC] Database clear failed:', error);
      } else {
        console.log('[TERMINAL_SYNC] Terminal state cleared from database');
      }
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Database not available:', error);
    }
  }

  /**
   * Update localStorage for immediate local updates
   */
  private updateLocalTerminalState(terminalId: string, qrData: TerminalQRData): void {
    const storageKey = `terminal_state_${terminalId}`;
    const state: TerminalState = {
      terminalId,
      merchantId: qrData.merchantId,
      currentQR: qrData,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(state));

    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(state),
      storageArea: localStorage
    }));
  }

  /**
   * Clear localStorage terminal state
   */
  private clearLocalTerminalState(terminalId: string): void {
    const storageKey = `terminal_state_${terminalId}`;
    localStorage.removeItem(storageKey);

    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: null,
      storageArea: localStorage
    }));
  }

  /**
   * Notify local listeners
   */
  private notifyLocalListeners(terminalId: string, data: TerminalQRData | null): void {
    const listeners = this.listeners.get(terminalId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[TERMINAL_SYNC] Error in listener callback:', error);
        }
      });
    }
  }

  /**
   * Get all active terminals for a merchant
   */
  async getActiveTerminals(merchantId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('display_states')
        .select('device_id')
        .eq('tenant_id', merchantId)
        .eq('state', 'show');

      if (error) {
        console.warn('[TERMINAL_SYNC] Error getting active terminals:', error);
        return [];
      }

      return (data || []).map(item => item.device_id);
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Database not available for active terminals:', error);
      return [];
    }
  }

  /**
   * Cleanup expired terminal states
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      const { error } = await supabase
        .from('display_states')
        .update({
          state: 'idle',
          order_id: null,
          amount: null,
          reference: null,
          qr_svg: null,
          expires_at: null
        })
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.warn('[TERMINAL_SYNC] Cleanup failed:', error);
      } else {
        console.log('[TERMINAL_SYNC] Expired states cleaned up');
      }
    } catch (error) {
      console.warn('[TERMINAL_SYNC] Database not available for cleanup:', error);
    }
  }
}

// Export singleton instance
export const terminalSync = TerminalSyncManager.getInstance();

// Default terminal IDs for the demo
export const DEFAULT_TERMINALS = {
  COUNTER_1: 'terminal-counter-1',
  COUNTER_2: 'terminal-counter-2'
} as const;

// Helper function to get terminal ID from device key
export function getTerminalIdFromDeviceKey(deviceKey: string): string {
  // Map device keys to terminal IDs
  const deviceToTerminalMap: Record<string, string> = {
    '472851': DEFAULT_TERMINALS.COUNTER_1,
    '639274': DEFAULT_TERMINALS.COUNTER_2
  };

  return deviceToTerminalMap[deviceKey] || `terminal-${deviceKey}`;
}

// Helper function to get all device keys for a terminal
export function getDeviceKeysForTerminal(terminalId: string): string[] {
  const terminalToDevicesMap: Record<string, string[]> = {
    [DEFAULT_TERMINALS.COUNTER_1]: ['472851'],
    [DEFAULT_TERMINALS.COUNTER_2]: ['639274']
  };

  return terminalToDevicesMap[terminalId] || [];
}