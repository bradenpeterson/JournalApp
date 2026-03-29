/**
 * Clerk JWT template name used for Supabase Third Party Auth.
 * When you connect Supabase in the Clerk dashboard, Clerk creates this template (default: "supabase").
 * It must match the template you use in getToken({ template }).
 */
export const CLERK_SUPABASE_JWT_TEMPLATE = 'supabase' as const
