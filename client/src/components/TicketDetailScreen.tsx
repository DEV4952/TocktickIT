import React, { useEffect, useState, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchTicketById,
  fetchTicketAttachments,
  uploadTicketAttachment,
  downloadAttachment,
  removeAttachment,
} from "../api.js";
import { Ticket, Attachment } from "../types.js";

interface TicketDetailScreenProps {
  ticketIdOrNumber: string | number;
  onBack: () => void;
}

export function TicketDetailScreen({ ticketIdOrNumber, onBack }: TicketDetailScreenProps) {
  const { currentRequester } = useRequester();

  // Ticket Data States
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<"not_found" | "unauthorized" | "generic" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Remove Modal States
  const [removingAttachment, setRemovingAttachment] = useState<Attachment | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Load ticket & attachment data
  const loadData = useCallback(async () => {
    if (!currentRequester) return;
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const ticketData = await fetchTicketById(ticketIdOrNumber, currentRequester.id);
      setTicket(ticketData);

      // Load full attachment metadata list
      try {
        const attList = await fetchTicketAttachments(ticketIdOrNumber, currentRequester.id);
        setAttachments(attList);
      } catch {
        // Fallback to ticket.attachments
        setAttachments(ticketData.attachments || []);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Failed to load ticket.";
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("access") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("forbidden")
      ) {
        setErrorStatus("unauthorized");
      } else if (msg.toLowerCase().includes("not found")) {
        setErrorStatus("not_found");
      } else {
        setErrorStatus("generic");
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [ticketIdOrNumber, currentRequester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format Helper
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFormatLabel = (mime: string, name: string) => {
    if (mime.includes("png") || name.endsWith(".png")) return "PNG";
    if (mime.includes("jpeg") || mime.includes("jpg") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "JPG";
    if (mime.includes("webp") || name.endsWith(".webp")) return "WEBP";
    if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
    if (mime.includes("plain") || name.endsWith(".txt")) return "TXT";
    return "FILE";
  };

  const activeAttachments = attachments.filter((a) => !a.isDeleted && !a.deletedAt);
  const isMaxAttachmentsReached = activeAttachments.length >= 5;

  // Handle Attachment Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRequester) return;

    // Reset input so change triggers again
    e.target.value = "";
    setUploadError(null);

    // Validation 1: Allowed Types
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];

    if (!allowedExtensions.includes(ext) && !allowedMimes.includes(file.type)) {
      setUploadError("File type is not supported. Please upload JPG, PNG, WEBP, PDF, or TXT.");
      return;
    }

    // Validation 2: Maximum 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must not exceed 5 MB.");
      return;
    }

    // Validation 3: Maximum 5 Active Attachments
    if (activeAttachments.length >= 5) {
      setUploadError("Maximum of 5 active attachments reached.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadTicketAttachment(ticketIdOrNumber, file, currentRequester.id);
      // Reload attachments
      const updated = await fetchTicketAttachments(ticketIdOrNumber, currentRequester.id);
      setAttachments(updated);
    } catch (err: any) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload attachment. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Download
  const handleDownload = async (attachment: Attachment) => {
    if (!currentRequester) return;
    try {
      await downloadAttachment(attachment.id, attachment.fileName, currentRequester.id);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Failed to download attachment.");
    }
  };

  // Handle Soft-Remove Confirmation Submit
  const handleConfirmRemove = async () => {
    if (!removingAttachment || !currentRequester) return;
    setIsRemoving(true);
    setRemoveError(null);

    try {
      await removeAttachment(removingAttachment.id, currentRequester.id, removeReason.trim() || undefined);
      // Update local attachment list
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === removingAttachment.id
            ? { ...a, isDeleted: true, deletedAt: new Date().toISOString(), removalReason: removeReason.trim() || "User removed" }
            : a
        )
      );
      setRemovingAttachment(null);
      setRemoveReason("");
    } catch (err: any) {
      setRemoveError(err instanceof Error ? err.message : "Unable to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="card zen-card p-5 text-center my-4" data-testid="detail-loading-state">
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading ticket...</span>
        </div>
        <h5 className="fw-semibold text-dark mb-1">Loading ticket details...</h5>
        <p className="text-muted small mb-0">Retrieving ticket metadata and diagnostic attachments.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Unauthorized State
  // ---------------------------------------------------------------------------
  if (errorStatus === "unauthorized") {
    return (
      <div className="card zen-card p-5 text-center my-4 border-warning" data-testid="detail-unauthorized-state">
        <h4 className="fw-bold text-dark mb-2">Access Denied</h4>
        <p className="text-muted small mb-4">
          You do not have access to this ticket. Tickets are strictly isolated by requester.
        </p>
        <div>
          <button type="button" className="btn btn-zen px-4" onClick={onBack} data-testid="unauthorized-back-btn">
            Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Not Found / Error State
  // ---------------------------------------------------------------------------
  if (errorStatus === "not_found" || !ticket) {
    return (
      <div className="card zen-card p-5 text-center my-4" data-testid="detail-not-found-state">
        <h4 className="fw-bold text-dark mb-2">Ticket not found</h4>
        <p className="text-muted small mb-4">
          {errorMessage || "The requested ticket could not be found."}
        </p>
        <div>
          <button type="button" className="btn btn-zen px-4" onClick={onBack} data-testid="not-found-back-btn">
            Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  // Status & Priority Helper Badges
  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "OPEN": return "badge-status-open";
      case "IN_PROGRESS": return "badge-status-in-progress";
      case "RESOLVED": return "badge-status-resolved";
      case "CLOSED": return "badge-status-closed";
      default: return "bg-light text-dark border";
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "URGENT": return "badge-priority-urgent";
      case "HIGH": return "badge-priority-high";
      case "LOW": return "badge-priority-low";
      default: return "badge-priority-medium";
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Ticket Detail Main View
  // ---------------------------------------------------------------------------
  return (
    <div className="d-flex flex-column gap-4" data-testid="ticket-detail-screen">
      {/* Header Navigation & Summary Slide */}
      <div className="zen-section-slide" data-testid="ticket-header-slide">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center pb-3 mb-3 border-bottom gap-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              onClick={onBack}
              data-testid="back-to-tickets-btn"
            >
              Back to My Tickets
            </button>
            <div>
              <span className="text-muted small d-block">Ticket Identifier</span>
              <code className="fs-5 fw-bold text-dark text-break" data-testid="header-ticket-number">
                {ticket.ticketNumber}
              </code>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className={`badge ${getStatusBadgeClass(ticket.status)} px-3 py-2 fs-6`} data-testid="header-ticket-status">
              {ticket.status.replace("_", " ")}
            </span>
            <span className={`badge ${getPriorityBadgeClass(ticket.priority)} px-3 py-2 fs-6`} data-testid="header-ticket-priority">
              {ticket.priority} Priority
            </span>
          </div>
        </div>

        {/* Read-Only Ticket Information Grid */}
        <div className="row g-3 small" data-testid="ticket-info-grid">
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Ticket Number:</span>
            <strong className="text-dark font-monospace" data-testid="ticket-info-number">
              {ticket.ticketNumber}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Ticket Date:</span>
            <strong className="text-dark" data-testid="ticket-info-date">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Requester:</span>
            <strong className="text-dark" data-testid="ticket-info-requester">
              {ticket.requester?.name || currentRequester?.name} ({ticket.requester?.department || currentRequester?.department})
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Category:</span>
            <strong className="text-dark" data-testid="ticket-info-category">
              {ticket.category?.name || "General"}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Related System:</span>
            <strong className="text-dark" data-testid="ticket-info-system">
              {ticket.relatedSystem || "None specified"}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <span className="text-muted d-block">Requested Priority:</span>
            <strong className="text-dark" data-testid="ticket-info-priority">
              {ticket.priority}
            </strong>
          </div>
        </div>
      </div>

      {/* Ticket Summary & Description Slide */}
      <div className="card zen-card p-4" data-testid="ticket-content-card">
        <div className="mb-4">
          <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Ticket Summary</span>
          <h4 className="fw-bold text-dark mb-0" data-testid="ticket-info-summary">
            {ticket.title}
          </h4>
        </div>

        <div>
          <span className="text-muted small text-uppercase fw-semibold d-block mb-2">Description</span>
          <div
            className="p-3 bg-light border rounded-3 text-break lh-base"
            style={{ whiteSpace: "pre-wrap" }}
            data-testid="ticket-info-description"
          >
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Attachments Section Slide */}
      <div className="card zen-card p-4" data-testid="ticket-attachments-card">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-3 mb-3 border-bottom gap-2">
          <div>
            <h5 className="fw-bold text-dark mb-1">
              Diagnostic Attachments
            </h5>
            <p className="text-muted small mb-0">
              Supporting logs and screenshots ({activeAttachments.length}/5 active files)
            </p>
          </div>

          <div className="position-relative">
            <input
              type="file"
              id="detail-attachment-file"
              className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
              onChange={handleFileSelect}
              disabled={isUploading || isMaxAttachmentsReached}
              data-testid="attachment-file-input"
            />
            <button
              type="button"
              className="btn btn-zen btn-sm d-flex align-items-center gap-2"
              disabled={isUploading || isMaxAttachmentsReached}
              data-testid="add-attachment-btn"
            >
              {isUploading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>+ Add Attachment</span>
              )}
            </button>
          </div>
        </div>

        {/* Upload Warning / Error Alert */}
        {uploadError && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert" data-testid="upload-error-alert">
            {uploadError}
          </div>
        )}

        {isMaxAttachmentsReached && (
          <div className="alert alert-secondary py-2 px-3 small mb-3 text-muted" role="alert" data-testid="max-attachments-alert">
            Maximum of 5 active attachments reached.
          </div>
        )}

        {/* Attachment List / Empty State */}
        {attachments.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-3 border" data-testid="empty-attachments">
            <h6 className="fw-bold text-dark mb-1">No attachments</h6>
            <p className="text-muted small mb-3">
              No supporting files have been attached to this ticket yet.
            </p>
            <label htmlFor="detail-attachment-file" className="btn btn-outline-success btn-sm px-3 cursor-pointer">
              Add Attachment
            </label>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2" data-testid="attachments-list">
            {attachments.map((att) => {
              const isRemoved = Boolean(att.isDeleted || att.deletedAt);
              return (
                <div
                  key={att.id}
                  className={`d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center p-3 border rounded-3 ${
                    isRemoved ? "bg-light-subtle text-muted border-dashed" : "bg-white shadow-sm"
                  } gap-3`}
                  data-testid={`attachment-item-${att.id}`}
                >
                  <div className="min-w-0 w-100">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="fw-semibold text-dark text-break" data-testid={`attachment-name-${att.id}`}>
                        {att.fileName}
                      </span>
                      <span className="badge bg-light text-muted border small">
                        {getFormatLabel(att.fileType, att.fileName)} · {formatFileSize(att.fileSize)}
                      </span>
                      {isRemoved && (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle small" data-testid={`removed-badge-${att.id}`}>
                          Removed
                        </span>
                      )}
                    </div>

                    {isRemoved && (
                      <div className="text-muted small mt-1 text-break" data-testid={`removed-meta-${att.id}`}>
                        Removed: {att.deletedAt ? new Date(att.deletedAt).toLocaleDateString() : "Recently"}
                        {att.removalReason && ` • Reason: ${att.removalReason}`}
                      </div>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-2 align-self-stretch align-self-sm-center justify-content-end">
                    {!isRemoved ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm px-3"
                          onClick={() => handleDownload(att)}
                          data-testid={`download-attachment-btn-${att.id}`}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm px-3"
                          onClick={() => {
                            setRemovingAttachment(att);
                            setRemoveReason("");
                            setRemoveError(null);
                          }}
                          data-testid={`remove-attachment-btn-${att.id}`}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="badge bg-secondary-subtle text-muted border px-3 py-2 small">
                        Removed (No Download)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="d-flex justify-content-start pb-4">
        <button
          type="button"
          className="btn btn-outline-secondary px-4"
          onClick={onBack}
          data-testid="bottom-back-btn"
        >
          ← Back to My Tickets
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Remove Attachment Confirmation Modal                               */}
      {/* ------------------------------------------------------------------ */}
      {removingAttachment && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
          data-testid="remove-confirm-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-light border-bottom px-4 py-3">
                <h5 className="modal-title fw-bold text-dark">Remove Attachment?</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setRemovingAttachment(null)}
                  disabled={isRemoving}
                />
              </div>

              <div className="modal-body p-4">
                <p className="text-muted small mb-3">
                  Are you sure you want to remove <strong>"{removingAttachment.fileName}"</strong>? The file will be soft-removed and its download action disabled.
                </p>

                {removeError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                    {removeError}
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="remove-reason" className="form-label small fw-semibold text-muted">
                    Removal Reason (Optional)
                  </label>
                  <input
                    type="text"
                    id="remove-reason"
                    className="form-control form-control-sm"
                    placeholder="e.g. Duplicate file, outdated log"
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    disabled={isRemoving}
                    data-testid="remove-reason-input"
                  />
                </div>
              </div>

              <div className="modal-footer bg-light border-top px-4 py-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setRemovingAttachment(null)}
                  disabled={isRemoving}
                  data-testid="cancel-remove-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 d-flex align-items-center gap-2"
                  onClick={handleConfirmRemove}
                  disabled={isRemoving}
                  data-testid="confirm-remove-btn"
                >
                  {isRemoving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <span>Remove Attachment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TicketDetailScreen;
