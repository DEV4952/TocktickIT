import React from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { RequesterSelectScreen } from "./components/RequesterSelectScreen.js";
import { AppShell } from "./components/AppShell.js";

function AppContent() {
  const { currentRequester } = useRequester();

  if (!currentRequester) {
    return <RequesterSelectScreen />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
