'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BarChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xAxisKey: string;
  series: Array<{
    key: string;
    label: string;
    color: string;
    stackId?: string;
  }>;
  isLoading?: boolean;
  height?: number;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
}

export function BarChartCard({
  title,
  description,
  data,
  xAxisKey,
  series,
  isLoading = false,
  height = 300,
  formatValue,
  formatXAxis,
}: BarChartCardProps) {
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
          <BarChart data={data}>
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
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                stackId={s.stackId}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
