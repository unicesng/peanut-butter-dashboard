"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { GetProjectedEnergyConsumption } from "@/api/energyApis";

const chartConfig = {
  day: {
    label: "Date",
  },
  actual: {
    label: "Actual",
    color: "hsl(var(--chart-1))",
  },
  predicted: {
    label: "Predicted",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface ProjectedEnergyConsumptionChartData {
  day: number;
  actual: number;
  predicted: number;
}

export function ProjectedEnergyConsumptionChart() {
  const [timeRange, setTimeRange] = React.useState("90d");
  const [chartData, setChartData] = useState<ProjectedEnergyConsumptionChartData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await GetProjectedEnergyConsumption();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  };

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.day);
    const referenceDate = new Date("2014-02-27");
    let daysToSubtract = 90;

    if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "3m") {
      daysToSubtract = 90;
    } else {
      daysToSubtract = 365;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return date >= startDate;
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Projected & Actual Energy Consumption Demand</CardTitle>
          <CardDescription>among UK households</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            <SelectItem value="3m" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="1y" className="rounded-lg">Last year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-predicted)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-predicted)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="actual"
              type="natural"
              fill="url(#fillActual)"
              stroke="var(--color-actual)"
              stackId="a"
            />
            <Area
              dataKey="predicted"
              type="natural"
              fill="url(#fillPredicted)"
              stroke="var(--color-predicted)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
