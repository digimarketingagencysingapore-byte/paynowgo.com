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

// GET /api/orders/:id - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    await setTenantContext(tenantId);

    const orderId = params.id;

    console.log('[API] Fetching order details:', orderId);

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        reference,
        amount_cents,
        status,
        qr_svg,
        qr_text,
        meta,
        created_at,
        paid_at,
        canceled_at,
        expires_at,
        terminal_id,
        terminals(
          id,
          name,
          device_key,
          location
        ),
        order_items(
          id,
          item_id,
          name,
          unit_price_cents,
          qty,
          line_total_cents,
          items(
            id,
            name,
            sku,
            category
          )
        ),
        payments(
          id,
          source,
          amount_cents,
          payer_name,
          bank_ref,
          received_at,
          raw
        )
      `)
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[API] Order fetch failed:', error);
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

    // Format response
    const formattedOrder = {
      id: order.id,
      reference: order.reference,
      amount: order.amount_cents / 100,
      status: order.status,
      qrSvg: order.qr_svg,
      qrText: order.qr_text,
      meta: order.meta,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      canceledAt: order.canceled_at,
      expiresAt: order.expires_at,
      terminal: order.terminals ? {
        id: order.terminals.id,
        name: order.terminals.name,
        deviceKey: order.terminals.device_key,
        location: order.terminals.location
      } : null,
      items: (order.order_items || []).map(item => ({
        id: item.id,
        itemId: item.item_id,
        name: item.name,
        unitPrice: item.unit_price_cents / 100,
        quantity: item.qty,
        lineTotal: item.line_total_cents / 100,
        product: item.items ? {
          id: item.items.id,
          name: item.items.name,
          sku: item.items.sku,
          category: item.items.category
        } : null
      })),
      payments: (order.payments || []).map(payment => ({
        id: payment.id,
        source: payment.source,
        amount: payment.amount_cents / 100,
        payerName: payment.payer_name,
        bankRef: payment.bank_ref,
        receivedAt: payment.received_at,
        raw: payment.raw
      }))
    };

    return NextResponse.json(formattedOrder);

  } catch (error) {
    console.error('[API] Order details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}