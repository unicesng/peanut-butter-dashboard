import { AverageDailyConsumption } from "@/app/components/AverageDailyConsumption";
import { EnergyConsumptionChart } from "@/app/components/EnergyConsumptionChart";
import { EnergyDistributionChart } from "@/app/components/EnergyDistributionChart";
import { EnergyFactorsChart } from "@/app/components/EnergyFactorsChart";
import { ProjectedEnergyConsumptionChart } from "@/app/components/ProjectedEnergyConsumptionChart";
import { EnergyAnomalyCard } from "@/app/components/EnergyAnomalyCard";

export default function Energy() {
  return (
    <section className="bg-white dark:bg-gray-900 ">
      <div className="border-b border-gray-200 pb-4 py-8 px-8">
        <div className="justify-between flex">
          <h1 className="text-2xl font-bold text-gray-900">Energy Dashboard</h1>
          <button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Download Report</button>
        </div>
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
