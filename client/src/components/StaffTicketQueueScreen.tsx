import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { fetchStaffTickets, fetchCategories, claimTicketApi } from "../api.js";
import { Category, TicketStatus, TicketPriority } from "../types.js";

interface StaffTicketQueueScreenProps {
  onViewTicket: (ticketIdOrNumber: string | number) => void;
  onNavigateToNewTicket?: () => void;
}

export function StaffTicketQueueScreen({ onViewTicket, onNavigateToNewTicket }: StaffTicketQueueScreenProps) {
  const { user } = useAuth();

  // State
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = useState({
    all: 0,
    unassigned: 0,
    myTickets: 0,
    inProgress: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Load Categories on mount
  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((cats) => {
        if (mounted) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Tickets
  const loadTickets = useCallback(
    async (targetPage = pagination.page) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetchStaffTickets({
          page: targetPage,
          limit: pagination.limit,
          search: search.trim() || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
          categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
          ownerId: ownerFilter !== "ALL" ? ownerFilter : undefined,
          sortBy,
          sortDir,
        });

        setTickets(res.data || []);
        setPagination({
          page: res.pagination?.page || targetPage,
          limit: res.pagination?.limit || 10,
          total: res.pagination?.total || 0,
          totalPages: res.pagination?.totalPages || 1,
        });
        if (res.counts) {
          setCounts(res.counts);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Unable to load tickets from server.");
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter, priorityFilter, categoryFilter, ownerFilter, sortBy, sortDir]
  );

  useEffect(() => {
    loadTickets(1);
  }, [search, statusFilter, priorityFilter, categoryFilter, ownerFilter, sortBy, sortDir]);

  // Quick Claim Handler
  const handleClaimTicket = async (ticketId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimingId(ticketId);
    setActionFeedback(null);
    try {
      await claimTicketApi(ticketId);
      setActionFeedback("Ticket successfully claimed!");
      await loadTickets(pagination.page);
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to claim ticket.");
    } finally {
      setClaimingId(null);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const badgeMap: Record<string, { label: string; className: string }> = {
      NEW: { label: "New", className: "badge-status-new bg-info-subtle text-info-emphasis border border-info-subtle" },
      OPEN: { label: "Open", className: "badge-status-open" },
      IN_PROGRESS: { label: "In Progress", className: "badge-status-in-progress" },
      WAITING_FOR_REQUESTER: { label: "Waiting for Requester", className: "badge-status-waiting bg-warning-subtle text-warning-emphasis border border-warning-subtle" },
      RESOLVED: { label: "Resolved", className: "badge-status-resolved" },
      CLOSED: { label: "Closed", className: "badge-status-closed" },
      REOPENED: { label: "Reopened", className: "badge-status-reopened bg-danger-subtle text-danger-emphasis border border-danger-subtle" },
      CANCELLED: { label: "Cancelled", className: "badge-status-cancelled bg-secondary-subtle text-secondary-emphasis border" },
    };
    const s = badgeMap[status] || { label: status, className: "badge bg-secondary" };
    return <span className={`badge ${s.className} text-nowrap`}>{s.label}</span>;
  };

  const getPriorityBadge = (priority?: TicketPriority) => {
    const p = priority || "MEDIUM";
    const badgeMap: Record<string, { label: string; className: string }> = {
      LOW: { label: "Low", className: "badge-priority-low" },
      MEDIUM: { label: "Medium", className: "badge-priority-medium" },
      HIGH: { label: "High", className: "badge-priority-high" },
      URGENT: { label: "Urgent", className: "badge-priority-urgent" },
    };
    const item = badgeMap[p] || { label: p, className: "badge bg-secondary" };
    return <span className={`badge ${item.className} text-nowrap`}>{item.label}</span>;
  };

  return (
    <div className="d-flex flex-column gap-3" data-testid="staff-ticket-queue">
      {/* Metrics Bar */}
      <div className="row g-2 g-md-3" data-testid="queue-metrics-bar">
        <div className="col-6 col-lg-3">
          <div
            className={`card p-3 h-100 cursor-pointer border ${ownerFilter === "ALL" && statusFilter === "ALL" ? "border-success shadow-sm bg-success-subtle" : "bg-white"}`}
            onClick={() => {
              setOwnerFilter("ALL");
              setStatusFilter("ALL");
            }}
            data-testid="metric-all-tickets"
            role="button"
          >
            <span className="text-muted small fw-semibold">All Tickets</span>
            <div className="fs-4 fw-bold text-dark">{counts.all}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div
            className={`card p-3 h-100 cursor-pointer border ${ownerFilter === "unassigned" ? "border-danger shadow-sm bg-danger-subtle" : "bg-white"}`}
            onClick={() => setOwnerFilter("unassigned")}
            data-testid="metric-unassigned-tickets"
            role="button"
          >
            <span className="text-danger small fw-semibold">Unassigned</span>
            <div className="fs-4 fw-bold text-danger">{counts.unassigned}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div
            className={`card p-3 h-100 cursor-pointer border ${ownerFilter === "me" ? "border-primary shadow-sm bg-primary-subtle" : "bg-white"}`}
            onClick={() => setOwnerFilter("me")}
            data-testid="metric-my-tickets"
            role="button"
          >
            <span className="text-primary small fw-semibold">Assigned to Me</span>
            <div className="fs-4 fw-bold text-primary">{counts.myTickets}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div
            className={`card p-3 h-100 cursor-pointer border ${statusFilter === "IN_PROGRESS" ? "border-warning shadow-sm bg-warning-subtle" : "bg-white"}`}
            onClick={() => setStatusFilter("IN_PROGRESS")}
            data-testid="metric-in-progress-tickets"
            role="button"
          >
            <span className="text-warning-emphasis small fw-semibold">In Progress</span>
            <div className="fs-4 fw-bold text-warning-emphasis">{counts.inProgress}</div>
          </div>
        </div>
      </div>

      {/* Action / Feedback Alerts */}
      {actionFeedback && (
        <div className="alert alert-success py-2 px-3 small mb-0 d-flex align-items-center justify-content-between" role="alert">
          <span>✓ {actionFeedback}</span>
          <button type="button" className="btn-close btn-close-white small" onClick={() => setActionFeedback(null)} />
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger py-2 px-3 small mb-0 d-flex align-items-center justify-content-between" role="alert">
          <span>{errorMessage}</span>
          <button type="button" className="btn-close small" onClick={() => setErrorMessage(null)} />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card p-3 bg-white shadow-sm border rounded-3" data-testid="queue-filter-card">
        <div className="row g-2 align-items-center">
          {/* Search */}
          <div className="col-12 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-muted" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg></span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search ticket #, title, requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="queue-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="queue-status-filter"
            >
              <option value="ALL">Status: All</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select
              className="form-select form-select-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              data-testid="queue-priority-filter"
            >
              <option value="ALL">Priority: All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select
              className="form-select form-select-sm"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              data-testid="queue-owner-filter"
            >
              <option value="ALL">Owner: All</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-sm-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              data-testid="queue-category-filter"
            >
              <option value="ALL">Category: All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List Table / Card View */}
      <div className="card shadow-sm border rounded-3 overflow-hidden bg-white">
        {isLoading ? (
          <div className="text-center py-5" data-testid="queue-loading">
            <div className="spinner-border text-success mb-2" role="status" />
            <div className="text-muted small">Loading ticket queue...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-5" data-testid="queue-empty-state">
            <div className="fs-2 mb-2 text-muted"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2.5z"/></svg></div>
            <h6 className="fw-bold text-dark">No tickets found</h6>
            <p className="text-muted small mb-3">
              {search || statusFilter !== "ALL" || priorityFilter !== "ALL" || ownerFilter !== "ALL"
                ? "Try adjusting your search query or clear filters to see more results."
                : "The queue is clear! No tickets currently require action."}
            </p>
            {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || ownerFilter !== "ALL" || categoryFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                  setOwnerFilter("ALL");
                  setCategoryFilter("ALL");
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" data-testid="staff-ticket-table">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === "ticketNumber") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("ticketNumber");
                        setSortDir("asc");
                      }
                    }}
                  >
                    Ticket # {sortBy === "ticketNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Summary</th>
                  <th>Requester</th>
                  <th>Status</th>
                  <th
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === "itPriority") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("itPriority");
                        setSortDir("desc");
                      }
                    }}
                  >
                    IT Priority {sortBy === "itPriority" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Assigned Owner</th>
                  <th
                    className="cursor-pointer text-end"
                    onClick={() => {
                      if (sortBy === "createdAt") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("createdAt");
                        setSortDir("desc");
                      }
                    }}
                  >
                    Created {sortBy === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const isUnassigned = !t.ownerId && !t.owner;
                  const isClaimedByMe = t.ownerId === user?.id;

                  return (
                    <tr
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => onViewTicket(t.id)}
                      data-testid={`queue-row-${t.id}`}
                    >
                      <td className="fw-semibold text-primary text-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 260 }}>
                          {t.title || t.summary}
                        </div>
                        <div className="text-muted small">
                          {t.category?.name || "General"}
                        </div>
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark text-truncate" style={{ maxWidth: 160 }}>
                          {t.requester?.name || t.requester?.fullName || "Unknown"}
                        </div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 160 }}>
                          {t.requester?.department || t.requester?.email || ""}
                        </div>
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>{getPriorityBadge(t.itPriority || t.priority)}</td>
                      <td>
                        {isUnassigned ? (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                            Unassigned
                          </span>
                        ) : (
                          <span
                            className={`badge ${isClaimedByMe ? "bg-primary-subtle text-primary border border-primary-subtle" : "bg-light text-dark border"}`}
                          >
                            {isClaimedByMe ? "You" : t.owner?.name || t.owner?.fullName || "Assigned"}
                          </span>
                        )}
                      </td>
                      <td className="small text-muted text-end text-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        {isUnassigned ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm px-2 py-1"
                            onClick={(e) => handleClaimTicket(t.id, e)}
                            disabled={claimingId === t.id}
                            data-testid={`claim-btn-${t.id}`}
                          >
                            {claimingId === t.id ? "Claiming..." : "Claim"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-light btn-sm px-2 py-1 border"
                            onClick={() => onViewTicket(t.id)}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-top small text-muted flex-wrap gap-2">
            <div>
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
            </div>
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-2"
                onClick={() => loadTickets(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                data-testid="queue-prev-page-btn"
              >
                ◀ Previous
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-2"
                onClick={() => loadTickets(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                data-testid="queue-next-page-btn"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffTicketQueueScreen;
