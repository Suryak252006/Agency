function requiredEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey = requiredEnv(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export { supabaseUrl, supabasePublishableKey };
