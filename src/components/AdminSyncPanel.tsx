import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Clock, Database } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const AdminSyncPanel = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: syncLogs = [], isLoading } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: hasRole("operator"),
    refetchInterval: 10000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-events");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.venuesUpserted} venues, ${data.eventsUpserted} events`);
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });

  if (!hasRole("operator")) return null;

  const lastSync = syncLogs[0];
  const lastSuccess = syncLogs.find((l) => l.status === "success");

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Scraper Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last sync info */}
        <div className="space-y-1 text-sm">
          {lastSuccess ? (
            <>
              <p className="text-muted-foreground">
                Last sync:{" "}
                <span className="text-foreground font-medium">
                  {formatDistanceToNow(new Date(lastSuccess.finished_at!), { addSuffix: true })}
                </span>
              </p>
              <p className="text-muted-foreground">
                {lastSuccess.venues_upserted} venues · {lastSuccess.events_upserted} events
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No syncs yet</p>
          )}
        </div>

        {/* Sync button */}
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="w-full"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing…" : "Sync Now"}
        </Button>

        {/* Recent log entries */}
        {syncLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recent</p>
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {statusIcon(log.status)}
                <span className="flex-1 truncate">
                  {log.status === "success"
                    ? `${log.venues_upserted}v / ${log.events_upserted}e`
                    : log.status === "error"
                    ? log.error_message?.slice(0, 40)
                    : "Running…"}
                </span>
                <span className="font-mono-nums shrink-0">
                  {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSyncPanel;
