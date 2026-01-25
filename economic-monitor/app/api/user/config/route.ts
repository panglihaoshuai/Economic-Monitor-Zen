import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, image, created_at, deepseek_api_key_encrypted, risk_tolerance, language')
      .eq('id', session.user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 不返回解密后的 API key 给前端，只在需要时使用
    return NextResponse.json({
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        created_at: data.created_at,
        hasDeepSeekKey: !!data.deepseek_api_key_encrypted,
        risk_tolerance: data.risk_tolerance,
        language: data.language || 'zh',
      },
    });
  } catch (error) {
    console.error('Get user config error:', error);
    return NextResponse.json(
      { error: 'Failed to get user config' },
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
    const { deepseek_api_key, ...updateData } = body;

    const updates: Record<string, unknown> = {};

    if (deepseek_api_key) {
      updates.deepseek_api_key_encrypted = encrypt(deepseek_api_key);
    }

    if (updateData.name !== undefined) {
      updates.name = updateData.name;
    }

    if (updateData.risk_tolerance !== undefined) {
      const validValues = ['conservative', 'moderate', 'aggressive'];
      if (validValues.includes(updateData.risk_tolerance)) {
        updates.risk_tolerance = updateData.risk_tolerance;
      }
    }

    if (updateData.language !== undefined) {
      const validValues = ['en', 'zh'];
      if (validValues.includes(updateData.language)) {
        updates.language = updateData.language;
      }
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', session.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user config error:', error);
    return NextResponse.json(
      { error: 'Failed to update user config' },
      { status: 500 }
    );
  }
}
