import { AnnualGrowthRateOfEV } from "@/app/components/AnnualGrowthRateEV";
// import ChargingPoints from "@/app/components/ChargingPoints";
import { EVAdoptionRateCard } from "@/app/components/EVAdoptionRateCard";
import { EVManufacturers } from "@/app/components/EVManufacturers";
import ForecastEVTrends from "@/app/components/ForecastEVTrends";
import { ProjectedEVGrowth } from "@/app/components/ProjectedEVGrowth";

export default function ElectricVehicles() {
  return (
    <section className="bg-white dark:bg-gray-900 ">
      <div className="border-b border-gray-200 pb-4 py-8 px-8">
        <h1 className="text-2xl font-bold text-gray-900">Electric Vehicles Dashboard</h1>
        <p className="text-gray-500">
          Insights on electric vehicle trends and metrics in the UK
        </p>
        <div className="flex m-2">
          <AnnualGrowthRateOfEV />
          <EVAdoptionRateCard />
        </div>
        <div>
          <EVManufacturers />
          <ProjectedEVGrowth />
          {/* <ChargingPoints /> */}
        </div>
        <div>
          <ForecastEVTrends />
        </div>
      </div>
    </section>
  );
}
