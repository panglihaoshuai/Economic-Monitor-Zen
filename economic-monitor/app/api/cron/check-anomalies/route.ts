import { NextResponse } from 'next/server';
import { supabaseAdmin, type AnomalyRow } from '@/lib/supabase';
import { detectBatchAnomalies, AnomalyResult } from '@/lib/anomaly-detector';
import { getAllIndicators } from '@/lib/fred';
import { INDICATORS } from '@/lib/fred';
import { sendAlertEmail } from '@/lib/resend';

export const maxDuration = 300; // 5 分钟

// CRON_SECRET 用于验证 cron 任务请求
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // 验证 CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized access attempt to check-anomalies');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting anomaly check...');

    const startTime = Date.now();
    const indicators = getAllIndicators();

    // ========== 批量查询（解决 N+1 问题） ==========
    
    // 1. 批量查询所有用户
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email');

    if (!users || users.length === 0) {
      console.log('[Cron] No users found');
      return NextResponse.json({ success: true, message: 'No users' });
    }

    // 2. 批量查询用户指标配置
    const { data: allUserConfigs } = await supabaseAdmin
      .from('user_indicators')
      .select('*')
      .eq('enabled', true);

    // 3. 批量查询最近数据
    const { data: recentData } = await supabaseAdmin
      .from('economic_data')
      .select('series_id, date, value')
      .order('date', { ascending: false });

    if (!recentData || recentData.length === 0) {
      console.log('[Cron] No recent data found');
      return NextResponse.json({ success: true, message: 'No data to check' });
    }

    console.log(`[Cron] Loaded ${users.length} users, ${allUserConfigs?.length || 0} configs, ${recentData.length} data points`);

    // ========== 构建用户配置映射 ==========

    // 按用户和指标建立索引
    type UserConfigType = { user_id: string; series_id: string; [key: string]: unknown };
    const userConfigsMap = new Map<string, Map<string, UserConfigType>>();

    for (const config of (allUserConfigs as UserConfigType[] | null | undefined) || []) {
      if (!userConfigsMap.has(config.user_id)) {
        userConfigsMap.set(config.user_id, new Map());
      }
      userConfigsMap.get(config.user_id)!.set(config.series_id, config);
    }

    // ========== 准备异常检测数据 ==========

    type RecentDataType = { series_id: string; date: string; value: number | null };
    const recentDataTyped = recentData as RecentDataType[] | null;

    const detectionData = indicators.map(indicator => {
      const indicatorData = (recentDataTyped || []).filter(d => d.series_id === indicator.id);
      if (indicatorData.length < 2) return null;

      const latest = indicatorData[0];
      const historicalValues = indicatorData
        .slice(1, 50)  // 使用更多历史数据
        .map(d => d.value)
        .filter((v): v is number => v !== null);

      if (historicalValues.length < 12) return null;

      return {
        seriesId: indicator.id,
        currentValue: latest.value,
        historicalValues,
      };
    }).filter(Boolean);

    // ========== 批量异常检测 ==========
    
    const { results, summary } = detectBatchAnomalies(detectionData as Array<{
      seriesId: string;
      currentValue: number;
      historicalValues: number[];
    }>);

    // ========== 处理异常（并发优化） ==========
    
    const anomaliesToCreate: Array<{
      userId: string;
      seriesId: string;
      date: string;
      value: number;
      zScore: number;
      severity: string;
    }> = [];

    const anomaliesUpdates: Array<{
      id: string;
      seriesId: string;
      analysis: string;
      analysisType: 'simple' | 'deep';
    }> = [];

    const notificationsToSend: Array<{
      userId: string;
      email: string;
      apiKey: string | null;
      indicatorId: string;
      indicatorTitle: string;
      value: number;
      zScore: number;
      displayText: string;
      severity: 'warning' | 'critical';
    }> = [];

    // 遍历每个指标
    for (const result of results) {
      if (result.severity === 'normal') continue;
      
      const indicator = INDICATORS[result.seriesId];
      if (!indicator) continue;

      // 遍历用户
      for (const user of users) {
        const userIndicatorConfigs = userConfigsMap.get(user.id);
        const userConfig = userIndicatorConfigs?.get(result.seriesId);

        if (!userConfig) continue;

        const threshold = result.severity === 'critical'
          ? Number(userConfig.z_threshold_critical)
          : Number(userConfig.z_threshold_warning);

        if (Math.abs(result.zScore) < threshold) continue;

        // 记录要创建的异常
        anomaliesToCreate.push({
          userId: user.id,
          seriesId: result.seriesId,
          date: new Date().toISOString().split('T')[0],
          value: result.currentValue,
          zScore: result.zScore,
          severity: result.severity,
        });

        // 准备发送通知（如果有配置）
        if (userConfig.notify_frequency === 'realtime') {
          notificationsToSend.push({
            userId: user.id,
            email: user.email,
            apiKey: null,
            indicatorId: result.seriesId,
            indicatorTitle: indicator.title,
            value: result.currentValue,
            zScore: result.zScore,
            displayText: result.displayText.zh,
            severity: result.severity as 'warning' | 'critical',
          });
        }
      }
    }

    // ========== 批量插入异常记录 ==========

    let anomaliesCreated = 0;
    let notificationsSent = 0;

    if (anomaliesToCreate.length > 0) {
      // Convert to database format (snake_case)
      const anomaliesToInsert = anomaliesToCreate.map(a => ({
        user_id: a.userId,
        series_id: a.seriesId,
        date: a.date,
        value: a.value,
        z_score: a.zScore,
        severity: a.severity,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('anomalies')
        .insert(anomaliesToInsert);

      if (insertError) {
        console.error('[Cron] Error inserting anomalies:', insertError);
      } else {
        anomaliesCreated = anomaliesToCreate.length;
        console.log(`[Cron] Created ${anomaliesCreated} anomaly records`);
      }
    }

    // ========== 并发发送通知 ==========
    
    if (notificationsToSend.length > 0) {
      const notificationPromises = notificationsToSend.map(async (notif) => {
        const sent = await sendAlertEmail({
          to: notif.email,
          seriesId: notif.indicatorId,
          seriesTitle: notif.indicatorTitle,
          value: notif.value,
          zScore: notif.zScore,
          displayText: notif.displayText,
          severity: notif.severity,
          analysis: '',
          lang: 'zh',
        });
        
        return sent ? 1 : 0;
      });

      const sentResults = await Promise.all(notificationPromises);
      notificationsSent = sentResults.reduce((a: number, b: number) => a + b, 0);
      console.log(`[Cron] Sent ${notificationsSent}/${notificationsToSend.length} notifications`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Anomaly check complete. Duration: ${duration}ms`);
    console.log(`[Cron] Anomalies: ${anomaliesCreated}, Notifications: ${notificationsSent}`);

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        indicatorsChecked: results.length,
        anomaliesDetected: results.filter(r => r.severity !== 'normal').length,
        anomaliesCreated,
        notificationsSent,
      },
      breakdown: {
        normal: results.filter(r => r.severity === 'normal').length,
        warning: results.filter(r => r.severity === 'warning').length,
        critical: results.filter(r => r.severity === 'critical').length,
      },
    });
  } catch (error) {
    console.error('[Cron] Anomaly check error:', error);
    return NextResponse.json(
      { success: false, error: 'Anomaly check failed' },
      { status: 500 }
    );
  }
}

