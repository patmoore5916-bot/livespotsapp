import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AdminSyncPanel from "@/components/AdminSyncPanel";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !hasRole("operator"))) {
      navigate("/");
    }
  }, [loading, user, hasRole, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-[100dvh] bg-background p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Admin</h1>
      </div>
      <AdminSyncPanel />
    </div>
  );
};

export default Admin;
