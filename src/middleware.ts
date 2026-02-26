import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'default_secret_key_change_me_in_production'
const encodedKey = new TextEncoder().encode(secretKey)

async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /mobile/* routes (except /mobile/login) — require driver_session cookie
  if (pathname.startsWith('/mobile') && !pathname.startsWith('/mobile/login')) {
    const driverSession = request.cookies.get('driver_session')
    
    if (!driverSession) {
      const loginUrl = new URL('/mobile/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // For all other routes, update the Supabase session
  const response = await updateSession(request)

  // Protect Admin/Dashboard routes (all routes except /mobile, /login, /track, and public assets)
  const isLoginPage = pathname.startsWith('/login')
  const isPublicTrack = pathname.startsWith('/track')
  const isMobile = pathname.startsWith('/mobile')
  
  if (!isMobile && !isLoginPage && !isPublicTrack && pathname !== '/favicon.ico') {
    const sessionCookie = request.cookies.get('session')

    if (!sessionCookie) {
      console.log(`Middleware: No session cookie for ${pathname}, redirecting to /login`)
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Role-based Access Control (RBAC)
    const payload = await decrypt(sessionCookie.value)
    
    if (!payload) {
      console.log(`Middleware: Invalid session for ${pathname}, redirecting to /login`)
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('session')
      return response
    }

    // RBAC logic...
    const roleId = Number(payload.roleId)
    const restrictions = [
      { path: '/settings', allowed: [1, 2] },
      { path: '/admin', allowed: [1, 2] },
      { path: '/billing', allowed: [1, 2, 4] },
      { path: '/reports', allowed: [1, 2, 4] },
    ]

    for (const rule of restrictions) {
      if (pathname.startsWith(rule.path)) {
        if (!rule.allowed.includes(roleId)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|track|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
