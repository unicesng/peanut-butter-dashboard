'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAggregateData, useHouseholdData, useAnomalyData, useConsumptionTimeSeries } from '../../hooks/useSmartMeterData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

interface SystemStat {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [acornFilter, setAcornFilter] = useState<string>('all');
  const [alertThreshold, setAlertThreshold] = useState<number>(30);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Fetch data using custom hooks with appropriate polling intervals
  
  const { 
    data: aggregateData, 
    isLoading: isLoadingAggregate, 
    refreshData: refreshAggregateData 
  } = useAggregateData(60000); // Refresh every minute
  // In your dashboard component
const applianceData = React.useMemo(() => {
  if (!aggregateData?.appliance_breakdown) return [];
  
  const breakdown = aggregateData.appliance_breakdown;
  const total = Object.values(breakdown).reduce((sum, value) => sum + Math.abs(Number(value)), 0);
  
  return Object.entries(breakdown).map(([name, value]) => {
    const numValue = Number(value);
    const percent = (Math.abs(numValue) / total) * 100;
    
    return {
      name,
      value: percent,
      actualValue: numValue, // keep the original value for tooltips if needed
      label: `${name} (${percent.toFixed(0)}%)`
    };
  });
}, [aggregateData?.appliance_breakdown]);
  const { 
    data: householdData, 
    isLoading: isLoadingHousehold,
    refreshData: refreshHouseholdData
  } = useHouseholdData(
    acornFilter !== 'all' ? acornFilter : null, 
    10, 
    120000 // Refresh every 2 minutes
  );
  
  const { 
    data: anomalyData, 
    isLoading: isLoadingAnomalies,
    refreshData: refreshAnomalyData
  } = useAnomalyData(10, 30000); // Refresh every 30 seconds for anomalies (more important)
  
  const { 
    data: timeSeriesData, 
    isLoading: isLoadingTimeSeries,
    refreshData: refreshTimeSeriesData
  } = useConsumptionTimeSeries(24, 60000); // Refresh every minute
  
  // Function to refresh all data on demand
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAggregateData(),
        refreshHouseholdData(),
        refreshAnomalyData(),
        refreshTimeSeriesData()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAggregateData, refreshHouseholdData, refreshAnomalyData, refreshTimeSeriesData]);
  
  // Effect to refresh data when acorn filter changes
  useEffect(() => {
    refreshHouseholdData();
  }, [acornFilter, refreshHouseholdData]);
  
  // Prepare ACORN consumption data from fetched data
  const acornConsumptionData = useMemo(() => {
    if (!aggregateData || !aggregateData.acorn_stats) return [];
    
    return Object.entries(aggregateData.acorn_stats).map(([group, stats]) => ({
      group,
      avgConsumption: stats.average_consumption_kwh,
      households: stats.household_count,
      color: getAcornColor(group)
    }));
  }, [aggregateData]);
  
  // Get color for ACORN groups
  function getAcornColor(group: string): string {
    const colors: Record<string, string> = {
      "Affluent Achievers": "#8884d8",
      "Rising Prosperity": "#83a6ed",
      "Comfortable Communities": "#8dd1e1",
      "Financially Stretched": "#82ca9d",
      "Urban Adversity": "#a4de6c"
    };
    return colors[group] || "#8884d8";
  }
  
  // Prepare system stats from aggregate data
  const systemStats = useMemo<SystemStat[]>(() => {
    if (!aggregateData) {
      return [
        { label: 'Households Monitored', value: 'No data', change: 'N/A', changeType: 'neutral' },
        { label: 'Active Alerts', value: 'No data', change: 'N/A', changeType: 'neutral' },
        { label: 'Avg. Consumption', value: 'No data', change: 'N/A', changeType: 'neutral' },
        { label: 'Peak Demand', value: 'No data', change: 'N/A', changeType: 'neutral' },
      ];
    }
    
    // No previous data available, just show current values with no change
    if (!aggregateData.previous_data) {
      return [
        { 
          label: 'Households Monitored', 
          value: aggregateData.num_households.toLocaleString(), 
          change: 'No historical data', 
          changeType: 'neutral'
        },
        { 
          label: 'Active Alerts', 
          value: aggregateData.anomaly_count.toString(), 
          change: 'No historical data', 
          changeType: 'neutral'
        },
        { 
          label: 'Avg. Consumption', 
          value: `${aggregateData.average_consumption_kwh.toFixed(2)} kWh`, 
          change: 'No historical data', 
          changeType: 'neutral'
        },
        { 
          label: 'Peak Demand', 
          value: aggregateData.peak_demand_time || 'No data',
          change: aggregateData.peak_change || 'No data', 
          changeType: 'neutral'
        },
      ];
    }
    
    // Calculate percentage change for display
    const calculateChange = (current: number, previous: number): { value: string, type: 'positive' | 'negative' | 'neutral' } => {
      if (!previous) return { value: 'N/A', type: 'neutral' };
      
      const percentChange = ((current - previous) / previous) * 100;
      const value = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
      
      // For consumption, lower is better (positive)
      const isConsumption = current === aggregateData.average_consumption_kwh;
      
      if (percentChange === 0) return { value, type: 'neutral' };
      if (isConsumption) {
        return { value, type: percentChange < 0 ? 'positive' : 'negative' };
      }
      return { value, type: percentChange > 0 ? 'positive' : 'negative' };
    };
    
    const householdChange = calculateChange(aggregateData.num_households, aggregateData.previous_data.num_households);
    const alertChange = calculateChange(aggregateData.anomaly_count, aggregateData.previous_data.anomaly_count);
    const consumptionChange = calculateChange(aggregateData.average_consumption_kwh, aggregateData.previous_data.average_consumption_kwh);
    
    return [
      { 
        label: 'Households Monitored', 
        value: aggregateData.num_households.toLocaleString(), 
        change: householdChange.value, 
        changeType: householdChange.type
      },
      { 
        label: 'Active Alerts', 
        value: aggregateData.anomaly_count.toString(), 
        change: alertChange.value, 
        changeType: alertChange.type
      },
      { 
        label: 'Avg. Consumption', 
        value: `${aggregateData.average_consumption_kwh.toFixed(2)} kWh`, 
        change: consumptionChange.value, 
        changeType: consumptionChange.type
      },
      { 
        label: 'Peak Demand', 
        value: aggregateData.peak_demand_time || 'No data',
        change: aggregateData.peak_change || 'No data', 
        changeType: 'neutral'
      },
    ];
  }, [aggregateData]);
  
  if (isLoadingAggregate && isLoadingHousehold && isLoadingAnomalies && isLoadingTimeSeries) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Household Energy Consumption Monitoring</h1>
        <div className="flex space-x-4">
          <select 
            className="bg-white px-3 py-2 rounded shadow"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'hourly' | 'daily' | 'weekly')}
          >
            <option value="hourly">Last 24 Hours</option>
            <option value="daily">Last 7 Days</option>
            <option value="weekly">Last 30 Days</option>
          </select>
          <select 
            className="bg-white px-3 py-2 rounded shadow"
            value={acornFilter}
            onChange={(e) => setAcornFilter(e.target.value)}
          >
            <option value="all">All ACORN Groups</option>
            <option value="affluent_achievers">Affluent Achievers</option>
            <option value="rising_prosperity">Rising Prosperity</option>
            <option value="comfortable_communities">Comfortable Communities</option>
            <option value="financially_stretched">Financially Stretched</option>
            <option value="urban_adversity">Urban Adversity</option>
          </select>
          <button 
            onClick={refreshAllData}
            disabled={refreshing} 
            className={`flex items-center bg-blue-600 text-white px-4 py-2 rounded shadow ${refreshing ? 'opacity-70' : ''}`}
          >
            {refreshing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span>Refresh Data</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {systemStats.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className={`text-sm ${
              stat.changeType === 'positive' ? 'text-green-500' : 
              stat.changeType === 'negative' ? 'text-red-500' : 'text-gray-500'
            }`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Realtime Consumption Chart */}
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
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="#8884d8" 
                    name="Current Consumption" 
                    strokeWidth={2} 
                    isAnimationActive={false} // Disable animations for real-time updates
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#82ca9d" 
                    strokeDasharray="3 3" 
                    name="Average Consumption" 
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
        
        {/* ACORN Group Breakdown */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Consumption by ACORN Group</h2>
          <div className="text-sm text-gray-500 mb-4">Average kWh per household type</div>
          
          {acornConsumptionData && acornConsumptionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={acornConsumptionData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'kWh', position: 'insideBottom', offset: -5 }} />
                  <YAxis type="category" dataKey="group" />
                  <Tooltip />
                  <Bar dataKey="avgConsumption" name="Avg. Consumption">
                    {acornConsumptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
              <div className="text-center">
                <p className="text-gray-500 font-medium">No ACORN group data available</p>
                <p className="text-gray-400 text-sm mt-2">API must return acorn_stats in aggregate data</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Alerts */}
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
                {anomalyData && anomalyData.length > 0 ? (
                  anomalyData.map((alert, index) => (
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
        
        {/* Appliance Consumption Breakdown */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Consumption Breakdown</h2>
          <div className="text-sm text-gray-500 mb-4">Usage by category</div>
          
          {aggregateData && aggregateData.appliance_breakdown ? (
            <div className="h-64 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
  <Pie
    data={applianceData}
    cx="50%"
    cy="50%"
    labelLine={false}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
    label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
  >
    {applianceData.map((entry, index) => {
      const colors = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#82ca9d'];
      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
    })}
  </Pie>
  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
</PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
              <div className="text-center">
                <p className="text-gray-500 font-medium">No appliance breakdown data available</p>
                <p className="text-gray-400 text-sm mt-2">API must return appliance_breakdown in aggregate data</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Household Snapshot</h2>
          <select className="border rounded px-3 py-1">
            <option>Top 10 by Consumption</option>
            <option>Recent Anomalies</option>
            <option>Bottom 10 by Consumption</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {householdData && householdData.length > 0 ? (
            householdData.slice(0, 5).map((household, index) => (
              <div key={index} className="border rounded p-3">
                <div className="font-medium">{household.household_id}</div>
                <div className="text-xs text-gray-500 mb-1">{household.acorn_group}</div>
                <div className="text-lg font-bold">{household.consumption_kwh.toFixed(1)} kWh</div>
                <div className={`text-xs ${household.is_anomaly ? 'text-red-500' : 'text-green-500'}`}>
                  {household.is_anomaly ? 
                    `Above average` : 
                    `Below average`
                  }
                  {aggregateData?.average_consumption_kwh ? 
                    ` (Avg: ${aggregateData.average_consumption_kwh.toFixed(1)} kWh)` : 
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
    </div>
  );
};

export default Dashboard;