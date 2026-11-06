import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'cihaz-takip-gizli-anahtar-super-secret'
const encodedKey = new TextEncoder().encode(secretKey)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicPath = path === '/login'

  // Serve static files and next internals
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get('session')?.value

  let isValidSession = false
  if (session) {
    try {
      await jwtVerify(session, encodedKey, { algorithms: ['HS256'] })
      isValidSession = true
    } catch (error) {
      isValidSession = false
    }
  }

  if (!isPublicPath && !isValidSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublicPath && isValidSession) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
