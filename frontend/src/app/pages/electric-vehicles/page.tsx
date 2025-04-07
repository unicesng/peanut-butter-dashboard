"use client"

import { AnnualGrowthRateOfEV } from "@/app/components/AnnualGrowthRateEV";
import ChargingPoints from "@/app/components/ChargingPoints";
import { EVAdoptionRateCard } from "@/app/components/EVAdoptionRateCard";
import { ProjectedEVGrowth } from "@/app/components/ProjectedEVGrowth";
import { useState } from "react";

export default function ElectricVehicles() {

  const [activeTab, setActiveTab] = useState("Dashboard");
  return (
    <section className="bg-white dark:bg-gray-900 ">
      <div className="border-b border-gray-200 pb-4 py-8 px-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Electric Vehicles Dashboard
        </h1>
        <p className="text-gray-500">
          Insights on electric vehicle trends and metrics in the UK
        </p>
        <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="me-2  cursor-pointer">
              <a
                onClick={() => setActiveTab("Dashboard")} // Set active tab to "Dashboard"
                className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === "Dashboard"
                  ? "text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500"
                  : "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
                  }`}
              >
                Dashboard
              </a>
            </li>
            <li className="me-2  cursor-pointer">
              <a
                onClick={() => setActiveTab("Charging Points")}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === "Charging Points"
                  ? "border-blue-6000 text-blue-600"
                  : "border-transparent hover:text-blue-500"
                  }`}
              >
                Charging Points
              </a>
            </li>
          </ul>
        </div>
        {activeTab === "Dashboard" ?
          <div>
            {/* <AnnualGrowthRateOfEV />
            <div className="flex w-full">
              <EVAdoptionRateCard />
              <ProjectedEVGrowth />
            </div> */}
          </div> :
          <ChargingPoints />
        }
      </div>
    </section>
  );
}
