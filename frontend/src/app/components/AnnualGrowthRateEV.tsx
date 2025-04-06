import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { GetAnnualGrowth } from "@/api/evApis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EVAnnualGrowthRateData {
  year: number;
  absolutechange: number;
  percentagechange: number;
  adoptionrate: number;
}

export function AnnualGrowthRateOfEV() {
  const [data, setData] = useState<EVAnnualGrowthRateData[]>([]);
  const [chartData, setChartData] = useState<EVAnnualGrowthRateData[]>([]);
  const [chosenYear, setChosenYear] = useState<number>(2024);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await GetAnnualGrowth();
      setData(data);
      setChartData(data.filter((row: { year: number; }) => row.year === chosenYear));
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card className="m-2">
      <CardHeader className="flex justify-between">
        <div>
          <CardDescription>Annual Growth Rate of EV Sales</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {chartData[0]?.percentagechange} %
          </CardTitle>
        </div>
        <Select
          value={chosenYear.toString()}
          onValueChange={(value) => {
            const year = Number(value);
            setChosenYear(year);
            setChartData(data.filter(row => row.year === year));
          }}
        >
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
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="text-muted-foreground">
          which is a change in {chartData[0]?.absolutechange} electric vehicles in {chartData[0]?.year}
        </div>
      </CardFooter>
    </Card>
  );
}
