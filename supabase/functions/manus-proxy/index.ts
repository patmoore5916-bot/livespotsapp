import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MANUS_BASE =
  "https://3000-i8bb5c6f1m8ce28uzrjdj-752a79f9.us2.manus.computer/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Expect ?endpoint=venues or ?endpoint=events plus optional limit/offset
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint || !["venues", "events"].includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint. Use ?endpoint=venues or ?endpoint=events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = url.searchParams.get("limit") || "500";
    const offset = url.searchParams.get("offset") || "0";

    const manusUrl = `${MANUS_BASE}/${endpoint}?limit=${limit}&offset=${offset}`;
    const res = await fetch(manusUrl);

    if (!res.ok) {
      const body = await res.text();
      return new Response(
        JSON.stringify({ error: `Manus API error [${res.status}]: ${body}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
