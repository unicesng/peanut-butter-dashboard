// helpers/simpleTransformer.ts

/**
 * Simple data transformer to bridge the gap between Kafka data and frontend expectations
 * This is a lightweight approach for local development
 */

export function transformAggregateData(data: any): any {
    // If data is null or undefined, return as is
    if (!data) return data;
    
    const transformedData = { ...data };
    
    // Transform time_series to hourly_data if present
    if (data.time_series && Array.isArray(data.time_series)) {
      transformedData.hourly_data = data.time_series.map((point: any) => ({
        time: new Date(point.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        consumption: point.total_consumption_kwh,
        average: point.average_consumption_kwh,
        anomaly: false // Default to false, could be calculated based on thresholds
      }));
    }
    
    // Transform historical_comparison to previous_data if present
    if (data.historical_comparison?.vs_yesterday_avg) {
      transformedData.previous_data = {
        num_households: data.num_households,
        anomaly_count: data.anomaly_count,
        average_consumption_kwh: data.average_consumption_kwh - data.historical_comparison.vs_yesterday_avg.value
      };
    }
    
    // Transform peak_demand to peak_demand_time and peak_change if present
    if (data.peak_demand) {
      if (data.peak_demand.current_day?.peak_time) {
        transformedData.peak_demand_time = `${data.peak_demand.current_day.peak_demand_kwh.toFixed(1)} kWh at ${data.peak_demand.current_day.peak_time}`;
      }
      
      if (data.peak_demand.vs_previous_day) {
        const change = data.peak_demand.vs_previous_day.percentage;
        transformedData.peak_change = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs yesterday`;
      }
    }
    
    return transformedData;
  }
  
  export function transformAnomalyData(data: any[]): any[] {
    // For anomalies, no transformation needed as the structure is compatible
    return data;
  }
  
  export function transformHouseholdData(data: any[]): any[] {
    // For household data, no transformation needed as the structure is compatible
    return data;
  }

  
  
  export function transformData(dataType: string, data: any): any {
    if (dataType === 'aggregate') {
      return transformAggregateData(data);
    } else if (dataType === 'anomalies') {
      return transformAnomalyData(data);
    } else if (dataType === 'household') {
      return transformHouseholdData(data);
    }
    return data;
  }