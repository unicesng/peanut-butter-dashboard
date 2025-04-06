'use client';
import React, { useState } from 'react';
import HouseholdsMonitored from '@/app/components/real-time/HouseholdsMonitored';
import ActiveAlerts from '@/app/components/real-time/ActiveAlerts';
import AvgConsumption from '@/app/components/real-time/AvgConsumption';
import PeakDemand from '@/app/components/real-time/PeakDemand';
import ConsumptionByAcorn from '@/app/components/real-time/ConsumptionByAcorn';
import ActiveAlertsExpanded from '@/app/components/real-time/ActiveAlertsExpanded';
import ConsumptionBreakdown from '@/app/components/real-time/ConsumptionBreakdown';
import HouseholdSnapshot from '@/app/components/real-time/HouseholdSnapshot';
import RealTimeConsumption from '@/app/components/real-time/RealTimeConsumption';

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [acornFilter, setAcornFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);

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
        <HouseholdsMonitored />
        <ActiveAlerts />
        <AvgConsumption />
        <PeakDemand />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Realtime Consumption Chart */}
        <RealTimeConsumption />
        
        {/* ACORN Group Breakdown */}
        <ConsumptionByAcorn />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Alerts */}
        <ActiveAlertsExpanded />
        
        {/* Appliance Consumption Breakdown */}
        <ConsumptionBreakdown />
      </div>
      
      {/*Household Snapshot */}
      <HouseholdSnapshot />
    </div>
  );
};

export default Dashboard;