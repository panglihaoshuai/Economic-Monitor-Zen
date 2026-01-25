// Enhanced Anomaly Display Component
// 显示增强版GARCH的置信度和模型参数

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { AnomalyResult } from '@/lib/anomaly-detector';

interface EnhancedAnomalyDisplayProps {
  anomaly: AnomalyResult;
  showDetails?: boolean;
}

export function EnhancedAnomalyDisplay({ 
  anomaly, 
  showDetails = true 
}: EnhancedAnomalyDisplayProps) {
  const isGARCH = anomaly.analyzer === 'garch';
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
            {/* 显示文本 */}
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">分析结果：</div>
              <div className="text-gray-700">{anomaly.displayText.zh}</div>
            </div>

            {/* 解释 */}
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">详细解释：</div>
              <div className="text-gray-700">{anomaly.explanation}</div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">当前值:</span>
                <div className="font-mono font-semibold">
                  {anomaly.currentValue.toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="text-gray-500">波动率:</span>
                <div className="font-mono font-semibold">
                  {anomaly.stdDev?.toFixed(3)}%
                </div>
              </div>
            </div>

            {/* 增强版GARCH 特有信息 */}
            {isGARCH && showDetails && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900">增强版GARCH分析</span>
                </div>

                {/* 置信度 */}
                {anomaly.confidence !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">模型置信度</span>
                      <span className="font-mono text-sm font-semibold">
                        {anomaly.confidence}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          anomaly.confidence >= 80 ? 'bg-green-500' :
                          anomaly.confidence >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${anomaly.confidence}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* GARCH参数 */}
                {anomaly.garchParams && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-purple-600 mb-1">持久性 (α+β)</div>
                      <div className="font-mono font-semibold text-purple-900">
                        {anomaly.garchParams.persistence?.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-purple-600 mb-1">短期冲击 (α)</div>
                      <div className="font-mono font-semibold text-purple-900">
                        {anomaly.garchParams.alpha?.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-purple-600 mb-1">波动持续性 (β)</div>
                      <div className="font-mono font-semibold text-purple-900">
                        {anomaly.garchParams.beta?.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-purple-600 mb-1">趋势</div>
                      <div className="flex items-center gap-1">
                        {anomaly.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                        {anomaly.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />}
                        {anomaly.trend === 'stable' && <div className="w-3 h-3 bg-gray-400 rounded-full" />}
                        <span className="font-mono font-semibold text-purple-900">
                          {anomaly.trend === 'up' ? '上升' : 
                           anomaly.trend === 'down' ? '下降' : '稳定'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 模型质量指标 */}
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Info className="w-3 h-3 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">模型质量</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    {anomaly.confidence! >= 80 ? '高质量模型，结果可靠' :
                     anomaly.confidence! >= 60 ? '中等质量，谨慎解读' :
                     '数据不足，建议积累更多历史数据'}
                  </div>
                </div>
              </div>
            )}

            {/* 波动率等级 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">波动率等级:</span>
              <div className={`rounded px-2 py-1 text-sm ${
                anomaly.volatility === 'low' ? 'bg-gray-100 text-gray-800' : 
                anomaly.volatility === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'
              }`}>
                {anomaly.volatility === 'low' ? '低' :
                 anomaly.volatility === 'medium' ? '中' : '高'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 对比信息 (仅GARCH) */}
      {isGARCH && showDetails && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              增强版GARCH vs 传统Z-Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>时变波动率</strong>: GARCH能适应市场变化，危机时自动提高阈值
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>减少误报</strong>: 区分真正的异常和正常的危机波动
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>参数置信度</strong>: 提供模型拟合质量评估
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}