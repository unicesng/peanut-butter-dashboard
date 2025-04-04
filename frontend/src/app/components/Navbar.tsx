"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <nav className="fixed top-0 w-full shadow-md bg-white border-gray-200 dark:bg-gray-900">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link href="/" className="flex">
          <Image src="/peanut-butter.png" alt="Logo" width={50} height={50} />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            Peanut Butter Dashboard
          </span>
        </Link>
        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li>
              <Link
                href="/pages/energy"
                className={`block py-2 px-3 rounded-sm md:p-0 text-lg ${
                  activeTab === "energy"
                    ? "text-blue-700 dark:text-blue-500"
                    : "text-black dark:text-white"
                }`}
                onClick={() => setActiveTab("energy")}
              >
                Energy
              </Link>
            </li>
            <li>
              <Link
                href="/pages/electric-vehicles"
                className={`block py-2 px-3 rounded-sm md:p-0 text-lg ${
                  activeTab === "electricVehicles"
                    ? "text-blue-700 dark:text-blue-500"
                    : "text-black dark:text-white"
                }`}
                onClick={() => setActiveTab("electricVehicles")}
              >
                Electric Vehicles
              </Link>
            </li>
            <li>
              <Link
                href="/pages/dashboard"
                className={`block py-2 px-3 rounded-sm md:p-0 text-lg ${
                  activeTab === "dashboard"
                    ? "text-blue-700 dark:text-blue-500"
                    : "text-black dark:text-white"
                }`}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
