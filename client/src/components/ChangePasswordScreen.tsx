import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export function ChangePasswordScreen() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Password Criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumberSpecial = /\d/.test(newPassword) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasUpperLower && hasNumberSpecial && passwordsMatch && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setErrorMessage("Please ensure all password criteria are satisfied.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: "var(--color-zen-bg, #f4f7f5)" }}
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
      </div>

      {/* Change Password Card */}
      <div
        className="card shadow-sm border-0"
        style={{
          width: "100%",
          maxWidth: "460px",
          borderRadius: "12px",
          backgroundColor: "var(--color-zen-surface, #ffffff)",
          border: "1px solid var(--color-zen-border, #d8e2dc)",
        }}
      >
        <div className="card-body p-4">
          <h4
            className="fw-bold text-center mb-1"
            style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
          >
            Change Your Password
          </h4>
          <p className="text-muted text-center small mb-4">
            You must change your password to continue into the application.
          </p>

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
                htmlFor="current-password"
                className="form-label small fw-semibold"
                style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
              >
                Current (temporary) password
              </label>
              <input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                required
                style={{
                  borderRadius: "8px",
                  borderColor: "var(--color-zen-border, #d8e2dc)",
                  padding: "0.6rem 0.75rem",
                }}
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="new-password"
                className="form-label small fw-semibold"
                style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
              >
                New password
              </label>
              <input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                className="form-control"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                required
                style={{
                  borderRadius: "8px",
                  borderColor: "var(--color-zen-border, #d8e2dc)",
                  padding: "0.6rem 0.75rem",
                }}
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="confirm-password"
                className="form-label small fw-semibold"
                style={{ color: "var(--color-zen-text-main, #1a2e26)" }}
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                className="form-control"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                required
                style={{
                  borderRadius: "8px",
                  borderColor: "var(--color-zen-border, #d8e2dc)",
                  padding: "0.6rem 0.75rem",
                }}
              />
            </div>

            <div className="form-check mb-3">
              <input
                id="toggle-show-passwords"
                type="checkbox"
                className="form-check-input"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              <label htmlFor="toggle-show-passwords" className="form-check-label small text-muted">
                Show passwords
              </label>
            </div>

            {/* Password Rules Checklist */}
            <div
              className="p-3 mb-4 rounded"
              style={{
                backgroundColor: "var(--color-zen-bg, #f4f7f5)",
                border: "1px solid var(--color-zen-border, #d8e2dc)",
              }}
            >
              <div className="small fw-semibold mb-2" style={{ color: "var(--color-zen-text-main, #1a2e26)" }}>
                Password must:
              </div>
              <ul className="list-unstyled mb-0 small">
                <li className={`d-flex align-items-center gap-2 mb-1 ${hasMinLength ? "text-success" : "text-muted"}`}>
                  <span>{hasMinLength ? "✓" : "○"}</span> Be at least 8 characters
                </li>
                <li className={`d-flex align-items-center gap-2 mb-1 ${hasUpperLower ? "text-success" : "text-muted"}`}>
                  <span>{hasUpperLower ? "✓" : "○"}</span> Include upper and lower case letters
                </li>
                <li className={`d-flex align-items-center gap-2 mb-1 ${hasNumberSpecial ? "text-success" : "text-muted"}`}>
                  <span>{hasNumberSpecial ? "✓" : "○"}</span> Include a number and a special character
                </li>
                <li className={`d-flex align-items-center gap-2 ${passwordsMatch ? "text-success" : "text-muted"}`}>
                  <span>{passwordsMatch ? "✓" : "○"}</span> Passwords match
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2 mb-2"
              disabled={isSubmitting || !isFormValid}
              style={{
                backgroundColor: isFormValid ? "var(--color-zen-primary, #0f5132)" : "#6c757d",
                borderRadius: "8px",
                padding: "0.65rem",
                border: "none",
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Updating Password...
                </>
              ) : (
                "Continue"
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary w-100 btn-sm"
              onClick={logout}
              style={{ borderRadius: "8px" }}
            >
              Sign out and return later
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
