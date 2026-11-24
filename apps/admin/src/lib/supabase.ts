import { createClient } from '@supabase/supabase-js'

// L'URL et la clé publishable du projet sont publiques par conception.
// Le fallback garantit le fonctionnement des déploiements Cloudflare Pages
// même si leurs variables VITE_* ne sont pas configurées.
// Ne jamais remplacer cette clé par une clé secret/service_role.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://pveodrhzvstvoywaytul.supabase.co'
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_gVS57hqkMhk_ytf56KM-bA_j3BI2k0e'

export const isSupabaseConfigured = Boolean(url && anon)
export const supabase = isSupabaseConfigured ? createClient(url, anon) : null
