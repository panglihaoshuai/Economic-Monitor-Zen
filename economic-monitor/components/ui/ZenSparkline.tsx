'use client';

import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    showGradient?: boolean;
}

export function ZenSparkline({
    data,
    color = '#7C9070', // Default Sage Green
    height = 50,
    showGradient = true
}: SparklineProps) {
    if (!data || data.length === 0) return null;

    // Transform array of numbers to array of objects for Recharts
    const chartData = data.map((val, idx) => ({ i: idx, value: val }));

    // Calculate min/max for domain to make the chart look dynamic
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padding = (max - min) * 0.1;

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <YAxis
                        domain={[min - padding, max + padding]}
                        hide
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={showGradient ? `url(#gradient-${color})` : 'transparent'}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
