import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScrapedVenue {
  name: string;
  type?: string;
  neighborhood?: string;
  city: string;
  lat: number;
  lng: number;
}

interface ScrapedShow {
  external_id: string;
  venue_name: string;
  venue_city: string;
  artist: string;
  genre?: string;
  doors_at?: string;
  start_time?: string;
  status?: string;
  ticket_url?: string;
}

interface ScraperResponse {
  venues: ScrapedVenue[];
  shows: ScrapedShow[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const scraperApiUrl = Deno.env.get("SCRAPER_API_URL");
  const scraperApiKey = Deno.env.get("SCRAPER_API_KEY");

  if (!scraperApiUrl) {
    return new Response(
      JSON.stringify({ error: "SCRAPER_API_URL not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify caller
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  // Admin client for writes
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Check operator role
  const { data: hasRole } = await adminClient.rpc("has_role", {
    _user_id: userId,
    _role: "operator",
  });
  if (!hasRole) {
    return new Response(JSON.stringify({ error: "Forbidden: operator role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create sync log
  const { data: syncLog, error: logError } = await adminClient
    .from("sync_logs")
    .insert({ triggered_by: userId, status: "running" })
    .select("id")
    .single();

  if (logError) {
    return new Response(JSON.stringify({ error: "Failed to create sync log" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Call scraper API
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (scraperApiKey) {
      fetchHeaders["Authorization"] = `Bearer ${scraperApiKey}`;
    }

    const scraperRes = await fetch(scraperApiUrl, { headers: fetchHeaders });
    if (!scraperRes.ok) {
      const body = await scraperRes.text();
      throw new Error(`Scraper API returned ${scraperRes.status}: ${body}`);
    }

    const scraperData: ScraperResponse = await scraperRes.json();
    const { venues: scraperVenues, shows: scraperShows } = scraperData;

    // Upsert venues by name+city
    let venuesUpserted = 0;
    const venueMap = new Map<string, string>(); // "name|city" -> uuid

    for (const v of scraperVenues) {
      const key = `${v.name}|${v.city}`;
      // Check existing
      const { data: existing } = await adminClient
        .from("venues")
        .select("id")
        .eq("name", v.name)
        .eq("city", v.city)
        .maybeSingle();

      if (existing) {
        // Update
        await adminClient
          .from("venues")
          .update({
            type: v.type ?? "venue",
            neighborhood: v.neighborhood ?? "",
            lat: v.lat,
            lng: v.lng,
          })
          .eq("id", existing.id);
        venueMap.set(key, existing.id);
      } else {
        // Insert
        const { data: inserted } = await adminClient
          .from("venues")
          .insert({
            name: v.name,
            city: v.city,
            type: (v.type as any) ?? "venue",
            neighborhood: v.neighborhood ?? "",
            lat: v.lat,
            lng: v.lng,
          })
          .select("id")
          .single();
        if (inserted) venueMap.set(key, inserted.id);
      }
      venuesUpserted++;
    }

    // Upsert shows — match by artist+venue+start_time as pseudo external_id
    let eventsUpserted = 0;
    for (const s of scraperShows) {
      const venueKey = `${s.venue_name}|${s.venue_city}`;
      const venueId = venueMap.get(venueKey);
      if (!venueId) continue;

      // Check for existing event by artist + venue
      const { data: existing } = await adminClient
        .from("events")
        .select("id")
        .eq("venue_id", venueId)
        .eq("artist", s.artist)
        .eq("start_time", s.start_time ?? "")
        .maybeSingle();

      const eventData = {
        venue_id: venueId,
        artist: s.artist,
        genre: s.genre ?? "",
        doors_at: s.doors_at ?? "",
        start_time: s.start_time ?? "",
        status: (s.status as any) ?? "today",
        ticket_url: s.ticket_url ?? null,
      };

      if (existing) {
        await adminClient.from("events").update(eventData).eq("id", existing.id);
      } else {
        await adminClient.from("events").insert(eventData);
      }
      eventsUpserted++;
    }

    // Update sync log
    await adminClient
      .from("sync_logs")
      .update({
        status: "success",
        venues_upserted: venuesUpserted,
        events_upserted: eventsUpserted,
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    return new Response(
      JSON.stringify({ venuesUpserted, eventsUpserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await adminClient
      .from("sync_logs")
      .update({
        status: "error",
        error_message: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
