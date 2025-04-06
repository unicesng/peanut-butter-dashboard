"use client";

import { useEffect, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface AcornStat {
    acorn_group: string
    avg: number
    color?: string
}

export default function ConsumptionByAcorn() {
    const [acornData, setAcornData] = useState<AcornStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/household-readings?type=consumption-by-acorn');
                const data = await res.json();
                const acornList: AcornStat[] = [];
                data.consumptionByAcorn.forEach(acorn => {
                    if (acorn.acorn_group == 'Affluent Achievers') acorn.color = '#8884d8';
                    if (acorn.acorn_group == 'Rising Prosperity') acorn.color = '#83a6ed';
                    if (acorn.acorn_group == 'Comfortable Communities') acorn.color = '#8dd1e1';
                    if (acorn.acorn_group == 'Financially Stretched') acorn.color = '#82ca9d';
                    if (acorn.acorn_group == 'Urban Adversity') acorn.color = '#a4de6c';

                    acorn.avg = parseFloat(acorn.avg);
                    acornList.push(acorn);
                });
                setAcornData(acornList);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
    }, []);

    return (
        <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Consumption by ACORN Group</h2>
            <div className="text-sm text-gray-500 mb-4">Average kWh per household type</div>
                      
            {!loading && acornData && acornData.length > 0 ? (
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={acornData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'kWh', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="acorn_group" />
                    <Tooltip />
                    <Bar dataKey="avg" name="Avg. Consumption">
                    {acornData.map((entry, index) => (
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
    )
}