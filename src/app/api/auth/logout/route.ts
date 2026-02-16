import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  
  // Return a redirection response
  return NextResponse.redirect(new URL('/login', request.url))
}

export async function GET(request: NextRequest) {
  // Support GET for direct navigation
  const cookieStore = await cookies()
  cookieStore.delete('session')
  
  return NextResponse.redirect(new URL('/login', request.url))
}
