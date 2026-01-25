import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// CRON_SECRET 用于验证 cron 任务请求
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // 验证 CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== \`Bearer \${CRON_SECRET}\`) {
    console.warn('[Cron] Unauthorized access attempt to health-check');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 检查系统健康状况
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime() || 0,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      data: healthCheck
    });

  } catch (error) {
    console.error('[Cron] Health check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
