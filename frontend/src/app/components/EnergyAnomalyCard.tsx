"use client";

import { GetEnergyAnomaly } from "@/api/energyApis";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

interface EnergyAnomalyChartData {
  date: string;
  tooltip: string;
}

export const EnergyAnomalyCard = () => {
  const [chartData, setChartData] = useState<EnergyAnomalyChartData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await GetEnergyAnomaly();
      setChartData(data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card className="w-1/2 m-2">
      <CardHeader className="relative">
        <CardDescription>Energy Grid Patterns</CardDescription>
        <TooltipProvider>
          <div className="flex gap-1 mt-4">
            {chartData.map((item, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-5 h-20 rounded-full 
                      ${item.tooltip === "Critically high/Peak" ? "bg-red-500" : ""} 
                      ${item.tooltip === "Moderate" ? "bg-yellow-500" : ""} 
                      ${item.tooltip === "Low" ? "bg-emerald-500" : ""} 
                      cursor-pointer`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{`${item.date}: ${item.tooltip}`}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardHeader>
    </Card>
  );
};