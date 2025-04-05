import { AverageDailyConsumption } from "@/app/components/AverageDailyConsumption";
import { EnergyConsumptionChart } from "@/app/components/EnergyConsumptionChart";
import { EnergyCostCard } from "@/app/components/EnergyCostCard";
import { EnergyDistributionChart } from "@/app/components/EnergyDistributionChart";
import { EnergyFactorsChart } from "@/app/components/EnergyFactorsChart";
import { ProjectedEnergyConsumptionChart } from "@/app/components/ProjectedEnergyConsumptionChart";
import { EnergyAnomalyCard } from "@/app/components/EnergyAnomalyCard";

export default function Energy() {
  return (
    <section className="bg-white dark:bg-gray-900 ">
      <div className="border-b border-gray-200 pb-4 py-8 px-8">
        <h1 className="text-2xl font-bold text-gray-900">Energy Dashboard</h1>
        <p className="text-gray-500">
          Real-time monitoring of energy metrics with AI-powered insights
        </p>
        <hr className="h-px my-4 bg-gray-400 border-0" />
        <div className="flex m-2">
          <AverageDailyConsumption />
          <EnergyAnomalyCard />
        </div>
        <div className="flex m-2">
          <EnergyConsumptionChart />
          <EnergyDistributionChart />
          <EnergyFactorsChart />
        </div>
        <div className="m-2">
          <ProjectedEnergyConsumptionChart />
        </div>
      </div>
    </section>
  );}
