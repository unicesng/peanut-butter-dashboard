import { TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EnergyCostCard() {
  return (
    <Card className="w-1/3 m-2">
      <CardHeader className="relative">
        <CardDescription>Electricity costs</CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          £27.03 per kWh
        </CardTitle>
        <div className="absolute right-4 top-4">
          <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
            <TrendingUpIcon className="size-3" />
            +4.5%
          </Badge>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          Exceeds predictions <TrendingUpIcon className="size-4" />
        </div>
        <div className="text-muted-foreground">largely due to Russian war</div>
      </CardFooter>
    </Card>
  );
}
