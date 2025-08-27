import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getTenantId(request: NextRequest): Promise<string> {
  return '00000000-0000-0000-0000-000000000001';
}

async function setTenantContext(tenantId: string) {
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenantId
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    await setTenantContext(tenantId);

    const orderId = params.id;

    console.log('[API] Canceling order:', orderId);

    // Get the order first
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, terminal_id, status')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (fetchError) {
      console.error('[API] Order fetch failed:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order is already ${order.status}` },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[API] Order update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    // Clear display state if terminal exists
    if (order.terminal_id) {
      const { error: displayError } = await supabase
        .from('display_states')
        .update({
          state: 'idle',
          order_id: null,
          amount_cents: null,
          reference: null,
          qr_svg: null,
          qr_text: null,
          expires_at: null
        })
        .eq('device_id', order.terminal_id);

      if (displayError) {
        console.error('[API] Display state clear failed:', displayError);
      }
    }

    // TODO: Publish realtime event to hide QR
    // await publishDisplayEvent(tenantId, 'hide', { orderId });

    console.log('[API] Order canceled successfully');

    return NextResponse.json({
      success: true,
      orderId,
      status: 'canceled',
      canceledAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Cancel order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}