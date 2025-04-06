"use client";

import { useEffect, useState } from "react";

export default function AvgConsumption () {
    const [avg, setAvg] = useState<number>(0);
    const [change, setChange] = useState<number>(0.0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=latest');
                const data = await res.json();
                setAvg(data.latest.average_consumption_kwh);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchPrev = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=latest2');
                const data = await res.json();
                const change = ((data.latest2[0].average_consumption_kwh - data.latest2[1].average_consumption_kwh) / data.latest2[1].average_consumption_kwh) * 100;
                setChange(change);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
        fetchPrev();
    }, []);

    return (
        <div>
            <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-500">Avg. Consumption</div>
                <div className="text-2xl font-bold">{avg} kWh</div>
                <div className={`text-sm ${
                    change > 0 ? 'text-red-500' : 
                    change < 0 ? 'text-green-500' : 'text-gray-500'
                }`}>
                    {change > 0 ? '+' : ''}
                    {change?.toFixed(1)}%
                </div>
            </div>
        </div>
    )
}