import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen.js";
import { TICKET_TRANSITIONS } from "../../src/ticketWorkflow.js";
import type { Ticket, TicketStatus, User, Role } from "../../src/types.js";
import * as api from "../../src/api.js";
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "RESOLVED"], CANCELLED: [],
};
const user: User = { id: 1, email: "staff@example.test", name: "Staff", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const initial: Ticket = { id: 101, ticketNumber: "TIC-101", title: "Workflow ticket", description: "A ticket with concurrent changes", status: "OPEN", priority: "HIGH", categoryId: 1, category: { id: 1, name: "Network" }, requesterId: 1, requester: { id: 1, email: "requester@example.test", name: "Requester", department: "IT", isActive: true }, attachments: [], createdAt: "2026-10-28T10:00:00.000Z", updatedAt: "2026-10-28T11:00:00.000Z" };
const version2 = "2026-10-28T12:00:00.000Z";
const version3 = "2026-10-28T13:00:00.000Z";
function view(role: Role = "IT_STAFF", isLoading = false) {
  const context: AuthContextType = { user: { ...user, role }, isLoading, token: "mock", error: null, login: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), refreshUser: vi.fn() };
  return render(<AuthContext.Provider value={context}><TicketDetailScreen ticketIdOrNumber={101} onBack={vi.fn()} /></AuthContext.Provider>);
}
beforeEach(() => {
  vi.restoreAllMocks(); localStorage.clear();
  vi.spyOn(api, "fetchTicketById").mockResolvedValue({ ...initial });
  vi.spyOn(api, "fetchTicketAttachments").mockResolvedValue([]);
  vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
  vi.spyOn(api, "fetchTicketInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([]);
  vi.spyOn(api, "fetchActionsTaken").mockResolvedValue({ ticketId: 101, ticketNumber: "TIC-101", totalActions: 0, actions: [] });
  vi.spyOn(api, "updateTicketStatusApi").mockResolvedValue({ ticket: { ...initial, status: "IN_PROGRESS", updatedAt: version2 }, message: "Updated" });
  vi.spyOn(api, "indicateProblemResolvedApi").mockResolvedValue({ ticket: { id: 101, status: "OPEN", problemAppearsResolved: true }, message: "Advisory recorded" });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Lab 4.6 Ticket Workflow UI", () => {
  it("uses the BR-06 graph", () => { expect(TICKET_TRANSITIONS).toEqual(matrix); });
  for (const role of ["IT_STAFF", "ADMINISTRATOR", "REQUESTER"] as const) for (const status of Object.keys(matrix) as TicketStatus[]) {
    it(`${role} sees only permitted controls at ${status}`, async () => {
      vi.mocked(api.fetchTicketById).mockResolvedValue({ ...initial, status }); view(role);
      await screen.findByTestId("header-ticket-status");
      const select = screen.queryByTestId("detail-status-select");
      if (role === "REQUESTER") expect(select).not.toBeInTheDocument();
      else {
        expect(within(select!).getAllByRole("option").map(option => (option as HTMLOptionElement).value)).toEqual([status, ...matrix[status]]);
        if (status === "CANCELLED") expect(select).toBeDisabled();
      }
    });
  }
  it("does not flash formal controls while auth is loading", async () => {
    view("IT_STAFF", true); await screen.findByTestId("header-ticket-status");
    expect(screen.queryByTestId("detail-status-select")).not.toBeInTheDocument();
  });
  it("sends the current token and updates the summary, transitions and next token", async () => {
    vi.mocked(api.updateTicketStatusApi).mockResolvedValueOnce({ ticket: { ...initial, status: "IN_PROGRESS", updatedAt: version2 }, message: "Updated" }).mockResolvedValueOnce({ ticket: { ...initial, status: "RESOLVED", updatedAt: version3 }, message: "Updated" });
    view();
    fireEvent.change(await screen.findByTestId("detail-status-select"), { target: { value: "IN_PROGRESS" } });
    await waitFor(() => expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("IN PROGRESS"));
    expect(api.updateTicketStatusApi).toHaveBeenNthCalledWith(1, 101, "IN_PROGRESS", initial.updatedAt);
    expect(within(screen.getByTestId("detail-status-select")).queryByRole("option", { name: /OPEN/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("detail-status-select"), { target: { value: "RESOLVED" } });
    await waitFor(() => expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("RESOLVED"));
    expect(api.updateTicketStatusApi).toHaveBeenNthCalledWith(2, 101, "RESOLVED", version2);
    expect(within(screen.getByTestId("detail-status-select")).getAllByRole("option").map(o => (o as HTMLOptionElement).value)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);
  });
  it("prevents repeated status submissions while pending", async () => {
    let resolve!: (v: any) => void;
    vi.mocked(api.updateTicketStatusApi).mockReturnValue(new Promise(r => { resolve = r; }));
    view(); const select = await screen.findByTestId("detail-status-select");
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } }); fireEvent.change(select, { target: { value: "RESOLVED" } });
    expect(api.updateTicketStatusApi).toHaveBeenCalledTimes(1); expect(select).toBeDisabled();
    await act(async () => { resolve({ ticket: { ...initial, status: "IN_PROGRESS", updatedAt: version2 } }); });
  });
  it("409 blocks further changes, does not retry, and requires explicit refresh/review", async () => {
    vi.mocked(api.updateTicketStatusApi).mockRejectedValueOnce(new api.TicketWorkflowApiError(409, "Stale"));
    view(); fireEvent.change(await screen.findByTestId("detail-status-select"), { target: { value: "IN_PROGRESS" } });
    expect(await screen.findByTestId("triage-error-banner")).toHaveTextContent("Your change was not saved");
    expect(screen.getByTestId("detail-status-select")).toBeDisabled();
    expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("OPEN");
    expect(api.updateTicketStatusApi).toHaveBeenCalledTimes(1); expect(api.fetchTicketById).toHaveBeenCalledTimes(1);
    vi.mocked(api.fetchTicketById).mockResolvedValue({ ...initial, status: "RESOLVED", updatedAt: version2, title: "Updated by another staff member" });
    await userEvent.click(screen.getByRole("button", { name: "Load latest ticket" }));
    await waitFor(() => expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("RESOLVED"));
    expect(screen.getByTestId("detail-status-select")).toHaveValue("RESOLVED");
    expect(screen.getByText(/Review its status and details/)).toBeInTheDocument();
    expect(screen.getByText("Updated by another staff member")).toBeInTheDocument();
    expect(api.updateTicketStatusApi).toHaveBeenCalledTimes(1);
    vi.mocked(api.updateTicketStatusApi).mockResolvedValue({ ticket: { ...initial, status: "CLOSED", updatedAt: version3 } });
    fireEvent.change(screen.getByTestId("detail-status-select"), { target: { value: "CLOSED" } });
    await waitFor(() => expect(api.updateTicketStatusApi).toHaveBeenLastCalledWith(101, "CLOSED", version2));
  });
  it("failed refresh keeps the conflict lock until latest data is loaded", async () => {
    vi.mocked(api.updateTicketStatusApi).mockRejectedValue(new api.TicketWorkflowApiError(409, "Stale"));
    view(); fireEvent.change(await screen.findByTestId("detail-status-select"), { target: { value: "IN_PROGRESS" } });
    await screen.findByRole("button", { name: "Load latest ticket" });
    vi.mocked(api.fetchTicketById).mockRejectedValue(new Error("Network unavailable"));
    await userEvent.click(screen.getByRole("button", { name: "Load latest ticket" }));
    expect(await screen.findByText("Network unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("detail-status-select")).toBeDisabled(); expect(api.updateTicketStatusApi).toHaveBeenCalledTimes(1);
  });
  for (const status of [400, 401, 403, 404, 500]) {
    it(`shows HTTP ${status} errors without changing the ticket or retrying`, async () => {
      vi.mocked(api.updateTicketStatusApi).mockRejectedValue(new api.TicketWorkflowApiError(status, `Workflow error ${status}`));
      view(); fireEvent.change(await screen.findByTestId("detail-status-select"), { target: { value: "IN_PROGRESS" } });
      expect(await screen.findByTestId("triage-error-banner")).toHaveTextContent(`Workflow error ${status}`);
      expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("OPEN");
      expect(api.updateTicketStatusApi).toHaveBeenCalledTimes(1);
    });
  }
  it("keeps Requester advisory feedback separate from formal resolution", async () => {
    view("REQUESTER"); await screen.findByTestId("header-ticket-status");
    expect(screen.queryByTestId("detail-status-select")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Problem Appears Resolved/i }));
    const modal = screen.getByTestId("resolve-confirm-modal");
    await userEvent.click(within(modal).getByRole("button", { name: /Confirm|Submit/i }));
    await waitFor(() => expect(api.indicateProblemResolvedApi).toHaveBeenCalled());
    expect(api.updateTicketStatusApi).not.toHaveBeenCalled();
    expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("OPEN");
  });
});

describe("Workflow API client with mocked fetch", () => {
  it("sends the version token and preserves HTTP 409 for safe conflict handling", async () => {
    vi.restoreAllMocks();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: "Another update occurred" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.updateTicketStatusApi(101, "RESOLVED", initial.updatedAt)).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).toHaveBeenCalledWith('/api/staff/tickets/101/status', expect.objectContaining({ method: "PATCH", credentials: "include", body: JSON.stringify({ status: "RESOLVED", currentUpdatedAt: initial.updatedAt }) }));
  });
});
