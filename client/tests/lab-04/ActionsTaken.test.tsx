import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { ActionTaken, User } from "../../src/types.js";

const staff: User = { id: 3, name: "Current Technician", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const original = { id: 4, name: "Original Technician", role: "IT_STAFF" as const };
function action(id = "a", overrides: Partial<ActionTaken> = {}): ActionTaken {
  return { id, ticketId: 101, actionDateTime: "2026-10-28T10:00:00.000Z", description: "Inspected gateway\nChecked firewall", result: "Connection restored", performedById: original.id, performedBy: original, followUpRequired: true, followUpNote: "Monitor tomorrow", attachmentNotes: "See diagnostic-log.txt", createdAt: "2026-10-28T11:00:00.000Z", updatedAt: "2026-10-28T11:00:00.000Z", ...overrides };
}
function context(user: User | null = staff, isLoading = false): AuthContextType {
  return { user, isLoading, token: "session", error: null, login: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), refreshUser: vi.fn() };
}
function view(user: User | null = staff, isLoading = false, ticketId = 101) {
  return render(<AuthContext.Provider value={context(user, isLoading)}><ActionsTaken ticketId={ticketId} /></AuthContext.Provider>);
}
async function openCreate() {
  await userEvent.click(await screen.findByRole("button", { name: "Add Action" }));
}
function fill() {
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Inspected network gateway" } });
  fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Connectivity restored" } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.restoreAllMocks(); localStorage.clear();
  vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([staff, original]);
  vi.spyOn(api, "fetchActionsTaken").mockResolvedValue({ ticketId: 101, ticketNumber: "TIC-101", totalActions: 1, actions: [action()] });
  vi.spyOn(api, "createActionTaken").mockResolvedValue({ action: action("new", { description: "Inspected network gateway" }) });
  vi.spyOn(api, "updateActionTaken").mockResolvedValue({ action: action("a", { result: "Updated result" }) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Lab 4.5 Actions Taken", () => {
  it("renders complete details in oldest-first order with deterministic ties", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC-101", totalActions: 3, actions: [action("z", { description: "Newer action", actionDateTime: "2026-10-29T10:00:00Z" }), action("b", { description: "Second tied action" }), action("a", { description: "First tied action" })] });
    view({ ...staff, role: "REQUESTER" });
    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("First tied action"); expect(items[1]).toHaveTextContent("Second tied action"); expect(items[2]).toHaveTextContent("Newer action");
    for (const text of ["Connection restored", "Original Technician", "IT Staff", "Required", "Monitor tomorrow", "See diagnostic-log.txt"]) expect(within(items[0]).getByText(text)).toBeInTheDocument();
    expect(items[0].querySelector("time")).toHaveAttribute("datetime", "2026-10-28T10:00:00.000Z");
    expect(api.fetchActionsTaken).toHaveBeenCalledWith(101);
  });
  it("keeps multiline text as text rather than HTML", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 1, actions: [action("a", { description: "First line\n<script>alert(1)</script>" })] });
    view();
    const list = await screen.findByRole("list");
    expect(list.textContent).toContain("First line\n<script>alert(1)</script>");
    expect(list.querySelector("script")).toBeNull();
  });
  it("shows loading rather than empty while a request is pending", () => {
    vi.mocked(api.fetchActionsTaken).mockReturnValue(new Promise(() => {})); view();
    expect(screen.getByRole("status")).toHaveTextContent("Loading actions");
    expect(screen.queryByText("No actions recorded yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
  });
  it("shows the empty state only after a successful empty response", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 0, actions: [] }); view();
    expect(await screen.findByText("No actions recorded yet.")).toBeInTheDocument();
  });
  it("shows load errors, no empty state, and supports retry", async () => {
    vi.mocked(api.fetchActionsTaken).mockRejectedValueOnce(new Error("Permission denied")); view();
    expect(await screen.findByRole("alert")).toHaveTextContent("Permission denied");
    expect(screen.queryByText("No actions recorded yet.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry actions" }));
    expect(await screen.findByText("Original Technician")).toBeInTheDocument();
    expect(api.fetchActionsTaken).toHaveBeenCalledTimes(2);
  });
  it("requester can read but has no create, edit or dialog path", async () => {
    view({ ...staff, role: "REQUESTER" }); await screen.findByRole("list");
    expect(screen.queryByRole("button", { name: /add action|edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  for (const user of [null, staff, { ...staff, role: "ADMINISTRATOR" as const }]) {
    it(`does not flash privileged controls while session loads (${user?.role || "none"})`, () => {
      view(user, true);
      expect(screen.queryByRole("button", { name: /add action|edit/i })).not.toBeInTheDocument();
      expect(api.fetchActionsTaken).not.toHaveBeenCalled();
    });
  }
  it("hides editing for inactive or password-change-required accounts", async () => {
    const rendered = view({ ...staff, isActive: false }); await screen.findByRole("list");
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
    rendered.rerender(<AuthContext.Provider value={context({ ...staff, mustChangePassword: true })}><ActionsTaken ticketId={101} /></AuthContext.Provider>);
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
  });
  for (const role of ["IT_STAFF", "ADMINISTRATOR"] as const) {
    it(`${role} creates using only editable payload fields and updates the list`, async () => {
      view({ ...staff, role }); await openCreate(); fill();
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Current Technician", { selector: ".actions-performer" })).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Attachment Notes"), { target: { value: "  See new-log.txt  " } });
      await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      const [id, payload] = vi.mocked(api.createActionTaken).mock.calls[0];
      expect(id).toBe(101);
      expect(Object.keys(payload).sort()).toEqual(["actionDateTime", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes", "assigneeId"].sort());
      expect(payload).toMatchObject({ description: "Inspected network gateway", result: "Connectivity restored", followUpRequired: false, followUpNote: null, attachmentNotes: "See new-log.txt" });
      expect(Number.isFinite(Date.parse(payload.actionDateTime))).toBe(true);
      expect(await screen.findByText("Inspected network gateway")).toBeInTheDocument();
    });
    it(`${role} edits existing values while preserving the original performer`, async () => {
      view({ ...staff, role });
      await userEvent.click(await screen.findByRole("button", { name: /^Edit action:/ }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Original Technician", { selector: ".actions-performer" })).toBeInTheDocument();
      expect(within(dialog).queryByText("Current Technician", { selector: ".actions-performer" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toHaveValue("Inspected gateway\nChecked firewall");
      expect(screen.getByLabelText("Follow-up Note (required)")).toHaveValue("Monitor tomorrow");
      expect(screen.getByLabelText("Attachment Notes")).toHaveValue("See diagnostic-log.txt");
      fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Updated result" } });
      await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
      await waitFor(() => expect(api.updateActionTaken).toHaveBeenCalled());
      const [id, actionId, payload] = vi.mocked(api.updateActionTaken).mock.calls[0];
      expect(id).toBe(101); expect(actionId).toBe("a");
      expect(payload).not.toHaveProperty("performedById"); expect(payload).not.toHaveProperty("performerId"); expect(payload).not.toHaveProperty("ticketId");
      expect(await screen.findByText("Updated result")).toBeInTheDocument();
    });
  }
  for (const note of ["", " ", "ab"]) {
    it(`blocks follow-up with invalid note ${JSON.stringify(note)}`, async () => {
      view(); await openCreate(); fill();
      await userEvent.click(screen.getByLabelText("Follow-Up Required?"));
      fireEvent.change(screen.getByLabelText("Follow-up Note (required)"), { target: { value: note } });
      await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Follow-up note");
      expect(api.createActionTaken).not.toHaveBeenCalled();
    });
  }
  it("allows a valid trimmed follow-up note", async () => {
    view(); await openCreate(); fill(); await userEvent.click(screen.getByLabelText("Follow-Up Required?"));
    fireEvent.change(screen.getByLabelText("Follow-up Note (required)"), { target: { value: "  Monitor next week  " } });
    await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(api.createActionTaken).toHaveBeenCalledWith(101, expect.objectContaining({ followUpRequired: true, followUpNote: "Monitor next week" }));
  });
  it("does not require a note when follow-up is disabled", async () => {
    view(); await openCreate(); fill(); await userEvent.click(screen.getByLabelText("Follow-Up Required?")); await userEvent.click(screen.getByLabelText("Follow-Up Required?"));
    expect(screen.queryByLabelText("Follow-up Note (required)")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(api.createActionTaken).toHaveBeenCalledWith(101, expect.objectContaining({ followUpNote: null }));
  });
  it("prevents duplicate submissions while a save is pending", async () => {
    const pending = deferred<{ action: ActionTaken }>(); vi.mocked(api.createActionTaken).mockReturnValue(pending.promise);
    view(); await openCreate(); fill();
    const form = screen.getByRole("button", { name: "Save Action" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(api.createActionTaken).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await act(async () => { pending.resolve({ action: action("new") }); });
  });
  for (const status of [400, 401, 403, 404]) {
    it(`preserves values and shows a useful error after save ${status}`, async () => {
      vi.mocked(api.createActionTaken).mockRejectedValue(new api.ActionsApiError(status, `API error ${status}`));
      view(); await openCreate(); fill();
      fireEvent.change(screen.getByLabelText("Attachment Notes"), { target: { value: "Keep these notes" } });
      await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(`API error ${status}`);
      expect(screen.getByLabelText("Description")).toHaveValue("Inspected network gateway");
      expect(screen.getByLabelText("Attachment Notes")).toHaveValue("Keep these notes");
      expect(screen.getByRole("button", { name: "Save Action" })).toBeEnabled();
    });
  }
  it("keeps edit values on failure", async () => {
    vi.mocked(api.updateActionTaken).mockRejectedValue(new Error("Unable to update"));
    view(); await userEvent.click(await screen.findByRole("button", { name: /^Edit action:/ }));
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Keep my changes" } });
    await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update");
    expect(screen.getByLabelText("Result")).toHaveValue("Keep my changes");
  });
  it("reorders an edited action without refetching the page", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 2, actions: [action("a"), action("b", { description: "Second action", actionDateTime: "2026-10-29T10:00:00Z" })] });
    vi.mocked(api.updateActionTaken).mockResolvedValue({ action: action("a", { description: "Moved action", actionDateTime: "2026-10-30T10:00:00Z" }) });
    view(); await userEvent.click(await screen.findByRole("button", { name: /^Edit action: Inspected/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await screen.findByText("Moved action");
    const items = screen.getAllByRole("listitem"); expect(items[0]).toHaveTextContent("Second action"); expect(items[1]).toHaveTextContent("Moved action");
    expect(api.fetchActionsTaken).toHaveBeenCalledTimes(1);
  });
  it("manages initial focus, Tab trapping, Escape and focus restoration", async () => {
    view(); await openCreate();
    expect(screen.getByLabelText("Action Date/Time")).toHaveFocus();
    screen.getByRole("button", { name: "Save Action" }).focus();
    await userEvent.tab(); expect(screen.getByRole("button", { name: "Close action form" })).toHaveFocus();
    await userEvent.tab({ shift: true }); expect(screen.getByRole("button", { name: "Save Action" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Action" })).toHaveFocus();
  });
  for (const field of ["Action Date/Time", "Description", "Result"]) {
    it(`validates required ${field}`, async () => {
      view(); await openCreate(); fill(); fireEvent.change(screen.getByLabelText(field), { target: { value: "" } });
      await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument(); expect(api.createActionTaken).not.toHaveBeenCalled();
    });
  }
  it("ignores a stale list response after switching tickets", async () => {
    const pending = deferred<Awaited<ReturnType<typeof api.fetchActionsTaken>>>();
    vi.mocked(api.fetchActionsTaken).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ticketId: 102, ticketNumber: "TIC", totalActions: 0, actions: [] });
    const rendered = view();
    rendered.rerender(<AuthContext.Provider value={context()}><ActionsTaken ticketId={102} /></AuthContext.Provider>);
    await screen.findByText("No actions recorded yet.");
    await act(async () => { pending.resolve({ ticketId: 101, ticketNumber: "TIC", totalActions: 1, actions: [action()] }); });
    expect(screen.queryByText("Original Technician")).not.toBeInTheDocument();
  });
  it("integrates into the real Ticket Detail screen using the resolved numeric ticket ID", async () => {
    vi.spyOn(api, "fetchTicketById").mockResolvedValue({ id: 101, ticketNumber: "TIC-101", title: "Gateway issue", description: "Connection failure", status: "OPEN", priority: "HIGH", categoryId: 1, category: { id: 1, name: "Network" }, requesterId: 1, requester: { id: 1, name: "Alex", email: "alex@example.test", department: "IT", isActive: true }, attachments: [], createdAt: "2026-10-28T10:00:00Z", updatedAt: "2026-10-28T10:00:00Z" });
    vi.spyOn(api, "fetchTicketAttachments").mockResolvedValue([]); vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]); vi.spyOn(api, "fetchTicketInternalNotes").mockResolvedValue([]);
    render(<AuthContext.Provider value={context()}><TicketDetailScreen ticketIdOrNumber="TIC-101" onBack={vi.fn()} /></AuthContext.Provider>);
    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    await screen.findByText("Original Technician"); expect(api.fetchActionsTaken).toHaveBeenCalledWith(101);
  });
});

describe("Actions Taken API client (mocked fetch, no database)", () => {
  const input = { actionDateTime: "2026-10-28T10:00:00Z", description: "Inspected gateway", result: "Restored service", followUpRequired: false, followUpNote: null, attachmentNotes: null };
  for (const status of [400, 401, 403, 404]) {
    it(`maps HTTP ${status} to a useful error`, async () => {
      vi.restoreAllMocks();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ message: "Server detail" }) }));
      await expect(api.fetchActionsTaken(101)).rejects.toMatchObject({ status });
    });
  }
  it("uses POST/PATCH, credentials and auth headers with an editable-field allowlist", async () => {
    vi.restoreAllMocks(); localStorage.setItem("toktickit_auth_token", "signed-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ action: action() }) }); vi.stubGlobal("fetch", fetchMock);
    await api.createActionTaken(101, { ...input, performedById: 999, ticketId: 2 } as typeof input);
    await api.updateActionTaken(101, "legacy id", input);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tickets/101/actions");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/tickets/101/actions/legacy%20id");
    for (const [index, method] of [[0, "POST"], [1, "PATCH"]] as const) {
      const options = fetchMock.mock.calls[index][1];
      expect(options).toMatchObject({ method, credentials: "include", headers: { Authorization: "Bearer signed-token" } });
      expect(JSON.parse(options.body)).toEqual(input);
    }
  });
});
