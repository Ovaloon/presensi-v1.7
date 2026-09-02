import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WhatsAppRequest {
  target: string;
  message: string;
  schoolId?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const fonnteToken = Deno.env.get("FONNTE_TOKEN");
  if (!supabaseUrl || !supabaseAnonKey || !fonnteToken) {
    return json({ error: "Server belum dikonfigurasi" }, 500);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let payload: WhatsAppRequest;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "JSON tidak valid" }, 400);
  }

  const target = String(payload.target || "").replace(/\D/g, "");
  const message = String(payload.message || "").trim();
  if (!target || !message || message.length > 4096) {
    return json({ error: "Target dan message wajib diisi" }, 400);
  }

  const fonnteResponse = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: fonnteToken, "Content-Type": "application/json" },
    body: JSON.stringify({ target, message }),
  });
  const result = await fonnteResponse.json().catch(() => ({}));
  if (!fonnteResponse.ok) return json({ error: result?.reason || "Pengiriman WhatsApp gagal" }, 502);

  return json({ success: true, provider: "fonnte", result });
});
