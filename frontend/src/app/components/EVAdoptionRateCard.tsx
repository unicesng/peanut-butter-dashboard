"use client";

import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
const chartData = [{ month: "january", electricVehicles: 1260, diesel: 570 }];

const chartConfig = {
  electricVehicles: {
    label: "Electric Vehicles",
    color: "hsl(var(--chart-1))",
  },
  diesel: {
    label: "Diesel",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function EVAdoptionRateCard() {
  const totalVisitors = chartData[0].electricVehicles + chartData[0].diesel;

  return (
    <Card className="w-1/2 m-2">
      <CardHeader className="items-center pb-0">
        <CardTitle>EV Adoption Rate</CardTitle>
        <CardDescription>% of all vehicles in the UK</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0 max-h-10">
        <ChartContainer
          config={chartConfig}
          className="mx-auto w-full h-50"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={130}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground"
                        >
                          Electric Vehicles
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="electricVehicles"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-electricVehicles)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="diesel"
              fill="var(--color-diesel)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
