import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type');
  try {
    if (type === 'latest') {
      const latest = await getLatest();
      return NextResponse.json({ latest });
    } else if (type === 'latest2') {
      const latest2 = await getLatest2();
      return NextResponse.json({ latest2 });
    } else {
      const result = await pool.query('SELECT * FROM smart_meter_data.daily_statistics');
      return NextResponse.json(result.rows);
    }
  } catch (err) {
    console.error('Database error:', err)
    return NextResponse.json({ message: 'Database query failed' }, { status: 500 })
  }
}

async function getLatest(): Promise<any | null> {
  const result = await pool.query(`
      SELECT *
      FROM smart_meter_data.daily_statistics
      ORDER BY date_key DESC
      LIMIT 1
  `)

  if (result.rows.length === 0) return null

  return result.rows[0]
}

async function getLatest2(): Promise<any | null> {
  const result = await pool.query(`
      SELECT *
      FROM smart_meter_data.daily_statistics
      ORDER BY date_key DESC
      LIMIT 2
  `)

  if (result.rows.length === 0) return null

  return result.rows
}