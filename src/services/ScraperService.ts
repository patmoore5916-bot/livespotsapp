const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL;
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
