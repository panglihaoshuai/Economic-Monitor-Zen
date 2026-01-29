// Data Quality Dashboard Component
// 数据质量监控面板 - 显示数据缺口分析和修复建议

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react';

interface DataGap {
    seriesId: string;
    seriesName: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    gapStart: string;
    gapEnd: string;
    gapDays: number;
    expectedPoints: number;
    actualPoints: number;
    missingPoints: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediationSuggestion: string;
}

interface GapAnalysisReport {
    generatedAt: string;
    totalIndicators: number;
    indicatorsWithGaps: number;
    totalGaps: number;
    criticalGaps: number;
    highGaps: number;
    mediumGaps: number;
    lowGaps: number;
    gapsByFrequency: Record<string, DataGap[]>;
    remediationPlan: Array<{
        priority: number;
        seriesId: string;
        action: string;
        description: string;
        estimatedRecords: number;
        timeRange: { start: string; end: string };
    }>;
}

export function DataQualityDashboard() {
    const [report, setReport] = useState<GapAnalysisReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [remediating, setRemediating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 执行缺口分析
    const analyzeGaps = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/cron/smart-scheduler?action=analyze-gaps&checkRangeDays=730');
            const data = await response.json();

            if (data.success) {
                setReport(data.report);
                setSuccess('数据缺口分析完成');
            } else {
                setError(data.error || '分析失败');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
        }
    };

    // 执行修复计划
    const executeRemediation = async () => {
        if (!report?.remediationPlan.length) return;

        setRemediating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/cron/smart-scheduler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remediate',
                    remediationPlan: report.remediationPlan.slice(0, 5), // 先执行前5个
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`修复完成: ${data.results.filter((r: { success: boolean }) => r.success).length}/${data.results.length} 成功`);
                // 重新分析
                await analyzeGaps();
            } else {
                setError(data.error || '修复失败');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setRemediating(false);
        }
    };

    // 导出报告
    const exportReport = () => {
        if (!report) return;

        const reportText = `
数据质量分析报告
生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}

=== 概览 ===
总指标数: ${report.totalIndicators}
存在缺口的指标: ${report.indicatorsWithGaps}
总缺口数: ${report.totalGaps}
严重缺口: ${report.criticalGaps}
高度缺口: ${report.highGaps}
中度缺口: ${report.mediumGaps}
低度缺口: ${report.lowGaps}

=== 详细缺口 ===
${Object.entries(report.gapsByFrequency)
                .map(([freq, gaps]) => `
【${freq}】
${gaps.map(g => `- ${g.seriesName} (${g.seriesId}): ${g.gapStart} 至 ${g.gapEnd}, 缺失 ${g.missingPoints} 个数据点 [${g.severity}]`).join('\n')}
`).join('\n')}

=== 修复计划 ===
${report.remediationPlan.map(p => `${p.priority}. ${p.description} (预计 ${p.estimatedRecords} 条记录)`).join('\n')}
    `.trim();

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-quality-report-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 获取严重程度颜色
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            case 'low': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    // 获取频率标签
    const getFrequencyLabel = (freq: string) => {
        const labels: Record<string, string> = {
            daily: '日度',
            weekly: '周度',
            monthly: '月度',
            quarterly: '季度',
        };
        return labels[freq] || freq;
    };

    return (
        <div className="space-y-6">
            {/* 控制面板 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        数据质量监控
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Button
                            onClick={analyzeGaps}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            分析数据缺口
                        </Button>

                        {report && (
                            <>
                                <Button
                                    onClick={executeRemediation}
                                    disabled={remediating || !report.remediationPlan.length}
                                    variant="secondary"
                                    className="flex items-center gap-2"
                                >
                                    {remediating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    执行修复计划
                                </Button>

                                <Button
                                    onClick={exportReport}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    导出报告
                                </Button>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                            {success}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 概览统计 */}
            {report && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-600">{report.criticalGaps}</div>
                            <div className="text-sm text-gray-500">严重缺口</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-orange-600">{report.highGaps}</div>
                            <div className="text-sm text-gray-500">高度缺口</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-yellow-600">{report.mediumGaps}</div>
                            <div className="text-sm text-gray-500">中度缺口</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-blue-600">{report.lowGaps}</div>
                            <div className="text-sm text-gray-500">低度缺口</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 详细缺口列表 */}
            {report && Object.entries(report.gapsByFrequency).some(([_, gaps]) => gaps.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle>详细缺口列表</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {Object.entries(report.gapsByFrequency).map(([frequency, gaps]) => (
                                gaps.length > 0 && (
                                    <div key={frequency}>
                                        <h3 className="text-lg font-semibold mb-3">
                                            {getFrequencyLabel(frequency)}指标 ({gaps.length}个缺口)
                                        </h3>
                                        <div className="space-y-2">
                                            {gaps.map((gap, index) => (
                                                <div
                                                    key={`${gap.seriesId}-${index}`}
                                                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-medium">{gap.seriesName}</span>
                                                                <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">{gap.seriesId}</span>
                                                                <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(gap.severity)}`}>
                                                                    {gap.severity === 'critical' ? '严重' :
                                                                        gap.severity === 'high' ? '高度' :
                                                                            gap.severity === 'medium' ? '中度' : '低度'}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-600 space-y-1">
                                                                <div>
                                                                    缺口范围: {gap.gapStart} 至 {gap.gapEnd} ({gap.gapDays}天)
                                                                </div>
                                                                <div>
                                                                    数据点: 应有 {gap.expectedPoints}, 实际 {gap.actualPoints}, 缺失 {gap.missingPoints}
                                                                </div>
                                                                <div className="text-blue-600">
                                                                    建议: {gap.remediationSuggestion}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 修复计划 */}
            {report && report.remediationPlan.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>修复计划 ({report.remediationPlan.length}项)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {report.remediationPlan.slice(0, 10).map((action) => (
                                <div
                                    key={action.priority}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 text-xs border rounded">#{action.priority}</span>
                                        <div>
                                            <div className="font-medium">{action.description}</div>
                                            <div className="text-sm text-gray-500">
                                                {action.seriesId} | 预计 {action.estimatedRecords} 条记录 |
                                                {action.timeRange.start} 至 {action.timeRange.end}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                        {action.action === 'immediate_fetch' ? '立即获取' :
                                            action.action === 'backfill' ? '回溯填充' :
                                                action.action === 'scheduled_fetch' ? '定时获取' : '人工审核'}
                                    </span>
                                </div>
                            ))}
                            {report.remediationPlan.length > 10 && (
                                <div className="text-center text-gray-500 py-2">
                                    还有 {report.remediationPlan.length - 10} 项修复计划...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 无缺口提示 */}
            {report && report.totalGaps === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-green-700">数据完整性良好</h3>
                        <p className="text-gray-500 mt-2">未发现数据缺口，所有指标数据完整</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
