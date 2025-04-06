import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
      const searchParams = req.nextUrl.searchParams;
      const type = searchParams.get('type');
      if (type === 'latest') {
        const latest = await getLatest();
        return NextResponse.json({ latest });
      } else if (type === 'latest2') {
        const latest2 = await getLatest2();
        return NextResponse.json({ latest2 });
      } else if (type === 'time-series') {
        const timeSeries = await getTimeSeries();
        return NextResponse.json({ timeSeries });
      } else {
        const result = await pool.query('SELECT * FROM smart_meter_data.aggregate_consumption');
        return NextResponse.json(result.rows);
      }
  } catch (err) {
      console.error('Database error:', err);
      return NextResponse.json({ message: 'Database query failed' }, { status: 500 });
  }
}

async function getLatest(): Promise<any | null> {
  const result = await pool.query(`
      SELECT *
      FROM smart_meter_data.aggregate_consumption
      ORDER BY datetime DESC
      LIMIT 1
  `)

  if (result.rows.length === 0) return null

  return result.rows[0]
}

async function getLatest2(): Promise<any | null> {
  const result = await pool.query(`
      SELECT *
      FROM smart_meter_data.aggregate_consumption
      ORDER BY datetime DESC
      LIMIT 2
  `)

  if (result.rows.length === 0) return null

  return result.rows
}

async function getTimeSeries(): Promise<any | null> {
  const result = await pool.query(`
      SELECT TO_CHAR(datetime, 'HH12:MI AM') AS time_formatted, total_consumption_kwh, average_consumption_kwh
      FROM smart_meter_data.aggregate_consumption
      ORDER BY datetime DESC
      LIMIT 48
  `)

  if (result.rows.length === 0) return null

  return result.rows
}