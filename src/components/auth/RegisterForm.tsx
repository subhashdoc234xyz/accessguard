import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Shield, Loader2, AlertTriangle, Eye, EyeOff, Mail, Lock, User, Check, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "Contains uppercase", test: /[A-Z]/.test(password) },
    { label: "Contains lowercase", test: /[a-z]/.test(password) },
    { label: "Contains a number", test: /\d/.test(password) },
    { label: "Contains a symbol", test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const strength = checks.filter((c) => c.test).length;
  const percentage = (strength / checks.length) * 100;

  const barColor =
    percentage <= 20
      ? "#ef4444"
      : percentage <= 40
      ? "#f97316"
      : percentage <= 60
      ? "#eab308"
      : percentage <= 80
      ? "#22c55e"
      : "#10b981";

  const label =
    percentage <= 20 ? "Very Weak" : percentage <= 40 ? "Weak" : percentage <= 60 ? "Fair" : percentage <= 80 ? "Strong" : "Very Strong";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%`, background: barColor }}
          />
        </div>
        <span className="text-[10px] font-semibold ml-3" style={{ color: barColor }}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {check.test ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-[#94a3b8] flex-shrink-0" />
            )}
            <span className={check.test ? "text-emerald-600" : "text-[#94a3b8]"}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterForm() {
  const { register, loginWithGoogle, loginWithGithub } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!displayName || !email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading("email");
    setError(null);
    try {
      await register(email, password, displayName);
      navigate("/");
    } catch (err: any) {
      const code = err.code;
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered. Try signing in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading("google");
    setError(null);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGithubLogin = async () => {
    setLoading("github");
    setError(null);
    try {
      await loginWithGithub();
      navigate("/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "GitHub sign-in failed.");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden flex items-center justify-center p-4">
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
          padding: "40px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center glow-blue mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">AccessGuard</h1>
          <p className="text-sm text-[#64748b] mt-1">Accessibility Compliance Platform</p>
        </div>

        <h2 className="text-lg font-semibold text-[#1e293b] text-center">Create your account</h2>
        <p className="text-sm text-[#64748b] text-center mt-1 mb-6">
          Start scanning web accessibility with AI
        </p>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 px-4 py-3 text-sm flex items-center gap-2"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#dc2626",
              borderRadius: "10px",
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleEmailRegister} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#475569] tracking-tight">Full Name</label>
            <div
              className="flex items-center gap-3 px-4 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "12px",
                height: "48px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <User className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
              <input
                type="text"
                placeholder="John Doe"
                className="bg-transparent border-none outline-none text-sm text-[#1e293b] placeholder-[#94a3b8] w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#475569] tracking-tight">Email</label>
            <div
              className="flex items-center gap-3 px-4 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "12px",
                height: "48px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Mail className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
              <input
                type="email"
                placeholder="you@company.com"
                className="bg-transparent border-none outline-none text-sm text-[#1e293b] placeholder-[#94a3b8] w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#475569] tracking-tight">Password</label>
            <div
              className="flex items-center gap-3 px-4 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "12px",
                height: "48px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Lock className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="bg-transparent border-none outline-none text-sm text-[#1e293b] placeholder-[#94a3b8] w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#94a3b8] hover:text-[#64748b] transition-colors cursor-pointer flex-shrink-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#475569] tracking-tight">Confirm Password</label>
            <div
              className="flex items-center gap-3 px-4 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "12px",
                height: "48px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Lock className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                className="bg-transparent border-none outline-none text-sm text-[#1e293b] placeholder-[#94a3b8] w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                <X className="w-3 h-3" /> Passwords do not match
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                <Check className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading !== null || !displayName || !email || !password || !confirmPassword || password !== confirmPassword}
            className="btn-primary w-full h-[48px] text-sm tracking-wide flex items-center justify-center gap-2"
          >
            {loading === "email" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t border-slate-200/60" />
          <span className="text-xs text-[#94a3b8] font-medium">or continue with</span>
          <div className="flex-1 border-t border-slate-200/60" />
        </div>

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
            if (loading === null) e.currentTarget.style.background = "white";
          }}
          onMouseLeave={(e) => {
            if (loading === null) e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
          }}
        >
          {loading === "google" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
            if (loading === null) e.currentTarget.style.background = "#2f363d";
          }}
          onMouseLeave={(e) => {
            if (loading === null) e.currentTarget.style.background = "#24292e";
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

        {/* Login Link */}
        <p className="text-xs text-[#64748b] text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-500 transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
