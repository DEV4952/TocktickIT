import React from "react";
import { useRequester } from "../context/RequesterContext.js";

export function AppShell() {
  const { currentRequester, changeRequester } = useRequester();

  if (!currentRequester) return null;

  return (
    <div className="min-vh-100 d-flex flex-column bg-light" data-testid="app-shell">
      {/* Global Navigation Bar */}
      <nav className="navbar navbar-expand-lg app-navbar px-3 py-2 shadow-sm" aria-label="Main Navigation">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2">
            <span className="badge bg-success p-2 fs-6">🎫</span>
            <span>TokTickIT</span>
            <span className="badge bg-light text-success border border-success-subtle small fw-normal ms-1">
              Lab 2
            </span>
          </span>

          <div className="d-flex align-items-center gap-3 ms-auto">
            {/* Requester Identity Pill */}
            <div
              className="d-flex align-items-center gap-2 bg-white border rounded-pill px-3 py-1 shadow-sm"
              data-testid="requester-pill"
            >
              {currentRequester.avatarUrl ? (
                <img
                  src={currentRequester.avatarUrl}
                  alt={currentRequester.name}
                  className="rounded-circle avatar-sm border"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold avatar-sm"
                  style={{ fontSize: "0.8rem" }}
                >
                  {currentRequester.name.charAt(0)}
                </div>
              )}
              <div className="d-none d-sm-block text-start lh-sm">
                <div className="fw-semibold small" data-testid="requester-pill-name">{currentRequester.name}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {currentRequester.department}
                </div>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle ms-1">
                Active
              </span>
            </div>

            {/* Change Requester Action */}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              onClick={changeRequester}
              data-testid="change-requester-btn"
            >
              Change Requester
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="container py-4 flex-grow-1">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="card zen-card p-4 h-100" data-testid="requester-profile-card">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <span>👤</span> Active Requester
              </h5>
              <div className="d-flex align-items-center gap-3 mb-3">
                {currentRequester.avatarUrl ? (
                  <img
                    src={currentRequester.avatarUrl}
                    alt={currentRequester.name}
                    className="avatar-circle"
                  />
                ) : (
                  <div
                    className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold avatar-circle"
                    style={{ fontSize: "1.2rem" }}
                  >
                    {currentRequester.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h6 className="fw-bold mb-0" data-testid="requester-card-name">{currentRequester.name}</h6>
                  <span className="text-muted small">{currentRequester.email}</span>
                </div>
              </div>
              <ul className="list-group list-group-flush small mb-3">
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span className="text-muted">Department:</span>
                  <span className="fw-semibold">{currentRequester.department}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success">Active Persona</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between">
                  <span className="text-muted">Requester ID:</span>
                  <code>{currentRequester.id}</code>
                </li>
              </ul>
              <button
                type="button"
                className="btn btn-outline-success btn-sm w-100 mt-auto"
                onClick={changeRequester}
                data-testid="profile-card-switch-btn"
              >
                Switch Persona
              </button>
            </div>
          </div>

          <div className="col-12 col-md-8">
            <div className="card zen-card p-4 h-100" data-testid="requester-workspace-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <span>📋</span> Requester Workspace
                </h5>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle" data-testid="context-badge">
                  Context: {currentRequester.name}
                </span>
              </div>
              <div className="zen-banner-info p-3 mb-4">
                <p className="mb-1 small">
                  <strong>Simulated Requester Session:</strong> All ticket operations in subsequent Lab 2 issues will be executed under <code>x-requester-id: {currentRequester.id}</code>.
                </p>
                <p className="mb-0 small text-muted">
                  Switching requesters dynamically updates the active context and reloads requester-specific datasets.
                </p>
              </div>

              <div className="border rounded-3 p-4 text-center bg-white">
                <div className="display-6 text-muted mb-2">🎫</div>
                <h6 className="fw-semibold">Ready for Ticket Management</h6>
                <p className="text-muted small mb-0">
                  Tickets logged by {currentRequester.name} will appear here once ticket creation and listing are implemented.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
export default AppShell;
