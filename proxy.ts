import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Routes anyone can hit without signing in.
 * `(auth)` and `(app)` are only folder groups — URLs are still /sign-in, /dashboard, etc.
 */
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/', // landing; tighten later if the whole site should require auth
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
