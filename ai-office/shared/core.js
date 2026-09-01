import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cfg = window.AI_OFFICE_CONFIG;
export const db = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
  auth: { persistSession: true, detectSessionInUrl: false, autoRefreshToken: true }
});
export const $ = id => document.getElementById(id);
export const clean = value => value == null ? "" : String(value).trim();
export const escapeHtml = value => clean(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
export const normalizeSpeech = value => clean(value).toLowerCase().replace(/(보여\s*줘|열어\s*줘|재생해\s*줘|해\s*줘)/g, "").replace(/[\s.,!?~]/g, "");
export const sessionCode = () => String(Math.floor(100000 + Math.random() * 900000));
export const sessionKey = code => `${cfg.channelPrefix}:${clean(code)}`;
export const isSafeHttpUrl = value => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } };
export const youtubeId = value => {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
  } catch {}
  return "";
};
export async function requireSession(redirect = "../") {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.replace(redirect); return null; }
  return session;
}
export async function loadCatalog() {
  const [{ data: menus, error: menuError }, { data: contents, error: contentError }] = await Promise.all([
    db.from("ai_office_menus").select("*").eq("is_visible", true).order("sort_order").order("title"),
    db.from("ai_office_contents").select("*").eq("is_visible", true).order("sort_order").order("title")
  ]);
  if (menuError) throw menuError;
  if (contentError) throw contentError;
  return { menus: menus || [], contents: contents || [] };
}
export function commandPayload(content, source = "touch") {
  return { id: crypto.randomUUID(), type: "SHOW_CONTENT", contentId: content.id, source, sentAt: new Date().toISOString() };
}
export function createPresentationChannel(code, role, handlers = {}) {
  const channel = db.channel(sessionKey(code), { config: { presence: { key: role + "-" + crypto.randomUUID() } } });
  if (handlers.command) channel.on("broadcast", { event: "command" }, ({ payload }) => handlers.command(payload));
  if (handlers.ack) channel.on("broadcast", { event: "ack" }, ({ payload }) => handlers.ack(payload));
  channel.on("presence", { event: "sync" }, () => handlers.presence?.(channel.presenceState()));
  channel.subscribe(async status => {
    handlers.status?.(status);
    if (status === "SUBSCRIBED") await channel.track({ role, onlineAt: new Date().toISOString() });
  });
  return channel;
}
export function presenceHasRole(state, role) {
  return Object.values(state || {}).flat().some(item => item.role === role);
}
export async function sendBroadcast(channel, event, payload) {
  return channel.send({ type: "broadcast", event, payload });
}
