"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GetEnergyConsumption } from "@/api/energyApis";
import { useEffect, useState } from "react";

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-1))",
  },
  average: {
    label: "Average",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface EnergyConsumptionChartData {
  [category: string]: {
    acorn: number;
    total: number;
    average: number;
  }[];
}


export function EnergyConsumptionChart() {
  const [chartData, setChartData] = useState<EnergyConsumptionChartData>({});
  const [category, setCategory] = useState("Affluent")

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    try {
      const data = await GetEnergyConsumption();
      setChartData(data);
      setCategory("Affluent")
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Card className="w-1/3 m-2">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <CardTitle>Daily Energy Demand</CardTitle>
        <CardDescription>Based on ACORN Type</CardDescription>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Affluent" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="Affluent" className="rounded-lg">
            Affluent
            </SelectItem>
            <SelectItem value="Adversity" className="rounded-lg">
              Adversity
            </SelectItem>
            <SelectItem value="Comfortable" className="rounded-lg">
              Comfortable
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData[category]}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="acorn"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            <Bar dataKey="average" fill="var(--color-average)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this household <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total energy consumption by households for the last 6 households
        </div>
      </CardFooter>
    </Card>
  );
}
