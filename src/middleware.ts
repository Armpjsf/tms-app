import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /mobile/* routes (except /mobile/login)
  if (pathname.startsWith('/mobile') && !pathname.startsWith('/mobile/login')) {
    const driverSession = request.cookies.get('driver_session')
    
    if (!driverSession) {
      // Redirect to mobile login page
      const loginUrl = new URL('/mobile/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/mobile/:path*'],
}
