const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MANUS_BASE =
  "https://3000-i8bb5c6f1m8ce28uzrjdj-752a79f9.us2.manus.computer/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint || !["venues", "events"].includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint. Use ?endpoint=venues or ?endpoint=events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 200);
    const offset = url.searchParams.get("offset") || "0";

    const manusUrl = `${MANUS_BASE}/${endpoint}?limit=${limit}&offset=${offset}`;
    console.log(`Proxying to: ${manusUrl}`);

    const res = await fetch(manusUrl);

    if (!res.ok) {
      const body = await res.text();
      console.error(`Manus API error: ${res.status} - ${body}`);
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
    console.error(`Proxy error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
