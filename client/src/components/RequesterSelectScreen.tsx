import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { Requester } from "../types.js";
import { SystemHealth } from "./SystemHealth.js";

export function RequesterSelectScreen() {
  const { requesters, isLoading, error, selectRequester, reloadRequesters } = useRequester();
  const [selectedId, setSelectedId] = useState<string>("");

  // Default to first active requester when list loads
  useEffect(() => {
    if (requesters.length > 0 && (!selectedId || !requesters.some((r) => String(r.id) === selectedId))) {
      setSelectedId(String(requesters[0].id));
    }
  }, [requesters, selectedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idToUse = selectedId || (requesters.length > 0 ? String(requesters[0].id) : "");
    if (!idToUse) return;

    const chosen = requesters.find((r) => r.id === parseInt(idToUse, 10));
    if (chosen) {
      selectRequester(chosen);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "85vh" }}>
      <div className="w-100" style={{ maxWidth: 540 }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3 font-monospace fw-bold" style={{ width: 52, height: 52, fontSize: 20 }}>
            TT
          </div>
          <h1 className="h3 fw-bold mb-1">
            TokTickIT <span className="text-success">Service Desk</span>
          </h1>
          <p className="text-muted small">Requester-Facing Ticketing Portal</p>
        </div>

        <div className="card zen-card p-4">
          {/* Lab 2 Testing Notice Banner */}
          <div className="zen-banner-info p-3 mb-4 d-flex align-items-start gap-2" role="region" aria-label="Lab 2 Notice">
            <div className="small">
              <strong>Lab 2 Testing Environment:</strong> Select a Development Requester persona to simulate support requests. Real authentication is introduced in Lab 3.
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4" data-testid="loading-state" role="status">
              <div className="spinner-border text-success mb-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mb-0">Loading development requesters...</p>
            </div>
          )}

          {/* API Failure / Error State */}
          {!isLoading && error && (
            <div className="alert alert-danger" data-testid="error-state" role="alert">
              <h6 className="alert-heading fw-bold mb-1">Connection Error</h6>
              <p className="mb-3 small">{error}</p>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => reloadRequesters()}
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && requesters.length === 0 && (
            <div className="text-center py-4" data-testid="empty-state">
              <p className="text-muted mb-3">No active development requesters found.</p>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => reloadRequesters()}
              >
                Refresh
              </button>
            </div>
          )}

          {/* Selection Form */}
          {!isLoading && !error && requesters.length > 0 && (
            <form onSubmit={handleSubmit} data-testid="requester-form">
              <div className="mb-4">
                <label htmlFor="requester-select" className="form-label fw-semibold">
                  Select Development Requester
                </label>
                <select
                  id="requester-select"
                  className="form-select form-select-lg"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  aria-describedby="requester-select-help"
                  autoFocus
                >
                  {requesters
                    .filter((r) => r.isActive)
                    .map((r: Requester) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.department} ({r.email})
                      </option>
                    ))}
                </select>
                <div id="requester-select-help" className="form-text mt-2">
                  Active personas available for simulated ticket creation & tracking.
                </div>
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-zen btn-lg"
                  disabled={!selectedId}
                >
                  Continue to Service Desk
                </button>
              </div>
            </form>
          )}

          {/* Diagnostic System Health Panel */}
          <SystemHealth />
        </div>
      </div>
    </div>
  );
}
export default RequesterSelectScreen;
