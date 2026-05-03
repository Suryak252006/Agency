'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublishableKey, supabaseUrl } from './config';

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
