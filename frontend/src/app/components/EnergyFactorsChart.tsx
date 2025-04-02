"use client";

import { TrendingUp } from "lucide-react";
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
const chartData = [
  { factors: "income", percentage: 25, fill: "var(--color-income)" },
  { factors: "location", percentage: 10, fill: "var(--color-location)" },
  { factors: "houseType", percentage: 18, fill: "var(--color-houseType)" },
  { factors: "weather", percentage: 17, fill: "var(--color-weather)" },
  { factors: "other", percentage: 9, fill: "var(--color-other)" },
];

const chartConfig = {
  percentage: {
    label: "Percentage",
  },
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  location: {
    label: "Location",
    color: "hsl(var(--chart-2))",
  },
  houseType: {
    label: "House Type",
    color: "hsl(var(--chart-3))",
  },
  weather: {
    label: "Weather",
    color: "hsl(var(--chart-4))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function EnergyFactorsChart() {
  return (
    <Card className="w-1/3 m-2">
      <CardHeader>
        <CardTitle>Top Factors Affecting Household Energy Consumption</CardTitle>
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
              dataKey="factors"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label
              }
            />
            <XAxis dataKey="percentage" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="percentage" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total percentage for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
