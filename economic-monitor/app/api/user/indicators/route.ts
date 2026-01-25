import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { supabaseAdmin } from '@/lib/supabase';
import { INDICATORS } from '@/lib/fred';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_indicators')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const indicators = data.map((config) => ({
      ...config,
      info: INDICATORS[config.series_id],
    }));

    return NextResponse.json({ indicators });
  } catch (error) {
    console.error('Get indicators error:', error);
    return NextResponse.json(
      { error: 'Failed to get indicators' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { configs } = body;

    const updates = configs.map((config: { series_id: string; enabled?: boolean; z_threshold_warning?: number; z_threshold_critical?: number; analysis_mode?: string; notify_frequency?: string }) =>
      supabaseAdmin
        .from('user_indicators')
        .upsert(
          {
            user_id: session.user.id,
            series_id: config.series_id,
            enabled: config.enabled,
            z_threshold_warning: config.z_threshold_warning,
            z_threshold_critical: config.z_threshold_critical,
            analysis_mode: config.analysis_mode,
            notify_frequency: config.notify_frequency,
          },
          { onConflict: 'user_id,series_id' }
        )
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update indicators error:', error);
    return NextResponse.json(
      { error: 'Failed to update indicators' },
      { status: 500 }
    );
  }
}
