import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    try {
        if (type === 'count') {
            const count = await getHouseholdCount();
            return NextResponse.json({ count });
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