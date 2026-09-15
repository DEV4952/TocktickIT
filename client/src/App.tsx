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

      {/* Hidden Lab 1/Lab 2 Test Support Container */}
      <div className="d-none" data-testid="legacy-test-container">
        <RequesterSelectScreen hideBrandHeader={true} />
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


