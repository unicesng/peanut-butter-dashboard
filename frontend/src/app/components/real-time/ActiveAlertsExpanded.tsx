"use client"

import { useEffect, useState } from "react"

export default function ActiveAlertsExpanded() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/household-readings?type=latest-anomaly');
                const data = await res.json();
                setAlerts(data.latestAnomaly);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
    }, []);

    return (
      <>
        {loading ? (
          <div className="bg-white p-4 rounded shadow lg:col-span-2 flex flex-col justify-center items-center space-y-2">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Loading alerts...</p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded shadow lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Active Alerts</h2>
        
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Household</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Timestamp</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Description</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Severity</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts && alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2 text-sm font-medium">{alert.household_id}</td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(alert.datetime).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {alert.anomaly_type || 'Unusual consumption pattern'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            alert.anomaly_type === 'Extremely High' ? 'bg-red-100 text-red-800' : 
                            alert.anomaly_type === 'Unusually High' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.anomaly_type === 'Extremely High' ? 'High' : 
                            alert.anomaly_type === 'Unusually High' ? 'Medium' : 'Low'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className="inline-block px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                        No active alerts at this time
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-right">
              <button className="text-blue-600 text-sm font-medium">View All Alerts</button>
            </div>
          </div>
        )}
      </>  
    )
}