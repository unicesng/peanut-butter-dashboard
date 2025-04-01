"use client";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const data = [
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-yellow-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-red-500", tooltip: "Peak" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-yellow-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-red-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-yellow-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
  { color: "bg-red-500", tooltip: "Peak" },
  { color: "bg-emerald-500", tooltip: "Tracker Info" },
];

export const EnergyAnomalyCard = () => (
  <Card className="w-1/3 m-2">
    <CardHeader className="relative">
      <CardDescription>Energy Grid Patterns</CardDescription>
      <TooltipProvider>
        <div className="flex gap-1 mt-4">
          {data.map((item, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={`w-5 h-20 rounded-full ${item.color} cursor-pointer`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </CardHeader>
  </Card>
);
