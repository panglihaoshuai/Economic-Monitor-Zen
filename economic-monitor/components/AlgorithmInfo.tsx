'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  Activity,
  Brain,
  Info,
} from 'lucide-react';

interface AlgorithmInfoProps {
  seriesId: string;
  analyzer: 'garch' | 'zscore';
  zScore?: number;
  percentile?: number;
}

export function AlgorithmInfo({
  seriesId,
  analyzer,
  zScore,
  percentile,
}: AlgorithmInfoProps) {
  const [open, setOpen] = useState(false);

  const algorithmData = getAlgorithmInfo(seriesId, analyzer);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            analyzer === 'garch'
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {analyzer === 'garch' ? (
            <>
              <Activity className="w-3 h-3" />
              GARCH
            </>
          ) : (
            <>
              <BarChart3 className="w-3 h-3" />
              Z-Score
            </>
          )}
          <Info className="w-3 h-3 ml-1 opacity-60" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {analyzer === 'garch' ? (
              <>
                <Activity className="w-5 h-5 text-purple-600" />
                GARCH 模型分析
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Z-Score + 百分位分析
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {algorithmData.title} - {seriesId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 为什么选择这个算法 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" />
              为什么选择 {analyzer === 'garch' ? 'GARCH' : 'Z-Score'}？
            </h4>
            <p className="text-gray-700 text-sm">{algorithmData.reason}</p>
          </div>

          {/* 算法特点 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                {analyzer === 'garch' ? (
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                ) : (
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                )}
                算法特点
              </h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {algorithmData.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">适用场景</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {algorithmData.useCases.map((u, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 当前数据状态 */}
          {zScore !== undefined && percentile !== undefined && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">当前数据状态</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Z-Score</div>
                  <div className={`text-xl font-bold ${
                    Math.abs(zScore) > 2 ? 'text-red-600' : 
                    Math.abs(zScore) > 1 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {zScore.toFixed(2)}σ
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">百分位</div>
                  <div className="text-xl font-bold text-gray-900">
                    {percentile.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">状态</div>
                  <div className={`text-sm font-medium ${
                    Math.abs(zScore) > 2 ? 'text-red-600' : 
                    Math.abs(zScore) > 1 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {Math.abs(zScore) > 2 ? '异常' : 
                     Math.abs(zScore) > 1 ? '偏离' : '正常'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 两种算法对比 */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">算法对比</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">维度</th>
                    <th className="text-center py-2 px-4 bg-purple-50 rounded-l">GARCH</th>
                    <th className="text-center py-2 px-4 bg-blue-50 rounded-r">Z-Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">波动率假设</td>
                    <td className="text-center py-2 px-4 bg-purple-50">时变（随时间变化）</td>
                    <td className="text-center py-2 px-4 bg-blue-50">恒定</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">数据频率</td>
                    <td className="text-center py-2 px-4 bg-purple-50">每日/每周</td>
                    <td className="text-center py-2 px-4 bg-blue-50">月度/季度</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">波动聚集</td>
                    <td className="text-center py-2 px-4 bg-purple-50">✅ 能捕捉</td>
                    <td className="text-center py-2 px-4 bg-blue-50">❌ 无法处理</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">危机检测</td>
                    <td className="text-center py-2 px-4 bg-purple-50">更敏感</td>
                    <td className="text-center py-2 px-4 bg-blue-50">可能误报</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">计算复杂度</td>
                    <td className="text-center py-2 px-4 bg-purple-50">高（需拟合）</td>
                    <td className="text-center py-2 px-4 bg-blue-50">低（简单统计）</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 实际例子 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📌 实际例子</h4>
            <div className="text-sm text-blue-800 space-y-2">
              {analyzer === 'garch' ? (
                <>
                  <p><strong>SOFR 利率突升时：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>传统 Z-Score：可能误报为"异常"</li>
                    <li>GARCH：自动提高波动率阈值，识别为"正常的高波动"</li>
                  </ul>
                  <p className="mt-2"><strong>2020年3月流动性危机：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>SOFR 从 1.5% 飙升至 3%+</li>
                    <li>GARCH 捕捉到波动率从 0.1% 升至 1%+</li>
                    <li>避免误报，同时保持敏感度</li>
                  </ul>
                </>
              ) : (
                <>
                  <p><strong>GDP 数据分析：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>季度数据，波动相对稳定</li>
                    <li>百分位法直观显示"比历史80%的时期高"</li>
                    <li>适合实体经济指标的趋势分析</li>
                  </ul>
                  <p className="mt-2"><strong>失业率监控：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>通常在 3-5% 区间波动</li>
                    <li>超过 6% 触发预警（接近历史极值）</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 算法信息数据
function getAlgorithmInfo(seriesId: string, analyzer: 'garch' | 'zscore') {
  const algorithmData: Record<string, {
    title: string;
    reason: string;
    features: string[];
    useCases: string[];
  }> = {
    garch: {
      title: '广义自回归条件异方差模型',
      reason:
        seriesId === 'SOFR'
          ? 'SOFR 是隔夜利率，高频数据（每日），波动聚集效应强。利率飙升往往预示流动性紧缩，GARCH 能捕捉这种波动率变化。'
          : seriesId === 'TEDRATE'
          ? 'TED 利差是信用风险先行指标，危机时期波动会急剧增加。GARCH 能自适应调整阈值，避免误报。'
          : '高频金融数据，波动聚集效应强。危机时期的正常波动可能被 Z-Score 误判为异常，GARCH 能更好地区分。',
      features: [
        '波动率随时间变化（时变波动率）',
        '捕捉波动聚集效应（大波动后常伴大波动）',
        '对危机更敏感，避免误报',
        '需要较多历史数据（建议≥100天）',
      ],
      useCases: [
        '利率突然飙升检测',
        '信用利差异常监控',
        '流动性危机预警',
        '高频交易风险管理',
      ],
    },
    zscore: {
      title: 'Z-Score + 百分位法',
      reason:
        seriesId === 'GDPC1'
          ? 'GDP 是季度数据，低频且波动相对稳定。Z-Score 足以捕捉趋势变化，百分位法直观显示经济周期位置。'
          : seriesId === 'UNRATE'
          ? '失业率月度数据，有季节性规律。历史百分位能清晰显示当前就业状况在历史上的位置。'
          : '实体经济指标（通胀、消费、房地产），数据频率低（月度/季度），波动模式相对稳定。简单统计方法足够有效。',
      features: [
        '计算简单，直观易懂',
        '百分位不依赖正态分布假设',
        '包含滚动窗口和趋势判断',
        '适合低频数据',
      ],
      useCases: [
        'GDP 趋势分析',
        '失业率周期位置',
        '通胀水平监控',
        '消费趋势追踪',
      ],
    },
  };

  return algorithmData[analyzer];
}

// 算法总览组件
export function AlgorithmOverview() {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📊 异常检测算法说明
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium">GARCH 模型</h4>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              高频金融数据
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            用于 SOFR、利率、国债收益率等每日/每周数据
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 捕捉波动聚集效应</li>
            <li>• 危机时期自适应阈值</li>
            <li>• 适合利率飙升检测</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium">Z-Score + 百分位</h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              实体经济数据
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            用于 GDP、失业率、通胀等月度/季度数据
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 简单直观</li>
            <li>• 百分位显示历史位置</li>
            <li>• 适合趋势分析</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
