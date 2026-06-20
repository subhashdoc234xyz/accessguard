import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Show loading spinner while Firebase checks auth state
  if (loading) {
    return (
      <div
        className="min-h-screen font-sans flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e8f4fd 0%, #dbeafe 50%, #ede9fe 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center glow-blue">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
