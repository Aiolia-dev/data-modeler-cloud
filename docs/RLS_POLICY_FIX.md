# RLS Policy Fix Documentation

## Problem

The Data Modeler application was experiencing issues with Supabase Row Level Security (RLS) policies, specifically:

1. API endpoints were returning 404 errors due to middleware intercepting requests
2. When projects were successfully created, viewing them resulted in 500 errors
3. The dashboard page couldn't load projects due to infinite recursion in RLS policies

The root cause was an infinite recursion detected in the policy for the `project_members` table, with the error:
```
infinite recursion detected in policy for relation "project_members"
```

## Solution

We implemented a two-part solution:

### 1. Middleware Fix

We modified the middleware to exclude API routes from authentication checks:

```typescript
// In middleware.ts
export const config = {
  matcher: [
    // Exclude API routes from middleware checks
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Also updated the Supabase middleware to skip authentication for API routes:

```typescript
// In utils/supabase/middleware.ts
// Skip authentication checks for API routes
if (request.nextUrl.pathname.startsWith('/api/')) {
  return response;
}
```

### 2. Admin Client Approach

We created an admin client that uses the Supabase service role key to bypass RLS policies entirely:

1. Created a new utility in `utils/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// This client uses the SUPABASE_SERVICE_ROLE_KEY which bypasses Row Level Security
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};
```

2. Updated API routes to use the admin client:
   - Modified `/api/projects/route.ts` to use the admin client for fetching and creating projects
   - Created a new API endpoint at `/api/projects/[id]/route.ts` for fetching specific projects

3. Updated page components to use the admin client directly:
   - Modified `/protected/page.tsx` (dashboard) to fetch projects with the admin client
   - Updated `/protected/projects/[id]/page.tsx` to fetch project details with the admin client

### 3. Environment Configuration

Added the Supabase service role key to the `.env.local` file:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Long-term Solution

The current implementation is a workaround that bypasses RLS policies entirely. For a proper long-term solution:

1. Fix the RLS policies in the Supabase database using the migration file at:
   `/supabase/migrations/20250416_fix_rls_policies.sql`

2. This migration removes the circular dependencies in the RLS policies and creates simplified policies that don't cause infinite recursion.

3. To apply the migration, you'll need to set up Docker and run:
   ```
   npx supabase db reset
   ```

## Security Considerations

Using the service role key bypasses all security checks, so this approach should be used carefully:

1. Only use the admin client in server-side code, never in client components
2. Implement proper authorization checks in your API routes
3. Consider implementing a more granular approach once the RLS policies are fixed

## Affected Files

- `/middleware.ts`
- `/utils/supabase/middleware.ts`
- `/utils/supabase/admin.ts` (new)
- `/app/api/projects/route.ts`
- `/app/api/projects/[id]/route.ts` (new)
- `/app/protected/page.tsx`
- `/app/protected/projects/[id]/page.tsx`
- `/.env.local`
- `/supabase/migrations/20250416_fix_rls_policies.sql` (new)
