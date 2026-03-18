const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL;
const SCRAPER_API_KEY = import.meta.env.VITE_SCRAPER_API_KEY;

interface BackendEvent {
  venueId?: string;
  venueName: string;
  bandName: string;
  eventCategory?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  coverCharge?: number;
  isFree?: boolean;
  ticketUrl?: string;
  description?: string;
  imageUrl?: string;
  source?: string;
}

interface BackendVenue {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  venueType?: string;
  vibeTags?: string[];
  googleRating?: number;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  imageUrl?: string;
  source?: string;
}

interface ApiResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number; returned: number };
}

export interface ScrapedShow {
  artist: string;
  venue_name: string;
  genre?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  cover_charge?: number;
  is_free?: boolean;
  ticket_url?: string;
  description?: string;
  image_url?: string;
  source?: string;
}

export interface ScrapedVenue {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  venue_type?: string;
  vibe_tags?: string[];
  google_rating?: number;
  lat?: number;
  lng?: number;
  image_url?: string;
  source?: string;
}

const buildHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (SCRAPER_API_KEY) h["X-API-Key"] = SCRAPER_API_KEY;
  return h;
};

export const ScraperService = {
  async fetchShows(): Promise<ScrapedShow[]> {
    if (!SCRAPER_API_URL) throw new Error("VITE_SCRAPER_API_URL is not configured");
    const res = await fetch(SCRAPER_API_URL + "/api/v1/events?limit=200", {
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error("Events API error: " + res.status + " " + res.statusText);
    const response: ApiResponse<BackendEvent> = await res.json();
    return (response.data || []).map((e) => ({
      artist: e.bandName,
      venue_name: e.venueName,
      genre: e.eventCategory,
      date: e.eventDate,
      start_time: e.startTime,
      end_time: e.endTime,
      cover_charge: e.coverCharge,
      is_free: e.isFree,
      ticket_url: e.ticketUrl,
      description: e.description,
      image_url: e.imageUrl,
      source: e.source,
    }));
  },

  async fetchVenues(): Promise<ScrapedVenue[]> {
    if (!SCRAPER_API_URL) throw new Error("VITE_SCRAPER_API_URL is not configured");
    const res = await fetch(SCRAPER_API_URL + "/api/v1/venues?limit=200", {
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error("Venues API error: " + res.status + " " + res.statusText);
    const response: ApiResponse<BackendVenue> = await res.json();
    return (response.data || []).map((v) => ({
      name: v.name,
      address: v.address,
      city: v.city,
      state: v.state,
      zip: v.zip,
      phone: v.phone,
      website: v.website,
      venue_type: v.venueType,
      vibe_tags: v.vibeTags,
      google_rating: v.googleRating,
      lat: v.lat ?? v.latitude,
      lng: v.lng ?? v.longitude,
      image_url: v.imageUrl,
      source: v.source,
    }));
  },

  async syncViaEdgeFunction(supabaseClient: any) {
    const { data, error } = await supabaseClient.functions.invoke("sync-events");
    if (error) throw error;
    return data;
  },

  async healthCheck(): Promise<boolean> {
    if (!SCRAPER_API_URL) return false;
    try {
      const res = await fetch(SCRAPER_API_URL + "/api/v1/health");
      const json = await res.json();
      return json.status === "ok";
    } catch {
      return false;
    }
  },
};const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL;
const SCRAPER_API_KEY = import.meta.env.VITE_SCRAPER_API_KEY;

export interface ScrapedVenue {
  name: string;
  type?: string;
  neighborhood?: string;
  city: string;
  lat: number;
  lng: number;
}

export interface ScrapedShow {
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

export interface ScraperResponse {
  venues: ScrapedVenue[];
  shows: ScrapedShow[];
}

const headers = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (SCRAPER_API_KEY) h["Authorization"] = `Bearer ${SCRAPER_API_KEY}`;
  return h;
};

export const ScraperService = {
  async fetchShows(): Promise<ScrapedShow[]> {
    if (!SCRAPER_API_URL) throw new Error("VITE_SCRAPER_API_URL is not configured");
    const res = await fetch(`${SCRAPER_API_URL}`, { headers: headers() });
    if (!res.ok) throw new Error(`Scraper API error: ${res.status}`);
    const data: ScraperResponse = await res.json();
    return data.shows;
  },

  async fetchVenues(): Promise<ScrapedVenue[]> {
    if (!SCRAPER_API_URL) throw new Error("VITE_SCRAPER_API_URL is not configured");
    const res = await fetch(`${SCRAPER_API_URL}`, { headers: headers() });
    if (!res.ok) throw new Error(`Scraper API error: ${res.status}`);
    const data: ScraperResponse = await res.json();
    return data.venues;
  },

  /** Trigger sync via the edge function (preferred path) */
  async syncViaEdgeFunction(supabaseClient: any): Promise<{ venuesUpserted: number; eventsUpserted: number }> {
    const { data, error } = await supabaseClient.functions.invoke("sync-events");
    if (error) throw error;
    return data;
  },
};
