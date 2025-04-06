"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { GetFinalChargingPoints } from '@/api/evApis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type RiskLevel = "Safe" | "Monitor" | "Caution" | "Do Not Add" | "Unclassified";

interface ChargingData {
  summary: SummaryData[];
  decision: string;
  map_file: string;
}

interface SummaryData {
  Segment: string;
  energy_sum: number;
  "New Chargers": number;
  "New Load (kWh)": number;
  "New Total Load": number;
  "Increase (%)": number;
  "Risk Level": RiskLevel;
}

const ChargingPoints = () => {
  const [data, setData] = useState<ChargingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargingPointId, setChargingPointId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const responseData = await GetFinalChargingPoints();
      console.log("retrieving charging data")
      setData(responseData);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch charging data';
      setError(errorMessage);
      setLoading(false);
      console.error(err);
    }
  };

  const handleViewMap = () => {
    if (data && data.map_file) {
      const mapUrl = chargingPointId ?
        `${data.map_file}?point=${encodeURIComponent(chargingPointId)}` :
        data.map_file;

      window.open(mapUrl, '_blank');
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    const colors = {
      "Safe": "bg-green-500",
      "Monitor": "bg-blue-500",
      "Caution": "bg-amber-500",
      "Do Not Add": "bg-red-500",
      "Unclassified": "bg-gray-500"
    };

    return (
      <Badge className={`${colors[risk] || "bg-gray-500"} text-white`}>
        {risk}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span>Loading electric vehicles charging point analysis ...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200 m-2">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle className="w-6 h-6" />
          <h3 className="font-medium">Error loading data</h3>
        </div>
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200 m-2">
        <div className="flex items-center space-x-2 text-yellow-700">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="font-medium">No data available</h3>
        </div>
        <p className="mt-2">No charging point assessment data is currently available.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Segment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Segment</th>
                  <th className="px-4 py-2 text-right">New Chargers</th>
                  <th className="px-4 py-2 text-right">Base Load (kWh)</th>
                  <th className="px-4 py-2 text-right">Added Load (kWh)</th>
                  <th className="px-4 py-2 text-right">Total Load (kWh)</th>
                  <th className="px-4 py-2 text-right">Increase (%)</th>
                  <th className="px-4 py-2">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{row.Segment}</td>
                    <td className="px-4 py-2 text-right">{row["New Chargers"]}</td>
                    <td className="px-4 py-2 text-right">{row.energy_sum.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row["New Load (kWh)"].toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row["New Total Load"].toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row["Increase (%)"].toFixed(1)}%</td>
                    <td className="px-4 py-2">{getRiskBadge(row["Risk Level"])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* <Card>
        <CardHeader>
          <CardTitle>Generate Charging Point Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Enter a specific charging point ID to highlight it on the map, or leave blank to view all points:</p>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter Charging Point ID"
                  value={chargingPointId}
                  onChange={(e) => setChargingPointId(e.target.value)}
                  className="max-w-md"
                />
                <Button onClick={handleViewMap} className="flex items-center">
                  View Map <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">Available Segment IDs</h4>
              <div className="flex flex-wrap gap-2">
                {data.summary.map((row, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setChargingPointId(row.Segment)}
                  >
                    {row.Segment}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default ChargingPoints;