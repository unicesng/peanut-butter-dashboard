"use client";

import { useEffect, useState } from "react";

export default function PeakDemand () {
    const [demand, setDemand] = useState<number>(0);
    const [time, setTime] = useState<string>('00:00');
    const [change, setChange] = useState<number>(0.0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/daily-statistics?type=latest');
                const data = await res.json();
                setDemand(data.latest.peak_demand_kwh);
                setTime(data.latest.peak_time.substring(11, 16));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchPrev = async () => {
            try {
                const res = await fetch('/api/daily-statistics?type=latest2');
                const data = await res.json();
                const change = ((data.latest2[0].peak_demand_kwh - data.latest2[1].peak_demand_kwh) / data.latest2[1].peak_demand_kwh) * 100;
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
                <div className="text-sm text-gray-500">Peak Demand</div>
                <div className="text-2xl font-bold">{demand} at {time}</div>
                <div className={`text-sm ${
                    change > 0 ? 'text-red-500' : 
                    change < 0 ? 'text-green-500' : 'text-gray-500'
                }`}>
                    {change > 0 ? '+' : ''}
                    {change?.toFixed(1)}% vs yesterday
                </div>
            </div>
        </div>
    )
}