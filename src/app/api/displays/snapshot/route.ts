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

// GET /api/displays/snapshot?k=DEVICE_KEY
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceKey = searchParams.get('k');

    if (!deviceKey) {
      return NextResponse.json(
        { error: 'Device key is required' },
        { status: 400 }
      );
    }

    const tenantId = await getTenantId(request);
    await setTenantContext(tenantId);

    console.log('[API] Getting display snapshot for device:', deviceKey);

    // Get terminal by device key
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .select('id, tenant_id, name')
      .eq('device_key', deviceKey)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (terminalError) {
      console.error('[API] Terminal fetch failed:', terminalError);
      return NextResponse.json(
        { error: 'Failed to fetch terminal' },
        { status: 500 }
      );
    }

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal not found' },
        { status: 404 }
      );
    }

    // Get current display state
    const { data: displayState, error: stateError } = await supabase
      .from('display_states')
      .select(`
        state,
        order_id,
        amount_cents,
        reference,
        qr_svg,
        qr_text,
        expires_at,
        updated_at
      `)
      .eq('device_id', terminal.id)
      .maybeSingle();

    if (stateError) {
      console.error('[API] Display state fetch failed:', stateError);
      return NextResponse.json(
        { error: 'Failed to fetch display state' },
        { status: 500 }
      );
    }

    // Format response
    const snapshot = {
      state: displayState?.state || 'idle',
      payload: displayState?.state === 'show' && displayState.order_id ? {
        orderId: displayState.order_id,
        amount: (displayState.amount_cents || 0) / 100,
        reference: displayState.reference,
        qrSvg: displayState.qr_svg,
        qrText: displayState.qr_text,
        expiresAt: displayState.expires_at
      } : null,
      terminal: {
        id: terminal.id,
        name: terminal.name
      },
      timestamp: new Date().toISOString()
    };

    console.log('[API] Display snapshot:', {
      deviceKey,
      state: snapshot.state,
      hasPayload: !!snapshot.payload
    });

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[API] Display snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}