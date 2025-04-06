"use client";

import { useEffect, useState } from "react";

export default function HouseholdsMonitored () {
    const [count, setCount] = useState<number>(0);
    const [change, setChange] = useState<number>(0.0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/aggregate-consumption?type=latest');
                const data = await res.json();
                setCount(data.latest.num_households);
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
                const change = ((data.latest2[0].num_households - data.latest2[1].num_households) / data.latest2[1].num_households) * 100;
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
                <div className="text-sm text-gray-500">Households Monitored</div>
                <div className="text-2xl font-bold">{count}</div>
                <div className={`text-sm ${
                    change > 0 ? 'text-green-500' : 
                    change < 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                    {change > 0 ? '+' : ''}
                    {change?.toFixed(1)}%
                </div>
            </div>
        </div>
    )
}