const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MANUS_BASE = "https://livespots.app/api/v1";
const MANUS_API_KEY = Deno.env.get("MANUS_API_KEY") ?? "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function apiDownResponse(error: string, limit: number, offset: number, upstreamStatus?: number) {
  return jsonResponse({
    data: [],
    meta: {
      total: 0,
      limit,
      offset,
      returned: 0,
    },
    error,
    apiDown: true,
    upstreamStatus: upstreamStatus ?? null,
  });
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<Response> {
  const headers: Record<string, string> = {};
  if (MANUS_API_KEY) headers["X-API-Key"] = MANUS_API_KEY;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers });
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

  let limit = 200;
  let offset = 0;

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint || !["venues", "events", "feed"].includes(endpoint)) {
      return jsonResponse(
        { error: "Invalid endpoint. Use ?endpoint=venues|events|feed" },
        400,
      );
    }

    // Unified feed endpoint — single fast call returning venues+events together
    if (endpoint === "feed") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      const radius = url.searchParams.get("radius") ?? "25";
      const state = url.searchParams.get("state");

      const params = new URLSearchParams();
      if (lat && lng) {
        params.set("lat", lat);
        params.set("lng", lng);
        params.set("radius", radius);
      } else if (state) {
        params.set("state", state);
      } else {
        params.set("state", "NC");
      }

      const feedUrl = `${MANUS_BASE}/feed?${params.toString()}`;
      console.log(`Proxying to: ${feedUrl}`);

      try {
        const res = await fetchWithRetry(feedUrl, 3, 2000);
        if (!res.ok) {
          const body = await res.text();
          const isHtml = body.trim().startsWith("<!") || body.trim().startsWith("<html");
          const errorMsg = isHtml
            ? `Manus API unavailable (status ${res.status})`
            : `Manus API error [${res.status}]: ${body.slice(0, 200)}`;
          console.error(errorMsg);
          return jsonResponse({ events: [], meta: {}, error: errorMsg, apiDown: true, upstreamStatus: res.status });
        }
        const data = await res.json();
        return jsonResponse(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return jsonResponse({ events: [], meta: {}, error: `Manus API unavailable: ${msg}`, apiDown: true, upstreamStatus: 502 });
      }
    }

    const rawLimit = Number.parseInt(url.searchParams.get("limit") || "200", 10);
    const rawOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
    limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 200;
    offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

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
      return apiDownResponse(errorMsg, limit, offset, res.status);
    }

    const data = await res.json();
    return jsonResponse(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Proxy error: ${msg}`);
    return apiDownResponse(`Manus API unavailable: ${msg}`, limit, offset, 502);
  }
});
