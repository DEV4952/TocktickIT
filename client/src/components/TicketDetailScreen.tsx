import React, { useEffect, useState, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchTicketById,
  fetchTicketAttachments,
  uploadTicketAttachment,
  downloadAttachment,
  removeAttachment,
  claimTicketApi,
  reassignTicketApi,
  updateTicketPriorityApi,
  updateTicketStatusApi,
  fetchAssignableStaffApi,
  fetchTicketComments,
  createTicketComment,
  fetchTicketInternalNotes,
  createTicketInternalNote,
  indicateProblemResolvedApi,
} from "../api.js";
import { Ticket, Attachment, TicketComment, InternalNote } from "../types.js";

import { useAuth } from "../context/AuthContext.js";

interface TicketDetailScreenProps {
  ticketIdOrNumber: string | number;
  onBack: () => void;
}

export function TicketDetailScreen({ ticketIdOrNumber, onBack }: TicketDetailScreenProps) {
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    // Fallback
  }

  let currentRequester = null;
  try {
    const reqCtx = useRequester();
    currentRequester = reqCtx?.currentRequester;
  } catch {
    // Fallback
  }

  const activeUser = authUser || currentRequester;

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
  const [removeSuccess, setRemoveSuccess] = useState<string | null>(null);

  // Operational Triage State (Issue #6)
  const isStaff = authUser?.role === "IT_STAFF" || authUser?.role === "ADMINISTRATOR";
  const [assignees, setAssignees] = useState<any[]>([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageFeedback, setTriageFeedback] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Communication States (Issue #7)
  const [commTab, setCommTab] = useState<"comments" | "notes">("comments");
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Requester Resolution State (Issue #7)
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveComment, setResolveComment] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isStaff) {
      fetchAssignableStaffApi()
        .then(setAssignees)
        .catch(() => {});
    }
  }, [isStaff]);

  const handleClaim = async () => {
    if (!ticket) return;
    setTriageLoading(true);
    setTriageError(null);
    setTriageFeedback(null);
    try {
      const res = await claimTicketApi(ticket.id);
      setTicket((prev: any) => ({
        ...prev,
        ownerId: res.ticket.ownerId,
        owner: res.ticket.owner,
      }));
      setTriageFeedback("Ticket successfully claimed!");
      setTimeout(() => setTriageFeedback(null), 3000);
    } catch (err: any) {
      setTriageError(err.message || "Failed to claim ticket.");
    } finally {
      setTriageLoading(false);
    }
  };

  const handleReassign = async (newOwnerIdStr: string) => {
    if (!ticket) return;
    const newOwnerId = newOwnerIdStr === "unassigned" ? null : parseInt(newOwnerIdStr, 10);
    setTriageLoading(true);
    setTriageError(null);
    setTriageFeedback(null);
    try {
      const res = await reassignTicketApi(ticket.id, newOwnerId);
      setTicket((prev: any) => ({
        ...prev,
        ownerId: res.ticket.ownerId,
        owner: res.ticket.owner,
      }));
      setTriageFeedback("Ticket ownership successfully updated!");
      setTimeout(() => setTriageFeedback(null), 3000);
    } catch (err: any) {
      setTriageError(err.message || "Failed to reassign ticket.");
    } finally {
      setTriageLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority: any) => {
    if (!ticket) return;
    setTriageLoading(true);
    setTriageError(null);
    setTriageFeedback(null);
    try {
      const res = await updateTicketPriorityApi(ticket.id, newPriority);
      setTicket((prev: any) => ({
        ...prev,
        itPriority: res.ticket.itPriority,
      }));
      setTriageFeedback("IT Priority successfully updated!");
      setTimeout(() => setTriageFeedback(null), 3000);
    } catch (err: any) {
      setTriageError(err.message || "Failed to update IT priority.");
    } finally {
      setTriageLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    setTriageLoading(true);
    setTriageError(null);
    setTriageFeedback(null);
    try {
      const res = await updateTicketStatusApi(ticket.id, newStatus);
      setTicket((prev: any) => ({
        ...prev,
        status: res.ticket.status,
      }));
      setTriageFeedback(`Status transitioned to ${newStatus}!`);
      setTimeout(() => setTriageFeedback(null), 3000);
    } catch (err: any) {
      setTriageError(err.message || "Disallowed status transition.");
    } finally {
      setTriageLoading(false);
    }
  };

  // Load ticket & attachment data
  const loadData = useCallback(async () => {
    if (!activeUser) return;
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const ticketData = await fetchTicketById(ticketIdOrNumber, activeUser.id);
      setTicket(ticketData);

      // Load full attachment metadata list
      try {
        const attList = await fetchTicketAttachments(ticketIdOrNumber, activeUser.id);
        setAttachments(attList);
      } catch {
        // Fallback to ticket.attachments
        setAttachments(ticketData.attachments || []);
      }

      // Load comments (Issue #7)
      try {
        const cList = await fetchTicketComments(ticketIdOrNumber, activeUser.id);
        setComments(cList);
      } catch {
        // ignore
      }

      // Load internal notes if staff (Issue #7)
      if (isStaff) {
        try {
          const nList = await fetchTicketInternalNotes(ticketIdOrNumber);
          setNotes(nList);
        } catch {
          // ignore
        }
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
  }, [ticketIdOrNumber, activeUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Communication Handlers (Issue #7)
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !ticket) return;
    setIsPostingComment(true);
    setCommentError(null);
    try {
      const newComment = await createTicketComment(ticket.id, commentInput.trim(), activeUser?.id);
      setComments((prev) => [...prev, newComment]);
      setCommentInput("");
      setCommentFeedback("Comment posted successfully!");
      setTimeout(() => setCommentFeedback(null), 3000);
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !ticket) return;
    setIsPostingNote(true);
    setNoteError(null);
    try {
      const newNote = await createTicketInternalNote(ticket.id, noteInput.trim());
      setNotes((prev) => [...prev, newNote]);
      setNoteInput("");
      setNoteFeedback("Internal note saved successfully!");
      setTimeout(() => setNoteFeedback(null), 3000);
    } catch (err: any) {
      setNoteError(err.message || "Failed to save internal note.");
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!ticket) return;
    setIsSubmittingResolve(true);
    setResolveError(null);
    try {
      await indicateProblemResolvedApi(ticket.id, resolveComment.trim() || undefined, activeUser?.id);
      setTicket((prev) => (prev ? { ...prev, problemAppearsResolved: true } : null));
      setShowResolveModal(false);
      setResolveComment("");
      setResolveSuccess("Thank you! Your resolution indication has been submitted.");
      setTimeout(() => setResolveSuccess(null), 4000);
      // Reload comments to see system comment
      try {
        const cList = await fetchTicketComments(ticket.id, activeUser?.id);
        setComments(cList);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setResolveError(err.message || "Failed to record resolution indication.");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

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
    if (!file || !activeUser) return;

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
      await uploadTicketAttachment(ticketIdOrNumber, file, activeUser.id);
      // Reload attachments
      const updated = await fetchTicketAttachments(ticketIdOrNumber, activeUser.id);
      setAttachments(updated);
    } catch (err: any) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload attachment. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Download
  const handleDownload = async (attachment: Attachment) => {
    if (!activeUser) return;
    try {
      await downloadAttachment(attachment.id, attachment.fileName, activeUser.id);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Failed to download attachment.");
    }
  };

  // Handle Soft-Remove Confirmation Submit
  const handleConfirmRemove = async () => {
    if (!removingAttachment || !activeUser) return;
    setIsRemoving(true);
    setRemoveError(null);

    try {
      await removeAttachment(removingAttachment.id, activeUser.id, removeReason.trim() || undefined);
      // Update local attachment list
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === removingAttachment.id
            ? { ...a, isDeleted: true, deletedAt: new Date().toISOString(), removalReason: removeReason.trim() || "User removed" }
            : a
        )
      );
      setRemoveSuccess(`Attachment "${removingAttachment.fileName}" was removed successfully.`);
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
            {!isStaff && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && ticket.status !== "CANCELLED" && (
              ticket.problemAppearsResolved ? (
                <span className="badge bg-success-subtle text-success border border-success px-3 py-2 fs-6" data-testid="problem-resolved-badge">
                  ✓ Problem Indicated as Resolved
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm px-3 fw-semibold shadow-sm"
                  onClick={() => setShowResolveModal(true)}
                  data-testid="problem-resolved-btn"
                >
                  ✓ Problem Appears Resolved
                </button>
              )
            )}
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
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Ticket Number:</span>
            <strong className="text-dark font-monospace text-break" data-testid="ticket-info-number">
              {ticket.ticketNumber}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Ticket Date:</span>
            <strong className="text-dark" data-testid="ticket-info-date">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Requester:</span>
            <strong className="text-dark text-break" data-testid="ticket-info-requester">
              {ticket.requester?.name || activeUser?.name} ({ticket.requester?.department || activeUser?.department || "General"})
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Category:</span>
            <strong className="text-dark text-break" data-testid="ticket-info-category">
              {ticket.category?.name || "General"}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Related System:</span>
            <strong className="text-dark text-break" data-testid="ticket-info-system">
              {ticket.relatedSystem || "None specified"}
            </strong>
          </div>
          <div className="col-12 col-sm-6 col-xl-4">
            <span className="text-muted d-block">Requested Priority:</span>
            <strong className="text-dark" data-testid="ticket-info-priority">
              {ticket.priority}
            </strong>
          </div>
        </div>
      </div>

      {/* Operational Triage Controls (IT Staff & Administrators) */}
      {isStaff && (
        <div className="card p-3 p-md-4 border-success bg-success-subtle shadow-sm rounded-3" data-testid="operational-triage-card">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h6 className="fw-bold text-success-emphasis mb-0 d-flex align-items-center gap-2">
              <span>🛠️</span>
              <span>IT Staff Operational Triage Controls</span>
            </h6>
            {ticket.ownerId !== authUser?.id && (
              <button
                type="button"
                className="btn btn-success btn-sm px-3 fw-semibold shadow-sm"
                onClick={handleClaim}
                disabled={triageLoading}
                data-testid="detail-claim-btn"
              >
                {triageLoading ? "Claiming..." : "Claim This Ticket"}
              </button>
            )}
          </div>

          {triageFeedback && (
            <div className="alert alert-success py-2 px-3 small mb-3">✓ {triageFeedback}</div>
          )}
          {triageError && (
            <div className="alert alert-danger py-2 px-3 small mb-3" data-testid="triage-error-banner">
              ⚠️ {triageError}
            </div>
          )}

          <div className="row g-3">
            {/* Owner Selection */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-dark">Ticket Owner</label>
              <select
                className="form-select form-select-sm"
                value={ticket.ownerId ? String(ticket.ownerId) : "unassigned"}
                onChange={(e) => handleReassign(e.target.value)}
                disabled={triageLoading}
                data-testid="detail-reassign-select"
              >
                <option value="unassigned">-- Unassigned --</option>
                {assignees.map((staff) => (
                  <option key={staff.id} value={String(staff.id)}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
            </div>

            {/* IT Priority */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-dark">IT Priority (Triage)</label>
              <select
                className="form-select form-select-sm"
                value={ticket.itPriority || ticket.priority || "MEDIUM"}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={triageLoading}
                data-testid="detail-it-priority-select"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Status Transition */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-dark">Status Transition</label>
              <select
                className="form-select form-select-sm"
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={triageLoading}
                data-testid="detail-status-select"
              >
                <option value={ticket.status}>{ticket.status} (Current)</option>
                {ticket.status === "NEW" && (
                  <>
                    <option value="OPEN">➔ OPEN</option>
                    <option value="IN_PROGRESS">➔ IN_PROGRESS</option>
                    <option value="CANCELLED">➔ CANCELLED</option>
                  </>
                )}
                {ticket.status === "OPEN" && (
                  <>
                    <option value="IN_PROGRESS">➔ IN_PROGRESS</option>
                    <option value="WAITING_FOR_REQUESTER">➔ WAITING_FOR_REQUESTER</option>
                    <option value="RESOLVED">➔ RESOLVED</option>
                    <option value="CANCELLED">➔ CANCELLED</option>
                  </>
                )}
                {ticket.status === "IN_PROGRESS" && (
                  <>
                    <option value="WAITING_FOR_REQUESTER">➔ WAITING_FOR_REQUESTER</option>
                    <option value="RESOLVED">➔ RESOLVED</option>
                    <option value="CANCELLED">➔ CANCELLED</option>
                  </>
                )}
                {ticket.status === "WAITING_FOR_REQUESTER" && (
                  <>
                    <option value="IN_PROGRESS">➔ IN_PROGRESS</option>
                    <option value="RESOLVED">➔ RESOLVED</option>
                    <option value="CANCELLED">➔ CANCELLED</option>
                  </>
                )}
                {ticket.status === "RESOLVED" && (
                  <>
                    <option value="CLOSED">➔ CLOSED</option>
                    <option value="REOPENED">➔ REOPENED</option>
                  </>
                )}
                {ticket.status === "CLOSED" && (
                  <option value="REOPENED">➔ REOPENED</option>
                )}
                {ticket.status === "REOPENED" && (
                  <>
                    <option value="IN_PROGRESS">➔ IN_PROGRESS</option>
                    <option value="RESOLVED">➔ RESOLVED</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

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

      {/* Resolution Success Banner */}
      {resolveSuccess && (
        <div className="alert alert-success py-2 px-3 small mb-0 d-flex align-items-center gap-2" data-testid="resolve-success-banner">
          <span>✓</span>
          <span>{resolveSuccess}</span>
        </div>
      )}

      {/* Communication Section: Public Comments & Internal Notes (Issue #7) */}
      <div className="card zen-card p-4 shadow-sm" data-testid="ticket-communication-card">
        {isStaff ? (
          <ul className="nav nav-tabs card-header-tabs mb-3 border-bottom" role="tablist">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${commTab === "comments" ? "active fw-bold text-success border-bottom-0" : "text-muted"}`}
                onClick={() => setCommTab("comments")}
                data-testid="tab-public-comments"
              >
                Public Comments ({comments.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${commTab === "notes" ? "active fw-bold text-warning-emphasis border-bottom-0 bg-warning-subtle" : "text-muted"}`}
                onClick={() => setCommTab("notes")}
                data-testid="tab-internal-notes"
              >
                Internal Notes ({notes.length})
              </button>
            </li>
          </ul>
        ) : (
          <div className="pb-3 mb-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" data-testid="public-comments-header">
              <span>💬</span>
              <span>Public Comments ({comments.length})</span>
            </h5>
            <span className="text-muted small">Visible to all ticket participants</span>
          </div>
        )}

        {/* Tab 1: Public Comments */}
        {(commTab === "comments" || !isStaff) && (
          <div data-testid="comments-panel">
            <div className="d-flex flex-column gap-2 mb-3" data-testid="comments-list">
              {comments.length === 0 ? (
                <div className="p-4 text-center text-muted bg-light rounded-3" data-testid="empty-comments">
                  <p className="small mb-0">No public comments yet. Post an update below.</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="card p-3 bg-light border-0 rounded-3 shadow-xs" data-testid={`comment-item-${c.id}`}>
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <strong className="text-dark small" data-testid={`comment-author-${c.id}`}>
                          {c.author?.name || c.author?.fullName || "User"}
                        </strong>
                        <span
                          className={`badge ${
                            c.author?.role === "IT_STAFF"
                              ? "bg-success-subtle text-success border border-success"
                              : c.author?.role === "ADMINISTRATOR"
                              ? "bg-purple-subtle text-purple border border-purple"
                              : "bg-info-subtle text-info border border-info"
                          } small`}
                        >
                          {c.author?.role === "IT_STAFF"
                            ? "IT Staff"
                            : c.author?.role === "ADMINISTRATOR"
                            ? "Admin"
                            : "Requester"}
                        </span>
                      </div>
                      <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mb-0 text-dark small text-break lh-base" style={{ whiteSpace: "pre-wrap" }} data-testid={`comment-body-${c.id}`}>
                      {c.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Public Comment Form */}
            <form onSubmit={handlePostComment} className="pt-2 border-top">
              {commentError && (
                <div className="alert alert-danger py-2 px-3 small mb-2" data-testid="comment-error-banner">
                  ⚠️ {commentError}
                </div>
              )}
              {commentFeedback && (
                <div className="alert alert-success py-2 px-3 small mb-2">
                  ✓ {commentFeedback}
                </div>
              )}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Write a public comment for all participants..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={2000}
                  disabled={isPostingComment}
                  data-testid="new-comment-input"
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {commentInput.length}/2000 characters
                </span>
                <button
                  type="submit"
                  className="btn btn-zen btn-sm px-3 fw-semibold shadow-sm"
                  disabled={isPostingComment || !commentInput.trim()}
                  data-testid="post-comment-btn"
                >
                  {isPostingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Internal Notes (IT Staff & Admin Only) */}
        {isStaff && commTab === "notes" && (
          <div data-testid="notes-panel">
            <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3">
              <span className="fw-bold">Confidential Internal Notes</span>
              <span className="text-muted">— Visible strictly to IT Staff & Administrators. Strictly hidden from requesters.</span>
            </div>

            <div className="d-flex flex-column gap-2 mb-3" data-testid="notes-list">
              {notes.length === 0 ? (
                <div className="p-4 text-center text-muted bg-warning-subtle rounded-3" data-testid="empty-notes">
                  <p className="small mb-0">No internal notes recorded yet.</p>
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="card p-3 bg-warning-subtle border-warning-subtle rounded-3 shadow-xs" data-testid={`note-item-${n.id}`}>
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <strong className="text-dark small" data-testid={`note-author-${n.id}`}>
                          {n.author?.name || n.author?.fullName || "Staff"}
                        </strong>
                        <span className="badge bg-warning text-dark small">Internal Note</span>
                      </div>
                      <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mb-0 text-dark small text-break lh-base" style={{ whiteSpace: "pre-wrap" }} data-testid={`note-body-${n.id}`}>
                      {n.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Internal Note Form */}
            <form onSubmit={handlePostNote} className="pt-2 border-top">
              {noteError && (
                <div className="alert alert-danger py-2 px-3 small mb-2" data-testid="note-error-banner">
                  ⚠️ {noteError}
                </div>
              )}
              {noteFeedback && (
                <div className="alert alert-success py-2 px-3 small mb-2">
                  ✓ {noteFeedback}
                </div>
              )}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm border-warning"
                  rows={3}
                  placeholder="Add confidential IT diagnostic observations, hardware inventory notes, or escalation details..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  maxLength={2000}
                  disabled={isPostingNote}
                  data-testid="new-note-input"
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {noteInput.length}/2000 characters
                </span>
                <button
                  type="submit"
                  className="btn btn-warning btn-sm px-3 fw-semibold text-dark shadow-sm"
                  disabled={isPostingNote || !noteInput.trim()}
                  data-testid="post-note-btn"
                >
                  {isPostingNote ? "Saving..." : "Add Internal Note"}
                </button>
              </div>
            </form>
          </div>
        )}
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

        {/* Remove Success Alert */}
        {removeSuccess && (
          <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center justify-content-between" role="alert" data-testid="remove-success-alert">
            <span>{removeSuccess}</span>
            <button
              type="button"
              className="btn-close btn-close-sm"
              aria-label="Close"
              onClick={() => setRemoveSuccess(null)}
            />
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

      {/* Problem Appears Resolved Confirmation Modal (FR-05 / AC-09) */}
      {showResolveModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
          role="dialog"
          aria-modal="true"
          data-testid="resolve-confirm-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom">
                <h6 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <span>✓</span>
                  <span>Indicate Problem Appears Resolved</span>
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowResolveModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Please confirm that your issue has been resolved. You can optionally add a concluding comment. IT Staff will review and complete the final closure.
                </p>
                {resolveError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3">
                    ⚠️ {resolveError}
                  </div>
                )}
                <div className="mb-2">
                  <label className="form-label small fw-semibold text-dark">
                    Optional Concluding Comment
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    placeholder="e.g. Restarted machine and VPN handshake is functioning now. Thank you!"
                    value={resolveComment}
                    onChange={(e) => setResolveComment(e.target.value)}
                    disabled={isSubmittingResolve}
                    data-testid="resolve-comment-input"
                  />
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-light btn-sm px-3"
                  onClick={() => setShowResolveModal(false)}
                  disabled={isSubmittingResolve}
                  data-testid="resolve-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-3 fw-semibold shadow-sm"
                  onClick={handleConfirmResolve}
                  disabled={isSubmittingResolve}
                  data-testid="confirm-resolve-btn"
                >
                  {isSubmittingResolve ? "Submitting..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
