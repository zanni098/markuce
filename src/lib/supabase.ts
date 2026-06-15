import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl  = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/[^ -~]/g, '').trim()
const supabaseAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').replace(/[^ -~]/g, '').trim()

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    '[Markuce] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your Supabase project values.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
})
