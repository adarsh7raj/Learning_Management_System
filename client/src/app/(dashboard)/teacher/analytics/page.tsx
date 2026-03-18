"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { useGetTeacherAnalyticsQuery } from "@/state/api";
import { useUser } from "@clerk/nextjs";
import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TeacherAnalyticsPage = () => {
  const [granularity, setGranularity] = useState<"day" | "month">("month");
  const { user, isLoaded } = useUser();

  const { data, isLoading } = useGetTeacherAnalyticsQuery(
    { granularity },
    { skip: !isLoaded || !user }
  );

  // 🔥 Convert data for single-axis display
  const chartData = useMemo(() => {
    const series = data?.series ?? [];

    const formatted = series.map((item) => {
      const revenueInDollars = item.revenue / 100;

      return {
        ...item,
        revenue: revenueInDollars,
        salesScaled: item.salesCount * 100, // scale sales → match revenue
      };
    });

    if (formatted.length === 1) {
      return [
        formatted[0],
        {
          date: "Next",
          salesCount: formatted[0].salesCount,
          revenue: formatted[0].revenue,
          salesScaled: formatted[0].salesScaled,
        },
      ];
    }

    return formatted;
  }, [data]);

  if (!isLoaded || isLoading) return <Loading />;
  if (!user) return <div>Please sign in to view analytics.</div>;

  return (
    <div className="analytics">
      <Header
        title="Analytics"
        subtitle="Track sales and revenue over time"
        rightElement={
          <Select
            value={granularity}
            onValueChange={(v) => setGranularity(v as "day" | "month")}
          >
            <SelectTrigger className="analytics__select">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* STATS */}
      <div className="analytics__stats">
        <div>
          <p>Total Revenue</p>
          <p>{formatPrice((data?.totals.revenue ?? 0))}</p>
        </div>

        <div>
          <p>Courses Sold</p>
          <p>{data?.totals.salesCount ?? 0}</p>
        </div>

        <div>
          <p>Your Courses</p>
          <p>{data?.totals.courseCount ?? 0}</p>
        </div>
      </div>

      {/* CHART */}
      <div className="analytics__chart-card">
        {chartData.length === 0 ? (
          <div>No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              {/* SINGLE Y AXIS */}
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(v) => `$${v}`}
              />

              {/* Tooltip */}
              <Tooltip
                formatter={(value, name, props) => {
                  if (name === "Revenue") {
                    return [`$${value}`, "Revenue"];
                  }
                  return [props.payload.salesCount, "Sales"];
                }}
              />

              <Legend />

              {/* Revenue */}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Revenue"
              />

              {/* Sales (scaled) */}
              <Line
                type="monotone"
                dataKey="salesScaled"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Sales"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TeacherAnalyticsPage;