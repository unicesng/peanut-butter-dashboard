"use client"

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RealTimeConsumption() {
    const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertThreshold, setAlertThreshold] = useState<number>(30);
    
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=time-series');
                const data = await res.json();
                const reversed = [...data.timeSeries].reverse();
                setTimeSeriesData(reversed);
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
          <div className="bg-white p-4 rounded shadow flex flex-col justify-center items-center space-y-2">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Loading alerts...</p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded shadow lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2">Real-time Consumption</h2>
            <div className="text-sm text-gray-500 mb-4">24-hour consumption with baseline comparison</div>
              
            {timeSeriesData && timeSeriesData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={timeSeriesData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time_formatted" />
                    <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total_consumption_kwh" 
                      stroke="#8884d8" 
                      name="Current Total Consumption" 
                      strokeWidth={2} 
                      isAnimationActive={false} // Disable animations for real-time updates
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average_consumption_kwh" 
                      stroke="#82ca9d" 
                      strokeDasharray="3 3" 
                      name="Current Average Consumption" 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
                <div className="text-center">
                  <p className="text-gray-500 font-medium">No time series data available</p>
                  <p className="text-gray-400 text-sm mt-2">API must return hourly_data array in aggregate data</p>
                </div>
              </div>
            )}
              
            <div className="mt-4 flex justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Anomaly Detected</span>
              </div>
              <div>
                <span className="text-sm mr-2">Alert Threshold:</span>
                <select 
                  value={alertThreshold} 
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  <option value={10}>10% deviation</option>
                  <option value={20}>20% deviation</option>
                  <option value={30}>30% deviation</option>
                  <option value={50}>50% deviation</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </>
    )
}