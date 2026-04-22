'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AreaChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xAxisKey: string;
  series: Array<{
    key: string;
    label: string;
    color: string;
    type?: 'area' | 'line';
  }>;
  isLoading?: boolean;
  height?: number;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
}

export function AreaChartCard({
  title,
  description,
  data,
  xAxisKey,
  series,
  isLoading = false,
  height = 300,
  formatValue,
  formatXAxis,
}: AreaChartCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          {description && <Skeleton className="h-4 w-60" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full rounded-lg" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <CartesianGrid stroke="#272B38" strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#9CA2BC"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              stroke="#9CA2BC"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#151824',
                border: '1px solid #272B38',
                borderRadius: 8,
                color: '#F5F7FF',
              }}
              labelStyle={{ color: '#9CA2BC' }}
              labelFormatter={formatXAxis}
              formatter={(value: number, name: string) => [
                formatValue ? formatValue(value) : value,
                name,
              ]}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={s.type === 'line' ? 0 : 0.1}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
