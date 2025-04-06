"use client";

import { useEffect, useState } from "react";

export default function ActiveAlerts () {
    const [alerts, setAlerts] = useState<number>(0);
    const [change, setChange] = useState<number>(0.0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=latest');
                const data = await res.json();
                setAlerts(data.latest.anomaly_count);
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
                const change = ((data.latest2[0].anomaly_count - data.latest2[1].anomaly_count) / data.latest2[1].anomaly_count) * 100;
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
                <div className="text-sm text-gray-500">Active Alerts</div>
                <div className="text-2xl font-bold">{alerts}</div>
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