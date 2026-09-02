import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchCategories, createTicket } from "../api.js";
import { Category, Ticket, TicketPriority } from "../types.js";

interface CreateTicketScreenProps {
  onCancel?: () => void;
  onSuccess?: (ticket: Ticket) => void;
}

interface LocalAttachment {
  name: string;
  size: number;
  type: string;
  fileUrl: string;
}

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 3;

export function CreateTicketScreen({ onCancel, onSuccess }: CreateTicketScreenProps) {
  const { currentRequester } = useRequester();

  // Form Field States
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystem, setRelatedSystem] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  // Async & Error States
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Success State
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Load Categories on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoriesError(null);
      try {
        const list = await fetchCategories();
        if (isMounted) {
          setCategories(list);
        }
      } catch (err) {
        if (isMounted) {
          setCategoriesError(err instanceof Error ? err.message : "Failed to load categories");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format File Size helper
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setAttachmentError(`Maximum ${MAX_ATTACHMENTS} attachments are permitted per ticket.`);
      return;
    }

    const newAttachments: LocalAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate File Size
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }

      // Validate MIME type or Extension
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

      if (!isValidMime && !isValidExt) {
        setAttachmentError(`File "${file.name}" has an unsupported format. Allowed formats: PNG, JPG, WEBP, PDF, TXT.`);
        return;
      }

      newAttachments.push({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        fileUrl: `/uploads/attachments/${encodeURIComponent(file.name)}`,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = ""; // reset file input
  };

  // Remove Attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate Form Client-Side
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      errors.title = "Title is required";
    } else if (trimmedTitle.length < 5) {
      errors.title = "Title must be at least 5 characters long";
    } else if (trimmedTitle.length > 150) {
      errors.title = "Title cannot exceed 150 characters";
    }

    if (!categoryId) {
      errors.categoryId = "Please select an IT category";
    }

    if (!trimmedDesc) {
      errors.description = "Description is required";
    } else if (trimmedDesc.length < 10) {
      errors.description = "Description must be at least 10 characters long";
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Description cannot exceed 2000 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!currentRequester) {
      setApiError("No active requester context found. Please select a persona.");
      return;
    }

    if (!currentRequester.isActive) {
      setApiError("Your account is currently inactive. You cannot submit new tickets.");
      return;
    }

    // Client-side validation check
    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketPayload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: parseInt(categoryId, 10),
        relatedSystem: relatedSystem.trim() || null,
        priority,
        attachments: attachments.map((att) => ({
          fileName: att.name,
          fileSize: att.size,
          fileType: att.type,
          fileUrl: att.fileUrl,
        })),
      };

      const result = await createTicket(ticketPayload, currentRequester.id);
      setCreatedTicket(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Unable to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Form for Creating Another Ticket
  const handleCreateAnother = () => {
    setTitle("");
    setCategoryId("");
    setRelatedSystem("");
    setPriority("MEDIUM");
    setDescription("");
    setAttachments([]);
    setFormErrors({});
    setApiError(null);
    setAttachmentError(null);
    setCreatedTicket(null);
  };

  if (!currentRequester) {
    return (
      <div className="alert alert-warning" role="alert">
        Please select a development requester persona first.
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success Confirmation Screen
  // ---------------------------------------------------------------------------
  if (createdTicket) {
    return (
      <div className="card zen-card p-4 p-md-5" data-testid="ticket-success-screen">
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3 fw-bold font-monospace"
            style={{ width: 56, height: 56, fontSize: 24 }}
          >
            OK
          </div>
          <h2 className="h4 fw-bold text-success mb-1" data-testid="success-heading">Ticket Created Successfully!</h2>
          <p className="text-muted small">
            Your IT service request has been logged and assigned to the support triage queue.
          </p>
        </div>

        <div className="border rounded-3 p-4 bg-light mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between pb-3 mb-3 border-bottom gap-2">
            <div>
              <span className="text-muted small d-block">Official Ticket Identifier:</span>
              <code className="ticket-badge-lg d-inline-block mt-1" data-testid="created-ticket-number">
                {createdTicket.ticketNumber}
              </code>
            </div>
            <div>
              <span className={`badge ${
                createdTicket.priority === "URGENT" ? "badge-priority-urgent" :
                createdTicket.priority === "HIGH" ? "badge-priority-high" :
                createdTicket.priority === "LOW" ? "badge-priority-low" : "badge-priority-medium"
              } px-3 py-2 fs-6`}>
                {createdTicket.priority} Priority
              </span>
            </div>
          </div>

          <div className="row g-3 small">
            <div className="col-12 col-sm-6">
              <span className="text-muted d-block">Summary / Title:</span>
              <strong className="d-block text-dark mt-1" data-testid="created-ticket-title">{createdTicket.title}</strong>
            </div>
            <div className="col-12 col-sm-6">
              <span className="text-muted d-block">Category:</span>
              <strong className="d-block text-dark mt-1">{createdTicket.category?.name || "General"}</strong>
            </div>
            {createdTicket.relatedSystem && (
              <div className="col-12 col-sm-6">
                <span className="text-muted d-block">Related System:</span>
                <strong className="d-block text-dark mt-1">{createdTicket.relatedSystem}</strong>
              </div>
            )}
            <div className="col-12 col-sm-6">
              <span className="text-muted d-block">Requester:</span>
              <strong className="d-block text-dark mt-1">
                {currentRequester.name} ({currentRequester.department})
              </strong>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleCreateAnother}
            data-testid="create-another-btn"
          >
            + Create Another Ticket
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-zen"
              onClick={onCancel}
              data-testid="back-to-workspace-btn"
            >
              Back to Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Create Ticket Form Screen
  // ---------------------------------------------------------------------------
  return (
    <div className="card zen-card p-4" data-testid="create-ticket-form-card">
      <div className="d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom">
        <div>
          <h4 className="fw-bold mb-1 text-dark">
            Submit New IT Ticket
          </h4>
          <p className="text-muted small mb-0">
            Fill in the issue details below to report an incident or request IT assistance.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3"
            onClick={onCancel}
            data-testid="cancel-header-btn"
          >
            Back
          </button>
        )}
      </div>

      {/* Inactive Requester Account Banner */}
      {!currentRequester.isActive && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" data-testid="inactive-requester-alert">
          <div>
            <strong>Account Inactive:</strong> Your user profile ({currentRequester.name}) is currently suspended/inactive. You cannot submit new tickets.
          </div>
        </div>
      )}

      {/* API Submission Error Banner */}
      {apiError && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert" data-testid="api-error-alert">
          <h6 className="alert-heading fw-bold mb-1">Submission Failed</h6>
          <p className="mb-0 small">{apiError}</p>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setApiError(null)}
          />
        </div>
      )}

      {/* Requester Identity Bar */}
      <div className="p-3 mb-4 rounded-3 bg-light border d-flex align-items-center justify-content-between" data-testid="requester-context-bar">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Submitting as:</span>
          <strong>{currentRequester.name}</strong>
          <span className="badge bg-secondary-subtle text-secondary border small">
            {currentRequester.department}
          </span>
        </div>
        <span className="text-muted small">{currentRequester.email}</span>
      </div>

      <form onSubmit={handleSubmit} noValidate data-testid="create-ticket-form">
        {/* Title / Summary */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label htmlFor="ticket-title" className="form-label fw-semibold mb-0">
              Title / Summary <span className="text-danger">*</span>
            </label>
            <span className="char-counter" data-testid="title-char-counter">
              {title.length}/150
            </span>
          </div>
          <input
            id="ticket-title"
            type="text"
            className={`form-control form-control-lg ${formErrors.title ? "is-invalid" : ""}`}
            placeholder="e.g. Cannot connect to internal VPN gateway"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (formErrors.title) {
                setFormErrors((prev) => ({ ...prev, title: "" }));
              }
            }}
            disabled={!currentRequester.isActive || isSubmitting}
            maxLength={150}
            required
            autoFocus
            data-testid="ticket-title-input"
          />
          {formErrors.title && (
            <div className="invalid-feedback d-block" data-testid="title-error">
              {formErrors.title}
            </div>
          )}
          <div className="form-text small">
            Provide a clear, brief summary of the issue (5–150 characters).
          </div>
        </div>

        {/* Category & Priority Grid */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label htmlFor="ticket-category" className="form-label fw-semibold">
              Category <span className="text-danger">*</span>
            </label>
            {isLoadingCategories ? (
              <div className="input-group">
                <select className="form-select" disabled>
                  <option>Loading categories...</option>
                </select>
                <span className="input-group-text">
                  <div className="spinner-border spinner-border-sm text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </span>
              </div>
            ) : categoriesError ? (
              <div className="text-danger small">{categoriesError}</div>
            ) : (
              <select
                id="ticket-category"
                className={`form-select form-select-lg ${formErrors.categoryId ? "is-invalid" : ""}`}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (formErrors.categoryId) {
                    setFormErrors((prev) => ({ ...prev, categoryId: "" }));
                  }
                }}
                disabled={!currentRequester.isActive || isSubmitting}
                required
                data-testid="ticket-category-select"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {formErrors.categoryId && (
              <div className="invalid-feedback d-block" data-testid="category-error">
                {formErrors.categoryId}
              </div>
            )}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">
              Requested Priority <span className="text-danger">*</span>
            </label>
            <div className="btn-group w-100 priority-btn-group" role="group" aria-label="Priority radio toggle button group">
              <input
                type="radio"
                className="btn-check"
                name="priority"
                id="priority-low"
                autoComplete="off"
                checked={priority === "LOW"}
                onChange={() => setPriority("LOW")}
                disabled={!currentRequester.isActive || isSubmitting}
              />
              <label className="btn btn-outline-secondary" htmlFor="priority-low">
                Low
              </label>

              <input
                type="radio"
                className="btn-check"
                name="priority"
                id="priority-medium"
                autoComplete="off"
                checked={priority === "MEDIUM"}
                onChange={() => setPriority("MEDIUM")}
                disabled={!currentRequester.isActive || isSubmitting}
              />
              <label className="btn btn-outline-info" htmlFor="priority-medium">
                Medium
              </label>

              <input
                type="radio"
                className="btn-check"
                name="priority"
                id="priority-high"
                autoComplete="off"
                checked={priority === "HIGH"}
                onChange={() => setPriority("HIGH")}
                disabled={!currentRequester.isActive || isSubmitting}
              />
              <label className="btn btn-outline-warning" htmlFor="priority-high">
                High
              </label>

              <input
                type="radio"
                className="btn-check"
                name="priority"
                id="priority-urgent"
                autoComplete="off"
                checked={priority === "URGENT"}
                onChange={() => setPriority("URGENT")}
                disabled={!currentRequester.isActive || isSubmitting}
              />
              <label className="btn btn-outline-danger" htmlFor="priority-urgent">
                Urgent
              </label>
            </div>
          </div>
        </div>

        {/* Related System (Optional) */}
        <div className="mb-3">
          <label htmlFor="ticket-related-system" className="form-label fw-semibold">
            Related System / Application <span className="text-muted fw-normal">(Optional)</span>
          </label>
          <input
            id="ticket-related-system"
            type="text"
            className="form-control"
            placeholder="e.g. Cisco AnyConnect, SAP, Jira, MacBook Pro 16"
            value={relatedSystem}
            onChange={(e) => setRelatedSystem(e.target.value)}
            disabled={!currentRequester.isActive || isSubmitting}
            maxLength={100}
            data-testid="ticket-related-system-input"
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label htmlFor="ticket-description" className="form-label fw-semibold mb-0">
              Description <span className="text-danger">*</span>
            </label>
            <span className="char-counter" data-testid="description-char-counter">
              {description.length}/2000
            </span>
          </div>
          <textarea
            id="ticket-description"
            rows={5}
            className={`form-control ${formErrors.description ? "is-invalid" : ""}`}
            placeholder="Please detail steps to reproduce, error codes, machine identifiers, and impact..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (formErrors.description) {
                setFormErrors((prev) => ({ ...prev, description: "" }));
              }
            }}
            disabled={!currentRequester.isActive || isSubmitting}
            maxLength={2000}
            required
            data-testid="ticket-description-input"
          />
          {formErrors.description && (
            <div className="invalid-feedback d-block" data-testid="description-error">
              {formErrors.description}
            </div>
          )}
          <div className="form-text small">
            Detail the problem clearly (minimum 10 characters).
          </div>
        </div>

        {/* Diagnostic Attachments */}
        <div className="mb-4">
          <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
            <span>Diagnostic Attachments <span className="text-muted fw-normal">(Optional)</span></span>
            <span className="small text-muted">{attachments.length}/{MAX_ATTACHMENTS} files</span>
          </label>

          {attachmentError && (
            <div className="alert alert-danger py-2 px-3 small mb-2" data-testid="attachment-error">
              {attachmentError}
            </div>
          )}

          {attachments.length < MAX_ATTACHMENTS && (
            <div className="attachment-dropzone p-3 text-center mb-2 position-relative">
              <input
                type="file"
                id="ticket-attachment-input"
                className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
                disabled={!currentRequester.isActive || isSubmitting}
                data-testid="ticket-attachment-input"
              />
              <div className="small text-muted">
                <span className="fw-semibold text-success">Click to browse</span> or drag and drop screenshots or logs
              </div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                PNG, JPG, WEBP, PDF, TXT (Max 5MB each, up to 3 files)
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2" data-testid="attachments-list">
              {attachments.map((file, idx) => (
                <div key={idx} className="attachment-chip" data-testid={`attachment-item-${idx}`}>
                  <span className="badge bg-light text-muted border small">File</span>
                  <span className="fw-medium text-truncate" style={{ maxWidth: 200 }}>
                    {file.name}
                  </span>
                  <span className="badge bg-light text-muted border">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0 ms-1 text-decoration-none"
                    onClick={() => handleRemoveAttachment(idx)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${file.name}`}
                    data-testid={`remove-attachment-btn-${idx}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          {onCancel && (
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onCancel}
              disabled={isSubmitting}
              data-testid="cancel-btn"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-zen px-4 d-flex align-items-center gap-2"
            disabled={!currentRequester.isActive || isSubmitting}
            data-testid="submit-ticket-btn"
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Creating Ticket...</span>
              </>
            ) : (
              <span>Submit Ticket</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
export default CreateTicketScreen;
