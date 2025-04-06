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
import { useEffect, useState } from "react";
import { GetAdoptionRate } from "@/api/evApis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartConfig = {
  electric: {
    label: "Electric Vehicles",
    color: "hsl(var(--chart-1))",
  },
  nonelectric: {
    label: "Non Electric",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface EVAdoptionRateData {
  year: number;
  electric: number;
  nonelectric: number;
  adoptionrate: number;
}

export function EVAdoptionRateCard() {
  const [data, setData] = useState<EVAdoptionRateData[]>([]);
  const [chartData, setChartData] = useState<EVAdoptionRateData[]>([]);
  const [chosenYear, setChosenYear] = useState<number>(2024);

  useEffect(() => {
    fetchData();
    console.log("Selected Value:", chosenYear); // Debugging
  }, [chosenYear]);

  const fetchData = async () => {
    try {
      const data = await GetAdoptionRate();
      setData(data);
      setChartData(data.filter((row: { year: number; }) => row.year === chosenYear));
    } catch (error) {
      console.log(error);
    }
  };

  const totalVehicles = chartData.length
    ? chartData[0].electric + chartData[0].nonelectric
    : 0;

  return (
    <Card className="w-1/2 m-2">
      <CardHeader className="items-center pb-0 flex">
        <div>
          <CardTitle>EV Adoption Rate</CardTitle>
          <CardDescription>{chartData[0]?.adoptionrate}% of all vehicles in the UK</CardDescription>
        </div>
        <Select value={chosenYear.toString()} onValueChange={(value) => {setChosenYear(Number(value));}}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select category"
          >
            <SelectValue placeholder="2024" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {data.map((row) => (
              <SelectItem key={row.year} value={row.year.toString()} className="rounded-lg">
                {row.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0 max-h-15">
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
                          {(totalVehicles / 1000000).toFixed(2)} M
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
              dataKey="electric"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-electric)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="nonelectric"
              fill="var(--color-nonelectric)"
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
