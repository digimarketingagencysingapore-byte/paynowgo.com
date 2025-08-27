/**
 * Supabase Realtime for cross-device QR display communication
 * Enables QR codes to appear on customer displays across different devices
 */

import { getSupabaseClient } from './supabase';
import { supabase } from './supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface QRDisplayEvent {
  id: string;
  tenant_id: string;
  event_type: 'show_qr' | 'hide_qr';
  order_id?: string;
  qr_data?: {
    orderId: string;
    qrSvg: string;
    amount: number;
    reference: string;
    expiresAt: string;
  };
  expires_at?: string;
  created_at: string;
}

export class DisplayRealtimeManager {
  private supabase: SupabaseClient;
  private channel: any = null;
  private tenantId: string;

  constructor(authToken?: string, tenantId: string = '00000000-0000-0000-0000-000000000001') {
    this.supabase = getSupabaseClient(authToken);
    this.tenantId = tenantId;
  }

  /**
   * Broadcast QR show event to all displays (from POS)
   */
  async broadcastShowQR(qrData: {
    orderId: string;
    qrSvg: string;
    amount: number;
    reference: string;
    expiresAt: string;
  }): Promise<void> {
    console.log('[DISPLAY_REALTIME] Broadcasting show QR event:', {
      orderId: qrData.orderId,
      amount: qrData.amount,
      reference: qrData.reference,
      svgLength: qrData.qrSvg?.length
    });

    try {
      // First, hide any existing QR codes
      await this.broadcastHideQR();

      // Method 1: Insert new show event in database
      try {
        const { error } = await this.supabase
          .from('display_events')
          .insert({
            tenant_id: this.tenantId,
            event_type: 'show_qr',
            order_id: qrData.orderId,
            qr_data: qrData,
            expires_at: qrData.expiresAt
          });

        if (error) {
          console.warn('[DISPLAY_REALTIME] Database insert failed:', error);
        }
      } catch (dbError) {
        console.warn('[DISPLAY_REALTIME] Database not available for events:', dbError);
      }

      // Method 2: Dual-channel broadcast via Supabase Realtime
      const payload = {
        type: 'show',
        orderId: qrData.orderId,
        qrSvg: qrData.qrSvg,
        amount: qrData.amount,
        reference: qrData.reference,
        expiresAt: qrData.expiresAt
      };

      // Broadcast to tenant channel (all displays for this tenant)
      const tenantChannel = this.supabase.channel(`display:${this.tenantId}`);
      await tenantChannel.send({
        type: 'broadcast',
        event: 'display',
        payload
      });
      
      // Also broadcast to device-specific channels (if any displays are connected)
      // Note: We don't know specific device IDs here, so tenant channel is primary
      
      console.log('[DISPLAY_REALTIME] Dual-channel broadcast sent successfully');

      console.log('[DISPLAY_REALTIME] Show QR event broadcasted successfully');
    } catch (error) {
      console.error('[DISPLAY_REALTIME] Failed to broadcast show QR:', error);
      throw error;
    }
  }

  /**
   * Broadcast QR hide event to all displays (when payment complete)
   */
  async broadcastHideQR(): Promise<void> {
    console.log('[DISPLAY_REALTIME] Broadcasting hide QR event');

    try {
      // Method 1: Insert hide event in database
      try {
        const { error } = await this.supabase
          .from('display_events')
          .insert({
            tenant_id: this.tenantId,
            event_type: 'hide_qr'
          });

        if (error) {
          console.warn('[DISPLAY_REALTIME] Database insert failed:', error);
        }
      } catch (dbError) {
        console.warn('[DISPLAY_REALTIME] Database not available for events:', dbError);
      }

      // Method 2: Dual-channel broadcast via Supabase Realtime
      const payload = {
        type: 'hide'
      };

      // Broadcast to tenant channel
      const tenantChannel = this.supabase.channel(`display:${this.tenantId}`);
      await tenantChannel.send({
        type: 'broadcast',
        event: 'display',
        payload
      });
      
      console.log('[DISPLAY_REALTIME] Hide broadcast sent successfully');

      console.log('[DISPLAY_REALTIME] Hide QR event broadcasted successfully');
    } catch (error) {
      console.error('[DISPLAY_REALTIME] Failed to broadcast hide QR:', error);
      throw error;
    }
  }

  /**
   * Subscribe to display events (for display devices)
   */
  subscribeToDisplayEvents(onEvent: (event: QRDisplayEvent) => void): () => void {
    console.log('[DISPLAY_REALTIME] Subscribing to display events for tenant:', this.tenantId);

    // Subscribe to realtime changes
    this.channel = this.supabase
      .channel(`display_events:${this.tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'display_events',
          filter: `tenant_id=eq.${this.tenantId}`
        },
        (payload) => {
          console.log('[DISPLAY_REALTIME] Realtime event received:', payload);
          onEvent(payload.new as QRDisplayEvent);
        }
      )
      .subscribe();

    // Also check for existing events on subscribe
    this.getLatestEvent().then(event => {
      if (event) {
        console.log('[DISPLAY_REALTIME] Found existing event on subscribe:', event);
        onEvent(event);
      }
    });

    return () => {
      if (this.channel) {
        this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  /**
   * Get the latest display event
   */
  async getLatestEvent(): Promise<QRDisplayEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('display_events')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[DISPLAY_REALTIME] Error getting latest event:', error);
        return null;
      }

      // Check if data exists
      if (!data) {
        return null;
      }

      // Check if event is still valid
      if (data.event_type === 'show_qr' && data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          console.log('[DISPLAY_REALTIME] Latest event expired');
          return null;
        }
      }

      return data as QRDisplayEvent;
    } catch (error) {
      console.error('[DISPLAY_REALTIME] Error fetching latest event:', error);
      return null;
    }
  }

  /**
   * Cleanup expired events
   */
  async cleanupExpiredEvents(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('display_events')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('[DISPLAY_REALTIME] Error cleaning up expired events:', error);
      }
    } catch (error) {
      console.error('[DISPLAY_REALTIME] Failed to cleanup expired events:', error);
    }
  }

  disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}