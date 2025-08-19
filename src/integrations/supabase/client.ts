// integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Public client for frontend use
const SUPABASE_URL = 'https://uzoxpldaqvetarzalbvw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b3hwbGRhcXZldGFyemFsYnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg2NTg0NSwiZXhwIjoyMDY5NDQxODQ1fQ.x6glc39ipzy6rqLMbcNCcrOw1SYaOrST4hWDxrXMxFg'; // Keep this safe but it's okay for frontend

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Optional: Admin client for server-side or Edge Function calls
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Never expose this in frontend

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
