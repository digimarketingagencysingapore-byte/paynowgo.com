import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured');
}

export interface DisplayEvent {
  type: 'show' | 'hide';
  orderId?: string;
  qrSvg?: string;
  amount?: number;
  reference?: string;
  expiresAt?: string;
}

export class DisplayRealtimeClient {
  private supabase;
  private channel: any = null;
  private tenantId: string;
  private deviceId: string;

  constructor(token: string, tenantId: string, deviceId: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    this.tenantId = tenantId;
    this.deviceId = deviceId;
  }

  connect(onEvent: (event: DisplayEvent) => void): () => void {
    const channelName = `display:${this.tenantId}:${this.deviceId}`;
    
    this.channel = this.supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${this.tenantId}`
      }, (payload) => {
        console.log('Order change received:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          onEvent({
            type: 'show',
            orderId: payload.new.id,
            qrSvg: payload.new.qr_svg,
            amount: parseFloat(payload.new.amount),
            reference: payload.new.reference,
            expiresAt: payload.new.expires_at
          });
        } else if (payload.eventType === 'UPDATE' && 
                   payload.old.status === 'pending' && 
                   ['paid', 'canceled', 'expired'].includes(payload.new.status)) {
          onEvent({
            type: 'hide',
            orderId: payload.new.id
          });
        }
      })
      .subscribe();

    return () => {
      if (this.channel) {
        this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  disconnect() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}