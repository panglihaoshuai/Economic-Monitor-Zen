// Simplified Anomaly Display Component

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { AnomalyResult } from '@/lib/simple-anomaly-detector';

interface EnhancedAnomalyDisplayProps {
  anomaly: AnomalyResult;
  showDetails?: boolean;
}

export function EnhancedAnomalyDisplay({ 
  anomaly, 
  showDetails = true 
}: EnhancedAnomalyDisplayProps) {
  const severityColors = {
    normal: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const severityIcons = {
    normal: CheckCircle,
    warning: AlertTriangle,
    critical: AlertTriangle,
  };

  const SeverityIcon = severityIcons[anomaly.severity];

  return (
    <div className="space-y-4">
      {/* 主要异常状态 */}
      <Card className={`border-2 ${severityColors[anomaly.severity]}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SeverityIcon className="w-5 h-5" />
              <span className="text-lg">
                {anomaly.severity === 'normal' ? '正常' : 
                 anomaly.severity === 'warning' ? '警告' : '严重异常'}
              </span>
            </div>
            <div className="border border-gray-300 rounded px-2 py-1 font-mono text-sm">
              Z={anomaly.zScore.toFixed(2)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 指标信息 */}
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">指标信息：</div>
              <div className="text-gray-700">{anomaly.seriesTitle}</div>
              <div className="text-gray-500">类别: {anomaly.category}</div>
            </div>

            {/* 分析结果 */}
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">分析结果：</div>
              <div className="text-gray-700">{anomaly.description}</div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">当前值:</span>
                <div className="font-mono font-semibold">
                  {anomaly.currentValue.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">分析器:</span>
                <div className="font-mono font-semibold">
                  {anomaly.analyzer}
                </div>
              </div>
            </div>

            {/* 额外信息 */}
            {showDetails && (
              <>
                {anomaly.percentile !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-500">百分位数:</span>
                    <div className="font-mono font-semibold">
                      {(anomaly.percentile * 100).toFixed(1)}%
                    </div>
                  </div>
                )}

                {anomaly.trend && (
                  <div className="text-sm">
                    <span className="text-gray-500">趋势:</span>
                    <div className="font-semibold capitalize">
                      {anomaly.trend === 'increasing' ? '上升' :
                       anomaly.trend === 'decreasing' ? '下降' : '稳定'}
                    </div>
                  </div>
                )}

                {anomaly.threshold && (
                  <div className="text-sm">
                    <span className="text-gray-500">检测阈值:</span>
                    <div className="font-mono font-semibold">
                      ±{anomaly.threshold.toFixed(1)} σ
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 严重程度说明 */}
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">
                {anomaly.severity === 'normal' ? '数值在正常范围内' :
                 anomaly.severity === 'warning' ? '数值偏离正常水平，值得关注' :
                 '数值严重异常，建议立即关注'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}