import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM daily_statistics')
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('Database error:', err)
    return NextResponse.json({ message: 'Database query failed' }, { status: 500 })
  }
}