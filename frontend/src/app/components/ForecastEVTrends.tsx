import React from "react";

const stats = [
  {
    name: "Household Type most likely to purchase an EV",
    value: "ACORN-1",
  },
  {
    name: "Better charging efficiency",
    value: "2-3x",
  },
  {
    name: "Charging points / neighbourhood",
    value: "Up to 900",
  },
];

export default function ForecastEVTrends() {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-3 py-20">
        <h2
          id="features-title"
          className="mt-2 inline-block bg-gradient-to-br from-gray-900 to-gray-800 bg-clip-text py-2 text-4xl font-bold tracking-tighter text-transparent dark:from-gray-50 dark:to-gray-300 sm:text-6xl"
        >
          Forecasted EV Trends
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-7 text-gray-600 dark:text-gray-400">
            As the EV Market grows, we need to understand the relevant trends and adapt accordingly.
            Electrical Car Makers and the Government need to work hand in hand to achieve a net carbon
            zero society.
        </p>
        <dl className="mt-12 grid grid-cols-1 gap-y-8 dark:border-gray-800 md:grid-cols-3 md:border-y md:border-gray-200 md:py-14">
          {stats.map((stat, index) => (
            <React.Fragment key={index}>
              <div className="border-l-2 border-blue-100 pl-6 dark:border-blue-900 md:border-l md:text-center lg:border-gray-200 lg:first:border-none lg:dark:border-gray-800">
                <dd className="inline-block bg-gradient-to-t from-blue-900 to-blue-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent dark:from-blue-700 dark:to-blue-400 lg:text-6xl">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-gray-600 dark:text-gray-400">
                  {stat.name}
                </dt>
              </div>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </>
  );
}
