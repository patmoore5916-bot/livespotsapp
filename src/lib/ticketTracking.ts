import { supabase } from "@/integrations/supabase/client";

/**
 * Append affiliate/referral params to a ticket URL.
 * Currently adds utm_source=livespots & utm_medium=referral.
 * Extend this as affiliate programs are added.
 */
export function affiliateUrl(originalUrl: string): string {
  try {
    const url = new URL(originalUrl);
    url.searchParams.set("utm_source", "livespots");
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    // If URL is malformed, return as-is
    return originalUrl;
  }
}

/**
 * Log an outbound ticket click (fire-and-forget).
 */
export function logTicketClick(params: {
  eventId: string;
  venueId: string;
  artist: string;
  originalUrl: string;
}) {
  // Get current user if logged in (non-blocking)
  supabase.auth.getSession().then(({ data }) => {
    const userId = data.session?.user?.id ?? null;

    supabase
      .from("ticket_clicks")
      .insert({
        event_id: params.eventId,
        venue_id: params.venueId,
        artist: params.artist,
        original_url: params.originalUrl,
        user_id: userId,
        referrer: window.location.pathname,
      })
      .then(({ error }) => {
        if (error) console.warn("ticket click log failed:", error.message);
      });
  });
}

/**
 * Track and open a ticket link in a new tab.
 */
export function trackAndOpenTicket(params: {
  eventId: string;
  venueId: string;
  artist: string;
  ticketUrl: string;
}) {
  logTicketClick({
    eventId: params.eventId,
    venueId: params.venueId,
    artist: params.artist,
    originalUrl: params.ticketUrl,
  });

  window.open(affiliateUrl(params.ticketUrl), "_blank", "noopener,noreferrer");
}
