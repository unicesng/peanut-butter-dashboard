// hooks/useSmartMeterData.ts
import { useState, useEffect, useRef, useCallback } from 'react';

// Define common type interfaces
interface HouseholdData {
  household_id: string;
  datetime: string;
  consumption_kwh: number;
  acorn_group: string;
  is_anomaly: boolean;
  anomaly_type?: string;
}

interface AggregateData {
  datetime: string;
  num_households: number;
  total_consumption_kwh: number;
  average_consumption_kwh: number;
  anomaly_count: number;
  anomaly_percentage: number;
  acorn_stats: {
    [key: string]: {
      household_count: number;
      total_consumption_kwh: number;
      average_consumption_kwh: number;
    }
  };
  previous_data?: {
    num_households: number;
    anomaly_count: number;
    average_consumption_kwh: number;
  };
  peak_demand_time?: string;
  peak_change?: string;
  appliance_breakdown?: Record<string, number>;
  hourly_data?: Array<{
    time: string;
    consumption: number;
    average: number;
    anomaly: boolean;
  }>;
}

interface TimeSeriesPoint {
  time: string;
  consumption: number;
  average: number;
  anomaly: boolean;
}

// Base hook for data fetching with polling
function usePollingFetch<T>(
  url: string,
  pollingInterval: number = 10000,
  initialData: T | null = null,
  fetchOptions?: RequestInit
) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(`API returned error: ${result.error}`);
      }
      
      setData(result.data);
      setError(null);
    } catch (err: any) {
      console.error(`Error fetching from ${url}:`, err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [url, fetchOptions]);

  // Start polling on mount and clean up on unmount
  useEffect(() => {
    // Fetch immediately on mount
    fetchData();

    // Set up polling
    pollingRef.current = setInterval(fetchData, pollingInterval);

    // Clean up on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchData, pollingInterval]);

  // Function to manually refresh data
  const refreshData = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refreshData };
}

// Hook for aggregate data
export function useAggregateData(pollingInterval: number = 10000) {
  const today = new Date().toISOString().split('T')[0];
  return usePollingFetch<AggregateData>(
    `/api/smart-meter-data?dataType=aggregate&date=${today}`,
    pollingInterval
  );
}

// Hook for household data
export function useHouseholdData(
  acornGroup: string | null = null,
  limit: number = 10,
  pollingInterval: number = 10000
) {
  const today = new Date().toISOString().split('T')[0];
  const url = acornGroup 
    ? `/api/smart-meter-data?dataType=household&acornGroup=${acornGroup}&date=${today}&limit=${limit}`
    : `/api/smart-meter-data?dataType=household&date=${today}&limit=${limit}`;
  
  return usePollingFetch<HouseholdData[]>(url, pollingInterval, []);
}

// Hook for anomaly data
export function useAnomalyData(
  limit: number = 10,
  pollingInterval: number = 10000
) {
  const today = new Date().toISOString().split('T')[0];
  return usePollingFetch<HouseholdData[]>(
    `/api/smart-meter-data?dataType=anomalies&date=${today}&limit=${limit}`,
    pollingInterval,
    []
  );
}

// Hook for timeseries data - requires the API to return hourly_data
export function useConsumptionTimeSeries(
  hours: number = 24,
  pollingInterval: number = 30000
) {
  const today = new Date().toISOString().split('T')[0];
  const { data: aggregateData, isLoading, error, refreshData } = usePollingFetch<AggregateData>(
    `/api/smart-meter-data?dataType=aggregate&date=${today}`,
    pollingInterval
  );

  // Extract time series data if available
  const timeSeriesData = aggregateData?.hourly_data || [];

  return { 
    data: timeSeriesData, 
    isLoading, 
    error,
    refreshData
  };
}

// Export a combined hook that refreshes all data
export function useRefreshAllData() {
  const aggregate = useAggregateData(0); // Set interval to 0 to prevent auto-polling
  const household = useHouseholdData(null, 10, 0);
  const anomaly = useAnomalyData(10, 0);
  const timeSeries = useConsumptionTimeSeries(24, 0);
  
  const refreshAll = useCallback(async () => {
    await Promise.all([
      aggregate.refreshData(),
      household.refreshData(),
      anomaly.refreshData(),
      timeSeries.refreshData()
    ]);
  }, [aggregate.refreshData, household.refreshData, anomaly.refreshData, timeSeries.refreshData]);
  
  return {
    isLoading: aggregate.isLoading || household.isLoading || anomaly.isLoading || timeSeries.isLoading,
    error: aggregate.error || household.error || anomaly.error || timeSeries.error,
    refreshAll
  };
}