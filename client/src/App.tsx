import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { LoginScreen } from "./components/LoginScreen.js";
import { RequesterSelectScreen } from "./components/RequesterSelectScreen.js";
import { ChangePasswordScreen } from "./components/ChangePasswordScreen.js";
import { AppShell } from "./components/AppShell.js";

function AppContent() {
  const { user, isLoading } = useAuth();
  const { currentRequester } = useRequester();

  if (isLoading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ backgroundColor: "var(--color-zen-bg, #f4f7f5)" }}
      >
        <div className="spinner-border text-success mb-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="text-muted small">Loading TokTickIT...</div>
      </div>
    );
  }

  if (user) {
    if (user.mustChangePassword) {
      return <ChangePasswordScreen />;
    }
    return <AppShell />;
  }

  if (currentRequester) {
    return <AppShell />;
  }

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: "var(--color-zen-bg, #f4f7f5)" }}
    >
      <LoginScreen />

      {/* Lab 2 Simulated Requester Persona & Diagnostics */}
      <div className="w-100 mt-4" style={{ maxWidth: "420px" }}>
        <div className="card shadow-sm border-0 p-3" style={{ borderRadius: "12px", border: "1px dashed var(--color-zen-border, #d8e2dc)" }}>
          <RequesterSelectScreen hideBrandHeader={true} />
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppContent />
      </RequesterProvider>
    </AuthProvider>
  );
}

export default App;


