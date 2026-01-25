import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { supabaseAdmin, type AnomalyRow, type UserRow, type Database } from '@/lib/supabase';
import { generateAnalysis, generateDeepAnalysis } from '@/lib/deepseek';
import { INDICATORS } from '@/lib/fred';
import { rateLimit, ANALYSIS_RATE_LIMIT, getRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // 应用速率限制
  const rateLimitResult = rateLimit(request, ANALYSIS_RATE_LIMIT);
  if (rateLimitResult && !rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Analysis rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { anomalyId, mode } = body;

    if (!anomalyId) {
      return NextResponse.json({ error: 'Anomaly ID required' }, { status: 400 });
    }

    const { data: anomalyData, error } = await supabaseAdmin
      .from('anomalies')
      .select('*')
      .eq('id', anomalyId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !anomalyData) {
      return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 });
    }

    const anomaly = anomalyData as unknown as AnomalyRow;

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('deepseek_api_key_encrypted')
      .eq('id', session.user.id)
      .single();

    const user = userData as unknown as UserRow | null;

    if (!user?.deepseek_api_key_encrypted) {
      return NextResponse.json({ error: 'DeepSeek API key not configured' }, { status: 400 });
    }

    const { data: historicalData } = await supabaseAdmin
      .from('economic_data')
      .select('value')
      .eq('series_id', anomaly.series_id)
      .order('date', { ascending: false })
      .limit(50);

    const historicalValues = historicalData?.map((d) => (d as { value: number }).value).filter((v) => v !== null) as number[];

    // 计算真实的历史统计数据
    let mean = anomaly.value;
    let stdDev = 0;
    if (historicalValues.length > 1) {
      mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
      const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (historicalValues.length - 1);
      stdDev = Math.sqrt(variance);
    }

    const indicator = INDICATORS[anomaly.series_id];
    const analysisRequest = {
      seriesId: anomaly.series_id,
      seriesTitle: indicator?.title || anomaly.series_id,
      value: anomaly.value,
      zScore: anomaly.z_score,
      mean,
      stdDev,
      historicalValues,
      displayText: anomaly.z_score > 2 ? '大幅偏离历史均值' : '偏离历史均值',
      lang: 'zh' as const,
    };

    let result;
    if (mode === 'deep') {
      result = await generateDeepAnalysis(analysisRequest, user.deepseek_api_key_encrypted);
      if (result.success) {
        await supabaseAdmin
          .from('anomalies')
          .update({ analysis_deep: result.content } as any)
          .eq('id', anomalyId) as any;
      }
    } else {
      result = await generateAnalysis(analysisRequest, user.deepseek_api_key_encrypted);
      if (result.success) {
        await supabaseAdmin
          .from('anomalies')
          .update({ analysis_simple: result.content } as any)
          .eq('id', anomalyId) as any;
      }
    }

    return NextResponse.json({
      success: result.success,
      analysis: result.content,
      model: result.model,
    });
  } catch (error) {
    console.error('Analysis trigger error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
