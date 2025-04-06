import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    try {
        if (type === 'consumption-by-acorn') {
            const consumptionByAcorn = await getConsumptionByAcorn();
            return NextResponse.json({ consumptionByAcorn });
        } else if (type === 'latest-anomaly') {
            const latestAnomaly = await getLatestAnomalyHouseholds();
            return NextResponse.json({ latestAnomaly });
        } else if (type === 'household-snapshot') {
            const householdSnapshot = await getHouseholdSnapshot();
            return NextResponse.json({ householdSnapshot });
        } else {
            const result = await pool.query('SELECT * FROM smart_meter_data.household_readings');
            return NextResponse.json(result.rows);
        }
    } catch (err) {
        console.error('Database error:', err);
        return NextResponse.json({ message: 'Database query failed' }, { status: 500 });
    }
}

async function getConsumptionByAcorn(): Promise<any | null> {
    const result = await pool.query(`
        SELECT acorn_group, avg(consumption_kwh)
        FROM smart_meter_data.household_readings
        GROUP BY acorn_group
    `)

    if (result.rows.length === 0) return null

    return result.rows
}

async function getLatestAnomalyHouseholds(): Promise<any | null> {
    const result = await pool.query(`
        SELECT * FROM smart_meter_data.household_readings
        WHERE is_anomaly = true AND datetime = (
            SELECT datetime FROM smart_meter_data.household_readings
            WHERE is_anomaly = true
            ORDER BY datetime DESC
            LIMIT 1	
        )
    `)

    if (result.rows.length === 0) return null

    return result.rows
}

async function getHouseholdSnapshot(): Promise<any | null> {
    const result = await pool.query(`
        SELECT * FROM smart_meter_data.household_readings
        ORDER BY consumption_kwh DESC
        LIMIT 10
    `)

    if (result.rows.length === 0) return null

    return result.rows
}