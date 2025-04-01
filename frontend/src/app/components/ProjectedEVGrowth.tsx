"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
const chartData = [
  { month: "January", predicted: 186, actual: 80 },
  { month: "February", predicted: 305, actual: 200 },
  { month: "March", predicted: 237, actual: 120 },
  { month: "April", predicted: 73, actual: 190 },
  { month: "May", predicted: 209, actual: 130 },
  { month: "June", predicted: 214, actual: 140 },
];

const chartConfig = {
  predicted: {
    label: "Predicted",
    color: "hsl(var(--chart-1))",
  },
  actual: {
    label: "Actual",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ProjectedEVGrowth() {
  return (
    <Card className="m-2 w-1/4">
      <CardHeader>
        <CardTitle>Projected EV Growth</CardTitle>
        <CardDescription>
          Showing total change for the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="actual"
              type="natural"
              fill="var(--color-actual)"
              fillOpacity={0.4}
              stroke="var(--color-actual)"
              stackId="a"
            />
            <Area
              dataKey="predicted"
              type="natural"
              fill="var(--color-predicted)"
              fillOpacity={0.4}
              stroke="var(--color-predicted)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
