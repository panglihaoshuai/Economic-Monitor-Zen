import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Re-export Database types for convenience
export type { Database };

// Create clients - use type assertion to work around @supabase/supabase-js v2 type issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// The generic typing in @supabase/supabase-js v2.39+ has issues with TypeScript
// So we create clients without generic and use explicit types in queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Export table row types for explicit casting when needed
export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserIndicatorRow = Database['public']['Tables']['user_indicators']['Row'];
export type EconomicDataRow = Database['public']['Tables']['economic_data']['Row'];
export type AnomalyRow = Database['public']['Tables']['anomalies']['Row'];
