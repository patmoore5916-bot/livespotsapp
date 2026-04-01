const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MANUS_BASE =
  "https://3000-i8bb5c6f1m8ce28uzrjdj-752a79f9.us2.manus.computer/api/v1";

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || i === retries - 1) return res;
      // Only retry on 502/503/504
      if (![502, 503, 504].includes(res.status)) return res;
      console.log(`Retry ${i + 1}/${retries} after ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retry ${i + 1}/${retries} after error: ${err}`);
    }
    await new Promise(r => setTimeout(r, delayMs * (i + 1)));
  }
  throw new Error("Exhausted retries");
}

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

    const res = await fetchWithRetry(manusUrl, 3, 2000);

    if (!res.ok) {
      const body = await res.text();
      const isHtml = body.trim().startsWith("<!") || body.trim().startsWith("<html");
      const errorMsg = isHtml
        ? `Manus API unavailable (status ${res.status})`
        : `Manus API error [${res.status}]: ${body.slice(0, 200)}`;
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg, apiDown: true }),
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
      JSON.stringify({ error: msg, apiDown: true }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
