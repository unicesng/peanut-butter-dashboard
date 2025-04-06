"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

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
import { GetEnergyDistribution } from "@/api/energyApis";

const chartConfig = {
  count: {
    label: "Households",
  },
  high: {
    label: "High (> 13.1) ",
    color: "hsl(var(--chart-1))",
  },
  medium: {
    label: "Medium (<13.1) ",
    color: "hsl(var(--chart-3))",
  },
  low: {
    label: "Low (<4.8>) ",
    color: "hsl(var(--chart-4))",
  },

} satisfies ChartConfig;

interface EnergyCategory {
  category: "low" | "medium" | "high";
  count: number;
}

type EnergyDistributionChartData = EnergyCategory[];

export function EnergyDistributionChart() {
  const [chartData, setChartData] = useState<EnergyDistributionChartData>([]);

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    try {
      const data = await GetEnergyDistribution();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Card className="flex flex-col w-1/3 m-2">
      <CardHeader className="items-center pb-0">
        <CardTitle>Energy Distribution Among Households</CardTitle>
        <CardDescription>November 2011 - February 2014</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="category"
              innerRadius={75}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {chartData.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Households
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Showing % of household with low, medium, high energy usage overall
        </div>
      </CardFooter>
    </Card>
  );
}