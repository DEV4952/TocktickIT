import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../context/AuthContext.js";
import { fetchActionsTaken, createActionTaken, updateActionTaken, fetchAssignableStaffApi, transitionActionTaken, fetchActionHistory } from "../api.js";
import { ActionTaken, ActionTakenInput, User, ActionTakenStatus, ActionHistory } from "../types.js";

function localDateInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
}
function Performer({ user }: { user: Pick<User, "name" | "role"> }) {
  return <span className="actions-performer">{user.name} <span className={`badge ${user.role === "ADMINISTRATOR" ? "badge-role-admin" : user.role === "IT_STAFF" ? "badge-role-staff" : "badge-role-requester"}`}>{user.role === "ADMINISTRATOR" ? "Administrator" : user.role === "IT_STAFF" ? "IT Staff" : "Requester"}</span></span>;
}

function ActionForm({ ticketId, action, user, onClose, onSaved }: {
  ticketId: number; action: ActionTaken | null; user: User; onClose: () => void; onSaved: (action: ActionTaken) => void;
}) {
  const [date, setDate] = useState(() => localDateInput(new Date(action?.actionDateTime || Date.now())));
  const [description, setDescription] = useState(action?.description || "");
  const [result, setResult] = useState(action?.result || "");
  const [followUp, setFollowUp] = useState(action?.followUpRequired || false);
  const [note, setNote] = useState(action?.followUpNote || "");
  const [attachments, setAttachments] = useState(action?.attachmentNotes || "");
  const [assigneeId, setAssigneeId] = useState(action ? String(action.assigneeId ?? "") : String(user.id));
  const [assignees, setAssignees] = useState<Pick<User, "id" | "name">[]>([]);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
  const [stale, setStale] = useState(false);
  useEffect(() => { let active = true; fetchAssignableStaffApi().then(rows => { if (active) setAssignees(rows); }).catch(() => { if (active) setAssigneeError("Unable to load active assignees. Close and reopen the form to retry."); }).finally(() => { if (active) setLoadingAssignees(false); }); return () => { active = false; }; }, []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dateInput.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); if (!busy.current) onClose(); }
      if (event.key === "Tab") {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); opener?.focus(); };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || stale) return;
    if (loadingAssignees || assigneeError) { setError("Active assignees must load before saving."); return; }
    if (assigneeId && !assignees.some(person => person.id === Number(assigneeId))) { setError("Choose an active staff member or Unassigned."); return; }
    const parsed = new Date(date);
    if (!date || !Number.isFinite(parsed.getTime()) || parsed.getFullYear() < 1 || parsed.getFullYear() > 9999) { setError("Enter a valid action date and time."); return; }
    if (description.trim().length < 5 || description.trim().length > 3000) { setError("Description must contain 5–3000 characters."); return; }
    if (result.trim().length < 3 || result.trim().length > 3000) { setError("Result must contain 3–3000 characters."); return; }
    if (followUp && note.trim().length < 3) { setError("Follow-up note must contain at least 3 characters when follow-up is required."); return; }
    if (attachments.trim().length > 1000) { setError("Attachment notes must not exceed 1000 characters."); return; }
    const input: ActionTakenInput = {
      assigneeId: assigneeId ? Number(assigneeId) : null,
      ...(action ? { currentUpdatedAt: action.updatedAt } : {}),
      actionDateTime: parsed.toISOString(), description: description.trim(), result: result.trim(),
      followUpRequired: followUp, followUpNote: followUp ? note.trim() : null, attachmentNotes: attachments.trim() || null,
    };
    busy.current = true; setSaving(true); setError(null);
    try {
      const response = action ? await updateActionTaken(ticketId, action.id, input) : await createActionTaken(ticketId, input);
      onSaved(response.action);
    } catch (err) { if ((err as { status?: number }).status === 409) setStale(true); setError(err instanceof Error ? err.message : "Unable to save action. Please try again."); }
    finally { busy.current = false; setSaving(false); }
  }
  return createPortal(<div className="actions-modal-backdrop">
    <div ref={dialog} className="actions-modal zen-card" role="dialog" aria-modal="true" aria-labelledby="action-form-title" aria-describedby={error ? "action-form-error" : undefined}>
      <div className="actions-modal-header"><h2 id="action-form-title" className="h5 mb-0">{action ? "Edit Action Taken" : "Add Action Taken"}</h2><button type="button" className="btn-close" aria-label="Close action form" disabled={saving} onClick={onClose} /></div>
      <form onSubmit={submit} noValidate aria-busy={saving}>
        <div className="actions-modal-body">
          {error && <div id="action-form-error" role="alert" className="alert alert-danger">{error}</div>}
          <fieldset disabled={saving}>
            <div className="mb-3"><span className="form-label d-block">Performed By (read-only)</span><Performer user={action?.performedBy || user} /></div>
            <label className="form-label" htmlFor="action-assignee">Assigned To</label>
            <select id="action-assignee" className="form-select mb-3" value={assigneeId} disabled={loadingAssignees} onChange={e => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{assigneeId && !loadingAssignees && !assignees.some(person => person.id === Number(assigneeId)) && <option value={assigneeId} disabled>{action?.assignee?.name || user.name} (unavailable)</option>}{assignees.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
            {loadingAssignees && <p role="status">Loading active assignees?</p>}{assigneeError && <p role="alert">{assigneeError}</p>}
            <label className="form-label" htmlFor="action-date">Action Date/Time</label>
            <input ref={dateInput} id="action-date" className="form-control mb-3" type="datetime-local" step="0.001" required value={date} onChange={e => setDate(e.target.value)} />
            <label className="form-label" htmlFor="action-description">Description</label>
            <textarea id="action-description" className="form-control mb-3" rows={3} required minLength={5} maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} />
            <label className="form-label" htmlFor="action-result">Result</label>
            <textarea id="action-result" className="form-control mb-3" rows={3} required minLength={3} maxLength={3000} value={result} onChange={e => setResult(e.target.value)} />
            <div className="form-check form-switch mb-3"><input id="action-follow-up" className="form-check-input" type="checkbox" checked={followUp} onChange={e => setFollowUp(e.target.checked)} /><label htmlFor="action-follow-up" className="form-check-label">Follow-Up Required?</label></div>
            {followUp && <><label className="form-label" htmlFor="action-note">Follow-up Note (required)</label><textarea id="action-note" className="form-control mb-3" required minLength={3} rows={3} value={note} onChange={e => setNote(e.target.value)} /></>}
            <label className="form-label" htmlFor="action-attachments">Attachment Notes</label>
            <textarea id="action-attachments" className="form-control" rows={2} maxLength={1000} value={attachments} onChange={e => setAttachments(e.target.value)} />
          </fieldset>
        </div>
        <div className="actions-modal-footer"><button type="button" className="btn btn-light border" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="btn btn-zen" disabled={saving || stale || loadingAssignees || Boolean(assigneeError)}>{saving ? "Saving…" : "Save Action"}</button></div>
      </form>
    </div>
  </div>, document.body);
}

export function ActionsTaken({ ticketId }: { ticketId: number }) {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const ready = Boolean(user && !auth?.isLoading);
  const canEdit = ready && user?.isActive && !user.mustChangePassword && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR");
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState<ActionTaken | null | undefined>(undefined);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setActions([]); setEditing(undefined); setFeedback("");
    if (ready) fetchActionsTaken(ticketId).then(data => { if (active) setActions(data.actions); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load actions."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketId, user?.id, ready, retry]);
  const sorted = [...actions].sort((a, b) => Date.parse(a.actionDateTime) - Date.parse(b.actionDateTime) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return <section className="zen-section-slide actions-section mb-4" aria-labelledby="actions-title">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h2 id="actions-title" className="h5 mb-0">Actions Taken</h2>{ready && !loading && <button className="btn btn-outline-secondary btn-sm" onClick={() => setRetry(v => v + 1)}>Reload actions</button>}{canEdit && !loading && !error && <button className="btn btn-zen btn-sm" onClick={() => { setEditing(null); setFeedback(""); }}>Add Action</button>}</div>
    {feedback && <div role="status" className="alert alert-success">{feedback}</div>}
    {!ready || loading ? <p role="status" className="text-muted mb-0">{auth?.isLoading || ready ? "Loading actions…" : "Sign in to view actions."}</p>
      : error ? <div role="alert" className="alert alert-danger mb-0"><p>{error}</p><button className="btn btn-outline-secondary btn-sm" onClick={() => setRetry(v => v + 1)}>Retry actions</button></div>
      : !sorted.length ? <p className="text-muted mb-0">No actions recorded yet.</p>
      : <ol className="actions-list">{sorted.map(action => <li key={action.id} className="actions-entry">
        <div className="actions-entry-header"><time dateTime={action.actionDateTime}>{new Date(action.actionDateTime).toLocaleString()}</time>{canEdit && !["COMPLETED", "CANCELLED"].includes(action.status || "RECORDED") && <button className="btn btn-sm btn-outline-secondary" aria-label={`Edit action: ${action.description}`} onClick={() => { setEditing(action); setFeedback(""); }}>Edit</button>}</div>
        <dl className="actions-details">
          <div><dt>Description</dt><dd>{action.description}</dd></div><div><dt>Result</dt><dd>{action.result}</dd></div>
          <div><dt>Status</dt><dd>{action.status || "RECORDED"}</dd></div>
          <div><dt>Assigned To</dt><dd>{action.assignee?.name || "Unassigned"}</dd></div>
          <div><dt>Performed By</dt><dd><Performer user={action.performedBy} /></dd></div>
          <div><dt>Follow-Up</dt><dd><span className={`badge ${action.followUpRequired ? "bg-warning text-dark" : "bg-light text-dark border"}`}>{action.followUpRequired ? "Required" : "Not required"}</span>{action.followUpRequired && action.followUpNote && <p className="mb-0 mt-2">{action.followUpNote}</p>}</dd></div>
          <div><dt>Attachment Notes</dt><dd>{action.attachmentNotes || "None"}</dd></div>
        </dl>
        <ActionLifecycle action={action} ticketId={ticketId} canEdit={Boolean(canEdit)} onSaved={saved => { setActions(current => current.map(item => item.id === saved.id ? saved : item)); setFeedback("Action status updated successfully."); }} />
      </li>)}</ol>}
    {canEdit && editing !== undefined && user && <ActionForm key={editing?.id || "create"} ticketId={ticketId} action={editing} user={user} onClose={() => setEditing(undefined)} onSaved={saved => { setActions(current => [...current.filter(item => item.id !== saved.id), saved]); setEditing(undefined); setFeedback("Action saved successfully."); }} />}
  </section>;
}

const nextStatuses: Record<ActionTakenStatus, ActionTakenStatus[]> = { RECORDED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
function ActionLifecycle({ action, ticketId, canEdit, onSaved }: { action: ActionTaken; ticketId: number; canEdit: boolean; onSaved: (action: ActionTaken) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [stale, setStale] = useState(false);
  const lock = useRef(false);
  const [open, setOpen] = useState(false), [history, setHistory] = useState<ActionHistory[] | null>(null), [historyError, setHistoryError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => { setStale(false); setError(null); }, [action.updatedAt]);
  useEffect(() => { if (!open) return; let active = true; setHistory(null); setHistoryError(null); fetchActionHistory(ticketId, action.id).then(data => { if (active) setHistory(data.history); }).catch(() => { if (active) setHistoryError("Unable to load action history."); }); return () => { active = false; }; }, [open, ticketId, action.id, action.updatedAt, retry]);
  async function change(status: ActionTakenStatus) {
    if (lock.current || stale) return;
    lock.current = true; setBusy(true); setError(null);
    try { onSaved((await transitionActionTaken(ticketId, action.id, status, action.updatedAt)).action); }
    catch (err) { if ((err as { status?: number }).status === 409) setStale(true); setError(err instanceof Error ? err.message : "Unable to change action status."); }
    finally { lock.current = false; setBusy(false); }
  }
  const labels = { IN_PROGRESS: "Start action", COMPLETED: "Complete action", CANCELLED: "Cancel action", RECORDED: "Recorded" };
  return <div className="mt-3">
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    <div className="d-flex flex-wrap gap-2">{canEdit && nextStatuses[action.status || "RECORDED"].map(status => <button key={status} className={status === "CANCELLED" ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-outline-success"} disabled={busy || stale || (status !== "CANCELLED" && !action.assigneeId)} onClick={() => change(status)}>{labels[status]}</button>)}<button className="btn btn-sm btn-light border" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Hide history" : "View history"}</button></div>
    {open && <div className="mt-3" aria-label="Action history">{historyError ? <div role="alert">{historyError}<button className="btn btn-sm btn-light" onClick={() => setRetry(value => value + 1)}>Retry history</button></div> : history === null ? <p role="status">Loading history?</p> : history.length === 0 ? <p>No history recorded for this legacy action.</p> : <ol>{history.map(event => <li key={event.id} className="mb-3"><strong>{event.event}</strong> ? {event.actor.name} ? <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time><details><summary>Before / after</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify({ before: event.before, after: event.after }, null, 2)}</pre></details></li>)}</ol>}</div>}
  </div>;
}
