export type VenueType = "venue" | "bar" | "brewery" | "club";

export type Venue = {
  id: string;
  name: string;
  type: VenueType;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  distance: string;
};

export type Event = {
  id: string;
  venue: Venue;
  artist: string;
  genre: string;
  doorsAt: string;
  startTime: string;
  isLiveNow: boolean;
  ticketUrl?: string;
};

export const venues: Venue[] = [
  { id: "v1", name: "Cat's Cradle", type: "venue", neighborhood: "Carrboro", city: "Chapel Hill", lat: 35.91, lng: -79.07, distance: "0.8 mi" },
  { id: "v2", name: "Motorco Music Hall", type: "venue", neighborhood: "Downtown", city: "Durham", lat: 35.99, lng: -78.90, distance: "0.3 mi" },
  { id: "v3", name: "The Ritz", type: "club", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.2 mi" },
  { id: "v4", name: "Lincoln Theatre", type: "venue", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.1 mi" },
  { id: "v5", name: "The Pinhook", type: "bar", neighborhood: "Downtown", city: "Durham", lat: 35.99, lng: -78.90, distance: "0.2 mi" },
  { id: "v6", name: "Local 506", type: "bar", neighborhood: "East Franklin", city: "Chapel Hill", lat: 35.91, lng: -79.04, distance: "1.1 mi" },
  { id: "v7", name: "The Pour House", type: "bar", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.3 mi" },
  { id: "v8", name: "Haw River Ballroom", type: "venue", neighborhood: "Saxapahaw", city: "Saxapahaw", lat: 35.95, lng: -79.32, distance: "12.4 mi" },
  { id: "v9", name: "Boxcar Bar + Arcade", type: "bar", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.0 mi" },
  { id: "v10", name: "Ponysaurus Brewing", type: "brewery", neighborhood: "Central Park", city: "Durham", lat: 35.98, lng: -78.89, distance: "0.6 mi" },
  { id: "v11", name: "Trophy Brewing", type: "brewery", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.4 mi" },
];

export const events: Event[] = [
  { id: "e1", venue: venues[0], artist: "Wednesday", genre: "Indie Rock", doorsAt: "8:00 PM", startTime: "9:00 PM", isLiveNow: true, ticketUrl: "#" },
  { id: "e2", venue: venues[1], artist: "Khruangbin", genre: "Psych Funk", doorsAt: "7:00 PM", startTime: "8:30 PM", isLiveNow: true, ticketUrl: "#" },
  { id: "e3", venue: venues[2], artist: "Turnstile", genre: "Hardcore", doorsAt: "6:30 PM", startTime: "7:30 PM", isLiveNow: true, ticketUrl: "#" },
  { id: "e4", venue: venues[3], artist: "Japanese Breakfast", genre: "Indie Pop", doorsAt: "7:00 PM", startTime: "8:00 PM", isLiveNow: false, ticketUrl: "#" },
  { id: "e5", venue: venues[4], artist: "Mdou Moctar", genre: "Tuareg Blues", doorsAt: "9:00 PM", startTime: "10:00 PM", isLiveNow: false, ticketUrl: "#" },
  { id: "e6", venue: venues[5], artist: "MJ Lenderman", genre: "Alt Country", doorsAt: "8:30 PM", startTime: "9:30 PM", isLiveNow: true, ticketUrl: "#" },
  { id: "e7", venue: venues[6], artist: "Hiss Golden Messenger", genre: "Folk Rock", doorsAt: "7:30 PM", startTime: "8:30 PM", isLiveNow: false, ticketUrl: "#" },
  { id: "e8", venue: venues[7], artist: "Waxahatchee", genre: "Indie Folk", doorsAt: "7:00 PM", startTime: "8:00 PM", isLiveNow: false, ticketUrl: "#" },
  { id: "e9", venue: venues[8], artist: "DJ Night", genre: "Electronic", doorsAt: "9:00 PM", startTime: "10:00 PM", isLiveNow: true, ticketUrl: "#" },
  { id: "e10", venue: venues[9], artist: "The Mountain Goats", genre: "Indie Folk", doorsAt: "7:00 PM", startTime: "8:00 PM", isLiveNow: false, ticketUrl: "#" },
  { id: "e11", venue: venues[10], artist: "Open Mic Night", genre: "Folk Rock", doorsAt: "7:00 PM", startTime: "7:30 PM", isLiveNow: true, ticketUrl: "#" },
];

export const genres = ["All", "Indie Rock", "Psych Funk", "Hardcore", "Indie Pop", "Tuareg Blues", "Alt Country", "Folk Rock", "Indie Folk", "Electronic"];
