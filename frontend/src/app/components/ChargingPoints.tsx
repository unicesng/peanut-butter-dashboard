"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { GetChargingPoints, GetFinalChargingPoints } from "@/api/evApis";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: `${process.env.NEXT_PUBLIC_ACCESS_KEY}`,
    secretAccessKey: `${process.env.NEXT_PUBLIC_SECRET_ACCESS_KEY}`,
  },
});

const s3ObjectKey1 = `maps/charging_port_risk_map.html`;
const s3ObjectKey2 = `maps/ev_charging_map_filtered.html`;

const command1 = new GetObjectCommand({
  Bucket: "peanut-butter-project",
  Key: s3ObjectKey1,
});
const command2 = new GetObjectCommand({
  Bucket: "peanut-butter-project",
  Key: s3ObjectKey2,
});

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
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargingPoints, setChargingPoints] = useState<number>(100);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const responseData = await GetFinalChargingPoints();
      console.log("retrieving charging data");
      setData(responseData);
      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch charging data";
      setError(errorMessage);
      setLoading(false);
      console.error(err);
    }
  };

  const handleViewMap = async () => {
    let signedUrlRiskMap;
    let signedUrlFilteredMap;
    try {
      // Wait for charging points to be generated
      setMapLoading(true);
      await GetChargingPoints({ number: chargingPoints });
      console.log("Charging Points generated");

      // Wait for final charging data to be fetched
      await fetchData();

      // Generate pre-signed URLs
      signedUrlRiskMap = await getSignedUrl(s3Client, command1, {
        expiresIn: 86400,
      });
      console.log(signedUrlRiskMap);
      signedUrlFilteredMap = await getSignedUrl(s3Client, command2, {
        expiresIn: 86400,
      });
    } catch (err) {
      console.error("Error in handleViewMap:", err);
    } finally {
      window.open(signedUrlRiskMap, "_blank");
      console.log(signedUrlRiskMap);
      window.open(signedUrlFilteredMap, "_blank");
      console.log(signedUrlFilteredMap);
      setMapLoading(false);
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    const colors = {
      Safe: "bg-green-500",
      Monitor: "bg-blue-500",
      Caution: "bg-amber-500",
      "Do Not Add": "bg-red-500",
      Unclassified: "bg-gray-500",
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
        <p className="mt-2">
          No charging point assessment data is currently available.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate Charging Point Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Enter a specific number of charge points to highlight it on the
                map:
              </p>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter Number of Charging Points"
                  value={chargingPoints}
                  onChange={(e) => setChargingPoints(Number(e.target.value))}
                  className="max-w-md"
                />
                <Button onClick={handleViewMap} className="flex items-center">
                  View Map{" "}
                  {mapLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  ) : (
                    <ExternalLink className="ml-2 w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
                    <td className="px-4 py-2 text-right">
                      {row["New Chargers"]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.energy_sum.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row["New Load (kWh)"].toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row["New Total Load"].toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row["Increase (%)"].toFixed(1)}%
                    </td>
                    <td className="px-4 py-2">
                      {getRiskBadge(row["Risk Level"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChargingPoints;
