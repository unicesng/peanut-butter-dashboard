import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type');
  try {
    if (type === 'appliance-consumption') {
      const applianceConsumption = await getApplianceConsumption();
      return NextResponse.json({ applianceConsumption });
    } else {
      const result = await pool.query('SELECT * FROM smart_meter_data.aggregate_appliance_consumption')
      return NextResponse.json(result.rows)
    }
  } catch (err) {
    console.error('Database error:', err)
    return NextResponse.json({ message: 'Database query failed' }, { status: 500 })
  }
}

async function getApplianceConsumption(): Promise<any | null> {
  const result = await pool.query(`
      SELECT appliance_type, SUM(consumption_kwh) from smart_meter_data.aggregate_appliance_consumption
      GROUP BY appliance_type
      HAVING appliance_type != 'Solar Production'
  `)

  if (result.rows.length === 0) return null

  return result.rows
}