'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle, XCircle, Brain } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Anomaly {
  id: string;
  series_id: string;
  date: string;
  value: number;
  z_score: number;
  severity: 'warning' | 'critical';
  analysis_simple: string | null;
  analysis_deep: string | null;
  notified: boolean;
}

export default function AnomaliesPage() {
  const { data: anomalies, error, isLoading, mutate } = useSWR<{ anomalies: Anomaly[] }>(
    '/api/user/anomalies',
    fetcher
  );

  const [analyzing, setAnalyzing] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Failed to load anomalies</h3>
      </div>
    );
  }

  const handleAnalyze = async (anomalyId: string, mode: 'simple' | 'deep') => {
    setAnalyzing(`${anomalyId}-${mode}`);
    try {
      await fetch('/api/analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalyId, mode }),
      });
      mutate();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Anomalies</h1>
        <p className="text-slate-500">Detected deviations from historical norms</p>
      </div>

      {(!anomalies || !anomalies.anomalies || anomalies.anomalies.length === 0) ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No anomalies detected</h3>
          <p className="text-slate-500">
            All monitored indicators are within normal ranges.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies?.anomalies?.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`bg-white rounded-lg border p-6 ${
                anomaly.severity === 'critical'
                  ? 'border-red-200 bg-red-50/30'
                  : 'border-amber-200 bg-amber-50/30'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-900">
                      {anomaly.series_id}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        anomaly.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {anomaly.severity === 'critical' ? '🔴 严重' : '🟡 警告'}
                    </span>
                    {anomaly.notified && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        📧 已通知
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(anomaly.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {anomaly.value.toFixed(2)}
                  </div>
                  <div
                    className={`font-medium ${
                      anomaly.z_score > 0 ? 'text-red-600' : 'text-blue-600'
                    }`}
                  >
                    z = {anomaly.z_score.toFixed(2)}
                  </div>
                </div>
              </div>

              {anomaly.analysis_simple && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">AI 分析</span>
                  </div>
                  <p className="text-blue-800">{anomaly.analysis_simple}</p>
                </div>
              )}

              {anomaly.analysis_deep && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-900">深度分析</span>
                  </div>
                  <p className="text-purple-800">{anomaly.analysis_deep}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!anomaly.analysis_simple && (
                  <button
                    onClick={() => handleAnalyze(anomaly.id, 'simple')}
                    disabled={analyzing === `${anomaly.id}-simple`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Brain className="w-4 h-4" />
                    {analyzing === `${anomaly.id}-simple` ? '分析中...' : '简单分析'}
                  </button>
                )}
                {!anomaly.analysis_deep && (
                  <button
                    onClick={() => handleAnalyze(anomaly.id, 'deep')}
                    disabled={analyzing === `${anomaly.id}-deep`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    <Brain className="w-4 h-4" />
                    {analyzing === `${anomaly.id}-deep` ? '分析中...' : '深度分析'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
