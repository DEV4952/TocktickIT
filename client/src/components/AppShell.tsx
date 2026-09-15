import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import { CreateTicketScreen } from "./CreateTicketScreen.js";
import { MyTicketsScreen } from "./MyTicketsScreen.js";
import { TicketDetailScreen } from "./TicketDetailScreen.js";
import { ChangePasswordScreen } from "./ChangePasswordScreen.js";

export function AppShell() {
  let authUser = null;
  let logoutFn = async () => {};
  try {
    const auth = useAuth();
    authUser = auth.user;
    logoutFn = auth.logout;
  } catch {
    // Fallback
  }

  let currentRequester = null;
  let changeRequester = () => {};
  try {
    const reqCtx = useRequester();
    currentRequester = reqCtx.currentRequester;
    changeRequester = reqCtx.changeRequester;
  } catch {
    // Fallback
  }

  const activeUser = authUser || currentRequester;
  const [activeTab, setActiveTab] = useState<"workspace" | "new-ticket" | "change-password">("workspace");
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (!activeUser) return null;

  const handleNavigateWorkspace = () => {
    setSelectedTicketId(null);
    setActiveTab("workspace");
  };

  const handleNavigateNewTicket = () => {
    setSelectedTicketId(null);
    setActiveTab("new-ticket");
  };

  const roleLabel = authUser?.role === "ADMINISTRATOR"
    ? "Admin"
    : authUser?.role === "IT_STAFF"
    ? "IT Staff"
    : "Requester";

  const roleBadgeClass = authUser?.role === "ADMINISTRATOR"
    ? "bg-purple-subtle text-purple border border-purple"
    : authUser?.role === "IT_STAFF"
    ? "bg-success-subtle text-success border border-success"
    : "bg-info-subtle text-info border border-info";

  return (
    <div className="min-vh-100 d-flex flex-column bg-light" data-testid="app-shell">
      {/* Global Navigation Bar */}
      <nav
        className="navbar navbar-expand-lg px-2 px-sm-3 py-2 shadow-sm text-white"
        style={{ backgroundColor: "var(--color-zen-primary, #0f5132)" }}
        aria-label="Main Navigation"
      >
        <div className="container-fluid px-0 d-flex align-items-center justify-content-between flex-nowrap">
          <span
            className="navbar-brand fw-bold d-flex align-items-center gap-1 gap-sm-2 cursor-pointer text-white me-2 flex-shrink-0"
            onClick={handleNavigateWorkspace}
            role="button"
          >
            <span
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                fontSize: "1rem",
              }}
            >
              ✓
            </span>
            <span className="text-white">TokTickIT</span>
            <span className="badge bg-white text-success small fw-normal ms-1 d-none d-sm-inline-block">
              {authUser?.role || "Lab 3"}
            </span>
          </span>

          {/* Desktop Navigation Links */}
          <div className="d-flex align-items-center gap-2 ms-3 d-none d-md-flex">
            <button
              type="button"
              className={`btn btn-sm ${
                activeTab === "workspace" && selectedTicketId === null
                  ? "bg-white text-success fw-bold"
                  : "text-white-50 hover-white"
              }`}
              onClick={handleNavigateWorkspace}
              data-testid="nav-workspace-tab"
              style={{ borderRadius: "6px" }}
            >
              {authUser?.role === "IT_STAFF" || authUser?.role === "ADMINISTRATOR" ? "My Queue" : "My Tickets"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                activeTab === "new-ticket"
                  ? "bg-white text-success fw-bold"
                  : "text-white-50 hover-white"
              }`}
              onClick={handleNavigateNewTicket}
              data-testid="nav-new-ticket-tab"
              style={{ borderRadius: "6px" }}
            >
              + Create Ticket
            </button>
          </div>

          <div className="d-flex align-items-center gap-2 ms-auto position-relative">
            {!authUser && (
              <button
                type="button"
                className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
                onClick={changeRequester}
                data-testid="change-requester-btn"
                aria-label="Change Requester"
              >
                <span>🔄</span>
                <span className="d-none d-md-inline">Change Requester</span>
              </button>
            )}

            {/* User Profile Pill */}
            <div
              className="d-flex align-items-center gap-2 bg-white text-dark rounded-pill px-2 px-sm-3 py-1 shadow-sm cursor-pointer"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              role="button"
              data-testid="requester-pill"
            >
              <div
                className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                style={{ width: "28px", height: "28px", fontSize: "0.8rem" }}
              >
                {activeUser.name.charAt(0)}
              </div>
              <div className="d-none d-sm-block text-start lh-sm">
                <div className="fw-semibold small text-truncate" style={{ maxWidth: 130 }} data-testid="requester-pill-name">
                  {activeUser.name}
                </div>
                <div className="text-muted text-truncate" style={{ fontSize: "0.75rem", maxWidth: 130 }}>
                  {activeUser.department || activeUser.email}
                </div>
              </div>
              <span className={`badge ${roleBadgeClass} ms-1 d-none d-xs-inline-block small`}>
                {roleLabel}
              </span>
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                className="position-absolute end-0 bg-white shadow-lg rounded border py-1 text-dark"
                style={{ top: "110%", minWidth: "180px", zIndex: 1050 }}
              >
                <div className="px-3 py-2 border-bottom small text-muted">
                  Signed in as <strong className="text-dark d-block text-truncate" style={{ maxWidth: 220 }}>{activeUser.email}</strong>
                </div>
                <button
                  type="button"
                  className="dropdown-item px-3 py-2 small d-flex align-items-center gap-2 text-dark"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setActiveTab("change-password");
                  }}
                  data-testid="nav-change-password-btn"
                >
                  <span>🔒</span>
                  <span>Change Password</span>
                </button>
                {authUser ? (
                  <button
                    type="button"
                    className="dropdown-item px-3 py-2 small text-danger d-flex align-items-center gap-2 border-top"
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await logoutFn();
                    }}
                    data-testid="logout-btn"
                  >
                    <span>🚪</span>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="dropdown-item px-3 py-2 small text-secondary d-flex align-items-center gap-2 border-top"
                    onClick={() => {
                      setShowProfileMenu(false);
                      changeRequester();
                    }}
                    data-testid="change-requester-btn"
                  >
                    <span>🔄</span>
                    <span>Switch Requester</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="d-flex d-md-none bg-white border-bottom px-3 py-2 gap-2 justify-content-between align-items-center shadow-sm" data-testid="mobile-nav-bar">
        <div className="btn-group btn-group-sm w-100" role="group">
          <button
            type="button"
            className={`btn ${activeTab === "workspace" && selectedTicketId === null ? "btn-success text-white fw-semibold" : "btn-light text-muted border"}`}
            onClick={handleNavigateWorkspace}
            data-testid="mobile-nav-workspace-tab"
          >
            {authUser?.role === "IT_STAFF" || authUser?.role === "ADMINISTRATOR" ? "My Queue" : "My Tickets"}
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "new-ticket" ? "btn-success text-white fw-semibold" : "btn-light text-muted border"}`}
            onClick={handleNavigateNewTicket}
            data-testid="mobile-nav-new-ticket-tab"
          >
            + Create Ticket
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="container py-3 py-md-4 flex-grow-1">
        {activeTab === "change-password" ? (
          <ChangePasswordScreen />
        ) : (
          <div className="row g-3 g-md-4">
            <div className="col-12 col-md-4">
              <div className="card zen-card p-3 p-md-4 h-100" data-testid="requester-profile-card">
                <h5 className="fw-bold mb-3 text-dark">
                  Active Profile
                </h5>
                <div className="d-flex align-items-center gap-3 mb-3">
                  {activeUser.avatarUrl ? (
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.name}
                      className="avatar-circle flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold avatar-circle flex-shrink-0"
                      style={{ fontSize: "1.2rem" }}
                    >
                      {activeUser.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-grow-1 overflow-hidden">
                    <h6 className="fw-bold mb-0 text-truncate" data-testid="requester-card-name">{activeUser.name}</h6>
                    <span className="text-muted small text-break d-block">{activeUser.email}</span>
                  </div>
                </div>
                <ul className="list-group list-group-flush small mb-3">
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <span className="text-muted">Department:</span>
                    <span className="fw-semibold text-break">{activeUser.department || "General"}</span>
                  </li>
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <span className="text-muted">Role:</span>
                    <span className={`badge ${roleBadgeClass}`}>{roleLabel}</span>
                  </li>
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <span className="text-muted">Status:</span>
                    <span className={`badge ${activeUser.isActive ? "badge-status-open" : "badge-priority-urgent"}`}>
                      {activeUser.isActive ? "Active Account" : "Suspended"}
                    </span>
                  </li>
                </ul>

                <div className="d-grid gap-2 mt-auto">
                  <button
                    type="button"
                    className="btn btn-zen btn-sm"
                    onClick={handleNavigateNewTicket}
                    disabled={!activeUser.isActive}
                    data-testid="create-ticket-cta-btn"
                  >
                    Submit New Ticket
                  </button>
                  {authUser ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={logoutFn}
                      data-testid="profile-card-logout-btn"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={changeRequester}
                      data-testid="profile-card-switch-btn"
                    >
                      Switch Persona
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-8" data-testid="requester-workspace-card">
              {selectedTicketId !== null ? (
                <TicketDetailScreen
                  ticketIdOrNumber={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : activeTab === "new-ticket" ? (
                <CreateTicketScreen onCancel={handleNavigateWorkspace} />
              ) : (
                <MyTicketsScreen
                  onNavigateToNewTicket={handleNavigateNewTicket}
                  onViewTicket={(id) => setSelectedTicketId(id)}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AppShell;
