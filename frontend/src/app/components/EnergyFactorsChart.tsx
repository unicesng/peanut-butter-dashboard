"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { GetEnergyFactors } from "@/api/energyApis";

interface EnergyFactors {
  acorn: string;
  avg: number;
  fill: string;
}

type EnergyFactorsChartData = EnergyFactors[];

const chartConfig = {
  avg: {
    label: "Mean Energy",
  },
  'ACORN-A': {
    label: "A",
    color: "hsl(var(--chart-1))",
  },
  'ACORN-D': {
    label: "D",
    color: "hsl(var(--chart-2))",
  },
  'ACORN-': {
    label: "-",
    color: "hsl(var(--chart-3))",
  },
  'ACORN-C': {
    label: "C",
    color: "hsl(var(--chart-4))",
  },
  'ACORN-B': {
    label: "B",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function EnergyFactorsChart() {
  const [chartData, setChartData] = useState<EnergyFactorsChartData>([]);

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    try {
      const data = await GetEnergyFactors();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Card className="w-1/3 m-2">
      <CardHeader>
        <CardTitle>Top Household Types with Highest Average Energy Consumption</CardTitle>
        <CardDescription>Identifying energy patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="acorn"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label
              }
            />
            <XAxis dataKey="avg" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="avg" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Showing Household Mean Energy Consumption for the last 10 years
        </div>
      </CardFooter>
    </Card>
  );
}
