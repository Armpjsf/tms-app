import { getAllBranches } from '@/lib/supabase/branches'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const branches = await getAllBranches()
    return NextResponse.json({ branches })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
