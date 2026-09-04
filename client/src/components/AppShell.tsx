import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { CreateTicketScreen } from "./CreateTicketScreen.js";
import { MyTicketsScreen } from "./MyTicketsScreen.js";
import { TicketDetailScreen } from "./TicketDetailScreen.js";

export function AppShell() {
  const { currentRequester, changeRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<"workspace" | "new-ticket">("workspace");
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);

  if (!currentRequester) return null;

  const handleNavigateWorkspace = () => {
    setSelectedTicketId(null);
    setActiveTab("workspace");
  };

  const handleNavigateNewTicket = () => {
    setSelectedTicketId(null);
    setActiveTab("new-ticket");
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light" data-testid="app-shell">
      {/* Global Navigation Bar */}
      <nav className="navbar navbar-expand-lg app-navbar px-2 px-sm-3 py-2 shadow-sm" aria-label="Main Navigation">
        <div className="container-fluid px-0 d-flex align-items-center justify-content-between flex-nowrap">
          <span
            className="navbar-brand fw-bold d-flex align-items-center gap-1 gap-sm-2 cursor-pointer text-dark me-2 flex-shrink-0"
            onClick={handleNavigateWorkspace}
            role="button"
          >
            <span className="badge bg-success text-white px-2 py-1 fs-6 font-monospace">TT</span>
            <span className="text-dark">TokTickIT</span>
            <span className="badge bg-light text-success border border-success-subtle small fw-normal ms-1 d-none d-sm-inline-block">
              Lab 2
            </span>
          </span>

          {/* Desktop Navigation Links */}
          <div className="d-flex align-items-center gap-2 ms-3 d-none d-md-flex">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "workspace" && selectedTicketId === null ? "btn-zen text-white fw-semibold" : "btn-light text-muted"}`}
              onClick={handleNavigateWorkspace}
              data-testid="nav-workspace-tab"
            >
              My Tickets
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "new-ticket" ? "btn-zen text-white fw-semibold" : "btn-light text-muted"}`}
              onClick={handleNavigateNewTicket}
              data-testid="nav-new-ticket-tab"
            >
              New Ticket
            </button>
          </div>

          <div className="d-flex align-items-center gap-2 ms-auto">
            {/* Requester Identity Pill */}
            <div
              className="d-flex align-items-center gap-2 bg-white border rounded-pill px-2 px-sm-3 py-1 shadow-sm"
              data-testid="requester-pill"
            >
              {currentRequester.avatarUrl ? (
                <img
                  src={currentRequester.avatarUrl}
                  alt={currentRequester.name}
                  className="rounded-circle avatar-sm border flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold avatar-sm flex-shrink-0"
                  style={{ fontSize: "0.8rem" }}
                >
                  {currentRequester.name.charAt(0)}
                </div>
              )}
              <div className="d-none d-sm-block text-start lh-sm">
                <div className="fw-semibold small text-truncate" style={{ maxWidth: 120 }} data-testid="requester-pill-name">{currentRequester.name}</div>
                <div className="text-muted text-truncate" style={{ fontSize: "0.75rem", maxWidth: 120 }}>
                  {currentRequester.department}
                </div>
              </div>
              <span className={`badge ${currentRequester.isActive ? "badge-status-open" : "badge-priority-urgent"} ms-1 d-none d-xs-inline-block`}>
                {currentRequester.isActive ? "Active" : "Suspended"}
              </span>
            </div>

            {/* Change Requester Action */}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-2 px-sm-3 text-nowrap"
              onClick={changeRequester}
              data-testid="change-requester-btn"
            >
              <span className="d-none d-sm-inline">Change Requester</span>
              <span className="d-inline d-sm-none">Switch</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="d-flex d-md-none bg-white border-bottom px-3 py-2 gap-2 justify-content-between align-items-center shadow-sm" data-testid="mobile-nav-bar">
        <div className="btn-group btn-group-sm w-100" role="group">
          <button
            type="button"
            className={`btn ${activeTab === "workspace" && selectedTicketId === null ? "btn-zen text-white fw-semibold" : "btn-light text-muted border"}`}
            onClick={handleNavigateWorkspace}
            data-testid="mobile-nav-workspace-tab"
          >
            My Tickets
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "new-ticket" ? "btn-zen text-white fw-semibold" : "btn-light text-muted border"}`}
            onClick={handleNavigateNewTicket}
            data-testid="mobile-nav-new-ticket-tab"
          >
            New Ticket
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="container py-3 py-md-4 flex-grow-1">
        <div className="row g-3 g-md-4">
          <div className="col-12 col-md-4">
            <div className="card zen-card p-3 p-md-4 h-100" data-testid="requester-profile-card">
              <h5 className="fw-bold mb-3 text-dark">
                Active Requester
              </h5>
              <div className="d-flex align-items-center gap-3 mb-3">
                {currentRequester.avatarUrl ? (
                  <img
                    src={currentRequester.avatarUrl}
                    alt={currentRequester.name}
                    className="avatar-circle flex-shrink-0"
                  />
                ) : (
                  <div
                    className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold avatar-circle flex-shrink-0"
                    style={{ fontSize: "1.2rem" }}
                  >
                    {currentRequester.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-grow-1 overflow-hidden">
                  <h6 className="fw-bold mb-0 text-truncate" data-testid="requester-card-name">{currentRequester.name}</h6>
                  <span className="text-muted small text-break d-block">{currentRequester.email}</span>
                </div>
              </div>
              <ul className="list-group list-group-flush small mb-3">
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span className="text-muted">Department:</span>
                  <span className="fw-semibold text-break">{currentRequester.department}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span className="text-muted">Status:</span>
                  <span className={`badge ${currentRequester.isActive ? "badge-status-open" : "badge-priority-urgent"}`}>
                    {currentRequester.isActive ? "Active Persona" : "Suspended"}
                  </span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span className="text-muted">Requester ID:</span>
                  <code className="text-break">{currentRequester.id}</code>
                </li>
              </ul>

              <div className="d-grid gap-2 mt-auto">
                <button
                  type="button"
                  className="btn btn-zen btn-sm"
                  onClick={handleNavigateNewTicket}
                  disabled={!currentRequester.isActive}
                  data-testid="create-ticket-cta-btn"
                >
                  Submit New Ticket
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={changeRequester}
                  data-testid="profile-card-switch-btn"
                >
                  Switch Persona
                </button>
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
      </main>
    </div>
  );
}
export default AppShell;



