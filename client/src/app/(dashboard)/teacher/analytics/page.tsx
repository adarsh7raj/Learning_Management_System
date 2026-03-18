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
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const { user, isLoaded } = useUser();

  const { data, isLoading } = useGetTeacherAnalyticsQuery(
    { granularity },
    { skip: !isLoaded || !user }
  );

  const chartData = useMemo(() => data?.series ?? [], [data]);

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
            <SelectContent className="analytics__select-content">
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="analytics__stats">
        <div className="analytics__stat-card">
          <p className="analytics__stat-label">Total Revenue</p>
          <p className="analytics__stat-value">
            {formatPrice(data?.totals.revenue ?? 0)}
          </p>
        </div>
        <div className="analytics__stat-card">
          <p className="analytics__stat-label">Courses Sold</p>
          <p className="analytics__stat-value">{data?.totals.salesCount ?? 0}</p>
        </div>
        <div className="analytics__stat-card">
          <p className="analytics__stat-label">Your Courses</p>
          <p className="analytics__stat-value">{data?.totals.courseCount ?? 0}</p>
        </div>
      </div>

      <div className="analytics__chart-card">
        {chartData.length === 0 ? (
          <div className="analytics__empty">No sales data yet.</div>
        ) : (
          <div className="analytics__chart">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis yAxisId="left" stroke="#9ca3af" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9ca3af"
                  tickFormatter={(v) => formatPrice(v)}
                />
                <Tooltip
                formatter={(value, name) => {
  if (name === "revenue") {
    return [formatPrice(Number(value)), "Revenue"];
  }
  return [value, "Sales"];
}}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="salesCount"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Sales"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
export default TeacherAnalyticsPage;