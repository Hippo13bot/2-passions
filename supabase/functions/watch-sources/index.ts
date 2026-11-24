import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function cleanText(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}
function textOf(parent: Element, tag: string) {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
}
function safeFeedUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:") throw new Error("Le flux doit utiliser HTTPS.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" ||
      host === "::1" || /^127\./.test(host) || /^10\./.test(host) ||
      /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error("Adresse de flux non autorisée.");
  }
  return u;
}
function extractItems(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (!doc || doc.querySelector("parsererror")) throw new Error("Flux XML illisible.");
  const rss = Array.from(doc.getElementsByTagName("item"));
  const atom = Array.from(doc.getElementsByTagName("entry"));
  return [...rss, ...atom].slice(0, 40).map((node) => {
    const atomLink = node.getElementsByTagName("link")[0];
    const link = textOf(node, "link") || atomLink?.getAttribute("href") || "";
    const title = cleanText(textOf(node, "title"));
    const raw = textOf(node, "description") || textOf(node, "summary") ||
      textOf(node, "content:encoded") || textOf(node, "content");
    const content = cleanText(raw).slice(0, 12000);
    const published = textOf(node, "pubDate") || textOf(node, "published") || textOf(node, "updated");
    const guid = textOf(node, "guid") || textOf(node, "id") || link || title;
    return { title, link, content, published, guid };
  }).filter((item) => item.title);
}
function summaryOf(content: string, title: string) {
  if (!content) return "Aucun résumé fourni par le flux. Ouvrir l'article pour le consulter.";
  const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.length > 35);
  const summary = sentences.slice(0, 3).join(" ").slice(0, 650);
  return summary || content.slice(0, 450) || title;
}
async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Authentification requise." }, { status: 401, headers: cors });
  const db = createClient(url, serviceKey);
  if (token !== serviceKey) {
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData.user) return Response.json({ error: "Session invalide." }, { status: 401, headers: cors });
    const { data: profile } = await db.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (!profile || !["administrator", "editor"].includes(profile.role)) {
      return Response.json({ error: "Droits insuffisants." }, { status: 403, headers: cors });
    }
  }
  let payload: { force?: boolean } = {};
  try { payload = await req.json(); } catch { /* empty body is valid */ }
  const { data: feeds, error } = await db.from("watch_sources").select("*").eq("enabled", true).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors });
  const results: Array<Record<string, unknown>> = [];
  for (const feed of feeds || []) {
    const last = feed.last_checked_at ? new Date(feed.last_checked_at).getTime() : 0;
    const interval = Math.max(15, Number(feed.check_interval_minutes) || 30) * 60000;
    if (!payload.force && Date.now() - last < interval) continue;
    try {
      const feedUrl = safeFeedUrl(feed.feed_url);
      const response = await fetch(feedUrl, { headers: { "User-Agent": "2PASSIONS-DocumentaryMonitor/1.0", "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(12000), redirect: "error" });
      if (!response.ok) throw new Error(`Flux inaccessible (HTTP ${response.status}).`);
      const xml = await response.text();
      if (xml.length > 1800000) throw new Error("Flux trop volumineux (limite 1,8 Mo).");
      const items = extractItems(xml);
      let inserted = 0;
      for (const item of items) {
        const guid = await fingerprint(item.guid || item.link || item.title);
        const publishedAt = item.published && !Number.isNaN(Date.parse(item.published)) ? new Date(item.published).toISOString() : null;
        const { data: existing } = await db.from("watch_items").select("id").eq("watch_source_id", feed.id).eq("guid", guid).maybeSingle();
        if (existing) continue;
        const { error: insertError } = await db.from("watch_items").insert({
          watch_source_id: feed.id, guid, item_url: item.link || null, title: item.title,
          published_at: publishedAt, excerpt: item.content.slice(0, 1400), content_text: item.content,
          summary: summaryOf(item.content, item.title), status: "pending"
        });
        if (!insertError) inserted++;
      }
      await db.from("watch_sources").update({ last_checked_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", feed.id);
      results.push({ source: feed.name, detected: inserted, read: items.length, status: "ok" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      await db.from("watch_sources").update({ last_checked_at: new Date().toISOString(), last_error: message, updated_at: new Date().toISOString() }).eq("id", feed.id);
      results.push({ source: feed.name, status: "error", error: message });
    }
  }
  return Response.json({ processed: results.length, results }, { headers: cors });
});
