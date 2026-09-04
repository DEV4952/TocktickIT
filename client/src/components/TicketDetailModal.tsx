import React, { useEffect, useState } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTicketById } from "../api.js";
import { Ticket } from "../types.js";

interface TicketDetailModalProps {
  ticketIdOrNumber: string | number;
  onClose: () => void;
}

export function TicketDetailModal({ ticketIdOrNumber, onClose }: TicketDetailModalProps) {
  const { currentRequester } = useRequester();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTicket() {
      if (!currentRequester) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTicketById(ticketIdOrNumber, currentRequester.id);
        if (isMounted) {
          setTicket(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load ticket details");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTicket();
    return () => {
      isMounted = false;
    };
  }, [ticketIdOrNumber, currentRequester]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "URGENT": return "badge badge-priority-urgent";
      case "HIGH": return "badge badge-priority-high";
      case "LOW": return "badge badge-priority-low";
      default: return "badge badge-priority-medium";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN": return "badge badge-status-open";
      case "IN_PROGRESS": return "badge badge-status-in-progress";
      case "RESOLVED": return "badge badge-status-resolved";
      case "CLOSED": return "badge badge-status-closed";
      default: return "badge bg-light text-dark border";
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
      data-testid="ticket-detail-modal"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 rounded-3">
          <div className="modal-header bg-light border-bottom px-4 py-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge bg-dark-subtle text-dark border font-monospace px-2 py-1 fs-6" data-testid="detail-ticket-number">
                {ticket?.ticketNumber || ticketIdOrNumber}
              </span>
              {ticket && (
                <>
                  <span className={`${getStatusBadgeClass(ticket.status)} px-2 py-1`} data-testid="detail-ticket-status">
                    {ticket.status.replace("_", " ")}
                  </span>
                  <span className={`${getPriorityBadgeClass(ticket.priority)} px-2 py-1`} data-testid="detail-ticket-priority">
                    {ticket.priority} Priority
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              data-testid="close-modal-btn"
            />
          </div>

          <div className="modal-body p-4">
            {isLoading ? (
              <div className="text-center py-5" data-testid="detail-loading-state">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted small">Loading ticket details...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger my-3" role="alert" data-testid="detail-error-state">
                <h6 className="fw-bold mb-1">Unable to Load Ticket</h6>
                <p className="mb-0 small">{error}</p>
              </div>
            ) : ticket ? (
              <div>
                <h4 className="fw-bold mb-3 text-dark" data-testid="detail-ticket-title">
                  {ticket.title}
                </h4>

                {/* Metadata Row */}
                <div className="row g-3 p-3 bg-light rounded-3 border mb-4 small">
                  <div className="col-12 col-sm-6 col-md-4">
                    <span className="text-muted d-block">Category:</span>
                    <strong className="text-dark">{ticket.category?.name || "General"}</strong>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4">
                    <span className="text-muted d-block">Related System:</span>
                    <strong className="text-dark">{ticket.relatedSystem || "None specified"}</strong>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4">
                    <span className="text-muted d-block">Requester:</span>
                    <strong className="text-dark">
                      {ticket.requester?.name} ({ticket.requester?.department})
                    </strong>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4">
                    <span className="text-muted d-block">Submitted:</span>
                    <span className="text-dark">{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4">
                    <span className="text-muted d-block">Last Updated:</span>
                    <span className="text-dark">{new Date(ticket.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h6 className="fw-bold text-muted text-uppercase small mb-2">Description</h6>
                  <div className="p-3 bg-white border rounded-3 text-break lh-base" style={{ whiteSpace: "pre-wrap" }} data-testid="detail-ticket-description">
                    {ticket.description}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <h6 className="fw-bold text-muted text-uppercase small mb-2 d-flex align-items-center justify-content-between">
                    <span>Diagnostic Attachments</span>
                    <span className="badge bg-secondary-subtle text-secondary border">
                      {ticket.attachments?.length || 0} files
                    </span>
                  </h6>
                  {ticket.attachments && ticket.attachments.length > 0 ? (
                    <div className="d-flex flex-column gap-2" data-testid="detail-attachments-list">
                      {ticket.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="d-flex align-items-center justify-content-between p-2 px-3 border rounded-3 bg-light"
                          data-testid={`attachment-row-${att.id}`}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-light text-muted border small">File</span>
                            <span className="fw-medium small text-truncate" style={{ maxWidth: 350 }}>
                              {att.fileName}
                            </span>
                            <span className="badge bg-white text-muted border small">
                              {formatFileSize(att.fileSize)}
                            </span>
                          </div>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-success py-0 px-2"
                            style={{ fontSize: "0.75rem" }}
                          >
                            View / Download
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small mb-0 italic">No attachments attached to this ticket.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="modal-footer bg-light border-top px-4 py-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm px-3"
              onClick={onClose}
              data-testid="modal-close-footer-btn"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TicketDetailModal;
