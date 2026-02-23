import { env } from './env';

const supabaseKey = env.supabaseServiceRoleKey || env.supabaseAnonKey;
// Keep runtime dependency on Supabase SDK while allowing offline typecheck in restricted envs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createClient } = require('@supabase/supabase-js');

if (!env.supabaseUrl || !supabaseKey) {
  throw new Error('Supabase configuration is missing. Check SUPABASE_URL and API keys.');
}

export const supabase = createClient(env.supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});
