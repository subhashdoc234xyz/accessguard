import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { loginWithGoogle, loginWithGithub } = useAuth();
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading("google");
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleGithubLogin = async () => {
    setLoading("github");
    setError(null);
    try {
      await loginWithGithub();
    } catch (err: any) {
      setError(err.message || "GitHub sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden flex items-center justify-center p-4">
      {/* Floating Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px]"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.9)",
          borderRadius: "20px",
          padding: "48px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center glow-blue mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">AccessGuard</h1>
          <p className="text-sm text-[#64748b] mt-1">Accessibility Compliance Platform</p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200/60 mb-6" />

        {/* Heading */}
        <h2 className="text-lg font-semibold text-[#1e293b] text-center">Sign in to continue</h2>
        <p className="text-sm text-[#64748b] text-center mt-1 mb-6">
          Scan and audit web accessibility with AI-powered agents
        </p>

        {/* Error Message */}
        {error && (
          <div
            className="mb-5 px-3 py-3 text-sm flex items-center gap-2"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#dc2626",
              borderRadius: "8px",
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-md"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid rgba(0, 0, 0, 0.12)",
            color: "#1e293b",
            borderRadius: "10px",
            height: "48px",
          }}
          onMouseEnter={(e) => {
            if (loading === null) {
              e.currentTarget.style.background = "white";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
          }}
        >
          {loading === "google" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {loading === "google" ? "Signing in..." : "Continue with Google"}
        </button>

        {/* GitHub Button */}
        <button
          onClick={handleGithubLogin}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 text-sm font-medium transition-all duration-200 mt-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: "#24292e",
            color: "white",
            borderRadius: "10px",
            height: "48px",
            border: "none",
          }}
          onMouseEnter={(e) => {
            if (loading === null) {
              e.currentTarget.style.background = "#2f363d";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#24292e";
          }}
        >
          {loading === "github" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          )}
          {loading === "github" ? "Signing in..." : "Continue with GitHub"}
        </button>

        {/* Footer Text */}
        <p className="text-xs text-[#94a3b8] text-center mt-6">
          By signing in you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
