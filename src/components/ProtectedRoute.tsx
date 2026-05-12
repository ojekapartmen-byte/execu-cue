import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Halaman tidak dapat dimuat</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{authError}</p>
          <Button className="mt-6 gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};