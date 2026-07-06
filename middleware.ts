import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!user && request.nextUrl.pathname.startsWith('/days')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Auth routes (redirect to dashboard if already logged in)
  // if (user && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/register')) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/days/:path*', '/auth/login', '/auth/register'],
}