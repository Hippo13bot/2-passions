import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const allowedRoles = ["administrator", "editor", "fact_checker", "moderator"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Authentification requise." }, { status: 401, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ error: "Session invalide." }, { status: 401, headers: cors });
  const admin = createClient(url, serviceKey);
  const { data: actor } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (actor?.role !== "administrator") return Response.json({ error: "Seul un administrateur peut gérer l'équipe." }, { status: 403, headers: cors });
  let body: { action?: string; email?: string; role?: string; display_name?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Requête invalide." }, { status: 400, headers: cors }); }
  if (body.action === "list") {
    const { data: profiles, error: profilesError } = await admin.from("profiles").select("*").order("created_at", { ascending: true });
    if (profilesError) return Response.json({ error: profilesError.message }, { status: 500, headers: cors });
    const usersById = new Map<string, string>();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
      if (error) return Response.json({ error: "Lecture des comptes impossible." }, { status: 502, headers: cors });
      for (const user of data.users) if (user.email) usersById.set(user.id, user.email);
      if (data.users.length < 500) break;
    }
    return Response.json({ members: (profiles || []).map((profile) => ({ ...profile, email: usersById.get(profile.id) || null })) }, { headers: cors });
  }
  const email = (body.email || "").trim().toLowerCase();
  const role = body.role || "editor";
  if (!email || !email.includes("@") || !allowedRoles.includes(role)) {
    return Response.json({ error: "Adresse e-mail ou rôle invalide." }, { status: 400, headers: cors });
  }
  let found = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) return Response.json({ error: "Recherche de compte impossible." }, { status: 502, headers: cors });
    found = data.users.find((u) => (u.email || "").toLowerCase() === email) || null;
    if (found || data.users.length < 500) break;
  }
  if (!found) return Response.json({ error: "Aucun compte Supabase Auth trouvé pour cette adresse. La personne doit d'abord créer son compte et se connecter une première fois." }, { status: 404, headers: cors });
  if (found.id === userData.user.id && role !== "administrator") {
    return Response.json({ error: "Vous ne pouvez pas retirer votre propre rôle administrateur." }, { status: 400, headers: cors });
  }
  const { error: profileError } = await admin.from("profiles").upsert({
    id: found.id, role, display_name: body.display_name?.trim() || found.user_metadata?.full_name || found.email?.split("@")[0] || null
  }, { onConflict: "id" });
  if (profileError) return Response.json({ error: profileError.message }, { status: 500, headers: cors });
  await admin.from("audit_log").insert({
    actor_id: userData.user.id, action: "team_upsert", table_name: "profiles", record_id: found.id,
    details: { assigned_role: role, target_email: email }
  });
  return Response.json({ success: true, email, role, user_id: found.id }, { headers: cors });
});
