import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type');
  try {
    if (type === 'peak') {
      const peak = await getLatestPeakDemand();
      return NextResponse.json({ peak });
    } else {
      const result = await pool.query('SELECT * FROM daily_statistics');
      return NextResponse.json(result.rows);
    }
  } catch (err) {
    console.error('Database error:', err)
    return NextResponse.json({ message: 'Database query failed' }, { status: 500 })
  }
}

async function getLatestPeakDemand(): Promise<number> {
  const result = await pool.query(`
    SELECT peak_demand_kwh
    FROM daily_statistics
    ORDER BY date_key DESC
    LIMIT 1
  `)
  return Number(result.rows[0].peak_demand_kwh);
}