import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    try {
        if (type === 'count') {
            const count = await getHouseholdCount();
            return NextResponse.json({ count });
        } else if (type === 'anomaly') {
            const anomalyCount = await getAnomalyCount();
            return NextResponse.json({ anomalyCount });
        } else if (type === 'avg') {
            const avg = await getAverageConsumption();
            return NextResponse.json({ average: avg })
        } else {
            const result = await pool.query('SELECT * FROM household_readings');
            return NextResponse.json(result.rows);
        }
    } catch (err) {
        console.error('Database error:', err);
        return NextResponse.json({ message: 'Database query failed' }, { status: 500 });
    }
}

async function getHouseholdCount(): Promise<number> {
    const result = await pool.query(`
        SELECT COUNT(DISTINCT household_id) AS count
        FROM household_readings
    `);
    return Number(result.rows[0].count);
}

async function getAnomalyCount(): Promise<number> {
    const result = await pool.query(`
        SELECT COUNT(*) AS count
        FROM household_readings
        WHERE is_anomaly = TRUE
    `);
    return Number(result.rows[0].count);
}

async function getAverageConsumption(): Promise<number> {
    const result = await pool.query(`
        SELECT AVG(consumption_kwh) AS avg
        FROM household_readings
    `)
    return Number(result.rows[0].avg);
}