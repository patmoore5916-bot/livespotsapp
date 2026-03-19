/**
 * Computes venue "music profiles" from event frequency data.
 * Venues with recurring music events get promoted to hasMusic=true
 * and receive a musicScore (0-1) representing likelihood of live music.
 */
import { useMemo } from "react";
import type { Venue, Event } from "@/hooks/useVenuesAndEvents";

/** Minimum events for a non-music-typed venue to be promoted */
const PROMOTION_THRESHOLD = 2;

export interface VenueProfile {
  venueId: string;
  eventCount: number;
  /** 0–1 likelihood of live music at any given time */
  musicScore: number;
  /** Day-of-week distribution (0=Sun..6=Sat), values 0–1 */
  dayDistribution: number[];
}

function buildProfiles(events: Event[]): Map<string, VenueProfile> {
  const counts = new Map<string, { total: number; days: number[] }>();

  for (const e of events) {
    const vid = e.venue.id;
    if (!counts.has(vid)) counts.set(vid, { total: 0, days: new Array(7).fill(0) });
    const c = counts.get(vid)!;
    c.total++;
    const day = new Date(`${e.date}T00:00:00`).getDay();
    c.days[day]++;
  }

  const profiles = new Map<string, VenueProfile>();
  for (const [venueId, { total, days }] of counts) {
    const maxDay = Math.max(...days);
    const dayDistribution = maxDay > 0 ? days.map((d) => d / maxDay) : days;

    // Score: clamp event count into 0–1 range (1 event=0.2, 5+=1.0)
    const freqScore = Math.min(1, total / 5);

    profiles.set(venueId, {
      venueId,
      eventCount: total,
      musicScore: freqScore,
      dayDistribution,
    });
  }

  return profiles;
}

/**
 * Takes venues + events and returns enriched venues where bars with
 * recurring music events get promoted (hasMusic=true, musicScore boosted).
 */
export function useVenueProfiles(venues: Venue[], events: Event[]): Venue[] {
  return useMemo(() => {
    if (!events.length) return venues;

    const profiles = buildProfiles(events);

    return venues.map((v) => {
      const profile = profiles.get(v.id);
      if (!profile) return v;

      // If venue already typed as music, just boost score
      if (v.hasMusic) {
        return {
          ...v,
          musicScore: Math.max(v.musicScore, profile.musicScore),
        };
      }

      // Promote bar/brewery/club to music venue if enough events
      if (profile.eventCount >= PROMOTION_THRESHOLD) {
        return {
          ...v,
          hasMusic: true,
          musicScore: profile.musicScore,
        };
      }

      return v;
    });
  }, [venues, events]);
}
