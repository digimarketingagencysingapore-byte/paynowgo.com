import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with Service Role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Request validation schemas
const CreateOrderSchema = z.object({
  terminalId: z.string().uuid().optional(),
  amount: z.number().min(0.01).max(999999.99),
  reference: z.string().min(1).max(25).optional(),
  items: z.array(z.object({
    itemId: z.string().uuid().optional(),
    name: z.string().min(1),
    unitPriceCents: z.number().int().min(0),
    qty: z.number().int().min(1)
  })).optional(),
  idempotencyKey: z.string().optional(),
  qrSvg: z.string().optional(),
  qrText: z.string().optional()
});

const OrdersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'paid', 'canceled', 'expired']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  terminalId: z.string().uuid().optional()
});

// Helper to get tenant context from JWT or default
async function getTenantId(request: NextRequest): Promise<string> {
  // In production, extract from JWT token
  // For demo, use default tenant
  return '00000000-0000-0000-0000-000000000001';
}

// Helper to set tenant context for RLS
async function setTenantContext(tenantId: string) {
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenantId
  });
}

// Generate reference number
function generateReference(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `POS${dateStr}${timeStr}${random}`;
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    await setTenantContext(tenantId);

    const body = await request.json();
    const validatedData = CreateOrderSchema.parse(body);

    console.log('[API] Creating order:', validatedData);

    // Check for existing order with same idempotency key
    if (validatedData.idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, reference, amount_cents, status')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', validatedData.idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        console.log('[API] Returning existing order for idempotency key');
        return NextResponse.json({
          orderId: existingOrder.id,
          reference: existingOrder.reference,
          amount: existingOrder.amount_cents / 100,
          status: existingOrder.status,
          duplicate: true
        });
      }
    }

    // Calculate total from items or use provided amount
    let totalCents: number;
    if (validatedData.items && validatedData.items.length > 0) {
      totalCents = validatedData.items.reduce((sum, item) => 
        sum + (item.unitPriceCents * item.qty), 0
      );
    } else {
      totalCents = Math.round(validatedData.amount * 100);
    }

    const finalReference = validatedData.reference || generateReference();

    // Start transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        terminal_id: validatedData.terminalId || null,
        reference: finalReference,
        amount_cents: totalCents,
        status: 'pending',
        qr_svg: validatedData.qrSvg,
        qr_text: validatedData.qrText,
        idempotency_key: validatedData.idempotencyKey,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('[API] Order creation failed:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      );
    }

    console.log('[API] Order created:', order.id);

    // Insert order items if provided
    if (validatedData.items && validatedData.items.length > 0) {
      const orderItems = validatedData.items.map(item => ({
        order_id: order.id,
        item_id: item.itemId || null,
        name: item.name,
        unit_price_cents: item.unitPriceCents,
        qty: item.qty,
        line_total_cents: item.unitPriceCents * item.qty
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('[API] Order items creation failed:', itemsError);
        // Continue anyway - order is created
      } else {
        console.log('[API] Order items created:', orderItems.length);
      }
    }

    // Update display state if terminal provided
    if (validatedData.terminalId) {
      const { error: displayError } = await supabase
        .from('display_states')
        .upsert({
          device_id: validatedData.terminalId,
          tenant_id: tenantId,
          state: 'show',
          order_id: order.id,
          amount_cents: totalCents,
          reference: finalReference,
          qr_svg: validatedData.qrSvg,
          qr_text: validatedData.qrText,
          expires_at: order.expires_at
        });

      if (displayError) {
        console.error('[API] Display state update failed:', displayError);
      } else {
        console.log('[API] Display state updated for terminal:', validatedData.terminalId);
      }
    }

    // TODO: Publish realtime event for displays
    // await publishDisplayEvent(tenantId, 'show', { orderId: order.id, ... });

    return NextResponse.json({
      orderId: order.id,
      reference: finalReference,
      amount: totalCents / 100,
      status: 'pending',
      expiresAt: order.expires_at
    });

  } catch (error) {
    console.error('[API] Order creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/orders - List orders with pagination
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    await setTenantContext(tenantId);

    const { searchParams } = new URL(request.url);
    const query = OrdersQuerySchema.parse(Object.fromEntries(searchParams));

    console.log('[API] Fetching orders with query:', query);

    let supabaseQuery = supabase
      .from('orders')
      .select(`
        id,
        reference,
        amount_cents,
        status,
        created_at,
        paid_at,
        canceled_at,
        expires_at,
        terminal_id,
        terminals(name, device_key),
        order_items(
          id,
          name,
          unit_price_cents,
          qty,
          line_total_cents
        ),
        payments(
          id,
          amount_cents,
          payer_name,
          bank_ref,
          received_at
        )
      `)
      .eq('tenant_id', tenantId);

    // Apply filters
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.from) {
      supabaseQuery = supabaseQuery.gte('created_at', query.from);
    }

    if (query.to) {
      supabaseQuery = supabaseQuery.lte('created_at', query.to);
    }

    if (query.terminalId) {
      supabaseQuery = supabaseQuery.eq('terminal_id', query.terminalId);
    }

    // Pagination with cursor
    if (query.cursor) {
      const [timestamp, id] = query.cursor.split(',');
      supabaseQuery = supabaseQuery
        .or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${id})`);
    }

    // Order and limit
    supabaseQuery = supabaseQuery
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(query.limit);

    const { data: orders, error } = await supabaseQuery;

    if (error) {
      console.error('[API] Orders fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      reference: order.reference,
      amount: order.amount_cents / 100,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      canceledAt: order.canceled_at,
      expiresAt: order.expires_at,
      terminal: order.terminals ? {
        id: order.terminal_id,
        name: order.terminals.name,
        deviceKey: order.terminals.device_key
      } : null,
      items: (order.order_items || []).map(item => ({
        id: item.id,
        name: item.name,
        unitPrice: item.unit_price_cents / 100,
        quantity: item.qty,
        lineTotal: item.line_total_cents / 100
      })),
      payments: (order.payments || []).map(payment => ({
        id: payment.id,
        amount: payment.amount_cents / 100,
        payerName: payment.payer_name,
        bankRef: payment.bank_ref,
        receivedAt: payment.received_at
      }))
    }));

    // Generate next cursor
    let nextCursor: string | null = null;
    if (formattedOrders.length === query.limit) {
      const lastOrder = formattedOrders[formattedOrders.length - 1];
      nextCursor = `${lastOrder.createdAt},${lastOrder.id}`;
    }

    return NextResponse.json({
      orders: formattedOrders,
      nextCursor,
      hasMore: formattedOrders.length === query.limit
    });

  } catch (error) {
    console.error('[API] Orders fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}