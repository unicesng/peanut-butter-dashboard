"use client";

import { TrendingDown } from "lucide-react";
import { CartesianGrid, LineChart, Line, XAxis } from "recharts";

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
import { useEffect, useState } from "react";
import { GetProjectedGrowth } from "@/api/evApis";

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

interface ProjectedEVGrowthChartData {
  month: number;
  predicted: number;
  actual: number;
}

export function ProjectedEVGrowth() {

  const [chartData, setChartData] = useState<ProjectedEVGrowthChartData[]>([]);

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    try {
      const data = await GetProjectedGrowth();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  }

  const currentYear = new Date().getFullYear();
  const currentYearData = chartData.find(data => data.month == currentYear);
  const previousYearData = chartData.find(data => data.month === currentYear - 1);

  let percentageChange = 0;

  if (currentYearData && previousYearData && previousYearData.actual !== null) {
    const currentActual = currentYearData.actual;
    const previousActual = previousYearData.actual;

    percentageChange = ((currentActual - previousActual) / previousActual) * 100;
  }

  return (
    <Card className="m-2 w-2/3">
      <CardHeader>
        <CardTitle>Projected EV Growth</CardTitle>
        <CardDescription>
          Showing forecasted change for the next 5 years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
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
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="actual"
              type="monotone"
              stroke="var(--color-actual)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="predicted"
              type="monotone"
              stroke="var(--color-predicted)"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending down by {percentageChange}% this year <TrendingDown className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              2015 - 2030
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
