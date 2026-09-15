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
      setErrorMessage(err.message || "Invalid email address or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center w-100"
    >
      {/* Brand Header */}
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center gap-2 mb-1">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "var(--color-zen-primary, #0f5132)",
              fontSize: "1.25rem",
            }}
          >
            ✓
          </div>
          <span
            className="fw-bold"
            style={{ fontSize: "1.75rem", color: "var(--color-zen-text-main, #1a2e26)", letterSpacing: "-0.5px" }}
          >
            TokTickIT
          </span>
        </div>
        <p className="text-muted small mb-0">Enterprise IT Service Management & Ticketing</p>
      </div>

      {/* Login Card */}
      <div
        className="card shadow-sm border-0"
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "12px",
          backgroundColor: "var(--color-zen-surface, #ffffff)",
          border: "1px solid var(--color-zen-border, #d8e2dc)",
        }}
      >
        <div className="card-body p-4">
          <h4
            className="fw-bold text-center mb-4"
            style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
          >
            Sign in to your account
          </h4>

          {errorMessage && (
            <div
              className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 small"
              role="alert"
              style={{ borderRadius: "8px" }}
            >
              <span className="fw-bold">✕</span>
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label
                htmlFor="login-email"
                className="form-label small fw-semibold"
                style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="name@toktick.it"
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
                  borderColor: "var(--color-zen-border, #d8e2dc)",
                  padding: "0.6rem 0.75rem",
                }}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="login-password"
                className="form-label small fw-semibold"
                style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
              >
                Password
              </label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
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
                    borderColor: "var(--color-zen-border, #d8e2dc)",
                    padding: "0.6rem 0.75rem",
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    borderRadius: "0 8px 8px 0",
                    borderColor: "var(--color-zen-border, #d8e2dc)",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--color-zen-primary, #0f5132)",
                borderRadius: "8px",
                padding: "0.65rem",
                border: "none",
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

          <div className="text-center mt-3">
            <span className="text-muted small">Forgot your password? Contact IT Support Desk.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;

