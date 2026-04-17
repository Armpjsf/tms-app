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
  
  if (pathname.includes('analytics')) {
    return NextResponse.next()
  }

  // Protect /mobile/* routes (except /mobile/login) — require driver_session cookie
  if (pathname.startsWith('/mobile') && !pathname.startsWith('/mobile/login')) {
    const driverSession = request.cookies.get('driver_session')
    
    if (!driverSession) {
      const loginUrl = new URL('/mobile/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect Admin/Dashboard routes
  const isApiRoute = pathname.startsWith('/api')
  const isLoginPage = pathname.startsWith('/login')
  const isPublicTrack = pathname.startsWith('/track')
  const isPublicInvoice = pathname.startsWith('/public/invoice')
  const isMobile = pathname.startsWith('/mobile')
  const isStaticFile = pathname.includes('.') // Simple check for assets

  // Only update Supabase session for login or public routes if needed, 
  // but for main app we rely on our custom session to avoid excessive network calls
  let response = NextResponse.next()
  
  if (isLoginPage || isApiRoute || isPublicInvoice) {
    response = await updateSession(request)
  }

  if (!isApiRoute && !isMobile && !isLoginPage && !isPublicTrack && !isPublicInvoice && !isStaticFile && pathname !== '/' && !pathname.includes('analytics')) {
    const sessionCookie = request.cookies.get('session')
    const driverSession = request.cookies.get('driver_session')

    if (!sessionCookie) {
      // Mobile detection for redirection
      const userAgent = request.headers.get('user-agent') || ''
      const isDeviceMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      
      if (isDeviceMobile && !pathname.startsWith('/mobile/login')) {
        if (driverSession) {
          return NextResponse.redirect(new URL('/mobile/jobs', request.url))
        }

        const searchParams = request.nextUrl.searchParams
        if (searchParams.get('type') !== 'staff') {
          return NextResponse.redirect(new URL('/mobile/login', request.url))
        }
      }

      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Role-based Access Control (RBAC) via Local JWT Decryption (FAST)
    const payload = await decrypt(sessionCookie.value)
    
    if (!payload) {
      const loginUrl = new URL('/login?error=session_invalid', request.url)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.delete('session')
      return redirectResponse
    }

    const roleId = Number(payload.roleId)
    const restrictions = [
      { path: '/settings', allowed: [1, 2] },
      { path: '/admin', allowed: [1, 2] },
      { path: '/billing', allowed: [1, 2, 4] },
      { path: '/reports', allowed: [1, 2, 4] },
    ]

    for (const rule of restrictions) {
      if (pathname.startsWith(rule.path)) {
        if (rule.path === '/billing' && pathname.startsWith('/billing/customer') && payload.customerId) {
            continue;
        }
        
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
