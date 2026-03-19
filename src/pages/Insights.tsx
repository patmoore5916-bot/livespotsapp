import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MapPin, Music, Zap, TrendingUp } from "lucide-react";
import {
  useGenreStats,
  useVenuePostStats,
  useEventStatusStats,
  useVenueCount,
  useEventCount,
  useExperiencePostCount,
} from "@/hooks/useAdminStats";

const CHART_COLORS = [
  "hsl(22, 100%, 50%)",
  "hsl(22, 80%, 60%)",
  "hsl(22, 60%, 40%)",
  "hsl(240, 5%, 45%)",
  "hsl(240, 5%, 55%)",
  "hsl(240, 5%, 65%)",
];

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) => (
  <div className="bg-card border border-border rounded-card p-4 space-y-1">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground font-mono-nums">{value}</p>
  </div>
);

const Insights = () => {
  const { data: genreStats = [] } = useGenreStats();
  const { data: venuePostStats = [] } = useVenuePostStats();
  const { data: eventStatusStats = [] } = useEventStatusStats();
  const { data: venueCount = 0 } = useVenueCount();
  const { data: eventCount = 0 } = useEventCount();
  const { data: postCount = 0 } = useExperiencePostCount();

  const statusData = eventStatusStats.map((s) => ({
    name: s.status === "live" ? "Live" : s.status === "today" ? "Today" : "This Week",
    value: Number(s.event_count),
  }));

  const genreData = genreStats.slice(0, 8).map((g) => ({
    name: g.genre,
    users: Number(g.user_count),
  }));

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-card bg-primary/10 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Livespot Insights</h1>
        <p className="text-xs text-muted-foreground">Aggregated platform analytics</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={MapPin} label="Venues" value={venueCount} />
          <StatCard icon={Zap} label="Events" value={eventCount} />
          <StatCard icon={Music} label="Posts" value={postCount} />
        </div>

        {/* Genre Preferences */}
        {genreData.length > 0 && (
          <div className="bg-card border border-border rounded-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Genre Popularity</h2>
            <p className="text-xs text-muted-foreground">User genre preference distribution</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genreData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "hsl(240,5%,65%)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fill: "hsl(0,0%,98%)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(240,4%,10%)",
                      border: "1px solid hsl(0,0%,100%,0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="users" fill="hsl(22,100%,50%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Event Status */}
        {statusData.length > 0 && (
          <div className="bg-card border border-border rounded-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Event Status Breakdown</h2>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(240,4%,10%)",
                      border: "1px solid hsl(0,0%,100%,0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Venues */}
        {venuePostStats.length > 0 && (
          <div className="bg-card border border-border rounded-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Top Venues by Engagement</h2>
            <div className="space-y-2">
              {venuePostStats.slice(0, 10).map((v, i) => (
                <div key={v.venue_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono-nums w-5">{i + 1}.</span>
                    <span className="text-sm text-foreground truncate">{v.venue_name || "Unknown"}</span>
                  </div>
                  <span className="text-sm font-bold text-primary font-mono-nums">{v.post_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50 pt-4">
          Powered by Livespot · Data is aggregated and anonymized
        </p>
      </div>
    </div>
  );
};

export default Insights;
