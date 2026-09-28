'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { WeekBucket } from '@/lib/dashboard/metrics';
import { tokens } from '@/tokens/tokens';

/**
 * Leads-per-week chart (Prompt 15), token-aligned. Loaded through
 * next/dynamic ssr:false so Recharts never enters a budgeted route's bundle —
 * dashboards are backoffice pages.
 */
export function LeadsChart({ weeks }: { weeks: WeekBucket[] }) {
  const data = weeks.map((week) => ({
    week: week.weekOf.slice(5),
    total: week.total,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={tokens.color.line} vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: tokens.color.graphite, fontSize: 11 }}
            axisLine={{ stroke: tokens.color.line }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: tokens.color.graphite, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: tokens.color.line }}
            contentStyle={{
              background: tokens.color.vellum,
              border: `1px solid ${tokens.color.line}`,
              fontSize: 12,
            }}
          />
          <Bar dataKey="total" fill={tokens.color.patina} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LeadsChart;
