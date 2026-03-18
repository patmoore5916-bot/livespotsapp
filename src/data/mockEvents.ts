export type Venue = {
  id: string;
  name: string;
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
  { id: "v1", name: "Cat's Cradle", neighborhood: "Carrboro", city: "Chapel Hill", lat: 35.91, lng: -79.07, distance: "0.8 mi" },
  { id: "v2", name: "Motorco Music Hall", neighborhood: "Downtown", city: "Durham", lat: 35.99, lng: -78.90, distance: "0.3 mi" },
  { id: "v3", name: "The Ritz", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.2 mi" },
  { id: "v4", name: "Lincoln Theatre", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.1 mi" },
  { id: "v5", name: "The Pinhook", neighborhood: "Downtown", city: "Durham", lat: 35.99, lng: -78.90, distance: "0.2 mi" },
  { id: "v6", name: "Local 506", neighborhood: "East Franklin", city: "Chapel Hill", lat: 35.91, lng: -79.04, distance: "1.1 mi" },
  { id: "v7", name: "The Pour House", neighborhood: "Downtown", city: "Raleigh", lat: 35.78, lng: -78.64, distance: "4.3 mi" },
  { id: "v8", name: "Haw River Ballroom", neighborhood: "Saxapahaw", city: "Saxapahaw", lat: 35.95, lng: -79.32, distance: "12.4 mi" },
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
];

export const genres = ["All", "Indie Rock", "Psych Funk", "Hardcore", "Indie Pop", "Tuareg Blues", "Alt Country", "Folk Rock", "Indie Folk"];
