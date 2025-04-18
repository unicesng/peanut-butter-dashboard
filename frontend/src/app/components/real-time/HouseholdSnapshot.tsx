"use client"

import { useEffect, useState } from "react";

export default function HouseholdSnapshot() {
    const [snapshotType, setSnapshotType] = useState<'top' | 'bottom' | 'anomalies'>('top');
    const [householdSnapshotTop, setHouseholdSnapshotTop] = useState<any[]>([]);
    const [householdSnapshotBottom, setHouseholdSnapshotBottom] = useState<any[]>([]);
    const [recentAnomalies, setRecentAnomalies] = useState<any[]>([]);
    const [avg, setAvg] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchHouseholdSnapshot = async () => {
            try {
                const resTop = await fetch('/api/household-readings?type=household-snapshot-top');
                const resBottom = await fetch('/api/household-readings?type=household-snapshot-bottom');
                const resAnomalies = await fetch ('/api/household-readings?type=recent-anomalies');
                const dataTop = await resTop.json();
                const dataBottom = await resBottom.json();
                const dataAnomalies = await resAnomalies.json();
                setHouseholdSnapshotTop(dataTop.householdSnapshotTop);
                setHouseholdSnapshotBottom(dataBottom.householdSnapshotBottom);
                setRecentAnomalies(dataAnomalies.recentAnomalies);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchAvg = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=latest');
                const data = await res.json();
                setAvg(data.latest.average_consumption_kwh);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHouseholdSnapshot();
        fetchAvg();
    }, []);

    const selectedHouseholds =
    snapshotType === 'top'
      ? householdSnapshotTop
      : snapshotType === 'bottom'
      ? householdSnapshotBottom
      : recentAnomalies;

    return (
      <>
        {loading ? (
            <div className="bg-white p-4 rounded shadow flex flex-col justify-center items-center space-y-2">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                <p className="text-sm text-gray-500">Loading alerts...</p>
            </div>
        ) : (
          <div className="bg-white p-4 rounded shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Household Snapshot</h2>
              <select
                className="border rounded px-3 py-1"
                value={snapshotType}
                onChange={(e) => setSnapshotType(e.target.value as 'top' | 'bottom' | 'anomalies')}
              >
                <option value='top'>Top 10 by Consumption</option>
                <option value='anomalies'>Recent Anomalies</option>
                <option value='bottom'>Bottom 10 by Consumption</option>
              </select>
            </div>
        
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {selectedHouseholds && selectedHouseholds.length > 0 ? (
                selectedHouseholds.slice(0, 5).map((household, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="font-medium">{household.household_id}</div>
                    <div className="text-xs text-gray-500 mb-1">{household.acorn_group}</div>
                    <div className="text-lg font-bold">{household.consumption_kwh.toFixed(1)} kWh</div>
                    <div className={`text-xs ${household.consumption_kwh > avg ? 'text-red-500' : 'text-green-500'}`}>
                      {household.consumption_kwh > avg ? 
                        `Above average` : 
                        `Below average`
                      }
                      {avg ? 
                        ` (Avg: ${avg.toFixed(1)} kWh)` : 
                        ''
                      }
                    </div>
                    <div className="mt-2 border-t pt-1">
                      <div className="text-xs text-gray-500">Last updated:</div>
                      <div className="text-xs">
                        {new Date(household.datetime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-5 text-center py-8 text-gray-500">
                  <p className="font-medium">No household data available</p>
                  <p className="text-sm mt-2">API must return data from household endpoint</p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
}