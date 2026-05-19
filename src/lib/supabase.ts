import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize the Supabase client. 
// Note: It will fail gracefully if env vars are missing, we can handle UI warnings.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
