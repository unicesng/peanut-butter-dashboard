"use client"

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GetAverageDailyConsumption } from "@/api/energyApis";
import { useEffect, useState } from "react";

interface AverageDailyConsumptionChartData {
  average: number;
  change: number;
}

export function AverageDailyConsumption() {
  const [chartData, setChartData] = useState<AverageDailyConsumptionChartData>({ average: 0, change: 0 });

  useEffect(() => {
    fetchData();
  }, [])

  const fetchData = async () => {
    try {
      const data = await GetAverageDailyConsumption();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Card className="w-1/3 m-2">
      <CardHeader className="relative">
        <CardDescription>Average Daily Consumption per Household</CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {chartData.average} kWh
        </CardTitle>
        <div className="absolute right-4 top-4">
          <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
            <TrendingUpIcon className="size-3" />
            {chartData.change > 0
              ? `+${chartData.change}%`
              : `${chartData.change}%`}
          </Badge>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        {chartData.change > 0 ? (
          <>
            `Increasing Trend` <TrendingUpIcon className="size-4" />
          </>
        ) : (
          <>
            `Decreasing Trend` <TrendingDownIcon className="size-4" />
          </>
        )}
    </CardFooter>
    </Card >
  );
}
