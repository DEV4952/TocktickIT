import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTickets, fetchCategories } from "../api.js";
import { TicketSummary, PaginationMetadata, TicketMetrics, Category } from "../types.js";
import { TicketDetailModal } from "./TicketDetailModal.js";

interface MyTicketsScreenProps {
  onNavigateToNewTicket: () => void;
  onViewTicket?: (ticketIdOrNumber: string | number) => void;
}

export function MyTicketsScreen({ onNavigateToNewTicket, onViewTicket }: MyTicketsScreenProps) {
  const { currentRequester } = useRequester();

  // Data States
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [metrics, setMetrics] = useState<TicketMetrics>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });

  // Categories list for filter dropdown
  const [categories, setCategories] = useState<Category[]>([]);

  // Query & Filter States
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [categoryId, setCategoryId] = useState("ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "priority" | "ticketNumber" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // UI Status States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);

  // Load Categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCats() {
      try {
        const list = await fetchCategories();
        if (isMounted) setCategories(list);
      } catch {
        // non-blocking for category dropdown
      }
    }
    loadCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Tickets
  const loadTickets = useCallback(async () => {
    if (!currentRequester) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTickets(currentRequester.id, {
        page,
        limit,
        search,
        status,
        priority,
        categoryId,
        sortBy,
        sortOrder,
      });
      setTickets(response.data);
      setPagination(response.pagination);
      setMetrics(response.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [currentRequester, page, limit, search, status, priority, categoryId, sortBy, sortOrder]);

  // Load tickets on dependency change
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setCategoryId("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const isFilteringActive =
    search.trim() !== "" || status !== "ALL" || priority !== "ALL" || categoryId !== "ALL";

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT": return <span className="badge badge-priority-urgent">URGENT</span>;
      case "HIGH": return <span className="badge badge-priority-high">HIGH</span>;
      case "LOW": return <span className="badge badge-priority-low">LOW</span>;
      default: return <span className="badge badge-priority-medium">MEDIUM</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "OPEN": return <span className="badge badge-status-open">OPEN</span>;
      case "IN_PROGRESS": return <span className="badge badge-status-in-progress">IN PROGRESS</span>;
      case "RESOLVED": return <span className="badge badge-status-resolved">RESOLVED</span>;
      case "CLOSED": return <span className="badge badge-status-closed">CLOSED</span>;
      default: return <span className="badge bg-light text-dark border">{s}</span>;
    }
  };

  if (!currentRequester) {
    return (
      <div className="alert alert-warning" role="alert">
        Please select a development requester persona.
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4" data-testid="my-tickets-screen">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: HERO & METRICS SLIDE                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="zen-section-slide" data-testid="hero-section">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-3 mb-3 border-bottom gap-2">
          <div>
            <h4 className="fw-bold mb-1 text-dark">
              My IT Tickets
            </h4>
            <p className="text-muted small mb-0">
              Overview and tracking of service requests submitted under your persona.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-zen d-flex align-items-center gap-2"
            onClick={onNavigateToNewTicket}
            disabled={!currentRequester.isActive}
            data-testid="header-create-ticket-btn"
          >
            <span>Submit New Ticket</span>
          </button>
        </div>

        {/* Metrics Summary Cards */}
        <div className="row g-3" data-testid="metrics-summary-bar">
          <div className="col-6 col-md-3">
            <div
              className={`zen-stat-card text-center ${status === "ALL" ? "active-stat" : ""}`}
              onClick={() => { setStatus("ALL"); setPage(1); }}
              data-testid="metric-card-total"
              role="button"
              tabIndex={0}
            >
              <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>Total Tickets</div>
              <div className="display-6 fw-bold text-dark my-1" data-testid="metric-val-total">
                {metrics.total}
              </div>
              <span className="badge bg-light text-muted border small">All statuses</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div
              className={`zen-stat-card text-center ${status === "OPEN" ? "active-stat" : ""}`}
              onClick={() => { setStatus("OPEN"); setPage(1); }}
              data-testid="metric-card-open"
              role="button"
              tabIndex={0}
            >
              <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>Open</div>
              <div className="display-6 fw-bold text-success my-1" data-testid="metric-val-open">
                {metrics.open}
              </div>
              <span className="badge badge-status-open small">Awaiting Triage</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div
              className={`zen-stat-card text-center ${status === "IN_PROGRESS" ? "active-stat" : ""}`}
              onClick={() => { setStatus("IN_PROGRESS"); setPage(1); }}
              data-testid="metric-card-in-progress"
              role="button"
              tabIndex={0}
            >
              <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>In Progress</div>
              <div className="display-6 fw-bold text-warning my-1" data-testid="metric-val-in-progress">
                {metrics.inProgress}
              </div>
              <span className="badge badge-status-in-progress small">Under Review</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div
              className={`zen-stat-card text-center ${status === "RESOLVED" ? "active-stat" : ""}`}
              onClick={() => { setStatus("RESOLVED"); setPage(1); }}
              data-testid="metric-card-resolved"
              role="button"
              tabIndex={0}
            >
              <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>Resolved</div>
              <div className="display-6 fw-bold text-primary my-1" data-testid="metric-val-resolved">
                {metrics.resolved}
              </div>
              <span className="badge badge-status-resolved small">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2 & 3: CONTROLS & TICKET LIST SLIDE                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="card zen-card p-4" data-testid="tickets-main-card">
        {/* Search and Filters Toolbar */}
        <div className="row g-2 mb-4 align-items-center" data-testid="filter-toolbar">
          <div className="col-12 col-md-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search number, title, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  data-testid="search-input"
                />
                <button type="submit" className="btn btn-outline-secondary px-3" data-testid="search-submit-btn">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              aria-label="Filter by Status"
              data-testid="filter-status-select"
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              aria-label="Filter by Priority"
              data-testid="filter-priority-select"
            >
              <option value="ALL">Priority: All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              aria-label="Filter by Category"
              data-testid="filter-category-select"
            >
              <option value="ALL">Category: All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-") as [any, any];
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              aria-label="Sort tickets"
              data-testid="sort-select"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="priority-desc">Priority</option>
              <option value="title-asc">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges & Reset */}
        {isFilteringActive && (
          <div className="d-flex align-items-center gap-2 mb-3 flex-wrap small" data-testid="active-filters-bar">
            <span className="text-muted fw-semibold">Active Filters:</span>
            {search && (
              <span className="badge bg-light text-dark border">
                Search: "{search}"
              </span>
            )}
            {status !== "ALL" && (
              <span className="badge bg-light text-dark border">
                Status: {status}
              </span>
            )}
            {priority !== "ALL" && (
              <span className="badge bg-light text-dark border">
                Priority: {priority}
              </span>
            )}
            {categoryId !== "ALL" && (
              <span className="badge bg-light text-dark border">
                Category: {categories.find((c) => String(c.id) === String(categoryId))?.name || categoryId}
              </span>
            )}
            <button
              type="button"
              className="btn btn-link btn-sm text-danger p-0 ms-2"
              onClick={handleResetFilters}
              data-testid="reset-filters-btn"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* UI STATES                                                          */}
        {/* ------------------------------------------------------------------ */}

        {/* 1. Loading State */}
        {isLoading ? (
          <div className="text-center py-5" data-testid="loading-state">
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Loading tickets...</span>
            </div>
            <h6 className="fw-semibold text-muted">Loading your tickets...</h6>
          </div>
        ) : error ? (
          /* 2. API Error State */
          <div className="alert alert-danger p-4 text-center my-3" data-testid="error-state">
            <h5 className="fw-bold mb-2">Unable to Load Tickets</h5>
            <p className="text-muted small mb-3">{error}</p>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-4"
              onClick={loadTickets}
              data-testid="retry-btn"
            >
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          isFilteringActive ? (
            /* 3. No Results State */
            <div className="text-center py-5 my-3 bg-light rounded-3 border" data-testid="no-results-state">
              <h5 className="fw-bold text-dark">No Matching Tickets Found</h5>
              <p className="text-muted small mb-3">
                No tickets match your search keywords or active filters. Try adjusting your criteria.
              </p>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={handleResetFilters}
                data-testid="no-results-clear-btn"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* 4. Empty State */
            <div className="text-center py-5 my-3 bg-light rounded-3 border" data-testid="empty-state">
              <h5 className="fw-bold text-dark">You don't have any tickets yet</h5>
              <p className="text-muted small mb-3">
                Need help with hardware, software, or access permissions? Submit your first support ticket.
              </p>
              <button
                type="button"
                className="btn btn-zen btn-sm px-4"
                onClick={onNavigateToNewTicket}
                disabled={!currentRequester.isActive}
                data-testid="empty-create-ticket-btn"
              >
                Submit Your First Ticket
              </button>
            </div>
          )
        ) : (
          /* Tickets Table & Mobile List */
          <div>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle border mb-0" data-testid="tickets-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: "16%" }}>Ticket #</th>
                    <th scope="col" style={{ width: "34%" }}>Summary / Title</th>
                    <th scope="col" style={{ width: "14%" }}>Category</th>
                    <th scope="col" style={{ width: "12%" }}>Priority</th>
                    <th scope="col" style={{ width: "12%" }}>Status</th>
                    <th scope="col" style={{ width: "12%" }} className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => (onViewTicket ? onViewTicket(t.ticketNumber) : setSelectedTicketId(t.ticketNumber))}
                      className="cursor-pointer"
                      data-testid={`ticket-row-${t.id}`}
                    >
                      <td>
                        <code className="fw-bold text-dark">{t.ticketNumber}</code>
                        {t.attachmentCount > 0 && (
                          <span className="badge bg-light text-muted border ms-1 small" title={`${t.attachmentCount} attachments`}>
                            {t.attachmentCount} files
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 320 }} data-testid={`ticket-title-${t.id}`}>
                          {t.title}
                        </div>
                        <div className="text-muted small">
                          Created {new Date(t.createdAt).toLocaleDateString()}
                          {t.relatedSystem && ` • System: ${t.relatedSystem}`}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          {t.category?.name || "General"}
                        </span>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm py-0 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewTicket) {
                              onViewTicket(t.ticketNumber);
                            } else {
                              setSelectedTicketId(t.ticketNumber);
                            }
                          }}
                          data-testid={`view-ticket-btn-${t.id}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="d-flex flex-column gap-3 d-md-none" data-testid="tickets-mobile-list">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="card p-3 border rounded-3 bg-light cursor-pointer shadow-sm"
                  onClick={() => (onViewTicket ? onViewTicket(t.ticketNumber) : setSelectedTicketId(t.ticketNumber))}
                  data-testid={`ticket-mobile-card-${t.id}`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <code className="fw-bold text-dark">{t.ticketNumber}</code>
                    <div className="d-flex gap-1">
                      {getPriorityBadge(t.priority)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>
                  <h6 className="fw-semibold mb-1 text-dark">{t.title}</h6>
                  <div className="d-flex justify-content-between align-items-center text-muted small mt-2">
                    <span>{t.category?.name}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* SECTION 4: PAGINATION SECTION                                  */}
            {/* -------------------------------------------------------------- */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-3 mt-3 border-top" data-testid="pagination-bar">
              <div className="d-flex align-items-center gap-2 small text-muted">
                <span>
                  Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} -{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
                </span>
                <span className="mx-1">•</span>
                <div className="d-flex align-items-center gap-1">
                  <span>Per page:</span>
                  <select
                    className="form-select form-select-sm py-0 px-2"
                    style={{ width: "auto" }}
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    data-testid="limit-select"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <nav aria-label="Ticket Pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${!pagination.hasPrev ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrev}
                        data-testid="prev-page-btn"
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${p === pagination.page ? "active" : ""}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPage(p)}
                          data-testid={`page-btn-${p}`}
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${!pagination.hasNext ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={!pagination.hasNext}
                        data-testid="next-page-btn"
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicketId !== null && (
        <TicketDetailModal
          ticketIdOrNumber={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
export default MyTicketsScreen;
