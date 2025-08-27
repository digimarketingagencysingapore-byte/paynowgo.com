import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export interface DisplayEvent {
  type: 'show' | 'hide';
  order_id?: string;
  amount?: number;
  reference?: string;
  qr_svg?: string;
  expires_at?: string;
}

export interface OrderEvent {
  type: 'paid' | 'canceled' | 'expired';
  order_id: string;
}

export class RealtimeClient {
  private supabase;
  private channels: Map<string, any> = new Map();

  constructor(token?: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      }
    });
  }

  /**
   * Subscribe to display events for customer displays
   */
  subscribeToDisplay(tenantId: string, onEvent: (event: DisplayEvent) => void): () => void {
    const channelName = `display:${tenantId}`;
    
    const channel = this.supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        console.log('[REALTIME] Order change received:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          onEvent({
            type: 'show',
            order_id: payload.new.id,
            amount: parseFloat(payload.new.amount),
            reference: payload.new.reference,
            qr_svg: payload.new.qr_svg,
            expires_at: payload.new.expires_at
          });
        } else if (payload.eventType === 'UPDATE' && 
                   payload.old.status === 'pending' && 
                   ['paid', 'canceled', 'expired'].includes(payload.new.status)) {
          onEvent({
            type: 'hide',
            order_id: payload.new.id
          });
        }
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to specific order events for POS
   */
  subscribeToOrder(tenantId: string, orderId: string, onEvent: (event: OrderEvent) => void): () => void {
    const channelName = `order:${tenantId}:${orderId}`;
    
    const channel = this.supabase.channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        console.log('[REALTIME] Order update received:', payload);
        
        if (payload.new.status !== payload.old.status) {
          onEvent({
            type: payload.new.status as 'paid' | 'canceled' | 'expired',
            order_id: payload.new.id
          });
        }
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  /**
   * Disconnect all channels
   */
  disconnect() {
    this.channels.forEach(channel => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}