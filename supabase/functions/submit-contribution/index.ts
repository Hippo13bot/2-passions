import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('PUBLIC_SITE_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body), { status, headers:corsHeaders })

Deno.serve(async (req:Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers:corsHeaders })
  if (req.method !== 'POST') return json(405, { error:'method_not_allowed' })
  const origin = req.headers.get('origin')
  const allowedOrigin = Deno.env.get('PUBLIC_SITE_ORIGIN')
  if (allowedOrigin && origin && origin !== allowedOrigin) return json(403, { error:'origin_not_allowed' })
  try {
    const body = await req.json()
    const { contribution_type, message, source_url, contact_email, public_anonymous, turnstileToken, website } = body
    if (typeof website === 'string' && website.trim()) return json(200, { ok:true })
    if (typeof contribution_type !== 'string' || contribution_type.length > 60) return json(400, { error:'invalid_type' })
    if (typeof message !== 'string' || message.trim().length < 30 || message.length > 10000) return json(400, { error:'invalid_message' })
    if (source_url && (typeof source_url !== 'string' || !/^https?:\/\//i.test(source_url))) return json(400, { error:'invalid_source_url' })
    if (contact_email && (typeof contact_email !== 'string' || contact_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))) return json(400, { error:'invalid_email' })
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!secret || typeof turnstileToken !== 'string' || !turnstileToken) return json(503, { error:'anti_bot_not_configured' })
    const verifyBody = new URLSearchParams({ secret, response:turnstileToken })
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    if (ip) verifyBody.set('remoteip', ip)
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:verifyBody
    })
    if (!verification.ok) return json(502, { error:'anti_bot_verification_unavailable' })
    const result = await verification.json()
    if (!result.success) return json(403, { error:'anti_bot_verification_failed' })
    const projectUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!projectUrl || !serviceKey) return json(503, { error:'server_not_configured' })
    const admin = createClient(projectUrl, serviceKey, { auth:{ persistSession:false, autoRefreshToken:false } })
    const { error } = await admin.from('contributions').insert({
      contribution_type: contribution_type.trim(),
      message: message.trim(),
      source_url: source_url || null,
      contact_email: contact_email || null,
      public_anonymous: public_anonymous !== false,
      status:'pending', reviewed_by:null, reviewed_at:null
    })
    if (error) { console.error('Contribution insert failed', error.message); return json(500, { error:'submission_failed' }) }
    return json(200, { ok:true })
  } catch (error) {
    console.error('Contribution handler error', error)
    return json(400, { error:'invalid_request' })
  }
})