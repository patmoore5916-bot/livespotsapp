App-level memory: nationwide scope, user geolocation, not Triangle-specific

Design system: dark-mode-only nightlife app. IBM Plex Sans/Mono. Signal Orange #FF5C00 as primary. Zinc-based neutrals. No light mode.
Key tokens: --primary: 22 100% 50%, --background: 240 6% 4%, --card: 240 4% 10%
Rounded: card=24px, inner=16px. Shadow: card uses layered rgba.
Font: tabular-nums for all times/distances via .font-mono-nums class.

App name: Livespot
Scope: Nationwide live music discovery (not limited to RDU Triangle)
Venue types: venue, bar, brewery, club
Event statuses: live (red #EF4444), today (amber #F59E0B), this-week (indigo #6366F1)
Map: Leaflet + CartoDB dark tiles, user geolocation with blue dot
Auth: optional for browsing, required for posting experiences
Roles: patron (default), operator, artist
