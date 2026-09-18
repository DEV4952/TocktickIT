import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center w-100 py-4">
      {/* Login Card Matching Design Specification */}
      <div
        className="card shadow-sm border-0 overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "440px",
          borderRadius: "14px",
          backgroundColor: "var(--color-zen-surface, #ffffff)",
          border: "1px solid var(--color-zen-border, #d8e2dc)",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* Card Top Brand Banner */}
        <div
          className="d-flex align-items-center gap-2 px-4 py-3"
          style={{
            backgroundColor: "#0d5332",
            color: "#ffffff",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className="flex-shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span
            className="fw-bold fs-5"
            style={{ letterSpacing: "-0.3px" }}
          >
            TokTickIT
          </span>
        </div>

        <div className="card-body p-4 pt-4">
          <h4
            className="fw-bold mb-4 text-start"
            style={{ color: "#1a2e26", fontSize: "1.35rem" }}
          >
            Sign in to your account
          </h4>

          <form onSubmit={handleSubmit} noValidate>
            {/* 1. Email Field */}
            <div className="mb-3 text-start">
              <label
                htmlFor="login-email"
                className="form-label small fw-semibold mb-1"
                style={{ color: "#374151" }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="janderson@toktickit.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                autoComplete="email"
                required
                style={{
                  borderRadius: "8px",
                  borderColor: "#d1d5db",
                  padding: "0.6rem 0.85rem",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            {/* 2. Password Field */}
            <div className="mb-3 text-start">
              <label
                htmlFor="login-password"
                className="form-label small fw-semibold mb-1"
                style={{ color: "#374151" }}
              >
                Password
              </label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control border-end-0"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                  style={{
                    borderRadius: "8px 0 0 8px",
                    borderColor: "#d1d5db",
                    padding: "0.6rem 0.85rem",
                    fontSize: "0.95rem",
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0 bg-white text-muted d-flex align-items-center justify-content-center px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    borderRadius: "0 8px 8px 0",
                    borderColor: "#d1d5db",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Error Banner Positioned Below Password Field & Above Sign In (Matching Screenshot) */}
            {errorMessage && (
              <div
                className="d-flex align-items-center gap-3 p-3 mb-3 text-start"
                role="alert"
                data-testid="login-error-banner"
                style={{
                  backgroundColor: "#fff1f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#991b1b",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="small lh-sm">
                  <div className="fw-semibold text-danger" style={{ color: "#991b1b" }}>
                    {errorMessage.includes("Please try again")
                      ? errorMessage.split("Please try again")[0].trim().replace(/\.$/, "") + "."
                      : errorMessage}
                  </div>
                  {errorMessage.includes("Please try again") && (
                    <div className="mt-1" style={{ color: "#b91c1c", fontSize: "0.825rem" }}>
                      Please try again.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Sign In Button */}
            <button
              type="submit"
              className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
              disabled={isSubmitting}
              style={{
                backgroundColor: "#0d5332",
                borderRadius: "8px",
                padding: "0.7rem",
                border: "none",
                fontSize: "1rem",
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* 5. Forgot Password */}
          <div className="text-center mt-3 pt-1">
            <button
              type="button"
              className="btn btn-link text-decoration-none p-0"
              onClick={() => alert("Please contact your IT Administrator at it-support@toktick.it to reset your credentials.")}
              style={{
                color: "#166534",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Forgot your password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
