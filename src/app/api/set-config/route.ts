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

// Helper function to set configuration
export async function POST(request: NextRequest) {
  try {
    const { parameter, value } = await request.json();

    console.log('[API] Setting config:', parameter, '=', value);

    const { error } = await supabase.rpc('set_config', {
      parameter,
      value
    });

    if (error) {
      console.error('[API] Set config failed:', error);
      return NextResponse.json(
        { error: 'Failed to set configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Set config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}