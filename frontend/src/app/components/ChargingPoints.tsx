import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { GetFinalChargingPoints } from '@/api/evApis';

// Define proper TypeScript interfaces
interface ChargingPoint {
  Longitude: number;
  Latitude: number;
  Segment: string;
  "Risk Level": RiskLevel;
}

interface SegmentSummary {
  Segment: string;
  "New Chargers": number;
  energy_sum: number;
  "New Load (kWh)": number;
  "New Total Load": number;
  "Increase (%)": number;
  "Risk Level": RiskLevel;
}

type RiskLevel = "Safe" | "Monitor" | "Caution" | "Do Not Add" | "Unclassified";

interface ChargingData {
  decision: string | string[];
  chargingPoints: ChargingPoint[];
  summary: SegmentSummary[];
}

const ChargingPoints: React.FC = () => {
  const [data, setData] = useState<ChargingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const responseData = await GetFinalChargingPoints();
      setData(responseData);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch charging data';
      setError(errorMessage);
      setLoading(false);
      console.error(err);
    }
  };

  const getDecisionIcon = (decision: string | string[]) => {
    if (Array.isArray(decision)) {
      if (decision.includes("Approved")) {
        return <CheckCircle className="text-green-500 w-6 h-6" />;
      } else if (decision.includes("Flagged")) {
        return <AlertTriangle className="text-amber-500 w-6 h-6" />;
      }
      return <AlertCircle className="text-red-500 w-6 h-6" />;
    }
    
    if (decision.includes("Approved")) {
      return <CheckCircle className="text-green-500 w-6 h-6" />;
    } else if (decision.includes("Flagged")) {
      return <AlertTriangle className="text-amber-500 w-6 h-6" />;
    }
    return <AlertCircle className="text-red-500 w-6 h-6" />;
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

  const getRiskColor = (risk: RiskLevel) => {
    const colors = {
      "Safe": "text-green-500",
      "Monitor": "text-blue-500",
      "Caution": "text-amber-500",
      "Do Not Add": "text-red-500",
      "Unclassified": "text-gray-500"
    };
    
    return colors[risk] || "text-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span>Loading charging risk assessment...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
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
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 text-yellow-700">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="font-medium">No data available</h3>
        </div>
        <p className="mt-2">No charging point assessment data is currently available.</p>
      </div>
    );
  }

  // Calculate risk distribution
  const riskDistribution = data.summary.reduce<Record<string, number>>((acc, row) => {
    acc[row["Risk Level"]] = (acc[row["Risk Level"]] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">EV Charging Feasibility Assessment</CardTitle>
          <div className="flex items-center space-x-2">
            {getDecisionIcon(data.decision)}
            <span className="font-medium">{Array.isArray(data.decision) ? data.decision.join(", ") : data.decision}</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Map visualization */}
          <div className="h-64 mb-4 relative bg-gray-100 rounded-md overflow-hidden">
            <div className="absolute inset-0 p-2">
              <div className="relative w-full h-full">
                {data.chargingPoints.map((point, idx) => {
                  // Calculate position based on coordinates
                  const xPos = ((point.Longitude + 0.14) / 0.04) * 100;
                  const yPos = (100 - ((point.Latitude - 51.5) / 0.04) * 100);
                  
                  return (
                    <div 
                      key={idx}
                      className={`absolute ${getRiskColor(point["Risk Level"])}`}
                      style={{ 
                        left: `${xPos}%`, 
                        top: `${yPos}%`,
                        transform: 'translate(-50%, -100%)'
                      }}
                      title={`Segment: ${point.Segment}, Risk: ${point["Risk Level"]}`}
                    >
                      <MapPin className="w-6 h-6" />
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-2 left-2 bg-white p-2 text-xs rounded shadow">
                <div className="text-xs font-semibold mb-1">Risk Legend</div>
                <div className="flex items-center mb-1">
                  <MapPin className="text-green-500 w-4 h-4 mr-1" /> Safe
                </div>
                <div className="flex items-center mb-1">
                  <MapPin className="text-blue-500 w-4 h-4 mr-1" /> Monitor
                </div>
                <div className="flex items-center mb-1">
                  <MapPin className="text-amber-500 w-4 h-4 mr-1" /> Caution
                </div>
                <div className="flex items-center">
                  <MapPin className="text-red-500 w-4 h-4 mr-1" /> Do Not Add
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Simplified Charging Location Map
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segment Analysis</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Risk Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {Object.entries(riskDistribution).map(([risk, count]) => {
              const percentage = (count / data.summary.length) * 100;
              const colors = {
                "Safe": "bg-green-500",
                "Monitor": "bg-blue-500",
                "Caution": "bg-amber-500",
                "Do Not Add": "bg-red-500",
                "Unclassified": "bg-gray-500"
              };
              
              return (
                <div key={risk} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{risk}</span>
                    <span>{count} segments ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${colors[risk as RiskLevel] || "bg-gray-500"} h-2 rounded-full`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChargingPoints;