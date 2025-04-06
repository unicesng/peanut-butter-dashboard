"use client"

import { useEffect, useState } from 'react';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ApplianceData {
    name: string;
    actualValue: number;
    value: number;
    label: string;
}

interface RawAppliance {
    appliance_type: string;
    sum: number;
    percentage: number;
}

export default function ConsumptionBreakdown() {
    const [applianceConsumption, setApplianceConsumption] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/aggregate-appliance-consumption?type=appliance-consumption');
                const data = await res.json();
                const applianceList: ApplianceData[] = [];
                let totalConsumption = 0;
                (data.applianceConsumption as RawAppliance[]).forEach(appliance => {
                    totalConsumption += appliance.sum;
                });
                (data.applianceConsumption as RawAppliance[]).forEach(appliance => {
                    const tempAppliance = {
                        name: '',
                        actualValue: 0,
                        value: 0,
                        label: '',
                    };
                    tempAppliance.name = appliance.appliance_type;
                    tempAppliance.actualValue = appliance.sum;
                    tempAppliance.value = (appliance.sum / totalConsumption) * 100;
                    tempAppliance.label = appliance.appliance_type + ' (' + Math.round(appliance.percentage) + '%)';
                    applianceList.push(tempAppliance);
                })
                setApplianceConsumption(applianceList);

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
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold mb-2">Consumption Breakdown</h2>
                    <div className="text-sm text-gray-500 mb-4">Usage by category</div>
                        
                    {applianceConsumption && applianceConsumption ? (
                    <div className="h-64 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={applianceConsumption}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
                            >
                                {applianceConsumption.map((entry, index) => {
                                const colors = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#82ca9d'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                            </Pie>
                            <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`} />
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
            )}
        </>
    )
}