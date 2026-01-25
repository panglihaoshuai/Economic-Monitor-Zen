// Resend email notification module

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build');

export interface AlertEmail {
  to: string;
  seriesId: string;
  seriesTitle: string;
  value: number;
  zScore: number;
  displayText: string;
  severity: 'warning' | 'critical';
  analysis: string;
  lang: 'en' | 'zh';
}

export async function sendAlertEmail(email: AlertEmail): Promise<boolean> {
  const isZh = email.lang === 'zh';
  const subject = isZh
    ? email.severity === 'critical'
      ? `【严重】${email.seriesTitle} 出现异常波动`
      : `【提醒】${email.seriesTitle} 偏离历史均值`
    : email.severity === 'critical'
      ? `[CRITICAL] ${email.seriesTitle} Abnormal Fluctuation`
      : `[Alert] ${email.seriesTitle} Deviation Detected`;

  const severityEmoji = email.severity === 'critical' ? '🔴' : '🟡';
  const severityText = isZh
    ? email.severity === 'critical' ? '严重偏离' : '偏离预警'
    : email.severity === 'critical' ? 'Critical Deviation' : 'Warning';

  const severityColor = email.severity === 'critical' ? '#dc2626' : '#d97706';
  const severityBg = email.severity === 'critical' ? '#fef2f2' : '#fffbeb';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 24px;">📊 ${isZh ? '经济指标异常提醒' : 'Economic Alert'}</h1>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background: ${severityBg}; border: 1px solid ${severityColor}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 24px; margin-right: 8px;">${severityEmoji}</span>
          <span style="color: ${severityColor}; font-size: 18px; font-weight: 600;">${severityText}</span>
        </div>
        <p style="margin: 0; color: #374151; font-size: 14px;">${email.displayText}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">${isZh ? '指标' : 'Indicator'}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 16px; font-weight: 600; text-align: right;">${email.seriesTitle} (${email.seriesId})</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">${isZh ? '当前值' : 'Current Value'}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 16px; font-weight: 600; text-align: right;">${email.value.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">${isZh ? '偏离程度' : 'Deviation'}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: ${severityColor}; font-size: 16px; font-weight: 600; text-align: right;">${email.zScore.toFixed(2)} σ</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">${isZh ? '日期' : 'Date'}</td>
          <td style="padding: 12px 0; color: #111827; font-size: 16px; font-weight: 600; text-align: right;">${new Date().toLocaleDateString()}</td>
        </tr>
      </table>

      ${email.analysis ? `
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="color: #1e40af; font-size: 14px; font-weight: 600; margin-bottom: 8px;">🤖 ${isZh ? 'AI 分析' : 'AI Analysis'}</div>
        <p style="margin: 0; color: #1f2937; font-size: 14px; line-height: 1.6;">${email.analysis}</p>
      </div>
      ` : ''}

      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          ${isZh ? '查看详情' : 'View Details'}
        </a>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">${isZh ? '此邮件由 Economic Monitor 自动发送' : 'This is an automated email from Economic Monitor'}</p>
      <p style="margin: 8px 0 0 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #6b7280; text-decoration: underline;">${isZh ? '管理通知设置' : 'Manage notification settings'}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const result = await resend.emails.send({
      from: `${isZh ? '经济监控' : 'Economic Monitor'} <noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}>`,
      to: email.to,
      subject,
      html,
    });

    return !!result.data;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendDailyDigest(
  to: string,
  anomalies: AlertEmail[],
  lang: 'en' | 'zh'
): Promise<boolean> {
  const isZh = lang === 'zh';
  const subject = isZh
    ? `📊 经济监控日报 - ${anomalies.length} 项异常`
    : `📊 Economic Monitor Daily - ${anomalies.length} anomalies`;

  const anomalyList = anomalies
    .map(
      (a, i) => `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
        <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">${a.seriesTitle} (${a.seriesId})</div>
        <div style="font-size: 14px; color: #78350f;">${a.displayText} | ${a.value.toFixed(2)} | ${a.zScore.toFixed(2)} σ</div>
      </div>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 24px;">📊 ${isZh ? '经济监控日报' : 'Economic Monitor Daily'}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="font-size: 16px; color: #374151; margin-bottom: 16px;">
        ${isZh ? `今日检测到 <strong>${anomalies.length}</strong> 项指标异常：` : `Detected <strong>${anomalies.length}</strong> anomalies today:`}
      </div>
      ${anomalyList}
      <div style="text-align: center; padding-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/anomalies" style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          ${isZh ? '查看所有异常' : 'View All Anomalies'}
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;

  try {
    const result = await resend.emails.send({
      from: `${isZh ? '经济监控' : 'Economic Monitor'} <noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}>`,
      to,
      subject,
      html,
    });

    return !!result.data;
  } catch (error) {
    console.error('Failed to send daily digest:', error);
    return false;
  }
}
